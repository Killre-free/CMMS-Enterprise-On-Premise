// app/api/v1/spare-parts/[id]/stock/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { stockTransactionSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const POST = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "sparePart", "edit");
  const body = parseOrThrow(stockTransactionSchema, { ...(await req.json()), sparePartId: params.id });
  const instance = `/api/v1/spare-parts/${params.id}/stock`;

  const part = await prisma.sparePart.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!part) {
    return NextResponse.json(problem(404, "Not Found", `Spare part ${params.id} was not found`, instance), { status: 404 });
  }

  const isInbound = body.type === "Receive" || body.type === "Return";
  const delta = isInbound ? body.quantity : -body.quantity;

  if (!isInbound && part.currentStock + delta < 0) {
    return NextResponse.json(
      problem(400, "Insufficient Stock", `Cannot deduct ${body.quantity} ${part.unit}; only ${part.currentStock} in stock.`, instance),
      { status: 400 }
    );
  }

  const [, transaction] = await prisma.$transaction([
    prisma.sparePart.update({
      where: { id: params.id },
      data: { currentStock: { increment: delta }, updatedBy: user.id },
    }),
    prisma.stockTransaction.create({
      data: {
        sparePartId: params.id,
        type: body.type,
        quantity: body.quantity,
        unitCost: body.unitCost,
        referenceType: body.referenceType,
        referenceId: body.referenceId,
        performedById: user.id,
      },
    }),
  ]);

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "StockTransaction",
    module: "sparePart",
    recordId: params.id,
    recordType: "SparePart",
    newValue: { type: body.type, quantity: body.quantity },
    ...requestMeta(req),
  });

  return NextResponse.json(transaction, { status: 201 });
});
