// app/api/v1/pm/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { pmPlanCreateSchema, parseOrThrow } from "@/lib/validators";
import { paginationParams } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { computeNextDue } from "@/lib/pm-schedule";

export const GET = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "pm", "view");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = paginationParams(url.searchParams);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where = {
    deletedAt: null,
    ...(from || to
      ? {
          nextDueAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.pMPlan.findMany({
      where,
      skip,
      take,
      orderBy: { nextDueAt: "asc" },
      include: { machine: true },
    }),
    prisma.pMPlan.count({ where }),
  ]);

  return NextResponse.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
});

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "pm", "add");
  const body = parseOrThrow(pmPlanCreateSchema, await req.json());

  const nextDueAt = computeNextDue(body.frequencyType, body.frequencyValue, new Date());

  const created = await prisma.pMPlan.create({
    data: { ...body, nextDueAt, createdBy: user.id },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Create",
    module: "pm",
    recordId: created.id,
    recordType: "PMPlan",
    newValue: { name: created.name },
    ...requestMeta(req),
  });

  return NextResponse.json(created, { status: 201 });
});
