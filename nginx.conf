// lib/check-sheet-formula.ts
import { evaluate } from "mathjs";
import type { CheckSheetField } from "@prisma/client";

/**
 * Evaluates every Calculated field in a template against the submitted
 * values, in field `order` so a formula can only reference fields earlier
 * in the same submission (circular references are rejected at template
 * save time in the builder, not here).
 */
export function evaluateCalculatedFields(
  fields: CheckSheetField[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...values };
  const ordered = [...fields].sort((a, b) => a.order - b.order);

  for (const field of ordered) {
    if (field.type !== "Calculated") continue;
    const config = (field.config as Record<string, unknown>) ?? {};
    const formula = config.formula as string | undefined;
    if (!formula) continue;
    try {
      result[field.key] = evaluate(formula, result);
    } catch {
      result[field.key] = null;
    }
  }
  return result;
}
