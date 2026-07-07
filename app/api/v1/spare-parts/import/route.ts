// app/api/v1/spare-parts/import/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { sparePartImportRowSchema } from "@/lib/validators";
import { processImportRows, summarize } from "@/lib/import";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import QRCode from "qrcode";

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "sparePart", "add");
  const body = await req.json();
  const rows: unknown[] = Array.isArray(body?.rows) ? body.rows : [];

  const results = await processImportRows(rows, sparePartImportRowSchema, async (row) => {
    const qrDataUrl = await QRCode.toDataURL(row.partCode);
    const created = await prisma.sparePart.create({
      data: {
        partCode: row.partCode,
        partName: row.partName,
        unit: row.unit,
        currentStock: row.currentStock,
        safetyStock: row.safetyStock,
        maxStock: row.maxStock,
        unitCost: row.unitCost,
        category: row.category,
        location: row.location,
        qrCode: qrDataUrl,
        barcode: row.partCode,
        createdBy: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: "Create",
      module: "sparePart",
      recordId: created.id,
      recordType: "SparePart",
      newValue: { partCode: created.partCode, importedVia: "excel" },
      ...requestMeta(req),
    });

    return created;
  });

  return NextResponse.json(summarize(results));
});
