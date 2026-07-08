// app/api/v1/reorder-suggestions/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { paginationParams } from "@/lib/utils";

export const GET = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "sparePart", "view");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = paginationParams(url.searchParams);
  const status = url.searchParams.get("status") ?? undefined;

  const where = { ...(status ? { status: status as any } : {}) };

  const [data, total] = await Promise.all([
    prisma.reorderSuggestion.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { sparePart: true },
    }),
    prisma.reorderSuggestion.count({ where }),
  ]);

  return NextResponse.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
});
