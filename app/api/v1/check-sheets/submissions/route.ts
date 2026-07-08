// app/api/v1/check-sheets/submissions/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { checkSheetSubmissionSchema, parseOrThrow } from "@/lib/validators";
import { paginationParams } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { evaluateCalculatedFields } from "@/lib/check-sheet-formula";
import { problem } from "@/lib/utils";

export const GET = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "checkSheet", "view");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = paginationParams(url.searchParams);
  const templateId = url.searchParams.get("templateId") ?? undefined;
  const linkedWorkOrderId = url.searchParams.get("workOrderId") ?? undefined;
  const machineId = url.searchParams.get("machineId") ?? undefined;

  const where = {
    ...(templateId ? { templateId } : {}),
    ...(linkedWorkOrderId ? { linkedWorkOrderId } : {}),
    ...(machineId ? { machineId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.checkSheetSubmission.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { template: true, submittedBy: true, responses: true, machine: true },
    }),
    prisma.checkSheetSubmission.count({ where }),
  ]);

  return NextResponse.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
});

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "checkSheet", "add");
  const body = parseOrThrow(checkSheetSubmissionSchema, await req.json());
  const instance = "/api/v1/check-sheets/submissions";

  const template = await prisma.checkSheetTemplate.findFirst({
    where: { id: body.templateId, deletedAt: null },
    include: { fields: true },
  });
  if (!template) {
    return NextResponse.json(problem(404, "Not Found", "Check sheet template not found", instance), { status: 404 });
  }

  // Required-field validation.
  const requiredKeys = template.fields.filter((f) => f.required).map((f) => f.key);
  const responseByFieldId = new Map(body.responses.map((r) => [r.fieldId, r]));
  const fieldById = new Map(template.fields.map((f) => [f.id, f]));

  if (body.status === "Submitted") {
    for (const key of requiredKeys) {
      const field = template.fields.find((f) => f.key === key)!;
      const resp = responseByFieldId.get(field.id);
      if (!resp || resp.value === undefined || resp.value === null || resp.value === "") {
        return NextResponse.json(
          problem(422, "Validation Error", `Field "${field.label}" is required.`, instance, "validation-error"),
          { status: 422 }
        );
      }
    }
  }

  // Server-side re-validation of Calculated fields (client already computed
  // them live; this guards against a tampered/stale client payload).
  const valuesByKey: Record<string, unknown> = {};
  for (const [fieldId, resp] of responseByFieldId) {
    const field = fieldById.get(fieldId);
    if (field) valuesByKey[field.key] = resp.value;
  }
  const calculated = evaluateCalculatedFields(template.fields, valuesByKey);

  const created = await prisma.$transaction(async (tx) => {
    const submission = await tx.checkSheetSubmission.create({
      data: {
        templateId: template.id,
        templateVersion: template.version,
        linkedType: body.linkedType,
        linkedWorkOrderId: body.linkedWorkOrderId,
        machineId: body.machineId,
        submittedById: user.id,
        submittedAt: body.status === "Submitted" ? new Date() : null,
        status: body.status,
      },
    });

    for (const r of body.responses) {
      const field = fieldById.get(r.fieldId);
      const value = field && calculated[field.key] !== undefined ? calculated[field.key] : r.value;
      await tx.checkSheetResponse.create({
        data: {
          submissionId: submission.id,
          fieldId: r.fieldId,
          value: value as any,
          attachments: r.attachments ?? [],
        },
      });
    }

    return submission;
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Create",
    module: "checkSheet",
    recordId: created.id,
    recordType: "CheckSheetSubmission",
    ...requestMeta(req),
  });

  return NextResponse.json(created, { status: 201 });
});
