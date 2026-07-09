// app/api/v1/machines/[id]/documents/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { machineDocumentCreateSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const POST = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "machine", "edit");
  const body = parseOrThrow(machineDocumentCreateSchema, await req.json());
  const instance = `/api/v1/machines/${params.id}/documents`;

  const machine = await prisma.machine.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!machine) {
    return NextResponse.json(problem(404, "Not Found", `Machine ${params.id} was not found`, instance), { status: 404 });
  }

  const created = await prisma.machineDocument.create({
    data: { machineId: machine.id, fileName: body.fileName, url: body.url, uploadedBy: user.id },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Create",
    module: "machine",
    recordId: created.id,
    recordType: "MachineDocument",
    newValue: { machineId: machine.id, fileName: created.fileName },
    ...requestMeta(req),
  });

  return NextResponse.json(created, { status: 201 });
});
