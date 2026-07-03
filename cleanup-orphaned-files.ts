// app/api/v1/users/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { userCreateSchema, parseOrThrow } from "@/lib/validators";
import { paginationParams } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const GET = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "users", "view");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = paginationParams(url.searchParams);
  const search = url.searchParams.get("search") ?? undefined;

  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { employeeId: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { role: true, department: true },
      omit: { passwordHash: true } as any,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "users", "add");
  const body = parseOrThrow(userCreateSchema, await req.json());

  const passwordHash = await bcrypt.hash(body.password, 12);
  const created = await prisma.user.create({
    data: {
      employeeId: body.employeeId,
      username: body.username,
      passwordHash,
      firstName: body.firstName,
      lastName: body.lastName,
      departmentId: body.departmentId,
      position: body.position,
      supervisorId: body.supervisorId,
      shift: body.shift,
      email: body.email,
      phone: body.phone,
      roleId: body.roleId,
      plantId: body.plantId,
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
    newValue: { username: created.username, employeeId: created.employeeId },
    ...requestMeta(req),
  });

  const { passwordHash: _omit, ...safe } = created;
  return NextResponse.json(safe, { status: 201 });
});
