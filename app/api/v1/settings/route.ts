// app/api/v1/settings/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { systemSettingsUpdateSchema, parseOrThrow } from "@/lib/validators";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const GET = withApiHandler(async (_req, { user }) => {
  await assertPermission(user.id, "settings", "view");
  const settings = await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return NextResponse.json(settings);
});

export const PATCH = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "settings", "edit");
  const body = parseOrThrow(systemSettingsUpdateSchema, await req.json());

  const updated = await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: body,
    create: { id: "singleton", ...body },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Edit",
    module: "settings",
    recordId: "singleton",
    recordType: "SystemSettings",
    newValue: body,
    ...requestMeta(req),
  });

  return NextResponse.json(updated);
});
