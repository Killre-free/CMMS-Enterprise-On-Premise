"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiGet, apiPatch, ApiError, type Page } from "@/lib/api-client";
import { Badge } from "@/components/shared/Badge";
import { formatDate } from "@/lib/utils";

interface ReorderSuggestion {
  id: string;
  suggestedQty: number;
  reason: string;
  status: string;
  createdAt: string;
  sparePart: { partCode: string; partName: string; unit: string; currentStock: number; safetyStock: number };
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const STATUS_COLOR: Record<string, "gray" | "green" | "yellow" | "red"> = {
  Pending: "yellow",
  Approved: "green",
  Rejected: "red",
  Ordered: "gray",
};

export default function ReorderSuggestionsPage() {
  const t = useTranslations("ReorderSuggestions");
  const tc = useTranslations("Common");
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("Pending");
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (status) params.set("status", status);

  const { data, isLoading } = useQuery({
    queryKey: ["reorder-suggestions", status],
    queryFn: () => apiGet<Page<ReorderSuggestion>>(`/api/v1/reorder-suggestions?${params.toString()}`),
  });

  async function updateStatus(id: string, newStatus: "Approved" | "Rejected" | "Ordered") {
    setError(null);
    setUpdatingId(id);
    try {
      await apiPatch(`/api/v1/reorder-suggestions/${id}`, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["reorder-suggestions"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("updateFailed"));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} w-auto`}>
        <option value="">{t("allStatuses")}</option>
        <option value="Pending">{t("statusPending")}</option>
        <option value="Approved">{t("statusApproved")}</option>
        <option value="Rejected">{t("statusRejected")}</option>
        <option value="Ordered">{t("statusOrdered")}</option>
      </select>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-3 font-medium">{t("part")}</th>
              <th className="p-3 font-medium">{t("currentStock")}</th>
              <th className="p-3 font-medium">{t("safetyStock")}</th>
              <th className="p-3 font-medium">{t("suggestedQty")}</th>
              <th className="p-3 font-medium">{tc("status")}</th>
              <th className="p-3 font-medium">{tc("created")}</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  {tc("loading")}
                </td>
              </tr>
            )}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  {t("noneFound")}
                </td>
              </tr>
            )}
            {data?.data.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  {s.sparePart.partCode} — {s.sparePart.partName}
                </td>
                <td className="p-3">
                  {s.sparePart.currentStock} {s.sparePart.unit}
                </td>
                <td className="p-3">
                  {s.sparePart.safetyStock} {s.sparePart.unit}
                </td>
                <td className="p-3">
                  {s.suggestedQty} {s.sparePart.unit}
                </td>
                <td className="p-3">
                  <Badge color={STATUS_COLOR[s.status]}>{s.status}</Badge>
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(s.createdAt)}</td>
                <td className="p-3">
                  {s.status === "Pending" && (
                    <div className="flex gap-2">
                      <button
                        disabled={updatingId === s.id}
                        onClick={() => updateStatus(s.id, "Approved")}
                        className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      >
                        {t("approve")}
                      </button>
                      <button
                        disabled={updatingId === s.id}
                        onClick={() => updateStatus(s.id, "Rejected")}
                        className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      >
                        {t("reject")}
                      </button>
                    </div>
                  )}
                  {s.status === "Approved" && (
                    <button
                      disabled={updatingId === s.id}
                      onClick={() => updateStatus(s.id, "Ordered")}
                      className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                    >
                      {t("markOrdered")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
