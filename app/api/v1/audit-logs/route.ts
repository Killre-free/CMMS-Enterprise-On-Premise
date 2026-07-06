// app/api/v1/audit-logs/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { paginationParams } from "@/lib/utils";

export const GET = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "auditLog", "view");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = paginationParams(url.searchParams);
  const moduleFilter = url.searchParams.get("module") ?? undefined;
  const action = url.searchParams.get("action") ?? undefined;

  const where = {
    ...(moduleFilter ? { module: moduleFilter } : {}),
    ...(action ? { action } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
});
