// app/api/v1/spare-parts/options/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";

// Lightweight spare part list for pickers — see machines/options/route.ts.
export const GET = withApiHandler(async (_req, { user }) => {
  await assertPermission(user.id, "sparePart", "view");
  const data = await prisma.sparePart.findMany({
    where: { deletedAt: null },
    select: { id: true, partCode: true, partName: true, unit: true },
    orderBy: { partCode: "asc" },
  });
  return NextResponse.json({ data });
});
