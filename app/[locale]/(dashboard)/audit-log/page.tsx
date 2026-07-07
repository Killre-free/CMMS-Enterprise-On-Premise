"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, type Page } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface AuditLogRow {
  id: string;
  username: string | null;
  action: string;
  module: string;
  recordType: string | null;
  recordId: string | null;
  createdAt: string;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

export default function AuditLogPage() {
  const [module, setModule] = useState("");

  const params = new URLSearchParams({ pageSize: "50" });
  if (module) params.set("module", module);

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-log", module],
    queryFn: () => apiGet<Page<AuditLogRow>>(`/api/v1/audit-logs?${params.toString()}`),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Audit Log</h1>

      <select value={module} onChange={(e) => setModule(e.target.value)} className={`${inputClass} w-auto`}>
        <option value="">All modules</option>
        {["auth", "workOrder", "machine", "pm", "checkSheet", "sparePart", "users", "settings"].map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">User</th>
              <th className="p-3 font-medium">Action</th>
              <th className="p-3 font-medium">Module</th>
              <th className="p-3 font-medium">Record</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-destructive">
                  Failed to load audit log.
                </td>
              </tr>
            )}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No audit log entries yet.
                </td>
              </tr>
            )}
            {data?.data.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-3 text-muted-foreground">{formatDate(row.createdAt)}</td>
                <td className="p-3">{row.username ?? "—"}</td>
                <td className="p-3">{row.action}</td>
                <td className="p-3">{row.module}</td>
                <td className="p-3">{row.recordType ? `${row.recordType} (${row.recordId})` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
