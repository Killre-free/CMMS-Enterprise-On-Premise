// app/api/v1/spare-parts/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { sparePartCreateSchema, parseOrThrow } from "@/lib/validators";
import { paginationParams } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import QRCode from "qrcode";

export const GET = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "sparePart", "view");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = paginationParams(url.searchParams);
  const search = url.searchParams.get("search") ?? undefined;
  const belowSafety = url.searchParams.get("belowSafety") === "true";

  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { partCode: { contains: search, mode: "insensitive" as const } },
            { partName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [allMatching, total] = await Promise.all([
    prisma.sparePart.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.sparePart.count({ where }),
  ]);

  const filtered = belowSafety
    ? allMatching.filter((p) => p.currentStock < p.safetyStock)
    : allMatching;

  const data = filtered.slice(skip, skip + take);

  return NextResponse.json({
    data,
    page,
    pageSize,
    total: belowSafety ? filtered.length : total,
    totalPages: Math.ceil((belowSafety ? filtered.length : total) / pageSize),
  });
});

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "sparePart", "add");
  const body = parseOrThrow(sparePartCreateSchema, await req.json());

  const qrDataUrl = await QRCode.toDataURL(body.partCode);

  const created = await prisma.sparePart.create({
    data: { ...body, qrCode: qrDataUrl, barcode: body.partCode, createdBy: user.id },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Create",
    module: "sparePart",
    recordId: created.id,
    recordType: "SparePart",
    newValue: { partCode: created.partCode },
    ...requestMeta(req),
  });

  return NextResponse.json(created, { status: 201 });
});
