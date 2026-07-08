// app/api/v1/spare-part-kits/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { sparePartKitCreateSchema, parseOrThrow } from "@/lib/validators";
import { paginationParams } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const GET = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "sparePart", "view");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = paginationParams(url.searchParams);
  const search = url.searchParams.get("search") ?? undefined;

  const where = {
    deletedAt: null,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.sparePartKit.findMany({
      where,
      skip,
      take,
      orderBy: { name: "asc" },
      include: { items: { include: { sparePart: true } } },
    }),
    prisma.sparePartKit.count({ where }),
  ]);

  return NextResponse.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
});

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "sparePart", "add");
  const body = parseOrThrow(sparePartKitCreateSchema, await req.json());

  const created = await prisma.sparePartKit.create({
    data: {
      name: body.name,
      description: body.description,
      createdBy: user.id,
      items: { create: body.items },
    },
    include: { items: { include: { sparePart: true } } },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Create",
    module: "sparePart",
    recordId: created.id,
    recordType: "SparePartKit",
    newValue: { name: created.name },
    ...requestMeta(req),
  });

  return NextResponse.json(created, { status: 201 });
});
