"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus, FileSpreadsheet } from "lucide-react";
import { apiGet, apiPost, ApiError, type Page } from "@/lib/api-client";
import { Badge } from "@/components/shared/Badge";
import { Modal } from "@/components/shared/Modal";
import { ImportModal, type ImportColumn } from "@/components/shared/ImportModal";
import { sparePartImportRowSchema } from "@/lib/validators";

const SPARE_PART_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "partCode", label: "Part Code", example: "SP-001" },
  { key: "partName", label: "Part Name", example: "Ball Bearing" },
  { key: "unit", label: "Unit", example: "pcs" },
  { key: "currentStock", label: "Current Stock", example: "10" },
  { key: "safetyStock", label: "Safety Stock", example: "5" },
  { key: "maxStock", label: "Max Stock", example: "50" },
  { key: "unitCost", label: "Unit Cost", example: "12.5" },
  { key: "category", label: "Category", example: "Mechanical" },
  { key: "location", label: "Location", example: "Warehouse A" },
];

interface SparePart {
  id: string;
  partCode: string;
  partName: string;
  unit: string;
  currentStock: number;
  safetyStock: number;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

function CreateSparePartForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("SpareParts");
  const queryClient = useQueryClient();
  const [partCode, setPartCode] = useState("");
  const [partName, setPartName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [safetyStock, setSafetyStock] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/v1/spare-parts", {
        partCode,
        partName,
        unit,
        safetyStock: Number(safetyStock),
      });
      queryClient.invalidateQueries({ queryKey: ["spare-parts"] });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium">{t("partCode")}</label>
        <input required value={partCode} onChange={(e) => setPartCode(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("partName")}</label>
        <input required value={partName} onChange={(e) => setPartName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("unit")}</label>
        <input required value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("safetyStock")}</label>
        <input
          type="number"
          value={safetyStock}
          onChange={(e) => setSafetyStock(e.target.value)}
          className={inputClass}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? t("creating") : t("createSparePart")}
      </button>
    </form>
  );
}

export default function SparePartsPage() {
  const t = useTranslations("SpareParts");
  const ti = useTranslations("Import");
  const tc = useTranslations("Common");
  const [search, setSearch] = useState("");
  const [belowSafety, setBelowSafety] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (belowSafety) params.set("belowSafety", "true");

  const { data, isLoading, error } = useQuery({
    queryKey: ["spare-parts", search, belowSafety],
    queryFn: () => apiGet<Page<SparePart>>(`/api/v1/spare-parts?${params.toString()}`),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t("title_plural")}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <FileSpreadsheet size={16} /> {ti("importButton")}
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus size={16} /> {t("newSparePart")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} max-w-sm`}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={belowSafety} onChange={(e) => setBelowSafety(e.target.checked)} />
          {t("belowSafetyOnly")}
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-3 font-medium">{t("code")}</th>
              <th className="p-3 font-medium">{tc("name")}</th>
              <th className="p-3 font-medium">{t("currentStock")}</th>
              <th className="p-3 font-medium">{t("safetyStock")}</th>
              <th className="p-3 font-medium">{t("unit")}</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  {tc("loading")}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-destructive">
                  {t("loadFailed")}
                </td>
              </tr>
            )}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  {t("noSparePartsYet")}
                </td>
              </tr>
            )}
            {data?.data.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-3">
                  <Link href={`/spare-parts/${p.id}`} className="font-medium text-primary hover:underline">
                    {p.partCode}
                  </Link>
                </td>
                <td className="p-3">{p.partName}</td>
                <td className="p-3">{p.currentStock}</td>
                <td className="p-3">{p.safetyStock}</td>
                <td className="p-3">{p.unit}</td>
                <td className="p-3">
                  {p.currentStock < p.safetyStock && <Badge color="red">{t("belowSafety")}</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("newSparePart")}>
        <CreateSparePartForm onDone={() => setModalOpen(false)} />
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["spare-parts"] })}
        title={`${ti("importButton")} — ${t("title_plural")}`}
        columns={SPARE_PART_IMPORT_COLUMNS}
        schema={sparePartImportRowSchema}
        importUrl="/api/v1/spare-parts/import"
        templateFileName="spare-parts-template.xlsx"
      />
    </div>
  );
}
