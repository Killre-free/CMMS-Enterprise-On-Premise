// app/api/v1/users/import/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { userImportRowSchema } from "@/lib/validators";
import { processImportRows, summarize } from "@/lib/import";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "users", "add");
  const body = await req.json();
  const rows: unknown[] = Array.isArray(body?.rows) ? body.rows : [];

  const results = await processImportRows(rows, userImportRowSchema, async (row) => {
    const role = await prisma.role.findUnique({ where: { name: row.roleName } });
    if (!role) throw new Error(`Role "${row.roleName}" not found.`);

    let plantId: string | undefined;
    if (row.plantCode) {
      const plant = await prisma.plant.findUnique({ where: { code: row.plantCode } });
      if (!plant) throw new Error(`Plant code "${row.plantCode}" not found.`);
      plantId = plant.id;
    }

    let departmentId: string | undefined;
    if (row.departmentName) {
      const department = await prisma.department.findFirst({
        where: { name: row.departmentName, ...(plantId ? { plantId } : {}) },
      });
      if (!department) throw new Error(`Department "${row.departmentName}" not found.`);
      departmentId = department.id;
    }

    const passwordHash = await bcrypt.hash(row.password, 12);
    const created = await prisma.user.create({
      data: {
        employeeId: row.employeeId,
        username: row.username,
        passwordHash,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        position: row.position,
        shift: row.shift,
        departmentId,
        plantId,
        roleId: role.id,
        forcePasswordChange: true,
        createdBy: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: "Create",
      module: "users",
      recordId: created.id,
      recordType: "User",
      newValue: { username: created.username, employeeId: created.employeeId, importedVia: "excel" },
      ...requestMeta(req),
    });

    return created;
  });

  return NextResponse.json(summarize(results));
});
