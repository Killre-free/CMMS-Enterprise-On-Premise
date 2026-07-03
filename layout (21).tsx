// app/api/v1/check-sheets/templates/[id]/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { checkSheetTemplateCreateSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const GET = withApiHandler(async (_req, { user, params }) => {
  await assertPermission(user.id, "checkSheet", "view");
  const found = await prisma.checkSheetTemplate.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!found) {
    return NextResponse.json(
      problem(404, "Not Found", `Template ${params.id} was not found`, `/api/v1/check-sheets/templates/${params.id}`),
      { status: 404 }
    );
  }
  return NextResponse.json(found);
});

// Editing a template used by existing submissions creates a NEW version;
// old submissions keep rendering against the version they were filled with
// (CheckSheetSubmission.templateVersion is set at submit time).
export const PATCH = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "checkSheet", "edit");
  const body = parseOrThrow(checkSheetTemplateCreateSchema, await req.json());
  const instance = `/api/v1/check-sheets/templates/${params.id}`;

  const existing = await prisma.checkSheetTemplate.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { _count: { select: { submissions: true } } },
  });
  if (!existing) {
    return NextResponse.json(problem(404, "Not Found", `Template ${params.id} was not found`, instance), { status: 404 });
  }

  const hasSubmissions = existing._count.submissions > 0;

  const updated = await prisma.$transaction(async (tx) => {
    if (hasSubmissions) {
      await tx.checkSheetField.deleteMany({ where: { templateId: params.id } });
      return tx.checkSheetTemplate.update({
        where: { id: params.id },
        data: {
          name: body.name,
          version: { increment: 1 },
          updatedBy: user.id,
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
    }
    await tx.checkSheetField.deleteMany({ where: { templateId: params.id } });
    return tx.checkSheetTemplate.update({
      where: { id: params.id },
      data: {
        name: body.name,
        updatedBy: user.id,
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
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Edit",
    module: "checkSheet",
    recordId: params.id,
    recordType: "CheckSheetTemplate",
    newValue: { version: updated.version },
    ...requestMeta(req),
  });

  return NextResponse.json(updated);
});
