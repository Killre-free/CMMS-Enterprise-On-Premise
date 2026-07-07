"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/api-client";
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
  department: { name: string } | null;
  pmPlans: { id: string; name: string; nextDueAt: string | null; isActive: boolean }[];
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

  const { data: machine, isLoading } = useQuery({
    queryKey: ["machine", id],
    queryFn: () => apiGet<MachineDetail>(`/api/v1/machines/${id}`),
  });

  if (isLoading || !machine) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push("/machines")}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> {t("backToMachines")}
      </button>

      <div>
        <h1 className="text-xl font-semibold">
          {machine.machineCode} — {machine.machineName}
        </h1>
        <p className="text-sm text-muted-foreground">{machine.department?.name}</p>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
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

      <div className="rounded-lg border border-border bg-background p-4">
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

      <div className="rounded-lg border border-border bg-background p-4">
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
