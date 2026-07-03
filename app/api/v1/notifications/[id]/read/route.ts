// app/api/v1/notifications/[id]/read/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { problem } from "@/lib/utils";

export const POST = withApiHandler(async (_req, { user, params }) => {
  const found = await prisma.notification.findFirst({ where: { id: params.id, userId: user.id } });
  if (!found) {
    return NextResponse.json(
      problem(404, "Not Found", "Notification not found", `/api/v1/notifications/${params.id}/read`),
      { status: 404 }
    );
  }
  const updated = await prisma.notification.update({
    where: { id: params.id },
    data: { isRead: true, readAt: new Date() },
  });
  return NextResponse.json(updated);
});
