"use client";

import { Check, ChevronDown, RotateCcw, Search } from "lucide-react";
import { Popover as P } from "radix-ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { menuPanel } from "./select-menu";
import { Spinner } from "./spinner";

export interface ComboOption {
  value: string;
  label: string;
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Searchable dropdown for long lists (countries, states). Type to filter, arrows to move,
 * Enter to pick, Esc to close. Prefix matches rank above substring matches.
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  loading,
  error,
  onRetry,
  disabled,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return options;
    const starts: ComboOption[] = [];
    const contains: ComboOption[] = [];
    for (const o of options) {
      const l = fold(o.label);
      if (l.startsWith(q)) starts.push(o);
      else if (l.includes(q)) contains.push(o);
    }
    return [...starts, ...contains];
  }, [options, query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (o: ComboOption) => {
    onChange(o.value);
    setOpen(false);
    setQuery("");
  };

  return (
    <P.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          // Open on the current selection so long lists don't restart at "A".
          setActive(Math.max(0, options.findIndex((opt) => opt.value === value)));
        } else setQuery("");
      }}
    >
      <P.Trigger
        id={id}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || undefined}
        className="group flex h-9 w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-bg px-3 text-left text-sm transition-[border-color,box-shadow] duration-150 hover:border-fg/40 focus:outline-none focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger/60 data-[state=open]:border-accent data-[state=open]:shadow-[0_0_0_3px_var(--accent-soft)]"
      >
        <span className={cn("truncate", selected ? "text-fg" : "text-subtle")}>{selected?.label ?? (loading ? "Loading…" : placeholder)}</span>
        {loading ? <Spinner className="size-3.5 text-subtle" /> : <ChevronDown className="size-4 shrink-0 text-subtle transition-transform duration-200 group-data-[state=open]:rotate-180" />}
      </P.Trigger>
      <P.Portal>
        <P.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(menuPanel, "flex w-[var(--radix-popover-trigger-width)] min-w-60 flex-col")}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(filtered.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Home") {
              e.preventDefault();
              setActive(0);
            } else if (e.key === "End") {
              e.preventDefault();
              setActive(filtered.length - 1);
            } else if (e.key === "Enter") {
              e.preventDefault();
              const o = filtered[active];
              if (o) pick(o);
            }
          }}
        >
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="size-3.5 shrink-0 text-subtle" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listId}
              aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
              className="h-10 w-full bg-transparent text-[13px] text-fg placeholder:text-subtle focus:outline-none"
            />
          </div>
          {error ? (
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-[13px] text-muted">
              Couldn&apos;t load the list.
              {onRetry && (
                <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-accent hover:underline">
                  <RotateCcw className="size-3.5" /> Try again
                </button>
              )}
            </div>
          ) : loading ? (
            <div className="space-y-1 p-2" aria-busy>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-8" />
              ))}
            </div>
          ) : (
            <ul id={listId} ref={listRef} role="listbox" aria-label={ariaLabel} className="max-h-72 overflow-y-auto overscroll-contain p-1">
              {filtered.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-subtle">{emptyText}</li>}
              {filtered.map((o, i) => {
                const isSelected = o.value === value;
                return (
                  <li
                    key={o.value}
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSelected}
                    onMouseMove={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={cn("relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-[13px] transition-colors", i === active ? "bg-accent-soft text-fg" : "text-muted", isSelected && "text-fg")}
                  >
                    {isSelected && <Check className="absolute left-2.5 size-3.5 text-accent" aria-hidden />}
                    {o.label}
                  </li>
                );
              })}
            </ul>
          )}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
