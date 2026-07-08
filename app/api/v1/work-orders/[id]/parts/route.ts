// app/api/v1/work-orders/[id]/parts/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { workOrderSparePartCreateSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

// Records a spare part as drawn against a work order. Stock isn't decremented
// here — that happens once when the work order transitions to Closed (see
// transition/route.ts), so a part line can still be corrected/removed while
// the work order is open.
export const POST = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "workOrder", "edit");
  const body = parseOrThrow(workOrderSparePartCreateSchema, await req.json());
  const instance = `/api/v1/work-orders/${params.id}/parts`;

  const wo = await prisma.workOrder.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!wo) {
    return NextResponse.json(problem(404, "Not Found", `Work order ${params.id} was not found`, instance), { status: 404 });
  }
  if (wo.status === "Closed") {
    return NextResponse.json(problem(400, "Closed", "Cannot add parts to a closed work order.", instance), { status: 400 });
  }

  const sparePart = await prisma.sparePart.findFirst({ where: { id: body.sparePartId, deletedAt: null } });
  if (!sparePart) {
    return NextResponse.json(problem(404, "Not Found", "Spare part not found", instance), { status: 404 });
  }

  const created = await prisma.workOrderSparePart.create({
    data: {
      workOrderId: wo.id,
      sparePartId: sparePart.id,
      quantity: body.quantity,
      unitCost: sparePart.unitCost,
    },
    include: { sparePart: true },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Create",
    module: "workOrder",
    recordId: created.id,
    recordType: "WorkOrderSparePart",
    newValue: { workOrderId: wo.id, sparePartId: sparePart.id, quantity: body.quantity },
    ...requestMeta(req),
  });

  return NextResponse.json(created, { status: 201 });
});
