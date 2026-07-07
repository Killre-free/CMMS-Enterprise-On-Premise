"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGet, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface RoleDetail {
  id: string;
  name: string;
  permissions: { moduleKey: string; action: string }[];
}

const MODULE_KEYS = [
  "dashboard",
  "workOrder",
  "machine",
  "pm",
  "checkSheet",
  "sparePart",
  "reports",
  "users",
  "auditLog",
  "settings",
] as const;
const ACTIONS = ["view", "add", "edit", "delete"] as const;

export default function RolePermissionsPage() {
  const t = useTranslations("RoleDetail");
  const tn = useTranslations("Nav");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const MODULE_LABEL_KEYS: Record<(typeof MODULE_KEYS)[number], string> = {
    dashboard: "dashboard",
    workOrder: "workOrders",
    machine: "machines",
    pm: "pm",
    checkSheet: "checkSheets",
    sparePart: "spareParts",
    reports: "reports",
    users: "users",
    auditLog: "auditLog",
    settings: "settings",
  };
  const MODULES = MODULE_KEYS.map((key) => ({
    key,
    label: key === "users" ? t("usersAndRoles") : tn(MODULE_LABEL_KEYS[key]),
  }));

  const { data: role, isLoading } = useQuery({
    queryKey: ["role", id],
    queryFn: () => apiGet<RoleDetail>(`/api/v1/roles/${id}`),
  });

  const [grid, setGrid] = useState<Record<string, Set<string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (role) {
      const next: Record<string, Set<string>> = {};
      for (const key of MODULE_KEYS) next[key] = new Set();
      for (const p of role.permissions) {
        if (!next[p.moduleKey]) next[p.moduleKey] = new Set();
        next[p.moduleKey].add(p.action);
      }
      setGrid(next);
    }
  }, [role]);

  if (isLoading || !role) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  function toggle(moduleKey: string, action: string) {
    setGrid((g) => {
      const next = { ...g, [moduleKey]: new Set(g[moduleKey] ?? []) };
      if (next[moduleKey].has(action)) next[moduleKey].delete(action);
      else next[moduleKey].add(action);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const permissions = MODULES.flatMap((m) =>
        ACTIONS.map((action) => ({
          moduleKey: m.key,
          action,
          granted: grid[m.key]?.has(action) ?? false,
        }))
      );
      const res = await fetch(`/api/v1/roles/${id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.title ?? t("saveFailed"));
      }
      queryClient.invalidateQueries({ queryKey: ["role", id] });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const ACTION_LABEL_KEYS: Record<(typeof ACTIONS)[number], string> = {
    view: "actionView",
    add: "actionAdd",
    edit: "actionEdit",
    delete: "actionDelete",
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push("/roles")}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> {t("backToRoles")}
      </button>

      <h1 className="text-xl font-semibold">{t("permissionsFor", { name: role.name })}</h1>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-3 font-medium">{t("module")}</th>
              {ACTIONS.map((a) => (
                <th key={a} className="p-3 text-center font-medium capitalize">
                  {t(ACTION_LABEL_KEYS[a])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m.key} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{m.label}</td>
                {ACTIONS.map((a) => (
                  <td key={a} className="p-3 text-center">
                    <input
                      type="checkbox"
                      className={cn("h-4 w-4")}
                      checked={grid[m.key]?.has(a) ?? false}
                      onChange={() => toggle(m.key, a)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{t("permissionsSaved")}</p>}
      <button
        onClick={handleSave}
        disabled={submitting}
        className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? t("saving") : t("savePermissions")}
      </button>
    </div>
  );
}
