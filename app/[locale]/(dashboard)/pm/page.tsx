"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { apiGet, apiPost, ApiError, type Page } from "@/lib/api-client";
import { Modal } from "@/components/shared/Modal";
import { formatDate } from "@/lib/utils";

interface PMPlan {
  id: string;
  name: string;
  frequencyType: string;
  frequencyValue: number | null;
  nextDueAt: string | null;
  isActive: boolean;
  machine: { machineCode: string; machineName: string };
}

interface Machine {
  id: string;
  machineCode: string;
  machineName: string;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const FREQUENCIES = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "RunningHour"];

function CreatePMForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("PM");
  const queryClient = useQueryClient();
  const { data: machines } = useQuery({
    queryKey: ["machines", "options"],
    queryFn: () => apiGet<Page<Machine>>("/api/v1/machines?pageSize=100"),
  });
  const [name, setName] = useState("");
  const [machineId, setMachineId] = useState("");
  const [frequencyType, setFrequencyType] = useState("Monthly");
  const [frequencyValue, setFrequencyValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/v1/pm", {
        name,
        machineId,
        frequencyType,
        frequencyValue: frequencyValue ? Number(frequencyValue) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["pm-plans"] });
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
        <label className="mb-1 block text-sm font-medium">{t("planName")}</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("machine")}</label>
        <select required value={machineId} onChange={(e) => setMachineId(e.target.value)} className={inputClass}>
          <option value="">{t("selectMachine")}</option>
          {machines?.data.map((m) => (
            <option key={m.id} value={m.id}>
              {m.machineCode} — {m.machineName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("frequency")}</label>
        <select value={frequencyType} onChange={(e) => setFrequencyType(e.target.value)} className={inputClass}>
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      {frequencyType === "RunningHour" && (
        <div>
          <label className="mb-1 block text-sm font-medium">{t("runningHoursInterval")}</label>
          <input
            type="number"
            value={frequencyValue}
            onChange={(e) => setFrequencyValue(e.target.value)}
            className={inputClass}
          />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? t("creating") : t("createPmPlan")}
      </button>
    </form>
  );
}

export default function PMPage() {
  const t = useTranslations("PM");
  const tc = useTranslations("Common");
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["pm-plans"],
    queryFn: () => apiGet<Page<PMPlan>>("/api/v1/pm"),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus size={16} /> {t("newPmPlan")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-3 font-medium">{t("plan")}</th>
              <th className="p-3 font-medium">{t("machine")}</th>
              <th className="p-3 font-medium">{t("frequency")}</th>
              <th className="p-3 font-medium">{t("nextDue")}</th>
              <th className="p-3 font-medium">{tc("active")}</th>
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
                  {t("noPmPlansYet")}
                </td>
              </tr>
            )}
            {data?.data.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">
                  {p.machine?.machineCode} — {p.machine?.machineName}
                </td>
                <td className="p-3">
                  {p.frequencyType}
                  {p.frequencyValue ? ` (${p.frequencyValue}h)` : ""}
                </td>
                <td className="p-3">{p.nextDueAt ? formatDate(p.nextDueAt) : "—"}</td>
                <td className="p-3">{p.isActive ? tc("yes") : tc("no")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("newPmPlan")}>
        <CreatePMForm onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
