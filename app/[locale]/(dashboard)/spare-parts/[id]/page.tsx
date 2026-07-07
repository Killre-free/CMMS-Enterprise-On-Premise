"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface SparePartDetail {
  id: string;
  partCode: string;
  partName: string;
  unit: string;
  currentStock: number;
  safetyStock: number;
  unitCost: number | null;
  transactions: {
    id: string;
    type: string;
    quantity: number;
    createdAt: string;
  }[];
}

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const TX_TYPES = ["Receive", "Issue", "Return", "Adjustment"];

export default function SparePartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [type, setType] = useState("Receive");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: part, isLoading } = useQuery({
    queryKey: ["spare-part", id],
    queryFn: () => apiGet<SparePartDetail>(`/api/v1/spare-parts/${id}`),
  });

  if (isLoading || !part) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost(`/api/v1/spare-parts/${id}/stock`, { type, quantity: Number(quantity) });
      setQuantity("");
      queryClient.invalidateQueries({ queryKey: ["spare-part", id] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record stock transaction");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push("/spare-parts")}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to Spare Parts
      </button>

      <h1 className="text-xl font-semibold">
        {part.partCode} — {part.partName}
      </h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <dt className="text-muted-foreground">Current Stock</dt>
              <dd className="sm:col-span-2">
                {part.currentStock} {part.unit}
              </dd>
              <dt className="text-muted-foreground">Safety Stock</dt>
              <dd className="sm:col-span-2">
                {part.safetyStock} {part.unit}
              </dd>
              <dt className="text-muted-foreground">Unit Cost</dt>
              <dd className="sm:col-span-2">{part.unitCost ?? "—"}</dd>
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <h2 className="mb-2 text-sm font-medium">Stock Card</h2>
            {part.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 font-medium">Quantity</th>
                    <th className="py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {part.transactions.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="py-2">{t.type}</td>
                      <td className="py-2">{t.quantity}</td>
                      <td className="py-2 text-muted-foreground">{formatDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <h2 className="mb-2 text-sm font-medium">Record Stock Transaction</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              {TX_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Record Transaction"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
