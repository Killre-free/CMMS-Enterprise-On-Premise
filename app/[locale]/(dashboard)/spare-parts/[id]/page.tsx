"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface SparePartDetail {
  id: string;
  partCode: string;
  partName: string;
  unit: string;
  currentStock: number;
  safetyStock: number;
  unitCost: number | null;
  transactions: {
    id: string;
    type: string;
    quantity: number;
    createdAt: string;
  }[];
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const TX_TYPES = ["Receive", "Issue", "Return", "Adjustment"];

export default function SparePartDetailPage() {
  const tr = useTranslations("SparePartDetail");
  const tc = useTranslations("Common");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [type, setType] = useState("Receive");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({ partName: "", unit: "", safetyStock: "", unitCost: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: part, isLoading } = useQuery({
    queryKey: ["spare-part", id],
    queryFn: () => apiGet<SparePartDetail>(`/api/v1/spare-parts/${id}`),
  });

  if (isLoading || !part) {
    return <p className="text-sm text-muted-foreground">{tr("loading")}</p>;
  }

  function startEdit() {
    if (!part) return;
    setEditFields({
      partName: part.partName,
      unit: part.unit,
      safetyStock: String(part.safetyStock),
      unitCost: part.unitCost !== null ? String(part.unitCost) : "",
    });
    setEditError(null);
    setEditing(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    setSaving(true);
    try {
      await apiPatch(`/api/v1/spare-parts/${id}`, {
        partName: editFields.partName,
        unit: editFields.unit,
        safetyStock: Number(editFields.safetyStock),
        unitCost: editFields.unitCost ? Number(editFields.unitCost) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["spare-part", id] });
      queryClient.invalidateQueries({ queryKey: ["spare-parts"] });
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : tr("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePart() {
    if (!window.confirm(tr("confirmDelete"))) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/v1/spare-parts/${id}`);
      queryClient.invalidateQueries({ queryKey: ["spare-parts"] });
      router.push("/spare-parts");
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : tr("deleteFailed"));
      setDeleting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost(`/api/v1/spare-parts/${id}/stock`, { type, quantity: Number(quantity) });
      setQuantity("");
      queryClient.invalidateQueries({ queryKey: ["spare-part", id] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("recordFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push("/spare-parts")}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> {tr("backToSpareParts")}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <h1 className="text-xl font-semibold">
          {part.partCode} — {part.partName}
        </h1>
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Pencil size={16} /> {tc("edit")}
            </button>
          )}
          <button
            onClick={handleDeletePart}
            disabled={deleting}
            className="flex items-center gap-1 rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 size={16} /> {tc("delete")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-lg border border-border bg-background p-4">
            {editing ? (
              <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">{tr("partName")}</label>
                    <input
                      required
                      value={editFields.partName}
                      onChange={(e) => setEditFields((f) => ({ ...f, partName: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{tr("unit")}</label>
                    <input
                      required
                      value={editFields.unit}
                      onChange={(e) => setEditFields((f) => ({ ...f, unit: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{tr("safetyStock")}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={editFields.safetyStock}
                      onChange={(e) => setEditFields((f) => ({ ...f, safetyStock: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{tr("unitCost")}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editFields.unitCost}
                      onChange={(e) => setEditFields((f) => ({ ...f, unitCost: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                </div>
                {editError && <p className="text-sm text-destructive">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? tc("saving") : tc("save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="w-fit rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    {tc("cancel")}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <dt className="text-muted-foreground">{tr("currentStock")}</dt>
                <dd className="sm:col-span-2">
                  {part.currentStock} {part.unit}
                </dd>
                <dt className="text-muted-foreground">{tr("safetyStock")}</dt>
                <dd className="sm:col-span-2">
                  {part.safetyStock} {part.unit}
                </dd>
                <dt className="text-muted-foreground">{tr("unitCost")}</dt>
                <dd className="sm:col-span-2">{part.unitCost ?? "—"}</dd>
              </dl>
            )}
            {editError && !editing && <p className="mt-2 text-sm text-destructive">{editError}</p>}
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <h2 className="mb-2 text-sm font-medium">{tr("stockCard")}</h2>
            {part.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr("noTransactionsYet")}</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="py-2 font-medium">{tr("type")}</th>
                    <th className="py-2 font-medium">{tr("quantity")}</th>
                    <th className="py-2 font-medium">{tr("date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {part.transactions.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="py-2">{t.type}</td>
                      <td className="py-2">{t.quantity}</td>
                      <td className="py-2 text-muted-foreground">{formatDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <h2 className="mb-2 text-sm font-medium">{tr("recordStockTransaction")}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              {TX_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              placeholder={tr("quantity")}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {submitting ? tr("saving") : tr("recordTransaction")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
