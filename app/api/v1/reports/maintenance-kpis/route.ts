// app/api/v1/reports/maintenance-kpis/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { assertPermission } from "@/lib/permissions";
import { computeMaintenanceKpis } from "@/lib/maintenance-kpis";

export const GET = withApiHandler(async (_req, { user }) => {
  await assertPermission(user.id, "reports", "view");
  const { rows, summary } = await computeMaintenanceKpis();
  return NextResponse.json({ data: rows, summary });
});
