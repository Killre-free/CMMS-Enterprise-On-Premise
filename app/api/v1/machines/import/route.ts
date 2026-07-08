// app/api/v1/machines/import/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { machineImportRowSchema } from "@/lib/validators";
import { processImportRows, summarize } from "@/lib/import";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import QRCode from "qrcode";

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "machine", "add");
  const body = await req.json();
  const rows: unknown[] = Array.isArray(body?.rows) ? body.rows : [];

  const results = await processImportRows(rows, machineImportRowSchema, async (row) => {
    let plantId: string | undefined;
    if (row.plantCode) {
      const plant = await prisma.plant.findUnique({ where: { code: row.plantCode } });
      if (!plant) throw new Error(`Plant code "${row.plantCode}" not found.`);
      plantId = plant.id;
    }

    let departmentId: string | undefined;
    if (row.departmentName) {
      const department =
        (await prisma.department.findFirst({
          where: { name: row.departmentName, ...(plantId ? { plantId } : {}) },
        })) ??
        (await prisma.department.create({
          data: { name: row.departmentName, plantId },
        }));
      departmentId = department.id;
    }

    const qrDataUrl = await QRCode.toDataURL(row.machineCode);
    const created = await prisma.machine.create({
      data: {
        machineCode: row.machineCode,
        machineName: row.machineName,
        manufacturer: row.manufacturer,
        model: row.model,
        serialNumber: row.serialNumber,
        location: row.location,
        criticality: row.criticality,
        installedAt: row.installedAt,
        notes: row.notes,
        lifeCycleStatus: row.lifeCycleStatus,
        departmentId,
        plantId,
        qrCode: qrDataUrl,
        barcode: row.machineCode,
        createdBy: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: "Create",
      module: "machine",
      recordId: created.id,
      recordType: "Machine",
      newValue: { machineCode: created.machineCode, importedVia: "excel" },
      ...requestMeta(req),
    });

    return created;
  });

  return NextResponse.json(summarize(results));
});
