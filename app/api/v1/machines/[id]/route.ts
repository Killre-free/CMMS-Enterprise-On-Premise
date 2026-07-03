// app/api/v1/machines/[id]/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { machineUpdateSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const GET = withApiHandler(async (_req, { user, params }) => {
  await assertPermission(user.id, "machine", "view");
  const found = await prisma.machine.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      department: true,
      plant: true,
      pmPlans: { where: { deletedAt: null } },
      workOrders: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { assignedTo: true, requestedBy: true },
      },
    },
  });
  if (!found) {
    return NextResponse.json(
      problem(404, "Not Found", `Machine ${params.id} was not found`, `/api/v1/machines/${params.id}`),
      { status: 404 }
    );
  }
  return NextResponse.json(found);
});

export const PATCH = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "machine", "edit");
  const body = parseOrThrow(machineUpdateSchema, await req.json());

  const existing = await prisma.machine.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json(
      problem(404, "Not Found", `Machine ${params.id} was not found`, `/api/v1/machines/${params.id}`),
      { status: 404 }
    );
  }

  const updated = await prisma.machine.update({
    where: { id: params.id },
    data: { ...body, updatedBy: user.id },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Edit",
    module: "machine",
    recordId: params.id,
    recordType: "Machine",
    oldValue: existing,
    newValue: updated,
    ...requestMeta(req),
  });

  return NextResponse.json(updated);
});

export const DELETE = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "machine", "delete");
  const existing = await prisma.machine.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json(
      problem(404, "Not Found", `Machine ${params.id} was not found`, `/api/v1/machines/${params.id}`),
      { status: 404 }
    );
  }

  await prisma.machine.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), updatedBy: user.id },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Delete",
    module: "machine",
    recordId: params.id,
    recordType: "Machine",
    ...requestMeta(req),
  });

  return new NextResponse(null, { status: 204 });
});
