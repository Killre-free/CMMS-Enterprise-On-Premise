// app/api/v1/work-orders/[id]/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { problem } from "@/lib/utils";

export const GET = withApiHandler(async (_req, { user, params }) => {
  await assertPermission(user.id, "workOrder", "view");
  const found = await prisma.workOrder.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      machine: true,
      requestedBy: true,
      assignedTo: true,
      stateHistory: { orderBy: { changedAt: "asc" }, include: { changedBy: true } },
      partsUsed: { include: { sparePart: true } },
      checkSheetSubmissions: true,
    },
  });
  if (!found) {
    return NextResponse.json(
      problem(404, "Not Found", `Work order ${params.id} was not found`, `/api/v1/work-orders/${params.id}`),
      { status: 404 }
    );
  }
  return NextResponse.json(found);
});
