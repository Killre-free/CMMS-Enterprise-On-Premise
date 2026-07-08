// app/api/v1/work-orders/[id]/parts/[partId]/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const DELETE = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "workOrder", "edit");
  const instance = `/api/v1/work-orders/${params.id}/parts/${params.partId}`;

  const line = await prisma.workOrderSparePart.findFirst({
    where: { id: params.partId, workOrderId: params.id },
  });
  if (!line) {
    return NextResponse.json(problem(404, "Not Found", "Work order part line not found", instance), { status: 404 });
  }

  const wo = await prisma.workOrder.findUnique({ where: { id: params.id } });
  if (wo?.status === "Closed") {
    return NextResponse.json(problem(400, "Closed", "Cannot edit parts on a closed work order.", instance), { status: 400 });
  }

  await prisma.workOrderSparePart.delete({ where: { id: line.id } });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Delete",
    module: "workOrder",
    recordId: line.id,
    recordType: "WorkOrderSparePart",
    ...requestMeta(req),
  });

  return new NextResponse(null, { status: 204 });
});
