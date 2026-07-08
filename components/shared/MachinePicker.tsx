"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

interface PickableMachine {
  id: string;
  machineCode: string;
  machineName: string;
}

interface MachinePickerProps {
  machines: PickableMachine[];
  value: string;
  onChange: (id: string) => void;
}

// A scanner (handheld or camera app pointed at a machine's printed QR label)
// types the machine code as keystrokes and submits it like a human pressing
// Enter, so an exact machineCode match auto-selects without any extra UI.
export function MachinePicker({ machines, value, onChange }: MachinePickerProps) {
  const t = useTranslations("WorkOrders");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = machines.find((m) => m.id === value) ?? null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return machines.slice(0, 50);
    return machines
      .filter((m) => m.machineCode.toLowerCase().includes(q) || m.machineName.toLowerCase().includes(q))
      .slice(0, 50);
  }, [machines, query]);

  useEffect(() => {
    const exact = machines.find((m) => m.machineCode.toLowerCase() === query.trim().toLowerCase());
    if (exact) {
      onChange(exact.id);
      setQuery("");
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, machines]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
        <span>
          {selected.machineCode} — {selected.machineName}
        </span>
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("changeMachine")}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
        <Search size={16} className="shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={t("searchOrScanMachine")}
          className="w-full bg-transparent text-sm outline-none"
          autoComplete="off"
        />
      </div>
      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-background shadow-lg">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{t("noMachinesFound")}</li>}
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(m.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {m.machineCode} — {m.machineName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
