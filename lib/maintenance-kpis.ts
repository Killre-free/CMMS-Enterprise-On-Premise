// lib/maintenance-kpis.ts
import { prisma } from "@/lib/prisma";

export interface MachineKpiRow {
  machineId: string;
  machineCode: string;
  machineName: string;
  workOrderCount: number;
  mttrHours: number | null;
  mtbfHours: number | null;
  availabilityPercent: number | null;
}

export interface MaintenanceKpiSummary {
  avgMttrHours: number | null;
  avgMtbfHours: number | null;
  avgAvailabilityPercent: number | null;
}

// MTTR (Mean Time To Repair) = avg(completedAt - startedAt) over a machine's
// closed work orders. MTBF (Mean Time Between Failures, "MTTF" in common
// shop-floor usage) = avg gap between consecutive work order createdAt
// timestamps for that machine. Availability = MTBF / (MTBF + MTTR).
export async function computeMaintenanceKpis(): Promise<{ rows: MachineKpiRow[]; summary: MaintenanceKpiSummary }> {
  const machines = await prisma.machine.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      machineCode: true,
      machineName: true,
      workOrders: {
        where: { deletedAt: null },
        select: { createdAt: true, startedAt: true, completedAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const rows: MachineKpiRow[] = machines
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

      const availabilityPercent =
        mtbfHours !== null && mttrHours !== null && mtbfHours + mttrHours > 0
          ? Math.round((mtbfHours / (mtbfHours + mttrHours)) * 1000) / 10
          : null;

      return {
        machineId: m.id,
        machineCode: m.machineCode,
        machineName: m.machineName,
        workOrderCount: m.workOrders.length,
        mttrHours: mttrHours !== null ? Math.round(mttrHours * 10) / 10 : null,
        mtbfHours: mtbfHours !== null ? Math.round(mtbfHours * 10) / 10 : null,
        availabilityPercent,
      };
    });

  const overallMttr = rows.filter((r) => r.mttrHours !== null);
  const overallMtbf = rows.filter((r) => r.mtbfHours !== null);
  const overallAvailability = rows.filter((r) => r.availabilityPercent !== null);

  return {
    rows,
    summary: {
      avgMttrHours:
        overallMttr.length > 0
          ? Math.round((overallMttr.reduce((s, r) => s + r.mttrHours!, 0) / overallMttr.length) * 10) / 10
          : null,
      avgMtbfHours:
        overallMtbf.length > 0
          ? Math.round((overallMtbf.reduce((s, r) => s + r.mtbfHours!, 0) / overallMtbf.length) * 10) / 10
          : null,
      avgAvailabilityPercent:
        overallAvailability.length > 0
          ? Math.round(
              (overallAvailability.reduce((s, r) => s + r.availabilityPercent!, 0) / overallAvailability.length) * 10
            ) / 10
          : null,
    },
  };
}
