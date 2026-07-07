"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { apiGet, apiPost, ApiError, type Page } from "@/lib/api-client";
import { Badge } from "@/components/shared/Badge";
import { Modal } from "@/components/shared/Modal";

interface Machine {
  id: string;
  machineCode: string;
  machineName: string;
  location: string | null;
  lifeCycleStatus: string;
  department: { name: string } | null;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const STATUS_COLOR: Record<string, "gray" | "green" | "yellow" | "red"> = {
  Active: "green",
  UnderMaintenance: "yellow",
  Retired: "gray",
};

function CreateMachineForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("Machines");
  const queryClient = useQueryClient();
  const [machineCode, setMachineCode] = useState("");
  const [machineName, setMachineName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/v1/machines", {
        machineCode,
        machineName,
        manufacturer: manufacturer || undefined,
        location: location || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
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
        <label className="mb-1 block text-sm font-medium">{t("machineCode")}</label>
        <input required value={machineCode} onChange={(e) => setMachineCode(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("machineName")}</label>
        <input required value={machineName} onChange={(e) => setMachineName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("manufacturer")}</label>
        <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("location")}</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? t("creating") : t("createMachine")}
      </button>
    </form>
  );
}

export default function MachinesPage() {
  const t = useTranslations("Machines");
  const tc = useTranslations("Common");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set("search", search);

  const { data, isLoading, error } = useQuery({
    queryKey: ["machines", search],
    queryFn: () => apiGet<Page<Machine>>(`/api/v1/machines?${params.toString()}`),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t("title_plural")}</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus size={16} /> {t("newMachine")}
        </button>
      </div>

      <input
        placeholder={t("searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`${inputClass} max-w-sm`}
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-3 font-medium">{t("code")}</th>
              <th className="p-3 font-medium">{tc("name")}</th>
              <th className="p-3 font-medium">{t("department")}</th>
              <th className="p-3 font-medium">{t("location")}</th>
              <th className="p-3 font-medium">{tc("status")}</th>
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
                  {t("noMachinesYet")}
                </td>
              </tr>
            )}
            {data?.data.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-3">
                  <Link href={`/machines/${m.id}`} className="font-medium text-primary hover:underline">
                    {m.machineCode}
                  </Link>
                </td>
                <td className="p-3">{m.machineName}</td>
                <td className="p-3">{m.department?.name ?? "—"}</td>
                <td className="p-3">{m.location ?? "—"}</td>
                <td className="p-3">
                  <Badge color={STATUS_COLOR[m.lifeCycleStatus]}>{m.lifeCycleStatus}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("newMachine")}>
        <CreateMachineForm onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
