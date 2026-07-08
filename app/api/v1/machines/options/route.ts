// app/api/v1/machines/options/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";

// Lightweight machine list for pickers (search/scan-to-select dropdowns).
// The full GET /machines endpoint includes department/plant relations and a
// base64 QR code per row, which is unnecessary weight when a caller only
// needs id/code/name for hundreds of machines at once.
export const GET = withApiHandler(async (_req, { user }) => {
  await assertPermission(user.id, "machine", "view");
  const data = await prisma.machine.findMany({
    where: { deletedAt: null },
    select: { id: true, machineCode: true, machineName: true },
    orderBy: { machineCode: "asc" },
  });
  return NextResponse.json({ data });
});
