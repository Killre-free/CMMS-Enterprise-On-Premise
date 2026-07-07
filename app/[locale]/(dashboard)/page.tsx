"use client";
// app/[locale]/(dashboard)/page.tsx
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AlertTriangle, ClipboardList, CalendarCheck, Timer, Wallet, PackageX } from "lucide-react";

interface DashboardData {
  kpiCards: {
    breakdownCount: number;
    breakdownTrendVsYesterday: number;
    woPendingCount: number;
    woPendingNewToday: number;
    pmDueToday: number;
    pmCompletedToday: number;
    mttrHours: number;
    budgetUsedPercent: number | null;
    partsBelowSafetyStock: number;
  };
  downtimeChart: { date: string; hours: number }[];
  woStatusDonut: { status: string; count: number }[];
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/v1/dashboard");
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

const STATUS_COLORS: Record<string, string> = {
  InProgress: "#2563eb",
  WaitingTechnician: "#ca8a04",
  Completed: "#16a34a",
  Closed: "#64748b",
};

function KpiCard({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
      <div className={`rounded-md p-2 ${danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">{t("loadFailed")}</p>;
  }

  const { kpiCards, downtimeChart, woStatusDonut } = data;

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={AlertTriangle} label={t("breakdowns")} value={kpiCards.breakdownCount} danger={kpiCards.breakdownCount > 0} />
        <KpiCard icon={ClipboardList} label={t("woPending")} value={kpiCards.woPendingCount} />
        <KpiCard icon={CalendarCheck} label={t("pmDueToday")} value={kpiCards.pmDueToday} />
        <KpiCard icon={Timer} label={t("mttrHours")} value={kpiCards.mttrHours} />
        <KpiCard icon={Wallet} label={t("budgetUsed")} value={kpiCards.budgetUsedPercent ?? t("budgetNotAvailable")} />
        <KpiCard
          icon={PackageX}
          label={t("partsBelowSafety")}
          value={kpiCards.partsBelowSafetyStock}
          danger={kpiCards.partsBelowSafetyStock > 0}
        />
      </div>

      {/* Row 2 — Downtime bar chart + WO status donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-4 lg:col-span-2">
          <h3 className="mb-2 text-sm font-medium">{t("downtimeLast7Days")}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={downtimeChart}>
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} unit="h" />
              <Tooltip />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {downtimeChart.map((d, i) => (
                  <Cell key={i} fill={d.hours >= 4 ? "#dc2626" : d.hours >= 2 ? "#ca8a04" : "#2563eb"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <h3 className="mb-2 text-sm font-medium">{t("workOrderStatus")}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={woStatusDonut} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80}>
                {woStatusDonut.map((s, i) => (
                  <Cell key={i} fill={STATUS_COLORS[s.status] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
