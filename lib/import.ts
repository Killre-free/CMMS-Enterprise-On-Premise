// lib/import.ts
import type { z } from "zod";

export interface ImportRowError {
  path: string;
  message: string;
}

export interface ImportRowResult {
  row: number;
  success: boolean;
  id?: string;
  errors?: ImportRowError[];
}

export interface ImportSummary {
  results: ImportRowResult[];
  summary: { total: number; success: number; failed: number };
}

/**
 * Validates and creates each row independently so a bad row doesn't abort
 * the whole import (spec requires partial import of valid rows).
 * `row` numbering starts at 2 to match the spreadsheet line (row 1 = header).
 */
export async function processImportRows<TRow>(
  rows: unknown[],
  schema: z.ZodType<TRow>,
  createRow: (row: TRow) => Promise<{ id: string }>
): Promise<ImportRowResult[]> {
  const results: ImportRowResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const parsed = schema.safeParse(rows[i]);
    if (!parsed.success) {
      results.push({
        row: rowNumber,
        success: false,
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      continue;
    }
    try {
      const created = await createRow(parsed.data);
      results.push({ row: rowNumber, success: true, id: created.id });
    } catch (err: any) {
      const message =
        err.code === "P2002"
          ? `Duplicate value for ${err.meta?.target ?? "a unique field"}.`
          : err.message || "Failed to create record.";
      results.push({ row: rowNumber, success: false, errors: [{ path: "", message }] });
    }
  }
  return results;
}

export function summarize(results: ImportRowResult[]): ImportSummary {
  const success = results.filter((r) => r.success).length;
  return { results, summary: { total: results.length, success, failed: results.length - success } };
}
