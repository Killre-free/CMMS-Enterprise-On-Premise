// app/api/v1/roles/[id]/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { roleUpdateSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const GET = withApiHandler(async (_req, { user, params }) => {
  await assertPermission(user.id, "users", "view");
  const found = await prisma.role.findUnique({
    where: { id: params.id },
    include: { permissions: true },
  });
  if (!found) {
    return NextResponse.json(
      problem(404, "Not Found", `Role ${params.id} was not found`, `/api/v1/roles/${params.id}`),
      { status: 404 }
    );
  }
  return NextResponse.json(found);
});

export const PATCH = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "users", "edit");
  const body = parseOrThrow(roleUpdateSchema, await req.json());

  const existing = await prisma.role.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json(
      problem(404, "Not Found", `Role ${params.id} was not found`, `/api/v1/roles/${params.id}`),
      { status: 404 }
    );
  }

  const updated = await prisma.role.update({ where: { id: params.id }, data: body });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Edit",
    module: "users",
    recordId: params.id,
    recordType: "Role",
    oldValue: { name: existing.name },
    newValue: { name: updated.name },
    ...requestMeta(req),
  });

  return NextResponse.json(updated);
});
