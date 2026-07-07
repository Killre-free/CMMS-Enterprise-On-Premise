"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api-client";
import { Badge, PRIORITY_COLOR, STATUS_COLOR } from "@/components/shared/Badge";
import { formatDate } from "@/lib/utils";

const ALLOWED_NEXT: Record<string, string[]> = {
  ProductionRequest: ["WaitingTechnician"],
  WaitingTechnician: ["Accepted"],
  Accepted: ["InProgress"],
  InProgress: ["WaitingSparePart", "WaitingMaker", "WaitingProduction", "WaitingBudgetApproval", "Completed"],
  WaitingSparePart: ["InProgress"],
  WaitingMaker: ["InProgress"],
  WaitingProduction: ["InProgress"],
  WaitingBudgetApproval: ["InProgress"],
  Completed: ["WaitingApproval", "Closed"],
  WaitingApproval: ["Closed", "InProgress"],
  Closed: [],
};

interface WorkOrderDetail {
  id: string;
  woNumber: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  version: number;
  createdAt: string;
  machine: { machineName: string; machineCode: string };
  requestedBy: { firstName: string; lastName: string };
  assignedTo: { firstName: string; lastName: string } | null;
  stateHistory: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedAt: string;
    comment: string | null;
    changedBy: { firstName: string; lastName: string };
  }[];
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toStatus, setToStatus] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: wo, isLoading } = useQuery({
    queryKey: ["work-order", id],
    queryFn: () => apiGet<WorkOrderDetail>(`/api/v1/work-orders/${id}`),
  });

  if (isLoading || !wo) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  const nextOptions = ALLOWED_NEXT[wo.status] ?? [];
  const photosRequired = toStatus === "Completed";

  async function handleTransition(e: React.FormEvent) {
    e.preventDefault();
    if (!toStatus) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiPost(`/api/v1/work-orders/${id}/transition`, {
        toStatus,
        version: wo!.version,
        comment: comment || undefined,
        photos: photos ? photos.split(",").map((p) => p.trim()).filter(Boolean) : undefined,
      });
      setToStatus("");
      setComment("");
      setPhotos("");
      queryClient.invalidateQueries({ queryKey: ["work-order", id] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push("/work-orders")}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to Work Orders
      </button>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">
            {wo.woNumber} — {wo.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {wo.machine?.machineCode} — {wo.machine?.machineName}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge color={PRIORITY_COLOR[wo.priority]}>{wo.priority}</Badge>
          <Badge color={STATUS_COLOR[wo.status]}>{wo.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <h2 className="mb-2 text-sm font-medium">Details</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Requested By</dt>
              <dd>
                {wo.requestedBy.firstName} {wo.requestedBy.lastName}
              </dd>
              <dt className="text-muted-foreground">Assigned To</dt>
              <dd>{wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : "Unassigned"}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(wo.createdAt)}</dd>
              {wo.description && (
                <>
                  <dt className="text-muted-foreground">Description</dt>
                  <dd>{wo.description}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <h2 className="mb-2 text-sm font-medium">History</h2>
            <ul className="flex flex-col gap-3">
              {wo.stateHistory.map((h) => (
                <li key={h.id} className="border-l-2 border-border pl-3 text-sm">
                  <div className="font-medium">
                    {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(h.changedAt)} by {h.changedBy.firstName} {h.changedBy.lastName}
                  </div>
                  {h.comment && <div className="mt-1">{h.comment}</div>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <h2 className="mb-2 text-sm font-medium">Update Status</h2>
          {nextOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">This work order is closed.</p>
          ) : (
            <form onSubmit={handleTransition} className="flex flex-col gap-3">
              <select value={toStatus} onChange={(e) => setToStatus(e.target.value)} className={inputClass} required>
                <option value="">Select next status...</option>
                {nextOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className={inputClass}
                rows={2}
              />
              {photosRequired && (
                <input
                  placeholder="Photo URLs, comma separated (required to complete)"
                  value={photos}
                  onChange={(e) => setPhotos(e.target.value)}
                  className={inputClass}
                />
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Update Status"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
