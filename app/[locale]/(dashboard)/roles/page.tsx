"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api-client";
import { Modal } from "@/components/shared/Modal";

interface Role {
  id: string;
  name: string;
  description: string | null;
  _count: { users: number };
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

function CreateRoleForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("Roles");
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/v1/roles", { name, description: description || undefined });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium">{t("roleName")}</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("description")}</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? t("creating") : t("createRole")}
      </button>
    </form>
  );
}

export default function RolesPage() {
  const t = useTranslations("Roles");
  const tc = useTranslations("Common");
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiGet<{ data: Role[] }>("/api/v1/roles"),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <Link href="/users" className="text-sm text-primary hover:underline">
            ← {t("backToUsers")}
          </Link>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus size={16} /> {t("newRole")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-3 font-medium">{tc("name")}</th>
              <th className="p-3 font-medium">{t("description")}</th>
              <th className="p-3 font-medium">{t("usersCount")}</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  {tc("loading")}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-destructive">
                  {t("loadFailed")}
                </td>
              </tr>
            )}
            {data?.data.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">{r.description ?? "—"}</td>
                <td className="p-3">{r._count.users}</td>
                <td className="p-3">
                  <Link href={`/roles/${r.id}`} className="text-primary hover:underline">
                    {t("editPermissions")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("newRole")}>
        <CreateRoleForm onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
