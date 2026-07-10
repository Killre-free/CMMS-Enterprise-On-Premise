// app/api/v1/pm/[id]/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { pmPlanUpdateSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { computeNextDue } from "@/lib/pm-schedule";

export const GET = withApiHandler(async (_req, { user, params }) => {
  await assertPermission(user.id, "pm", "view");
  const found = await prisma.pMPlan.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { machine: true },
  });
  if (!found) {
    return NextResponse.json(problem(404, "Not Found", `PM plan ${params.id} was not found`, `/api/v1/pm/${params.id}`), {
      status: 404,
    });
  }
  return NextResponse.json(found);
});

export const PATCH = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "pm", "edit");
  const body = parseOrThrow(pmPlanUpdateSchema, await req.json());
  const instance = `/api/v1/pm/${params.id}`;

  const existing = await prisma.pMPlan.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json(problem(404, "Not Found", `PM plan ${params.id} was not found`, instance), { status: 404 });
  }

  const frequencyType = body.frequencyType ?? existing.frequencyType;
  const frequencyValue = body.frequencyValue ?? existing.frequencyValue ?? undefined;
  const recompute = body.frequencyType !== undefined || body.frequencyValue !== undefined;

  const updated = await prisma.pMPlan.update({
    where: { id: params.id },
    data: {
      ...body,
      updatedBy: user.id,
      ...(recompute ? { nextDueAt: computeNextDue(frequencyType, frequencyValue, new Date()) } : {}),
    },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Edit",
    module: "pm",
    recordId: params.id,
    recordType: "PMPlan",
    oldValue: existing,
    newValue: updated,
    ...requestMeta(req),
  });

  return NextResponse.json(updated);
});

export const DELETE = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "pm", "delete");
  const instance = `/api/v1/pm/${params.id}`;

  const existing = await prisma.pMPlan.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json(problem(404, "Not Found", `PM plan ${params.id} was not found`, instance), { status: 404 });
  }

  await prisma.pMPlan.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Delete",
    module: "pm",
    recordId: params.id,
    recordType: "PMPlan",
    oldValue: { name: existing.name },
    ...requestMeta(req),
  });

  return new NextResponse(null, { status: 204 });
});
