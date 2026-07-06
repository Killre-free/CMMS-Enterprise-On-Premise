// app/api/v1/roles/[id]/permissions/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { permissionMatrixSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

// Replaces the role's entire permission matrix in one transaction — the UI
// always sends the full grid (every module x action), so a full replace is
// simpler and safer than diffing individual toggles.
export const PUT = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "users", "edit");
  const body = parseOrThrow(permissionMatrixSchema, await req.json());
  const instance = `/api/v1/roles/${params.id}/permissions`;

  const role = await prisma.role.findUnique({ where: { id: params.id } });
  if (!role) {
    return NextResponse.json(problem(404, "Not Found", `Role ${params.id} was not found`, instance), {
      status: 404,
    });
  }

  const granted = body.permissions.filter((p) => p.granted);

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: params.id } }),
    prisma.rolePermission.createMany({
      data: granted.map((p) => ({ roleId: params.id, moduleKey: p.moduleKey, action: p.action })),
    }),
  ]);

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Edit",
    module: "users",
    recordId: params.id,
    recordType: "RolePermission",
    newValue: { grantedCount: granted.length },
    ...requestMeta(req),
  });

  const updated = await prisma.rolePermission.findMany({ where: { roleId: params.id } });
  return NextResponse.json({ data: updated });
});
