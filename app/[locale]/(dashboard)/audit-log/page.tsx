"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("AuditLog");
  const tc = useTranslations("Common");
  const [module, setModule] = useState("");

  const params = new URLSearchParams({ pageSize: "50" });
  if (module) params.set("module", module);

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-log", module],
    queryFn: () => apiGet<Page<AuditLogRow>>(`/api/v1/audit-logs?${params.toString()}`),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

      <select value={module} onChange={(e) => setModule(e.target.value)} className={`${inputClass} w-auto`}>
        <option value="">{t("allModules")}</option>
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
              <th className="p-3 font-medium">{tc("date")}</th>
              <th className="p-3 font-medium">{t("user")}</th>
              <th className="p-3 font-medium">{t("action")}</th>
              <th className="p-3 font-medium">{t("module")}</th>
              <th className="p-3 font-medium">{t("record")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  {tc("loading")}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-destructive">
                  {t("loadFailed")}
                </td>
              </tr>
            )}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  {t("noEntriesYet")}
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
