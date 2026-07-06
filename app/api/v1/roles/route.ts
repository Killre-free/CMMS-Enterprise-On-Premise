// app/api/v1/roles/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { roleCreateSchema, parseOrThrow } from "@/lib/validators";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const GET = withApiHandler(async (_req, { user }) => {
  await assertPermission(user.id, "users", "view");
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });
  return NextResponse.json({ data: roles });
});

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "users", "add");
  const body = parseOrThrow(roleCreateSchema, await req.json());

  const created = await prisma.role.create({ data: body });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Create",
    module: "users",
    recordId: created.id,
    recordType: "Role",
    newValue: { name: created.name },
    ...requestMeta(req),
  });

  return NextResponse.json(created, { status: 201 });
});
