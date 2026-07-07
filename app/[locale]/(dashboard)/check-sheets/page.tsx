"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api-client";
import { Badge } from "@/components/shared/Badge";
import { Modal } from "@/components/shared/Modal";
import { formatDate } from "@/lib/utils";

interface Field {
  id: string;
  key: string;
  type: string;
  label: string;
  required: boolean;
  order: number;
}

interface Template {
  id: string;
  name: string;
  version: number;
  fields: Field[];
}

interface Submission {
  id: string;
  status: string;
  createdAt: string;
  template: { name: string };
  submittedBy: { firstName: string; lastName: string };
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const FIELD_TYPES = ["Text", "Number", "Boolean", "Select", "Photo", "Signature", "Calculated", "Date"];

function CreateTemplateForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [fields, setFields] = useState([{ key: "", type: "Text", label: "", required: false }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(i: number, patch: Partial<(typeof fields)[number]>) {
    setFields((f) => f.map((field, idx) => (idx === i ? { ...field, ...patch } : field)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/v1/check-sheets/templates", {
        name,
        fields: fields.map((f, i) => ({ ...f, order: i })),
      });
      queryClient.invalidateQueries({ queryKey: ["check-sheet-templates"] });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create template");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Template Name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Fields</label>
        {fields.map((field, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
            <input
              required
              placeholder="key"
              value={field.key}
              onChange={(e) => updateField(i, { key: e.target.value })}
              className={`${inputClass} w-24`}
            />
            <input
              required
              placeholder="Label"
              value={field.label}
              onChange={(e) => updateField(i, { label: e.target.value })}
              className={`${inputClass} flex-1`}
            />
            <select value={field.type} onChange={(e) => updateField(i, { type: e.target.value })} className={`${inputClass} w-32`}>
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(i, { required: e.target.checked })}
              />
              Required
            </label>
            <button
              type="button"
              onClick={() => setFields((f) => f.filter((_, idx) => idx !== i))}
              aria-label="Remove field"
            >
              <Trash2 size={16} className="text-destructive" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setFields((f) => [...f, { key: "", type: "Text", label: "", required: false }])}
          className="flex w-fit items-center gap-1 text-sm text-primary"
        >
          <Plus size={14} /> Add field
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Template"}
      </button>
    </form>
  );
}

function SubmitCheckSheetForm({ template, onDone }: { template: Template; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent, status: "Draft" | "Submitted") {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/v1/check-sheets/submissions", {
        templateId: template.id,
        status,
        responses: template.fields.map((f) => ({ fieldId: f.id, value: values[f.id] ?? "" })),
      });
      queryClient.invalidateQueries({ queryKey: ["check-sheet-submissions"] });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit check sheet");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, "Submitted")} className="flex flex-col gap-3">
      {template.fields
        .sort((a, b) => a.order - b.order)
        .map((f) => (
          <div key={f.id}>
            <label className="mb-1 block text-sm font-medium">
              {f.label}
              {f.required && " *"}
            </label>
            {f.type === "Boolean" ? (
              <input
                type="checkbox"
                checked={values[f.id] === "true"}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: String(e.target.checked) }))}
              />
            ) : f.type === "Calculated" ? (
              <input disabled placeholder="Computed automatically" className={inputClass} />
            ) : (
              <input
                type={f.type === "Number" ? "number" : f.type === "Date" ? "date" : "text"}
                required={f.required}
                value={values[f.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                className={inputClass}
              />
            )}
          </div>
        ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={(e) => handleSubmit(e, "Draft")}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
}

export default function CheckSheetsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [fillTemplate, setFillTemplate] = useState<Template | null>(null);

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["check-sheet-templates"],
    queryFn: () => apiGet<{ data: Template[] }>("/api/v1/check-sheets/templates"),
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["check-sheet-submissions"],
    queryFn: () => apiGet<{ data: Submission[] }>("/api/v1/check-sheets/submissions"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Check Sheets</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus size={16} /> New Template
        </button>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <h2 className="mb-2 text-sm font-medium">Templates</h2>
        {templatesLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {templates?.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No templates yet.</p>
        )}
        <ul className="flex flex-col gap-2">
          {templates?.data.map((t) => (
            <li key={t.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
              <span>
                {t.name} <span className="text-xs text-muted-foreground">v{t.version} · {t.fields.length} fields</span>
              </span>
              <button onClick={() => setFillTemplate(t)} className="text-primary hover:underline">
                Fill Out
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <h2 className="mb-2 text-sm font-medium">Recent Submissions</h2>
        {submissionsLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {submissions?.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        )}
        <ul className="flex flex-col gap-2">
          {submissions?.data.map((s) => (
            <li key={s.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
              <span>
                {s.template.name} — {s.submittedBy.firstName} {s.submittedBy.lastName}
              </span>
              <div className="flex items-center gap-2">
                <Badge color={s.status === "Submitted" ? "green" : "gray"}>{s.status}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Check Sheet Template">
        <CreateTemplateForm onDone={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!fillTemplate} onClose={() => setFillTemplate(null)} title={fillTemplate?.name ?? ""}>
        {fillTemplate && <SubmitCheckSheetForm template={fillTemplate} onDone={() => setFillTemplate(null)} />}
      </Modal>
    </div>
  );
}
