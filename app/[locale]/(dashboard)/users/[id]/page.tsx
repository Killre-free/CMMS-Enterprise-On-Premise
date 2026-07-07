"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGet, apiPatch, ApiError } from "@/lib/api-client";

interface UserDetail {
  id: string;
  employeeId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  roleId: string;
}

interface Role {
  id: string;
  name: string;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

export default function UserDetailPage() {
  const t = useTranslations("UserDetail");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => apiGet<UserDetail>(`/api/v1/users/${id}`),
  });
  const { data: roles } = useQuery({
    queryKey: ["roles", "options"],
    queryFn: () => apiGet<{ data: Role[] }>("/api/v1/roles"),
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setRoleId(user.roleId);
      setIsActive(user.isActive);
    }
  }, [user]);

  if (isLoading || !user) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await apiPatch(`/api/v1/users/${id}`, {
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        roleId,
        isActive,
      });
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("updateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push("/users")}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> {t("backToUsers")}
      </button>

      <h1 className="text-xl font-semibold">
        {user.employeeId} — {user.username}
      </h1>

      <div className="max-w-lg rounded-lg border border-border bg-background p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("firstName")}</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("lastName")}</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("phone")}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("role")}</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className={inputClass}
              disabled={user.isSuperAdmin}
            >
              {roles?.data.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              disabled={user.isSuperAdmin}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            {t("active")}
          </label>
          {user.isSuperAdmin && (
            <p className="text-xs text-muted-foreground">{t("superAdminNotice")}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{t("saved")}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? t("saving") : t("saveChanges")}
          </button>
        </form>
      </div>
    </div>
  );
}
