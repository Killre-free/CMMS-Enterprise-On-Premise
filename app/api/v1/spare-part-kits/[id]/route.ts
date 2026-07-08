// app/api/v1/spare-part-kits/[id]/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { sparePartKitUpdateSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const GET = withApiHandler(async (_req, { user, params }) => {
  await assertPermission(user.id, "sparePart", "view");
  const found = await prisma.sparePartKit.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { items: { include: { sparePart: true } } },
  });
  if (!found) {
    return NextResponse.json(
      problem(404, "Not Found", `Spare part kit ${params.id} was not found`, `/api/v1/spare-part-kits/${params.id}`),
      { status: 404 }
    );
  }
  return NextResponse.json(found);
});

export const PATCH = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "sparePart", "edit");
  const body = parseOrThrow(sparePartKitUpdateSchema, await req.json());
  const instance = `/api/v1/spare-part-kits/${params.id}`;

  const existing = await prisma.sparePartKit.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json(problem(404, "Not Found", `Spare part kit ${params.id} was not found`, instance), { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.sparePartKitItem.deleteMany({ where: { kitId: params.id } });
    return tx.sparePartKit.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        items: { create: body.items },
      },
      include: { items: { include: { sparePart: true } } },
    });
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Edit",
    module: "sparePart",
    recordId: params.id,
    recordType: "SparePartKit",
    oldValue: { name: existing.name },
    newValue: { name: updated.name },
    ...requestMeta(req),
  });

  return NextResponse.json(updated);
});

export const DELETE = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "sparePart", "delete");
  const instance = `/api/v1/spare-part-kits/${params.id}`;

  const existing = await prisma.sparePartKit.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json(problem(404, "Not Found", `Spare part kit ${params.id} was not found`, instance), { status: 404 });
  }

  await prisma.sparePartKit.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Delete",
    module: "sparePart",
    recordId: params.id,
    recordType: "SparePartKit",
    oldValue: { name: existing.name },
    ...requestMeta(req),
  });

  return new NextResponse(null, { status: 204 });
});
