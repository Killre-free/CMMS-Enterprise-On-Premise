"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { apiGet } from "@/lib/api-client";

interface PMEvent {
  date: string;
  planId: string;
  planName: string;
  machineCode: string;
  machineName: string;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PMCalendar() {
  const t = useTranslations("PMCalendar");
  const [cursor, setCursor] = useState(() => new Date());
  const month = monthKey(cursor);

  const { data } = useQuery({
    queryKey: ["pm-calendar", month],
    queryFn: () => apiGet<{ data: PMEvent[] }>(`/api/v1/pm-calendar?month=${month}`),
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, PMEvent[]>();
    for (const ev of data?.data ?? []) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [data]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const monthIdx = cursor.getMonth();
    const firstOfMonth = new Date(year, monthIdx, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    const list: { key: string; day: number | null }[] = [];
    for (let i = 0; i < startOffset; i++) list.push({ key: `pad-${i}`, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({ key: `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d });
    }
    return list;
  }, [cursor]);

  const today = todayKey(new Date());
  const weekdayLabels = [t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")];

  return (
    <div className="rounded-lg border border-border bg-background p-4 print:border-0 print:p-0">
      <div className="mb-3 flex items-center justify-between print:hidden">
        <h3 className="text-sm font-medium">{t("title")}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            aria-label={t("prevMonth")}
            className="rounded-md border border-border p-1 hover:bg-muted"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[7rem] text-center text-sm font-medium">
            {cursor.toLocaleDateString(undefined, { year: "numeric", month: "long" })}
          </span>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            aria-label={t("nextMonth")}
            className="rounded-md border border-border p-1 hover:bg-muted"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => window.print()}
            className="ml-2 flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            <Printer size={14} /> {t("printCalendar")}
          </button>
        </div>
      </div>

      <h3 className="mb-2 hidden text-base font-semibold print:block">
        {t("title")} — {cursor.toLocaleDateString(undefined, { year: "numeric", month: "long" })}
      </h3>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border text-xs">
        {weekdayLabels.map((w) => (
          <div key={w} className="bg-muted/50 p-1 text-center font-medium">
            {w}
          </div>
        ))}
        {cells.map((cell) => {
          const events = cell.day ? (eventsByDay.get(cell.key) ?? []) : [];
          const isToday = cell.key === today;
          return (
            <div key={cell.key} className={`min-h-[70px] bg-background p-1 ${isToday ? "ring-2 ring-inset ring-primary" : ""}`}>
              {cell.day && (
                <>
                  <div className="mb-1 text-right font-medium text-muted-foreground">{cell.day}</div>
                  <div className="flex flex-col gap-0.5">
                    {events.slice(0, 3).map((ev) => (
                      <div
                        key={ev.planId + ev.date}
                        title={`${ev.machineCode} — ${ev.machineName} (${ev.planName})`}
                        className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary"
                      >
                        {ev.machineCode}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">{t("moreCount", { count: events.length - 3 })}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
