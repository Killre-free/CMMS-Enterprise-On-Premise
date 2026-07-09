"use client";
import { useRef, useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowLeft, Printer, FileText, Trash2, Upload, Loader2 } from "lucide-react";
import { apiGet, apiPost, apiDelete, ApiError } from "@/lib/api-client";
import { Badge, PRIORITY_COLOR, STATUS_COLOR } from "@/components/shared/Badge";
import { formatDate } from "@/lib/utils";

interface MachineDetail {
  id: string;
  machineCode: string;
  machineName: string;
  manufacturer: string | null;
  model: string | null;
  location: string | null;
  lifeCycleStatus: string;
  qrCode: string | null;
  department: { name: string } | null;
  pmPlans: { id: string; name: string; nextDueAt: string | null; isActive: boolean }[];
  documents: { id: string; fileName: string; url: string; createdAt: string }[];
  workOrders: {
    id: string;
    woNumber: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
  }[];
}

export default function MachineDetailPage() {
  const t = useTranslations("MachineDetail");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const { data: machine, isLoading } = useQuery({
    queryKey: ["machine", id],
    queryFn: () => apiGet<MachineDetail>(`/api/v1/machines/${id}`),
  });

  async function handleDocUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setDocError(null);
    setUploadingDoc(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/v1/uploads", { method: "POST", body: formData });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new ApiError(res.status, body.title ?? res.statusText, body.detail);
        }
        const { url } = await res.json();
        await apiPost(`/api/v1/machines/${id}/documents`, { fileName: file.name, url });
      }
      queryClient.invalidateQueries({ queryKey: ["machine", id] });
    } catch (err) {
      setDocError(err instanceof ApiError ? (err.detail ?? err.message) : t("uploadFailed"));
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleDocDelete(docId: string) {
    try {
      await apiDelete(`/api/v1/machines/${id}/documents/${docId}`);
      queryClient.invalidateQueries({ queryKey: ["machine", id] });
    } catch {
      // best-effort
    }
  }

  if (isLoading || !machine) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push("/machines")}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft size={16} /> {t("backToMachines")}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">
            {machine.machineCode} — {machine.machineName}
          </h1>
          <p className="text-sm text-muted-foreground">{machine.department?.name}</p>
        </div>
        {machine.qrCode && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted print:hidden"
          >
            <Printer size={16} /> {t("printQrLabel")}
          </button>
        )}
      </div>

      {machine.qrCode && (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-background p-4 print:flex-col print:items-center print:justify-center print:border-none print:p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={machine.qrCode} alt={t("qrCodeAlt")} className="h-32 w-32 print:h-64 print:w-64" />
          <div className="print:text-center">
            <p className="text-lg font-semibold print:text-2xl">{machine.machineCode}</p>
            <p className="text-sm text-muted-foreground print:text-base">{machine.machineName}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-background p-4 print:hidden">
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <dt className="text-muted-foreground">{t("manufacturer")}</dt>
          <dd>{machine.manufacturer ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("model")}</dt>
          <dd>{machine.model ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("location")}</dt>
          <dd>{machine.location ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("status")}</dt>
          <dd>{machine.lifeCycleStatus}</dd>
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-background p-4 print:hidden">
        <h2 className="mb-2 text-sm font-medium">{t("pmPlans")}</h2>
        {machine.pmPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noPmPlans")}</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {machine.pmPlans.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-border pb-2 last:border-0">
                <span>{p.name}</span>
                <span className="text-muted-foreground">
                  {p.nextDueAt ? t("due", { date: formatDate(p.nextDueAt) }) : t("noDueDate")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border bg-background p-4 print:hidden">
        <h2 className="mb-2 text-sm font-medium">{t("documents")}</h2>
        {machine.documents.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">{t("noDocuments")}</p>
        ) : (
          <ul className="mb-3 flex flex-col gap-2 text-sm">
            {machine.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText size={14} /> {doc.fileName}
                </a>
                <button
                  onClick={() => handleDocDelete(doc.id)}
                  aria-label={t("removeDocument")}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingDoc}
          className="flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          {uploadingDoc ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploadingDoc ? t("uploading") : t("uploadDocument")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,.doc,.docx"
          multiple
          className="hidden"
          onChange={handleDocUpload}
        />
        {docError && <p className="mt-2 text-sm text-destructive">{docError}</p>}
      </div>

      <div className="rounded-lg border border-border bg-background p-4 print:hidden">
        <h2 className="mb-2 text-sm font-medium">{t("recentWorkOrders")}</h2>
        {machine.workOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noWorkOrders")}</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {machine.workOrders.map((wo) => (
              <li key={wo.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <Link href={`/work-orders/${wo.id}`} className="text-primary hover:underline">
                  {wo.woNumber} — {wo.title}
                </Link>
                <div className="flex gap-2">
                  <Badge color={PRIORITY_COLOR[wo.priority]}>{wo.priority}</Badge>
                  <Badge color={STATUS_COLOR[wo.status]}>{wo.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
