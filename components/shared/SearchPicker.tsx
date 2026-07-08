"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export interface PickableItem {
  id: string;
  code: string;
  label: string;
}

interface SearchPickerProps {
  items: PickableItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  noResultsText: string;
  changeLabel: string;
}

// A scanner (handheld barcode/QR reader, or a phone camera app pointed at a
// printed label) types the item's code as keystrokes and submits it like a
// human pressing Enter, so an exact code match auto-selects without any
// extra UI — this same component backs both the machine and spare-part
// pickers since both already carry a printed qrCode/barcode.
export function SearchPicker({ items, value, onChange, placeholder, noResultsText, changeLabel }: SearchPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = items.find((i) => i.id === value) ?? null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 50);
    return items.filter((i) => i.code.toLowerCase().includes(q) || i.label.toLowerCase().includes(q)).slice(0, 50);
  }, [items, query]);

  useEffect(() => {
    const exact = items.find((i) => i.code.toLowerCase() === query.trim().toLowerCase());
    if (exact) {
      onChange(exact.id);
      setQuery("");
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, items]);

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
          {selected.code} — {selected.label}
        </span>
        <button type="button" onClick={() => onChange("")} aria-label={changeLabel} className="text-muted-foreground hover:text-foreground">
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
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none"
          autoComplete="off"
        />
      </div>
      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-background shadow-lg">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{noResultsText}</li>}
          {results.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(i.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {i.code} — {i.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
