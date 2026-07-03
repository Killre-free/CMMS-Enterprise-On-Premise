// app/api/v1/dashboard/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

export const GET = withApiHandler(async (_req, { user }) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const isTechnicianScoped = user.roleName === "Technician" && !user.isSuperAdmin;
  const scopeFilter = isTechnicianScoped
    ? { OR: [{ requestedById: user.id }, { assignedToId: user.id }] }
    : {};

  const [
    breakdownCount,
    breakdownYesterday,
    woPendingCount,
    woPendingToday,
    pmDueToday,
    pmCompletedToday,
    partsBelowSafety,
    woByStatus,
    closedThisWeek,
  ] = await Promise.all([
    prisma.workOrder.count({
      where: { deletedAt: null, priority: "Critical", status: { notIn: ["Closed"] }, ...scopeFilter },
    }),
    prisma.workOrder.count({
      where: {
        deletedAt: null,
        priority: "Critical",
        createdAt: { gte: new Date(Date.now() - 2 * 86400000), lt: new Date(Date.now() - 86400000) },
      },
    }),
    prisma.workOrder.count({ where: { deletedAt: null, status: { notIn: ["Closed"] }, ...scopeFilter } }),
    prisma.workOrder.count({ where: { deletedAt: null, createdAt: { gte: startOfToday }, ...scopeFilter } }),
    prisma.pMPlan.count({ where: { deletedAt: null, isActive: true, nextDueAt: { lte: new Date() } } }),
    prisma.pMPlan.count({
      where: { deletedAt: null, isActive: true, lastGeneratedAt: { gte: startOfToday } },
    }),
    prisma.sparePart
      .findMany({ where: { deletedAt: null } })
      .then((parts) => parts.filter((p) => p.currentStock < p.safetyStock).length),
    prisma.workOrder.groupBy({ by: ["status"], where: { deletedAt: null, ...scopeFilter }, _count: true }),
    prisma.workOrder.findMany({
      where: { deletedAt: null, closedAt: { gte: sevenDaysAgo } },
      select: { closedAt: true, startedAt: true, completedAt: true },
    }),
  ]);

  // MTTR (hours) = avg(completedAt - startedAt) over WOs completed in the last 7 days.
  const mttrSamples = closedThisWeek.filter((w) => w.startedAt && w.completedAt);
  const mttrHours =
    mttrSamples.length > 0
      ? mttrSamples.reduce(
          (sum, w) => sum + (w.completedAt!.getTime() - w.startedAt!.getTime()) / 3600000,
          0
        ) / mttrSamples.length
      : 0;

  // Downtime bar chart: last 7 days, hours of open WO time per day.
  const downtimeByDay: { date: string; hours: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayWOs = await prisma.workOrder.findMany({
      where: { deletedAt: null, createdAt: { gte: dayStart, lt: dayEnd } },
      select: { createdAt: true, closedAt: true },
    });
    const hours = dayWOs.reduce((sum, w) => {
      const end = w.closedAt ?? new Date();
      return sum + (end.getTime() - w.createdAt.getTime()) / 3600000;
    }, 0);
    downtimeByDay.push({ date: dayStart.toISOString().slice(0, 10), hours: Math.round(hours * 10) / 10 });
  }

  return NextResponse.json({
    kpiCards: {
      breakdownCount,
      breakdownTrendVsYesterday: breakdownCount - breakdownYesterday,
      woPendingCount,
      woPendingNewToday: woPendingToday,
      pmDueToday,
      pmCompletedToday,
      mttrHours: Math.round(mttrHours * 10) / 10,
      budgetUsedPercent: null, // Budget module ships in Phase 2 — no data source yet
      partsBelowSafetyStock: partsBelowSafety,
    },
    downtimeChart: downtimeByDay,
    woStatusDonut: woByStatus.map((g) => ({ status: g.status, count: g._count })),
  });
});
