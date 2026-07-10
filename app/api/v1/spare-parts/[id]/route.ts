// app/api/v1/spare-parts/[id]/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { sparePartUpdateSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const GET = withApiHandler(async (_req, { user, params }) => {
  await assertPermission(user.id, "sparePart", "view");
  const found = await prisma.sparePart.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      transactions: { orderBy: { createdAt: "desc" }, take: 100 }, // stock card
      reorderSuggestions: { where: { status: "Pending" } },
    },
  });
  if (!found) {
    return NextResponse.json(
      problem(404, "Not Found", `Spare part ${params.id} was not found`, `/api/v1/spare-parts/${params.id}`),
      { status: 404 }
    );
  }
  return NextResponse.json(found);
});

export const PATCH = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "sparePart", "edit");
  const body = parseOrThrow(sparePartUpdateSchema, await req.json());

  const existing = await prisma.sparePart.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json(
      problem(404, "Not Found", `Spare part ${params.id} was not found`, `/api/v1/spare-parts/${params.id}`),
      { status: 404 }
    );
  }

  const updated = await prisma.sparePart.update({
    where: { id: params.id },
    data: { ...body, updatedBy: user.id },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Edit",
    module: "sparePart",
    recordId: params.id,
    recordType: "SparePart",
    oldValue: existing,
    newValue: updated,
    ...requestMeta(req),
  });

  return NextResponse.json(updated);
});

export const DELETE = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "sparePart", "delete");
  const instance = `/api/v1/spare-parts/${params.id}`;

  const existing = await prisma.sparePart.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json(problem(404, "Not Found", `Spare part ${params.id} was not found`, instance), { status: 404 });
  }

  await prisma.sparePart.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Delete",
    module: "sparePart",
    recordId: params.id,
    recordType: "SparePart",
    oldValue: { partCode: existing.partCode },
    ...requestMeta(req),
  });

  return new NextResponse(null, { status: 204 });
});
