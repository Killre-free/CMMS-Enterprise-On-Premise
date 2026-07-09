// app/api/v1/pm-calendar/route.ts
// Projects each active PM plan's recurring due dates onto a calendar month,
// using nextDueAt as the recurrence anchor and frequencyType/frequencyValue
// as the interval. RunningHour plans aren't tied to calendar time, so only
// their single known nextDueAt (if it falls in the month) is shown.
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";

function addInterval(date: Date, freq: string, step: number, direction: 1 | -1): Date {
  const d = new Date(date);
  switch (freq) {
    case "Daily":
      d.setUTCDate(d.getUTCDate() + direction * step);
      break;
    case "Weekly":
      d.setUTCDate(d.getUTCDate() + direction * step * 7);
      break;
    case "Monthly":
      d.setUTCMonth(d.getUTCMonth() + direction * step);
      break;
    case "Quarterly":
      d.setUTCMonth(d.getUTCMonth() + direction * step * 3);
      break;
    case "Yearly":
      d.setUTCFullYear(d.getUTCFullYear() + direction * step);
      break;
  }
  return d;
}

function projectOccurrences(anchor: Date, freq: string, value: number | null, rangeStart: Date, rangeEnd: Date): Date[] {
  if (freq === "RunningHour") {
    return anchor >= rangeStart && anchor < rangeEnd ? [anchor] : [];
  }

  const step = value && value > 0 ? Math.round(value) : 1;
  const results: Date[] = [];

  let cursor = new Date(anchor);
  let guard = 0;
  while (cursor >= rangeStart && guard < 1000) {
    cursor = addInterval(cursor, freq, step, -1);
    guard++;
  }
  guard = 0;
  while (cursor < rangeEnd && guard < 1000) {
    cursor = addInterval(cursor, freq, step, 1);
    if (cursor >= rangeStart && cursor < rangeEnd) results.push(new Date(cursor));
    guard++;
  }

  return results;
}

export const GET = withApiHandler(async (req, { user }) => {
  await assertPermission(user.id, "pm", "view");
  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month");
  const anchorMonth = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? new Date(`${monthParam}-01T00:00:00.000Z`) : new Date();

  const monthStart = new Date(Date.UTC(anchorMonth.getUTCFullYear(), anchorMonth.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(anchorMonth.getUTCFullYear(), anchorMonth.getUTCMonth() + 1, 1));

  const plans = await prisma.pMPlan.findMany({
    where: { deletedAt: null, isActive: true, nextDueAt: { not: null } },
    select: {
      id: true,
      name: true,
      frequencyType: true,
      frequencyValue: true,
      nextDueAt: true,
      machine: { select: { machineCode: true, machineName: true } },
    },
  });

  const events: { date: string; planId: string; planName: string; machineCode: string; machineName: string }[] = [];
  for (const plan of plans) {
    if (!plan.nextDueAt) continue;
    const occurrences = projectOccurrences(plan.nextDueAt, plan.frequencyType, plan.frequencyValue, monthStart, monthEnd);
    for (const d of occurrences) {
      events.push({
        date: d.toISOString().slice(0, 10),
        planId: plan.id,
        planName: plan.name,
        machineCode: plan.machine.machineCode,
        machineName: plan.machine.machineName,
      });
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ data: events, month: monthStart.toISOString().slice(0, 7) });
});
