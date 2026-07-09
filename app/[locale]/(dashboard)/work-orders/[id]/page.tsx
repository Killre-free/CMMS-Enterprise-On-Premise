"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGet, apiPost, apiDelete, ApiError } from "@/lib/api-client";
import { Badge, PRIORITY_COLOR, STATUS_COLOR } from "@/components/shared/Badge";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { SearchPicker } from "@/components/shared/SearchPicker";
import { formatDate } from "@/lib/utils";
import { Trash2, CheckCircle2 } from "lucide-react";

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
  partsUsed: {
    id: string;
    quantity: number;
    sparePart: { partCode: string; partName: string; unit: string };
  }[];
  rootCauseWhys: string[];
  rootCause: string | null;
}

interface SparePart {
  id: string;
  partCode: string;
  partName: string;
  unit: string;
}

interface KitOption {
  id: string;
  name: string;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

export default function WorkOrderDetailPage() {
  const t = useTranslations("WorkOrderDetail");
  const tk = useTranslations("SparePartKits");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toStatus, setToStatus] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [partId, setPartId] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partError, setPartError] = useState<string | null>(null);
  const [addingPart, setAddingPart] = useState(false);
  const [kitId, setKitId] = useState("");
  const [applyingKit, setApplyingKit] = useState(false);
  const [kitError, setKitError] = useState<string | null>(null);
  const [showRootCause, setShowRootCause] = useState(false);
  const [whys, setWhys] = useState(["", "", "", "", ""]);
  const [rootCause, setRootCause] = useState("");

  const { data: wo, isLoading } = useQuery({
    queryKey: ["work-order", id],
    queryFn: () => apiGet<WorkOrderDetail>(`/api/v1/work-orders/${id}`),
  });

  const { data: spareParts } = useQuery({
    queryKey: ["spare-parts", "options"],
    queryFn: () => apiGet<{ data: SparePart[] }>("/api/v1/spare-parts/options"),
  });

  const { data: kits } = useQuery({
    queryKey: ["spare-part-kits", "options"],
    queryFn: () => apiGet<{ data: KitOption[] }>("/api/v1/spare-part-kits/options"),
  });

  if (isLoading || !wo) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
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
        photos: photos.length > 0 ? photos : undefined,
        rootCauseWhys: photosRequired ? whys.filter((w) => w.trim()) : undefined,
        rootCause: photosRequired && rootCause.trim() ? rootCause.trim() : undefined,
      });
      setToStatus("");
      setComment("");
      setPhotos([]);
      setWhys(["", "", "", "", ""]);
      setRootCause("");
      setShowRootCause(false);
      queryClient.invalidateQueries({ queryKey: ["work-order", id] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("updateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAccept() {
    setError(null);
    setAccepting(true);
    try {
      await apiPost(`/api/v1/work-orders/${id}/transition`, {
        toStatus: "Accepted",
        version: wo!.version,
      });
      queryClient.invalidateQueries({ queryKey: ["work-order", id] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("updateFailed"));
    } finally {
      setAccepting(false);
    }
  }

  async function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    if (!partId) return;
    setPartError(null);
    setAddingPart(true);
    try {
      await apiPost(`/api/v1/work-orders/${id}/parts`, { sparePartId: partId, quantity: Number(partQty) });
      setPartId("");
      setPartQty("1");
      queryClient.invalidateQueries({ queryKey: ["work-order", id] });
    } catch (err) {
      setPartError(err instanceof ApiError ? err.message : t("addPartFailed"));
    } finally {
      setAddingPart(false);
    }
  }

  async function handleRemovePart(partLineId: string) {
    try {
      await apiDelete(`/api/v1/work-orders/${id}/parts/${partLineId}`);
      queryClient.invalidateQueries({ queryKey: ["work-order", id] });
    } catch {
      // best-effort; the list simply won't update if this fails
    }
  }

  async function handleApplyKit(e: React.FormEvent) {
    e.preventDefault();
    if (!kitId) return;
    setKitError(null);
    setApplyingKit(true);
    try {
      await apiPost(`/api/v1/work-orders/${id}/apply-kit`, { kitId });
      setKitId("");
      queryClient.invalidateQueries({ queryKey: ["work-order", id] });
    } catch (err) {
      setKitError(err instanceof ApiError ? err.message : tk("applyKitFailed"));
    } finally {
      setApplyingKit(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push("/work-orders")}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> {t("backToWorkOrders")}
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

      {wo.status === "WaitingTechnician" && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary bg-primary/5 p-4">
          <p className="text-sm font-medium">{t("waitingTechnicianBanner")}</p>
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> {accepting ? t("accepting") : t("acceptWorkOrder")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <h2 className="mb-2 text-sm font-medium">{t("details")}</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">{t("requestedBy")}</dt>
              <dd>
                {wo.requestedBy.firstName} {wo.requestedBy.lastName}
              </dd>
              <dt className="text-muted-foreground">{t("assignedTo")}</dt>
              <dd>{wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : t("unassigned")}</dd>
              <dt className="text-muted-foreground">{t("created")}</dt>
              <dd>{formatDate(wo.createdAt)}</dd>
              {wo.description && (
                <>
                  <dt className="text-muted-foreground">{t("description")}</dt>
                  <dd>{wo.description}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <h2 className="mb-2 text-sm font-medium">{t("history")}</h2>
            <ul className="flex flex-col gap-3">
              {wo.stateHistory.map((h) => (
                <li key={h.id} className="border-l-2 border-border pl-3 text-sm">
                  <div className="font-medium">
                    {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("changedBy", { date: formatDate(h.changedAt), name: `${h.changedBy.firstName} ${h.changedBy.lastName}` })}
                  </div>
                  {h.comment && <div className="mt-1">{h.comment}</div>}
                </li>
              ))}
            </ul>
          </div>

          {((wo.rootCauseWhys?.length ?? 0) > 0 || wo.rootCause) && (
            <div className="rounded-lg border border-border bg-background p-4">
              <h2 className="mb-2 text-sm font-medium">{t("rootCauseAnalysis")}</h2>
              {(wo.rootCauseWhys?.length ?? 0) > 0 && (
                <ol className="mb-2 list-decimal pl-4 text-sm">
                  {wo.rootCauseWhys.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ol>
              )}
              {wo.rootCause && <p className="text-sm font-medium">{wo.rootCause}</p>}
            </div>
          )}

          <div className="rounded-lg border border-border bg-background p-4">
            <h2 className="mb-2 text-sm font-medium">{t("partsUsed")}</h2>
            {wo.partsUsed.length === 0 ? (
              <p className="mb-3 text-sm text-muted-foreground">{t("noPartsUsedYet")}</p>
            ) : (
              <ul className="mb-3 flex flex-col gap-2">
                {wo.partsUsed.map((p) => (
                  <li key={p.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                    <span>
                      {p.sparePart.partCode} — {p.sparePart.partName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {p.quantity} {p.sparePart.unit}
                      </span>
                      {wo.status !== "Closed" && (
                        <button
                          onClick={() => handleRemovePart(p.id)}
                          aria-label={t("removePart")}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {wo.status !== "Closed" && (
              <form onSubmit={handleAddPart} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[220px] flex-1">
                  <SearchPicker
                    items={(spareParts?.data ?? []).map((p) => ({ id: p.id, code: p.partCode, label: p.partName }))}
                    value={partId}
                    onChange={setPartId}
                    placeholder={t("searchOrScanPart")}
                    noResultsText={t("noPartsFound")}
                    changeLabel={t("changePart")}
                  />
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={partQty}
                  onChange={(e) => setPartQty(e.target.value)}
                  className={`${inputClass} w-24`}
                  aria-label={t("quantity")}
                />
                <button
                  type="submit"
                  disabled={!partId || addingPart}
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {addingPart ? t("adding") : t("addPart")}
                </button>
              </form>
            )}
            {partError && <p className="mt-2 text-sm text-destructive">{partError}</p>}

            {wo.status !== "Closed" && kits && kits.data.length > 0 && (
              <form onSubmit={handleApplyKit} className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <select value={kitId} onChange={(e) => setKitId(e.target.value)} className={`${inputClass} w-auto flex-1`}>
                  <option value="">{tk("selectKit")}</option>
                  {kits.data.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!kitId || applyingKit}
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {applyingKit ? tk("applyingKit") : tk("applyKit")}
                </button>
              </form>
            )}
            {kitError && <p className="mt-2 text-sm text-destructive">{kitError}</p>}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <h2 className="mb-2 text-sm font-medium">{t("updateStatus")}</h2>
          {nextOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("closed")}</p>
          ) : (
            <form onSubmit={handleTransition} className="flex flex-col gap-3">
              <select value={toStatus} onChange={(e) => setToStatus(e.target.value)} className={inputClass} required>
                <option value="">{t("selectNextStatus")}</option>
                {nextOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <textarea
                placeholder={t("commentOptional")}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className={inputClass}
                rows={2}
              />
              {photosRequired && <PhotoUpload value={photos} onChange={setPhotos} label={t("photos")} />}
              {photosRequired && (
                <div className="rounded-md border border-border p-3">
                  <button
                    type="button"
                    onClick={() => setShowRootCause((s) => !s)}
                    className="text-xs font-medium text-primary"
                  >
                    {showRootCause ? t("hideRootCause") : t("addRootCause")}
                  </button>
                  {showRootCause && (
                    <div className="mt-2 flex flex-col gap-2">
                      {whys.map((w, i) => (
                        <input
                          key={i}
                          placeholder={t("whyN", { n: i + 1 })}
                          value={w}
                          onChange={(e) => setWhys((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                          className={inputClass}
                        />
                      ))}
                      <textarea
                        placeholder={t("rootCauseSummary")}
                        value={rootCause}
                        onChange={(e) => setRootCause(e.target.value)}
                        className={inputClass}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {submitting ? t("updating") : t("updateStatusButton")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
