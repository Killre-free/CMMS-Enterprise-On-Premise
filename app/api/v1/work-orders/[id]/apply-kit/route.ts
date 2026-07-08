// app/api/v1/work-orders/[id]/apply-kit/route.ts
// Adds every part in a SparePartKit as a WorkOrderSparePart line in one go,
// so a technician doesn't have to add each part in the kit one by one.
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { applyKitSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const POST = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "workOrder", "edit");
  const body = parseOrThrow(applyKitSchema, await req.json());
  const instance = `/api/v1/work-orders/${params.id}/apply-kit`;

  const wo = await prisma.workOrder.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!wo) {
    return NextResponse.json(problem(404, "Not Found", `Work order ${params.id} was not found`, instance), { status: 404 });
  }
  if (wo.status === "Closed") {
    return NextResponse.json(problem(400, "Closed", "Cannot add parts to a closed work order.", instance), { status: 400 });
  }

  const kit = await prisma.sparePartKit.findFirst({
    where: { id: body.kitId, deletedAt: null },
    include: { items: { include: { sparePart: true } } },
  });
  if (!kit) {
    return NextResponse.json(problem(404, "Not Found", "Spare part kit not found", instance), { status: 404 });
  }

  const created = await prisma.$transaction(
    kit.items.map((item) =>
      prisma.workOrderSparePart.create({
        data: {
          workOrderId: wo.id,
          sparePartId: item.sparePartId,
          quantity: item.quantity,
          unitCost: item.sparePart.unitCost,
        },
        include: { sparePart: true },
      })
    )
  );

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Create",
    module: "workOrder",
    recordId: wo.id,
    recordType: "WorkOrderSparePart",
    newValue: { appliedKit: kit.name, itemCount: created.length },
    ...requestMeta(req),
  });

  return NextResponse.json(created, { status: 201 });
});
