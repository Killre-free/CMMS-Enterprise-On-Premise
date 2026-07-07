"use client";
import { useRef, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import type { z } from "zod";
import { useTranslations } from "next-intl";
import { Download, Upload } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { cn } from "@/lib/utils";

export interface ImportColumn {
  key: string;
  label: string;
  example?: string;
}

interface RowResult {
  row: number;
  success: boolean;
  errors?: { path: string; message: string }[];
}

interface PreviewRow {
  data: Record<string, unknown>;
  errors: string[];
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  title: string;
  columns: ImportColumn[];
  schema: z.ZodTypeAny;
  importUrl: string;
  templateFileName: string;
}

export function ImportModal({
  open,
  onClose,
  onImported,
  title,
  columns,
  schema,
  importUrl,
  templateFileName,
}: ImportModalProps) {
  const t = useTranslations("Import");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  function reset() {
    setRows([]);
    setResults(null);
    setParseError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      columns.map((c) => c.key),
      columns.map((c) => c.example ?? ""),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, templateFileName);
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParseError(null);
    setResults(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        const preview: PreviewRow[] = json.map((raw) => {
          const cleaned: Record<string, unknown> = {};
          for (const col of columns) {
            const value = raw[col.key];
            cleaned[col.key] = typeof value === "string" && value.trim() === "" ? undefined : value;
          }
          const parsed = schema.safeParse(cleaned);
          return {
            data: cleaned,
            errors: parsed.success
              ? []
              : parsed.error.issues.map((issue: z.ZodIssue) => `${issue.path.join(".")}: ${issue.message}`),
          };
        });
        setRows(preview);
      } catch {
        setParseError(t("parseFailed"));
      }
    };
    reader.readAsBinaryString(file);
  }

  function errorTextFor(index: number): string {
    if (results && results[index]) {
      return results[index].success ? "" : (results[index].errors ?? []).map((e) => e.message).join("; ");
    }
    return rows[index]?.errors.join("; ") ?? "";
  }

  async function handleImport() {
    setImporting(true);
    setParseError(null);
    try {
      const res = await fetch(importUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.map((r) => r.data) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail ?? t("importFailed"));
      setResults(body.results ?? []);
      if ((body.summary?.success ?? 0) > 0) onImported();
    } catch {
      setParseError(t("importFailed"));
    } finally {
      setImporting(false);
    }
  }

  function exportErrorReport() {
    const failedIndexes = rows.map((_, i) => i).filter((i) => errorTextFor(i) !== "");
    if (failedIndexes.length === 0) return;
    const header = [...columns.map((c) => c.key), "error"];
    const data = failedIndexes.map((i) => [
      ...columns.map((c) => String(rows[i].data[c.key] ?? "")),
      errorTextFor(i),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Errors");
    XLSX.writeFile(wb, templateFileName.replace(/\.xlsx$/, "") + "-errors.xlsx");
  }

  const failedCount = rows.filter((_, i) => errorTextFor(i) !== "").length;
  const successCount = rows.length - failedCount;

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Download size={14} /> {t("downloadTemplate")}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Upload size={14} /> {t("chooseFile")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {parseError && <p className="text-sm text-destructive">{parseError}</p>}

        {rows.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {t("previewSummary", { total: rows.length, valid: successCount, invalid: failedCount })}
            </p>
            <div className="max-h-64 overflow-auto rounded-md border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-2 font-medium">#</th>
                    {columns.map((c) => (
                      <th key={c.key} className="p-2 font-medium">
                        {c.label}
                      </th>
                    ))}
                    <th className="p-2 font-medium">{t("errorColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const errorText = errorTextFor(i);
                    return (
                      <tr
                        key={i}
                        className={cn(
                          "border-b border-border last:border-0",
                          errorText && "bg-destructive/10"
                        )}
                      >
                        <td className="p-2">{i + 2}</td>
                        {columns.map((c) => (
                          <td key={c.key} className="p-2">
                            {String(row.data[c.key] ?? "")}
                          </td>
                        ))}
                        <td className="p-2 text-destructive">{errorText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleImport}
                disabled={importing || rows.length === 0}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {importing ? t("importing") : t("importRows", { count: rows.length })}
              </button>
              {failedCount > 0 && (
                <button
                  onClick={exportErrorReport}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  {t("exportErrors")}
                </button>
              )}
            </div>
          </>
        )}

        {results && (
          <p className="text-sm">
            {t("importResult", {
              success: results.filter((r) => r.success).length,
              failed: results.filter((r) => !r.success).length,
            })}
          </p>
        )}
      </div>
    </Modal>
  );
}
