"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import { apiGet, apiPatch, ApiError } from "@/lib/api-client";

interface SystemSettings {
  companyName: string;
  logoUrl: string | null;
  timezone: string;
  language: string;
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

const TIMEZONES = ["Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "UTC"];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "th", label: "ไทย" },
];

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<SystemSettings>("/api/v1/settings"),
  });

  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [timezone, setTimezone] = useState("Asia/Bangkok");
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setCompanyName(data.companyName);
      setLogoUrl(data.logoUrl ?? "");
      setTimezone(data.timezone);
      setLanguage(data.language);
    }
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/uploads", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.title ?? res.statusText, body.detail);
      }
      const { url } = await res.json();
      setLogoUrl(url);
    } catch (err) {
      setError(err instanceof ApiError ? (err.detail ?? err.message) : t("saveFailed"));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await apiPatch("/api/v1/settings", {
        companyName,
        logoUrl: logoUrl || undefined,
        timezone,
        language,
      });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

      <div className="max-w-lg rounded-lg border border-border bg-background p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("companyName")}</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("logoUrl")}</label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-12 w-12 rounded-md border border-border object-contain" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
                  {(companyName || "C").charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploadingLogo ? t("uploading") : t("uploadLogo")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("timezone")}</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("defaultLanguage")}</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{t("saved")}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? t("saving") : t("saveSettings")}
          </button>
        </form>
      </div>
    </div>
  );
}
