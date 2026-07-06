"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  useEffect(() => {
    if (data) {
      setCompanyName(data.companyName);
      setLogoUrl(data.logoUrl ?? "");
      setTimezone(data.timezone);
      setLanguage(data.language);
    }
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
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
      setError(err instanceof ApiError ? err.message : "Failed to save settings");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="max-w-lg rounded-lg border border-border bg-background p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Company Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Logo URL</label>
            <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
              {TIMEZONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">Saved.</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
