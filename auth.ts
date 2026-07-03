// app/api/v1/machines/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { machineCreateSchema, parseOrThrow } from "@/lib/validators";
import { paginationParams } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import QRCode from "qrcode";

export const GET = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "machine", "view");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = paginationParams(url.searchParams);
  const search = url.searchParams.get("search") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  const where = {
    deletedAt: null,
    ...(status ? { lifeCycleStatus: status as any } : {}),
    ...(search
      ? {
          OR: [
            { machineCode: { contains: search, mode: "insensitive" as const } },
            { machineName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.machine.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { department: true, plant: true },
    }),
    prisma.machine.count({ where }),
  ]);

  return NextResponse.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
});

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "machine", "add");
  const body = parseOrThrow(machineCreateSchema, await req.json());

  const qrDataUrl = await QRCode.toDataURL(body.machineCode);

  const created = await prisma.machine.create({
    data: {
      ...body,
      qrCode: qrDataUrl,
      barcode: body.machineCode,
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
    newValue: { machineCode: created.machineCode },
    ...requestMeta(req),
  });

  return NextResponse.json(created, { status: 201 });
});
