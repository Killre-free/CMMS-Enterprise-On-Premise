// app/api/v1/notifications/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { paginationParams } from "@/lib/utils";

export const GET = withApiHandler(async (req, { user }) => {
  const url = new URL(req.url);
  const { page, pageSize, skip, take } = paginationParams(url.searchParams);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const moduleFilter = url.searchParams.get("module") ?? undefined;

  const where = {
    userId: user.id,
    deletedAt: null,
    ...(unreadOnly ? { isRead: false } : {}),
    ...(moduleFilter ? { module: moduleFilter } : {}),
  };

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, isRead: false, deletedAt: null } }),
  ]);

  return NextResponse.json({
    data,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    unreadCount,
  });
});

export const PATCH = withApiHandler(async (req, { user }) => {
  const body = await req.json().catch(() => ({}));
  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false, detail: "No action specified" }, { status: 400 });
});
