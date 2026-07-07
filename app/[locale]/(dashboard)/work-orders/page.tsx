"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus } from "lucide-react";
import { apiGet, apiPost, type Page } from "@/lib/api-client";
import { Badge, PRIORITY_COLOR, STATUS_COLOR } from "@/components/shared/Badge";
import { Modal } from "@/components/shared/Modal";
import { formatDate } from "@/lib/utils";

interface WorkOrder {
  id: string;
  woNumber: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
  machine: { machineName: string; machineCode: string };
  requestedBy: { firstName: string; lastName: string };
  assignedTo: { firstName: string; lastName: string } | null;
}

interface Machine {
  id: string;
  machineCode: string;
  machineName: string;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

function CreateWorkOrderForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const { data: machines } = useQuery({
    queryKey: ["machines", "options"],
    queryFn: () => apiGet<Page<Machine>>("/api/v1/machines?pageSize=100"),
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [machineId, setMachineId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/v1/work-orders", { title, description, priority, machineId });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create work order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
          rows={3}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Machine</label>
        <select required value={machineId} onChange={(e) => setMachineId(e.target.value)} className={inputClass}>
          <option value="">Select a machine...</option>
          {machines?.data.map((m) => (
            <option key={m.id} value={m.id}>
              {m.machineCode} — {m.machineName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Priority</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
          {["Low", "Medium", "High", "Critical"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Work Order"}
      </button>
    </form>
  );
}

export default function WorkOrdersPage() {
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);

  const { data, isLoading, error } = useQuery({
    queryKey: ["work-orders", status, priority],
    queryFn: () => apiGet<Page<WorkOrder>>(`/api/v1/work-orders?${params.toString()}`),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Work Orders</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus size={16} /> New Work Order
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_COLOR).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">All priorities</option>
          {Object.keys(PRIORITY_COLOR).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-3 font-medium">WO #</th>
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Machine</th>
              <th className="p-3 font-medium">Priority</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Assigned To</th>
              <th className="p-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-destructive">
                  Failed to load work orders.
                </td>
              </tr>
            )}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  No work orders yet.
                </td>
              </tr>
            )}
            {data?.data.map((wo) => (
              <tr key={wo.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-3">
                  <Link href={`/work-orders/${wo.id}`} className="font-medium text-primary hover:underline">
                    {wo.woNumber}
                  </Link>
                </td>
                <td className="p-3">{wo.title}</td>
                <td className="p-3">{wo.machine?.machineName}</td>
                <td className="p-3">
                  <Badge color={PRIORITY_COLOR[wo.priority]}>{wo.priority}</Badge>
                </td>
                <td className="p-3">
                  <Badge color={STATUS_COLOR[wo.status]}>{wo.status}</Badge>
                </td>
                <td className="p-3">
                  {wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : "—"}
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(wo.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Work Order">
        <CreateWorkOrderForm onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
