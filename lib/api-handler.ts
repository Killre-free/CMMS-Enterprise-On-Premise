// lib/api-handler.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { problem } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { SessionUser } from "@/types";

type Handler = (
  req: Request,
  ctx: { user: SessionUser; params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wraps a route handler with: session resolution, standardized error handling
 * (RFC 7807), and structured logging. All /api/v1 routes use this so every
 * route gets auth + validation + error handling for free.
 */
export function withApiHandler(handler: Handler) {
  return async (req: Request, routeCtx: { params: Promise<Record<string, string>> }) => {
    const params = await routeCtx.params;
    const url = new URL(req.url);
    try {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json(
          problem(401, "Unauthorized", "Authentication required.", url.pathname),
          { status: 401 }
        );
      }
      return await handler(req, { user: session.user as unknown as SessionUser, params });
    } catch (err: any) {
      const status = err.status ?? 500;
      if (status === 422 && err.issues) {
        return NextResponse.json(
          {
            ...problem(422, "Validation Error", "One or more fields are invalid.", url.pathname, "validation-error"),
            errors: err.issues,
          },
          { status: 422 }
        );
      }
      if (status === 403 && err.message === "MODULE_NOT_LICENSED") {
        return NextResponse.json(
          { error: "MODULE_NOT_LICENSED", detail: "This module is not licensed for this deployment." },
          { status: 403 }
        );
      }
      if (status === 409) {
        return NextResponse.json(
          problem(409, "Conflict", err.message ?? "The record was modified by someone else.", url.pathname),
          { status: 409 }
        );
      }
      if (status !== 500) {
        return NextResponse.json(
          problem(status, err.title ?? "Error", err.message, url.pathname),
          { status }
        );
      }
      logger.error({ err, path: url.pathname }, "unhandled API error");
      return NextResponse.json(
        problem(500, "Internal Server Error", "An unexpected error occurred.", url.pathname),
        { status: 500 }
      );
    }
  };
}
