"use client";
// components/shared/NotificationBell.tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import Link from "next/link";
import { EnablePushButton } from "@/components/shared/EnablePushButton";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "Info" | "Warning" | "Critical";
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

async function fetchNotifications() {
  const res = await fetch("/api/v1/notifications?pageSize=10");
  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json() as Promise<{ data: NotificationItem[]; unreadCount: number }>;
}

export function NotificationBell() {
  const t = useTranslations("Notifications");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications", "bell"],
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
  });

  async function markAllRead() {
    await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markRead(id: string) {
    await fetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Notifications" className="relative">
        <Bell size={18} />
        {Boolean(data?.unreadCount) && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
            {data!.unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-border p-2 text-sm font-medium">
            {t("title")}
            <button onClick={markAllRead} className="text-xs text-primary">
              {t("markAllAsRead")}
            </button>
          </div>
          <EnablePushButton />
          <div className="max-h-80 overflow-y-auto">
            {data?.data.length ? (
              data.data.map((n) => (
                <Link
                  key={n.id}
                  href={n.linkUrl ?? "#"}
                  onClick={() => {
                    if (!n.isRead) markRead(n.id);
                    setOpen(false);
                  }}
                  className={`block border-b border-border p-3 text-sm hover:bg-muted ${n.isRead ? "" : "bg-muted/50 font-medium"}`}
                >
                  <div>{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.message}</div>
                </Link>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">{t("noNotifications")}</div>
            )}
          </div>
          <Link href="/notifications" className="block p-2 text-center text-xs text-primary">
            {t("viewAll")}
          </Link>
        </div>
      )}
    </div>
  );
}
