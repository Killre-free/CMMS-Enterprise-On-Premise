"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { apiGet, apiPost, ApiError, type Page } from "@/lib/api-client";
import { Badge } from "@/components/shared/Badge";
import { Modal } from "@/components/shared/Modal";

interface UserRow {
  id: string;
  employeeId: string;
  username: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  role: { name: string };
  department: { name: string } | null;
}

interface Role {
  id: string;
  name: string;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("Users");
  const queryClient = useQueryClient();
  const { data: roles } = useQuery({
    queryKey: ["roles", "options"],
    queryFn: () => apiGet<{ data: Role[] }>("/api/v1/roles"),
  });
  const [employeeId, setEmployeeId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/v1/users", { employeeId, username, password, firstName, lastName, roleId });
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
        <label className="mb-1 block text-sm font-medium">{t("employeeId")}</label>
        <input required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("firstName")}</label>
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("lastName")}</label>
          <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("username")}</label>
        <input required value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("password")}</label>
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("role")}</label>
        <select required value={roleId} onChange={(e) => setRoleId(e.target.value)} className={inputClass}>
          <option value="">{t("selectRole")}</option>
          {roles?.data.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? t("creating") : t("createUser")}
      </button>
    </form>
  );
}

export default function UsersPage() {
  const t = useTranslations("Users");
  const tc = useTranslations("Common");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set("search", search);

  const { data, isLoading, error } = useQuery({
    queryKey: ["users", search],
    queryFn: () => apiGet<Page<UserRow>>(`/api/v1/users?${params.toString()}`),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t("title_plural")}</h1>
        <div className="flex gap-2">
          <Link
            href="/roles"
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            {t("manageRoles")}
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus size={16} /> {t("newUser")}
          </button>
        </div>
      </div>

      <input
        placeholder={t("searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`${inputClass} max-w-sm`}
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-3 font-medium">{t("employeeId")}</th>
              <th className="p-3 font-medium">{tc("name")}</th>
              <th className="p-3 font-medium">{t("username")}</th>
              <th className="p-3 font-medium">{t("role")}</th>
              <th className="p-3 font-medium">{t("department")}</th>
              <th className="p-3 font-medium">{tc("status")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  {tc("loading")}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-destructive">
                  {t("loadFailed")}
                </td>
              </tr>
            )}
            {data?.data.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-3">
                  <Link href={`/users/${u.id}`} className="font-medium text-primary hover:underline">
                    {u.employeeId}
                  </Link>
                </td>
                <td className="p-3">
                  {u.firstName} {u.lastName}
                </td>
                <td className="p-3">{u.username}</td>
                <td className="p-3">{u.role.name}</td>
                <td className="p-3">{u.department?.name ?? "—"}</td>
                <td className="p-3">
                  <Badge color={u.isActive ? "green" : "gray"}>{u.isActive ? tc("active") : tc("inactive")}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("newUser")}>
        <CreateUserForm onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
