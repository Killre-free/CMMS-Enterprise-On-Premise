// app/api/v1/spare-part-kits/options/route.ts
// Lightweight list for pickers (e.g. "Apply Kit" on a work order) — avoids
// fetching full kit + item + spare-part payloads just to populate a dropdown.
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";

export const GET = withApiHandler(async (_req, { user }) => {
  await assertPermission(user.id, "sparePart", "view");
  const kits = await prisma.sparePartKit.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: kits });
});
