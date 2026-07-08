"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { utils, writeFile } from "xlsx";
import { Download, Printer } from "lucide-react";
import { apiGet, type Page } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

type ReportType = "workOrders" | "spareParts" | "machines" | "maintenanceKpis";

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

interface Column<T> {
  key: string;
  label: string;
  value: (row: T) => string | number;
}

function buildReportConfig(
  t: ReturnType<typeof useTranslations<"Reports">>
): Record<ReportType, { label: string; endpoint: string; columns: Column<any>[] }> {
  const workOrderColumns: Column<any>[] = [
    { key: "woNumber", label: t("woNumber"), value: (r) => r.woNumber },
    { key: "title", label: t("title_field"), value: (r) => r.title },
    { key: "machine", label: t("machine"), value: (r) => r.machine?.machineName ?? "" },
    { key: "priority", label: t("priority"), value: (r) => r.priority },
    { key: "status", label: t("status"), value: (r) => r.status },
    {
      key: "assignedTo",
      label: t("assignedTo"),
      value: (r) => (r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : ""),
    },
    { key: "createdAt", label: t("created"), value: (r) => formatDate(r.createdAt) },
  ];

  const sparePartColumns: Column<any>[] = [
    { key: "partCode", label: t("partCode"), value: (r) => r.partCode },
    { key: "partName", label: t("partName"), value: (r) => r.partName },
    { key: "currentStock", label: t("currentStock"), value: (r) => r.currentStock },
    { key: "safetyStock", label: t("safetyStock"), value: (r) => r.safetyStock },
    { key: "unit", label: t("unit"), value: (r) => r.unit },
  ];

  const machineColumns: Column<any>[] = [
    { key: "machineCode", label: t("code"), value: (r) => r.machineCode },
    { key: "machineName", label: t("name"), value: (r) => r.machineName },
    { key: "department", label: t("department"), value: (r) => r.department?.name ?? "" },
    { key: "lifeCycleStatus", label: t("status"), value: (r) => r.lifeCycleStatus },
  ];

  const maintenanceKpiColumns: Column<any>[] = [
    { key: "machineCode", label: t("code"), value: (r) => r.machineCode },
    { key: "machineName", label: t("name"), value: (r) => r.machineName },
    { key: "workOrderCount", label: t("workOrderCount"), value: (r) => r.workOrderCount },
    { key: "mttrHours", label: t("mttrHours"), value: (r) => r.mttrHours ?? "—" },
    { key: "mtbfHours", label: t("mtbfHours"), value: (r) => r.mtbfHours ?? "—" },
    {
      key: "availabilityPercent",
      label: t("availabilityPercent"),
      value: (r) => (r.availabilityPercent !== null && r.availabilityPercent !== undefined ? `${r.availabilityPercent}%` : "—"),
    },
  ];

  return {
    workOrders: { label: t("workOrders"), endpoint: "/api/v1/work-orders", columns: workOrderColumns },
    spareParts: { label: t("sparePartsStock"), endpoint: "/api/v1/spare-parts", columns: sparePartColumns },
    machines: { label: t("machines"), endpoint: "/api/v1/machines", columns: machineColumns },
    maintenanceKpis: {
      label: t("maintenanceKpis"),
      endpoint: "/api/v1/reports/maintenance-kpis",
      columns: maintenanceKpiColumns,
    },
  };
}

function toCsv(columns: Column<any>[], rows: any[]): string {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => `"${String(c.value(row)).replace(/"/g, '""')}"`).join(",")
  );
  return [header, ...lines].join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const t = useTranslations("Reports");
  const tc = useTranslations("Common");
  const [reportType, setReportType] = useState<ReportType>("workOrders");
  const REPORT_CONFIG = useMemo(() => buildReportConfig(t), [t]);
  const config = REPORT_CONFIG[reportType];

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", reportType],
    queryFn: () =>
      apiGet<
        Page<any> & {
          summary?: { avgMttrHours: number | null; avgMtbfHours: number | null; avgAvailabilityPercent: number | null };
        }
      >(`${config.endpoint}?pageSize=100`),
  });

  const rows = useMemo(() => data?.data ?? [], [data]);

  function exportCsv() {
    const csv = toCsv(config.columns, rows);
    downloadBlob(csv, `${reportType}-report.csv`, "text/csv;charset=utf-8;");
  }

  function exportExcel() {
    const sheetData = [
      config.columns.map((c) => c.label),
      ...rows.map((row) => config.columns.map((c) => c.value(row))),
    ];
    const worksheet = utils.aoa_to_sheet(sheetData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, config.label.slice(0, 31));
    writeFile(workbook, `${reportType}-report.xlsx`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Download size={16} /> CSV
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Download size={16} /> Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <Printer size={16} /> {t("printPdf")}
          </button>
        </div>
      </div>

      <select
        value={reportType}
        onChange={(e) => setReportType(e.target.value as ReportType)}
        className={`${inputClass} w-auto print:hidden`}
      >
        {Object.entries(REPORT_CONFIG).map(([key, c]) => (
          <option key={key} value={key}>
            {c.label}
          </option>
        ))}
      </select>

      <h2 className="hidden text-lg font-semibold print:block">{t("reportSuffix", { label: config.label })}</h2>

      {reportType === "maintenanceKpis" && data?.summary && (
        <div className="flex flex-wrap gap-4">
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">{t("avgMttrHours")}</p>
            <p className="text-xl font-semibold">{data.summary.avgMttrHours ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">{t("avgMtbfHours")}</p>
            <p className="text-xl font-semibold">{data.summary.avgMtbfHours ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">{t("avgAvailabilityPercent")}</p>
            <p className="text-xl font-semibold">
              {data.summary.avgAvailabilityPercent !== null ? `${data.summary.avgAvailabilityPercent}%` : "—"}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              {config.columns.map((c) => (
                <th key={c.key} className="p-3 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={config.columns.length} className="p-6 text-center text-muted-foreground">
                  {tc("loading")}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={config.columns.length} className="p-6 text-center text-destructive">
                  {t("loadFailed")}
                </td>
              </tr>
            )}
            {rows.length === 0 && !isLoading && (
              <tr>
                <td colSpan={config.columns.length} className="p-6 text-center text-muted-foreground">
                  {t("noData")}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {config.columns.map((c) => (
                  <td key={c.key} className="p-3">
                    {c.value(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
