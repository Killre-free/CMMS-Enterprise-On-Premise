// app/api/v1/reports/maintenance-kpis/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";

// MTTR (Mean Time To Repair) = avg(completedAt - startedAt) over a machine's
// closed work orders. MTBF (Mean Time Between Failures, "MTTF" in common
// shop-floor usage) = avg gap between consecutive work order createdAt
// timestamps for that machine, i.e. how long it typically runs between call-ins.
export const GET = withApiHandler(async (_req, { user }) => {
  await assertPermission(user.id, "reports", "view");

  const machines = await prisma.machine.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      machineCode: true,
      machineName: true,
      workOrders: {
        where: { deletedAt: null },
        select: { createdAt: true, startedAt: true, completedAt: true, closedAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const rows = machines
    .filter((m) => m.workOrders.length > 0)
    .map((m) => {
      const closed = m.workOrders.filter((w) => w.startedAt && w.completedAt);
      const mttrHours =
        closed.length > 0
          ? closed.reduce((sum, w) => sum + (w.completedAt!.getTime() - w.startedAt!.getTime()) / 3600000, 0) /
            closed.length
          : null;

      let mtbfHours: number | null = null;
      if (m.workOrders.length > 1) {
        const gaps: number[] = [];
        for (let i = 1; i < m.workOrders.length; i++) {
          gaps.push((m.workOrders[i].createdAt.getTime() - m.workOrders[i - 1].createdAt.getTime()) / 3600000);
        }
        mtbfHours = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      }

      return {
        machineId: m.id,
        machineCode: m.machineCode,
        machineName: m.machineName,
        workOrderCount: m.workOrders.length,
        mttrHours: mttrHours !== null ? Math.round(mttrHours * 10) / 10 : null,
        mtbfHours: mtbfHours !== null ? Math.round(mtbfHours * 10) / 10 : null,
      };
    });

  const overallMttr = rows.filter((r) => r.mttrHours !== null);
  const overallMtbf = rows.filter((r) => r.mtbfHours !== null);

  return NextResponse.json({
    data: rows,
    summary: {
      avgMttrHours:
        overallMttr.length > 0
          ? Math.round((overallMttr.reduce((s, r) => s + r.mttrHours!, 0) / overallMttr.length) * 10) / 10
          : null,
      avgMtbfHours:
        overallMtbf.length > 0
          ? Math.round((overallMtbf.reduce((s, r) => s + r.mtbfHours!, 0) / overallMtbf.length) * 10) / 10
          : null,
    },
  });
});
