// app/api/v1/settings/public/route.ts
// Unauthenticated subset of System Settings needed to brand the login page
// (company name/logo) before a session exists. Deliberately excludes
// anything sensitive — only companyName/logoUrl are exposed.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
    select: { companyName: true, logoUrl: true },
  });
  return NextResponse.json(settings);
}
