import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { hasPermission, assertPermission } from "@/lib/permissions";

// Integration tests: exercise hasPermission/assertPermission against a real
// Postgres database (DATABASE_URL), since permission resolution is a
// role-lookup + override-lookup chain that isn't meaningful to test against
// a mock.
describe("hasPermission / assertPermission", () => {
  const suffix = randomUUID().slice(0, 8);
  const roleId = `test-role-${suffix}`;
  const emptyRoleId = `test-empty-role-${suffix}`;
  const superAdminId = `test-super-${suffix}`;
  const grantedUserId = `test-granted-${suffix}`;
  const overriddenDenyUserId = `test-deny-${suffix}`;
  const overriddenGrantUserId = `test-grant-${suffix}`;
  const noPermissionUserId = `test-none-${suffix}`;

  function baseUser(id: string, userRoleId: string, overrides: { isSuperAdmin?: boolean } = {}) {
    return {
      id,
      employeeId: id,
      username: id,
      passwordHash: "not-a-real-hash",
      firstName: "Test",
      lastName: "User",
      roleId: userRoleId,
      ...overrides,
    };
  }

  before(async () => {
    await prisma.role.create({
      data: {
        id: roleId,
        name: `Test Role ${suffix}`,
        permissions: {
          create: [{ moduleKey: "machines", action: "view" }],
        },
      },
    });
    await prisma.role.create({
      data: { id: emptyRoleId, name: `Test Empty Role ${suffix}` },
    });

    await prisma.user.create({ data: baseUser(grantedUserId, roleId) });
    await prisma.user.create({ data: baseUser(noPermissionUserId, emptyRoleId) });
    await prisma.user.create({ data: baseUser(superAdminId, roleId, { isSuperAdmin: true }) });

    await prisma.user.create({ data: baseUser(overriddenDenyUserId, roleId) });
    await prisma.userPermissionOverride.create({
      data: { userId: overriddenDenyUserId, moduleKey: "machines", action: "view", isGranted: false },
    });

    await prisma.user.create({ data: baseUser(overriddenGrantUserId, emptyRoleId) });
    await prisma.userPermissionOverride.create({
      data: { userId: overriddenGrantUserId, moduleKey: "reports", action: "view", isGranted: true },
    });
  });

  after(async () => {
    await prisma.userPermissionOverride.deleteMany({
      where: { userId: { in: [overriddenDenyUserId, overriddenGrantUserId] } },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [grantedUserId, noPermissionUserId, superAdminId, overriddenDenyUserId, overriddenGrantUserId],
        },
      },
    });
    await prisma.role.deleteMany({ where: { id: { in: [roleId, emptyRoleId] } } });
    await prisma.$disconnect();
  });

  it("returns true when the user's role grants the action on the module", async () => {
    assert.equal(await hasPermission(grantedUserId, "machines", "view"), true);
  });

  it("returns false when neither the role nor an override grants the action", async () => {
    assert.equal(await hasPermission(noPermissionUserId, "machines", "view"), false);
    assert.equal(await hasPermission(grantedUserId, "machines", "delete"), false);
  });

  it("returns false for an unknown user id", async () => {
    assert.equal(await hasPermission("does-not-exist", "machines", "view"), false);
  });

  it("always returns true for a super admin, regardless of role permissions", async () => {
    assert.equal(await hasPermission(superAdminId, "anything", "delete"), true);
  });

  it("a denying user override takes precedence over a role grant", async () => {
    assert.equal(await hasPermission(overriddenDenyUserId, "machines", "view"), false);
  });

  it("a granting user override takes precedence even when the role has no such permission", async () => {
    assert.equal(await hasPermission(overriddenGrantUserId, "reports", "view"), true);
  });

  it("assertPermission resolves silently when allowed", async () => {
    await assert.doesNotReject(assertPermission(grantedUserId, "machines", "view"));
  });

  it("assertPermission throws a 403-shaped error when denied", async () => {
    await assert.rejects(
      assertPermission(noPermissionUserId, "machines", "view"),
      (err: any) => {
        assert.equal(err.status, 403);
        assert.equal(err.message, "PERMISSION_DENIED");
        return true;
      }
    );
  });
});
