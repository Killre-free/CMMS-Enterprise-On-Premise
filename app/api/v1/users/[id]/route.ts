// app/api/v1/users/[id]/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { userUpdateSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const GET = withApiHandler(async (_req, { user, params }) => {
  await assertPermission(user.id, "users", "view");
  const found = await prisma.user.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { role: true, department: true },
    omit: { passwordHash: true } as any,
  });
  if (!found) {
    return NextResponse.json(
      problem(404, "Not Found", `User ${params.id} was not found`, `/api/v1/users/${params.id}`),
      { status: 404 }
    );
  }
  return NextResponse.json(found);
});

export const PATCH = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "users", "edit");
  const body = parseOrThrow(userUpdateSchema, await req.json());
  const { password: _pw, ...updateData } = body as any;

  const existing = await prisma.user.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json(
      problem(404, "Not Found", `User ${params.id} was not found`, `/api/v1/users/${params.id}`),
      { status: 404 }
    );
  }
  if (existing.isSuperAdmin) {
    return NextResponse.json(
      problem(403, "Forbidden", "The seeded Super Admin account cannot be modified this way.", `/api/v1/users/${params.id}`),
      { status: 403 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { ...updateData, updatedBy: user.id },
    omit: { passwordHash: true } as any,
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Edit",
    module: "users",
    recordId: params.id,
    recordType: "User",
    oldValue: existing,
    newValue: updated,
    ...requestMeta(req),
  });

  return NextResponse.json(updated);
});

export const DELETE = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "users", "delete");

  const existing = await prisma.user.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json(
      problem(404, "Not Found", `User ${params.id} was not found`, `/api/v1/users/${params.id}`),
      { status: 404 }
    );
  }
  if (existing.isSuperAdmin) {
    return NextResponse.json(
      problem(403, "Forbidden", "The seeded Super Admin account cannot be deleted.", `/api/v1/users/${params.id}`),
      { status: 403 }
    );
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false, updatedBy: user.id },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Delete",
    module: "users",
    recordId: params.id,
    recordType: "User",
    ...requestMeta(req),
  });

  return new NextResponse(null, { status: 204 });
});
