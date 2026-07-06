"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { apiGet, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface RoleDetail {
  id: string;
  name: string;
  permissions: { moduleKey: string; action: string }[];
}

const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "workOrder", label: "Work Orders" },
  { key: "machine", label: "Machines" },
  { key: "pm", label: "Preventive Maintenance" },
  { key: "checkSheet", label: "Check Sheets" },
  { key: "sparePart", label: "Spare Parts" },
  { key: "reports", label: "Reports" },
  { key: "users", label: "Users & Roles" },
  { key: "auditLog", label: "Audit Log" },
  { key: "settings", label: "Settings" },
];
const ACTIONS = ["view", "add", "edit", "delete"] as const;

export default function RolePermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

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
      for (const m of MODULES) next[m.key] = new Set();
      for (const p of role.permissions) {
        if (!next[p.moduleKey]) next[p.moduleKey] = new Set();
        next[p.moduleKey].add(p.action);
      }
      setGrid(next);
    }
  }, [role]);

  if (isLoading || !role) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
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
        throw new ApiError(res.status, body.title ?? "Failed to save permissions");
      }
      queryClient.invalidateQueries({ queryKey: ["role", id] });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save permissions");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push("/roles")}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to Roles
      </button>

      <h1 className="text-xl font-semibold">{role.name} — Permissions</h1>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-3 font-medium">Module</th>
              {ACTIONS.map((a) => (
                <th key={a} className="p-3 text-center font-medium capitalize">
                  {a}
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
      {success && <p className="text-sm text-green-600">Permissions saved.</p>}
      <button
        onClick={handleSave}
        disabled={submitting}
        className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save Permissions"}
      </button>
    </div>
  );
}
