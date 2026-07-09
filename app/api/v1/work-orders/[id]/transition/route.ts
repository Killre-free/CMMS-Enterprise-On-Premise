// app/api/v1/work-orders/[id]/transition/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { workOrderTransitionSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { notify } from "@/lib/notify";
import type { WorkOrderStatus } from "@prisma/client";

// Allowed forward transitions per WORK ORDER workflow states. Not a strict
// linear chain — several branches (Waiting Spare Part / Maker / Production /
// Budget Approval) can occur from InProgress and return to it.
const ALLOWED_NEXT: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  ProductionRequest: ["WaitingTechnician"],
  WaitingTechnician: ["Accepted"],
  Accepted: ["InProgress"],
  InProgress: [
    "WaitingSparePart",
    "WaitingMaker",
    "WaitingProduction",
    "WaitingBudgetApproval",
    "Completed",
  ],
  WaitingSparePart: ["InProgress"],
  WaitingMaker: ["InProgress"],
  WaitingProduction: ["InProgress"],
  WaitingBudgetApproval: ["InProgress"],
  Completed: ["WaitingApproval", "Closed"],
  WaitingApproval: ["Closed", "InProgress"], // rejection sends back to InProgress
  Closed: [],
};

export const POST = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "workOrder", "edit");
  const body = parseOrThrow(workOrderTransitionSchema, await req.json());
  const instance = `/api/v1/work-orders/${params.id}/transition`;

  const wo = await prisma.workOrder.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { machine: true, requestedBy: true, assignedTo: true },
  });
  if (!wo) {
    return NextResponse.json(problem(404, "Not Found", `Work order ${params.id} was not found`, instance), { status: 404 });
  }

  // Optimistic concurrency check.
  if (wo.version !== body.version) {
    return NextResponse.json(
      problem(409, "Conflict", "This work order was modified by someone else. Please refresh and try again.", instance),
      { status: 409 }
    );
  }

  const allowed = ALLOWED_NEXT[wo.status] ?? [];
  if (!allowed.includes(body.toStatus)) {
    return NextResponse.json(
      problem(400, "Invalid Transition", `Cannot move from ${wo.status} to ${body.toStatus}`, instance),
      { status: 400 }
    );
  }

  // Business rule: completion photo mandatory before moving to Completed.
  if (body.toStatus === "Completed" && (!body.photos || body.photos.length < 1)) {
    return NextResponse.json(
      problem(400, "Photo Required", "At least 1 completion photo is required to complete this work order.", instance),
      { status: 400 }
    );
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {
      status: body.toStatus,
      version: { increment: 1 },
      updatedBy: user.id,
    };
    if (body.toStatus === "Accepted" && !wo.startedAt) updateData.startedAt = now;
    if (body.toStatus === "InProgress" && !wo.startedAt) updateData.startedAt = now;
    if (body.toStatus === "Completed") {
      updateData.completedAt = now;
      updateData.completionPhotos = { push: body.photos } as any;
      if (body.rootCauseWhys && body.rootCauseWhys.some((w) => w.trim().length > 0)) {
        updateData.rootCauseWhys = body.rootCauseWhys.filter((w) => w.trim().length > 0);
      }
      if (body.rootCause) updateData.rootCause = body.rootCause;
    }
    if (body.toStatus === "Closed") {
      updateData.closedAt = now;
    }

    const wUpdated = await tx.workOrder.update({
      where: { id: wo.id, version: wo.version },
      data: updateData as any,
    });

    await tx.workOrderStateHistory.create({
      data: {
        workOrderId: wo.id,
        fromStatus: wo.status,
        toStatus: body.toStatus,
        changedById: user.id,
        comment: body.comment,
        photos: body.photos ?? [],
        videos: body.videos ?? [],
        voiceNotes: body.voiceNotes ?? [],
        gpsLatitude: body.gpsLatitude,
        gpsLongitude: body.gpsLongitude,
      },
    });

    // Auto stock deduction on close: consume any WorkOrderSparePart lines
    // that haven't been deducted yet (idempotent — StockTransaction is the
    // ledger; re-running a close attempt won't double-deduct because the
    // transition itself is already blocked by version conflict).
    if (body.toStatus === "Closed") {
      const parts = await tx.workOrderSparePart.findMany({ where: { workOrderId: wo.id } });
      for (const p of parts) {
        await tx.sparePart.update({
          where: { id: p.sparePartId },
          data: { currentStock: { decrement: p.quantity } },
        });
        await tx.stockTransaction.create({
          data: {
            sparePartId: p.sparePartId,
            type: "Issue",
            quantity: p.quantity,
            unitCost: p.unitCost,
            referenceType: "WorkOrder",
            referenceId: wo.id,
            performedById: user.id,
          },
        });
        const part = await tx.sparePart.findUnique({ where: { id: p.sparePartId } });
        if (part && part.currentStock < part.safetyStock) {
          const existing = await tx.reorderSuggestion.findFirst({
            where: { sparePartId: part.id, status: "Pending" },
          });
          if (!existing) {
            await tx.reorderSuggestion.create({
              data: {
                sparePartId: part.id,
                suggestedQty: Math.max(part.maxStock ?? part.safetyStock * 2, part.safetyStock) - part.currentStock,
                reason: "BelowSafetyStock",
                status: "Pending",
              },
            });
          }
        }
      }
    }

    return wUpdated;
  });

  // ── Notification routing per WORK ORDER > Notification Triggers table ──
  // "Golden Hour" alert: fire the moment a job becomes actionable for a
  // technician (i.e. the Accept button appears), not just at creation —
  // this is the trigger that actually shortens MTTR.
  if (body.toStatus === "WaitingTechnician") {
    const recipients = wo.assignedToId
      ? [wo.assignedToId]
      : (
          await prisma.user.findMany({
            where: {
              deletedAt: null,
              isActive: true,
              departmentId: wo.machine.departmentId ?? undefined,
              role: { name: "Technician" },
            },
            select: { id: true },
          })
        ).map((u) => u.id);

    await notify({
      userIds: recipients,
      title: `Work Order ${wo.woNumber} ready for pickup`,
      message: `${wo.title} — ${wo.machine.machineName} is waiting for a technician.`,
      module: "workOrder",
      linkUrl: `/work-orders/${wo.id}`,
    });
  }

  if (body.toStatus === "Accepted") {
    await notify({
      userIds: [wo.requestedById],
      title: `Work Order ${wo.woNumber} accepted`,
      message: `${wo.title} has been accepted by a technician.`,
      module: "workOrder",
      linkUrl: `/work-orders/${wo.id}`,
    });
  }

  if (body.toStatus === "Completed") {
    const [requester, assignee] = await Promise.all([
      prisma.user.findUnique({ where: { id: wo.requestedById } }),
      wo.assignedToId ? prisma.user.findUnique({ where: { id: wo.assignedToId } }) : null,
    ]);
    const recipients = [
      wo.requestedById,
      ...(requester?.supervisorId ? [requester.supervisorId] : []),
      ...(assignee?.supervisorId ? [assignee.supervisorId] : []),
    ];
    await notify({
      userIds: recipients,
      title: `Work Order ${wo.woNumber} completed`,
      message: `${wo.title} has been completed with photo evidence.`,
      module: "workOrder",
      linkUrl: `/work-orders/${wo.id}`,
      sendEmail: true,
    });
  }

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Edit",
    module: "workOrder",
    recordId: wo.id,
    recordType: "WorkOrder",
    oldValue: { status: wo.status, version: wo.version },
    newValue: { status: updated.status, version: updated.version },
    ...requestMeta(req),
  });

  return NextResponse.json(updated);
});
