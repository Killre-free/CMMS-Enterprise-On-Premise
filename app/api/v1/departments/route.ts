// app/api/v1/departments/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

export const GET = withApiHandler(async () => {
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ data: departments });
});
