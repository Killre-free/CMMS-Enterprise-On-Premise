"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { utils, writeFile } from "xlsx";
import { Download, Printer } from "lucide-react";
import { apiGet, type Page } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

type ReportType = "workOrders" | "spareParts" | "machines";

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

interface Column<T> {
  key: string;
  label: string;
  value: (row: T) => string | number;
}

const WORK_ORDER_COLUMNS: Column<any>[] = [
  { key: "woNumber", label: "WO #", value: (r) => r.woNumber },
  { key: "title", label: "Title", value: (r) => r.title },
  { key: "machine", label: "Machine", value: (r) => r.machine?.machineName ?? "" },
  { key: "priority", label: "Priority", value: (r) => r.priority },
  { key: "status", label: "Status", value: (r) => r.status },
  {
    key: "assignedTo",
    label: "Assigned To",
    value: (r) => (r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : ""),
  },
  { key: "createdAt", label: "Created", value: (r) => formatDate(r.createdAt) },
];

const SPARE_PART_COLUMNS: Column<any>[] = [
  { key: "partCode", label: "Part Code", value: (r) => r.partCode },
  { key: "partName", label: "Part Name", value: (r) => r.partName },
  { key: "currentStock", label: "Current Stock", value: (r) => r.currentStock },
  { key: "safetyStock", label: "Safety Stock", value: (r) => r.safetyStock },
  { key: "unit", label: "Unit", value: (r) => r.unit },
];

const MACHINE_COLUMNS: Column<any>[] = [
  { key: "machineCode", label: "Code", value: (r) => r.machineCode },
  { key: "machineName", label: "Name", value: (r) => r.machineName },
  { key: "department", label: "Department", value: (r) => r.department?.name ?? "" },
  { key: "lifeCycleStatus", label: "Status", value: (r) => r.lifeCycleStatus },
];

const REPORT_CONFIG: Record<ReportType, { label: string; endpoint: string; columns: Column<any>[] }> = {
  workOrders: { label: "Work Orders", endpoint: "/api/v1/work-orders", columns: WORK_ORDER_COLUMNS },
  spareParts: { label: "Spare Parts Stock", endpoint: "/api/v1/spare-parts", columns: SPARE_PART_COLUMNS },
  machines: { label: "Machines", endpoint: "/api/v1/machines", columns: MACHINE_COLUMNS },
};

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
  const [reportType, setReportType] = useState<ReportType>("workOrders");
  const config = REPORT_CONFIG[reportType];

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", reportType],
    queryFn: () => apiGet<Page<any>>(`${config.endpoint}?pageSize=100`),
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
        <h1 className="text-xl font-semibold">Reports</h1>
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
            <Printer size={16} /> Print / PDF
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

      <h2 className="hidden text-lg font-semibold print:block">{config.label} Report</h2>

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
                  Loading...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={config.columns.length} className="p-6 text-center text-destructive">
                  Failed to load report data.
                </td>
              </tr>
            )}
            {rows.length === 0 && !isLoading && (
              <tr>
                <td colSpan={config.columns.length} className="p-6 text-center text-muted-foreground">
                  No data for this report.
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
