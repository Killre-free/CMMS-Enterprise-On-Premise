// lib/pm-schedule.ts
import type { PMFrequencyType } from "@prisma/client";

/**
 * Computes the next due date for a calendar-based PM plan. RunningHour-based
 * plans are triggered by machine.runningHour crossing frequencyValue in the
 * PM auto-generate job (scripts/generate-pm-work-orders.ts) rather than a
 * fixed calendar date, so this returns null for that type.
 */
export function computeNextDue(
  frequencyType: PMFrequencyType,
  frequencyValue: number | undefined,
  from: Date
): Date | null {
  const d = new Date(from);
  switch (frequencyType) {
    case "Daily":
      d.setDate(d.getDate() + 1);
      return d;
    case "Weekly":
      d.setDate(d.getDate() + 7);
      return d;
    case "Monthly":
      d.setMonth(d.getMonth() + 1);
      return d;
    case "Quarterly":
      d.setMonth(d.getMonth() + 3);
      return d;
    case "Yearly":
      d.setFullYear(d.getFullYear() + 1);
      return d;
    case "RunningHour":
      return null;
    default:
      return null;
  }
}
