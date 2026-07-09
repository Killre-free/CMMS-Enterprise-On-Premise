// app/api/v1/machines/[id]/documents/[docId]/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const DELETE = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "machine", "edit");
  const instance = `/api/v1/machines/${params.id}/documents/${params.docId}`;

  const doc = await prisma.machineDocument.findFirst({ where: { id: params.docId, machineId: params.id } });
  if (!doc) {
    return NextResponse.json(problem(404, "Not Found", "Document not found", instance), { status: 404 });
  }

  await prisma.machineDocument.delete({ where: { id: doc.id } });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Delete",
    module: "machine",
    recordId: doc.id,
    recordType: "MachineDocument",
    oldValue: { fileName: doc.fileName },
    ...requestMeta(req),
  });

  return new NextResponse(null, { status: 204 });
});
