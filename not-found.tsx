// app/api/v1/check-sheets/templates/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { checkSheetTemplateCreateSchema, parseOrThrow } from "@/lib/validators";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const GET = withApiHandler(async (_req, { user }) => {
  await assertPermission(user.id, "checkSheet", "view");
  const templates = await prisma.checkSheetTemplate.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: { createdAt: "desc" },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json({ data: templates });
});

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "checkSheet", "add");
  const body = parseOrThrow(checkSheetTemplateCreateSchema, await req.json());

  const created = await prisma.checkSheetTemplate.create({
    data: {
      name: body.name,
      mode: "Classic",
      createdBy: user.id,
      fields: {
        create: body.fields.map((f) => ({
          key: f.key,
          type: f.type,
          label: f.label,
          required: f.required,
          order: f.order,
          config: f.config ?? {},
        })),
      },
    },
    include: { fields: true },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Create",
    module: "checkSheet",
    recordId: created.id,
    recordType: "CheckSheetTemplate",
    newValue: { name: created.name },
    ...requestMeta(req),
  });

  return NextResponse.json(created, { status: 201 });
});
