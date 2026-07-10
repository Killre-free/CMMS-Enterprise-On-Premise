"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError, type Page } from "@/lib/api-client";
import { Modal } from "@/components/shared/Modal";
import { MachinePicker } from "@/components/shared/MachinePicker";
import { formatDate } from "@/lib/utils";

interface PMPlan {
  id: string;
  name: string;
  frequencyType: string;
  frequencyValue: number | null;
  nextDueAt: string | null;
  isActive: boolean;
  machineId: string;
  machine: { machineCode: string; machineName: string };
}

interface Machine {
  id: string;
  machineCode: string;
  machineName: string;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const FREQUENCIES = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "RunningHour"];

function CreatePMForm({ onDone, editPlan }: { onDone: () => void; editPlan?: PMPlan }) {
  const t = useTranslations("PM");
  const tc = useTranslations("Common");
  const queryClient = useQueryClient();
  const { data: machines } = useQuery({
    queryKey: ["machines", "options"],
    queryFn: () => apiGet<{ data: Machine[] }>("/api/v1/machines/options"),
  });
  const [name, setName] = useState(editPlan?.name ?? "");
  const [machineId, setMachineId] = useState(editPlan?.machineId ?? "");
  const [frequencyType, setFrequencyType] = useState(editPlan?.frequencyType ?? "Monthly");
  const [frequencyValue, setFrequencyValue] = useState(editPlan?.frequencyValue ? String(editPlan.frequencyValue) : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!machineId) {
      setError(t("selectMachine"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name,
        machineId,
        frequencyType,
        frequencyValue: frequencyValue ? Number(frequencyValue) : undefined,
      };
      if (editPlan) {
        await apiPatch(`/api/v1/pm/${editPlan.id}`, payload);
      } else {
        await apiPost("/api/v1/pm", payload);
      }
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
        <MachinePicker machines={machines?.data ?? []} value={machineId} onChange={setMachineId} />
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
        {submitting ? tc("saving") : editPlan ? tc("save") : t("createPmPlan")}
      </button>
    </form>
  );
}

export default function PMPage() {
  const t = useTranslations("PM");
  const tc = useTranslations("Common");
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PMPlan | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["pm-plans"],
    queryFn: () => apiGet<Page<PMPlan>>("/api/v1/pm"),
  });

  async function handleDelete(id: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await apiDelete(`/api/v1/pm/${id}`);
      queryClient.invalidateQueries({ queryKey: ["pm-plans"] });
    } catch {
      // best-effort
    }
  }

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
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingPlan(p)}
                      aria-label={tc("edit")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      aria-label={tc("delete")}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("newPmPlan")}>
        <CreatePMForm onDone={() => setModalOpen(false)} />
      </Modal>

      <Modal open={editingPlan !== null} onClose={() => setEditingPlan(null)} title={t("editPmPlan")}>
        {editingPlan && <CreatePMForm editPlan={editingPlan} onDone={() => setEditingPlan(null)} />}
      </Modal>
    </div>
  );
}
