"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { apiGet, apiPost, apiPatch, type Page } from "@/lib/api-client";
import { Badge, NOTIFICATION_TYPE_COLOR } from "@/components/shared/Badge";
import { formatDate } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "Info" | "Warning" | "Critical";
  module: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [module, setModule] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const queryClient = useQueryClient();

  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (module) params.set("module", module);
  if (unreadOnly) params.set("unreadOnly", "true");

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications", page, module, unreadOnly],
    queryFn: () => apiGet<Page<NotificationItem> & { unreadCount: number }>(`/api/v1/notifications?${params.toString()}`),
  });

  async function markRead(id: string) {
    await apiPost(`/api/v1/notifications/${id}/read`, {});
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markAllRead() {
    await apiPatch("/api/v1/notifications", { markAllRead: true });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          Notifications
          {Boolean(data?.unreadCount) && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({data!.unreadCount} unread)
            </span>
          )}
        </h1>
        <button
          onClick={markAllRead}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <CheckCheck size={16} /> Mark all as read
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={module}
          onChange={(e) => {
            setPage(1);
            setModule(e.target.value);
          }}
          className={`${inputClass} w-auto`}
        >
          <option value="">All modules</option>
          {["workOrder", "pm", "machine", "sparePart", "checkSheet", "users"].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setPage(1);
              setUnreadOnly(e.target.checked);
            }}
          />
          Unread only
        </label>
      </div>

      <div className="rounded-lg border border-border">
        {isLoading && <div className="p-6 text-center text-muted-foreground">Loading...</div>}
        {error && <div className="p-6 text-center text-destructive">Failed to load notifications.</div>}
        {data?.data.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">No notifications.</div>
        )}
        {data?.data.map((n) => (
          <Link
            key={n.id}
            href={n.linkUrl ?? "#"}
            onClick={() => !n.isRead && markRead(n.id)}
            className={`flex items-start justify-between gap-3 border-b border-border p-4 text-sm last:border-0 hover:bg-muted/50 ${
              n.isRead ? "" : "bg-muted/50"
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Badge color={NOTIFICATION_TYPE_COLOR[n.type]}>{n.type}</Badge>
                <span className={n.isRead ? "" : "font-semibold"}>{n.title}</span>
              </div>
              <p className="text-muted-foreground">{n.message}</p>
              <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
            </div>
            {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
          </Link>
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
