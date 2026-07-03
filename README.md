// lib/permissions.ts
import { prisma } from "@/lib/prisma";
import type { PermissionAction } from "@prisma/client";

/**
 * Checks whether a user may perform `action` on `moduleKey`.
 * User-level overrides (UserPermissionOverride) take precedence over the
 * role's default permissions. Super Admins always pass.
 */
export async function hasPermission(
  userId: string,
  moduleKey: string,
  action: PermissionAction
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, roleId: true },
  });
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const override = await prisma.userPermissionOverride.findUnique({
    where: { userId_moduleKey_action: { userId, moduleKey, action } },
  });
  if (override) return override.isGranted;

  const rolePermission = await prisma.rolePermission.findUnique({
    where: { roleId_moduleKey_action: { roleId: user.roleId, moduleKey, action } },
  });
  return Boolean(rolePermission);
}

/** Throws a 403-shaped error object if the user lacks permission. Use in API routes. */
export async function assertPermission(
  userId: string,
  moduleKey: string,
  action: PermissionAction
): Promise<void> {
  const allowed = await hasPermission(userId, moduleKey, action);
  if (!allowed) {
    const err = new Error("PERMISSION_DENIED") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}
