// app/api/v1/work-orders/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { workOrderCreateSchema, parseOrThrow } from "@/lib/validators";
import { paginationParams, buildWoNumber } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const GET = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "workOrder", "view");
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = paginationParams(url.searchParams);
  const status = url.searchParams.get("status") ?? undefined;
  const priority = url.searchParams.get("priority") ?? undefined;
  const machineId = url.searchParams.get("machineId") ?? undefined;

  // Technicians see only their own WOs (requested or assigned); managers/admins see all.
  const isTechnicianScoped = user.roleName === "Technician" && !user.isSuperAdmin;

  const where = {
    deletedAt: null,
    ...(status ? { status: status as any } : {}),
    ...(priority ? { priority: priority as any } : {}),
    ...(machineId ? { machineId } : {}),
    ...(isTechnicianScoped
      ? { OR: [{ requestedById: user.id }, { assignedToId: user.id }] }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      skip,
      take,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      include: { machine: true, requestedBy: true, assignedTo: true },
    }),
    prisma.workOrder.count({ where }),
  ]);

  return NextResponse.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
});

export const POST = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "workOrder", "add");
  const body = parseOrThrow(workOrderCreateSchema, await req.json());

  const machine = await prisma.machine.findFirst({ where: { id: body.machineId, deletedAt: null } });
  if (!machine) {
    return NextResponse.json(
      { type: "https://cmms.app/errors/not-found", title: "Not Found", status: 404, detail: "Machine not found", instance: "/api/v1/work-orders" },
      { status: 404 }
    );
  }

  const countThisMonth = await prisma.workOrder.count({
    where: {
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });
  const woNumber = buildWoNumber(countThisMonth + 1);

  const created = await prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.create({
      data: {
        woNumber,
        title: body.title,
        description: body.description,
        priority: body.priority,
        status: "ProductionRequest",
        machineId: body.machineId,
        requestedById: user.id,
        assignedToId: body.assignedToId,
        estimatedHours: body.estimatedHours,
        reportPhotos: body.reportPhotos,
        createdBy: user.id,
      },
    });
    await tx.workOrderStateHistory.create({
      data: {
        workOrderId: wo.id,
        toStatus: "ProductionRequest",
        changedById: user.id,
        photos: body.reportPhotos,
      },
    });
    return wo;
  });

  // Notify: assignee if pre-assigned, otherwise all technicians in the machine's department.
  const recipients = body.assignedToId
    ? [body.assignedToId]
    : (
        await prisma.user.findMany({
          where: {
            deletedAt: null,
            isActive: true,
            departmentId: machine.departmentId ?? undefined,
            role: { name: "Technician" },
          },
          select: { id: true },
        })
      ).map((u) => u.id);

  await notify({
    userIds: recipients,
    title: `New Work Order: ${created.woNumber}`,
    message: `${created.title} — ${machine.machineName}`,
    module: "workOrder",
    linkUrl: `/work-orders/${created.id}`,
    type: created.priority === "Critical" ? "Critical" : "Info",
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Create",
    module: "workOrder",
    recordId: created.id,
    recordType: "WorkOrder",
    newValue: { woNumber: created.woNumber },
    ...requestMeta(req),
  });

  return NextResponse.json(created, { status: 201 });
});
