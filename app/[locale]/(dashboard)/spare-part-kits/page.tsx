"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Plus, Trash2, X } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError, type Page } from "@/lib/api-client";
import { SearchPicker } from "@/components/shared/SearchPicker";

interface KitItem {
  id: string;
  quantity: number;
  sparePart: { id: string; partCode: string; partName: string; unit: string };
}

interface Kit {
  id: string;
  name: string;
  description: string | null;
  items: KitItem[];
}

interface SparePart {
  id: string;
  partCode: string;
  partName: string;
  unit: string;
}

interface DraftItem {
  sparePartId: string;
  code: string;
  label: string;
  quantity: string;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

export default function SparePartKitsPage() {
  const t = useTranslations("SparePartKits");
  const tc = useTranslations("Common");
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [itemPartId, setItemPartId] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["spare-part-kits"],
    queryFn: () => apiGet<Page<Kit>>("/api/v1/spare-part-kits?pageSize=100"),
  });

  const { data: spareParts } = useQuery({
    queryKey: ["spare-parts", "options"],
    queryFn: () => apiGet<{ data: SparePart[] }>("/api/v1/spare-parts/options"),
  });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setDraftItems([]);
    setItemPartId("");
    setItemQty("1");
    setError(null);
  }

  function startEdit(kit: Kit) {
    setEditingId(kit.id);
    setName(kit.name);
    setDescription(kit.description ?? "");
    setDraftItems(
      kit.items.map((it) => ({
        sparePartId: it.sparePart.id,
        code: it.sparePart.partCode,
        label: it.sparePart.partName,
        quantity: String(it.quantity),
      }))
    );
    setShowForm(true);
  }

  function addDraftItem() {
    if (!itemPartId) return;
    const part = spareParts?.data.find((p) => p.id === itemPartId);
    if (!part) return;
    if (draftItems.some((d) => d.sparePartId === itemPartId)) return;
    setDraftItems((prev) => [...prev, { sparePartId: part.id, code: part.partCode, label: part.partName, quantity: itemQty }]);
    setItemPartId("");
    setItemQty("1");
  }

  function removeDraftItem(sparePartId: string) {
    setDraftItems((prev) => prev.filter((d) => d.sparePartId !== sparePartId));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name || draftItems.length === 0) return;
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        items: draftItems.map((d) => ({ sparePartId: d.sparePartId, quantity: Number(d.quantity) })),
      };
      if (editingId) {
        await apiPatch(`/api/v1/spare-part-kits/${editingId}`, payload);
      } else {
        await apiPost("/api/v1/spare-part-kits", payload);
      }
      queryClient.invalidateQueries({ queryKey: ["spare-part-kits"] });
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/v1/spare-part-kits/${id}`);
      queryClient.invalidateQueries({ queryKey: ["spare-part-kits"] });
    } catch {
      // best-effort
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus size={16} /> {t("newKit")}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{editingId ? t("editKit") : t("newKit")}</h2>
            <button type="button" onClick={resetForm} aria-label={tc("cancel")} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          <input
            placeholder={t("kitName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
          <textarea
            placeholder={t("kitDescriptionOptional")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            rows={2}
          />

          <div className="rounded-md border border-border p-3">
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">{t("partsInKit")}</h3>
            {draftItems.length === 0 ? (
              <p className="mb-2 text-sm text-muted-foreground">{t("noPartsAddedYet")}</p>
            ) : (
              <ul className="mb-2 flex flex-col gap-2">
                {draftItems.map((d) => (
                  <li key={d.sparePartId} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                    <span>
                      {d.code} — {d.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{d.quantity}</span>
                      <button type="button" onClick={() => removeDraftItem(d.sparePartId)} aria-label={t("removePart")} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1">
                <SearchPicker
                  items={(spareParts?.data ?? []).map((p) => ({ id: p.id, code: p.partCode, label: p.partName }))}
                  value={itemPartId}
                  onChange={setItemPartId}
                  placeholder={t("searchOrScanPart")}
                  noResultsText={t("noPartsFound")}
                  changeLabel={t("changePart")}
                />
              </div>
              <input
                type="number"
                min="0.01"
                step="any"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                className={`${inputClass} w-24`}
                aria-label={t("quantity")}
              />
              <button
                type="button"
                onClick={addDraftItem}
                disabled={!itemPartId}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {t("addPart")}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !name || draftItems.length === 0}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? tc("saving") : tc("save")}
            </button>
            <button type="button" onClick={resetForm} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              {tc("cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-3 font-medium">{t("kitName")}</th>
              <th className="p-3 font-medium">{t("partsInKit")}</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-muted-foreground">
                  {tc("loading")}
                </td>
              </tr>
            )}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-muted-foreground">
                  {t("noneFound")}
                </td>
              </tr>
            )}
            {data?.data.map((kit) => (
              <tr key={kit.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  <div className="font-medium">{kit.name}</div>
                  {kit.description && <div className="text-xs text-muted-foreground">{kit.description}</div>}
                </td>
                <td className="p-3 text-muted-foreground">
                  {kit.items.map((it) => `${it.sparePart.partCode} ×${it.quantity}`).join(", ")}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(kit)} className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted">
                      {tc("edit")}
                    </button>
                    <button onClick={() => handleDelete(kit.id)} className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted">
                      {tc("delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
