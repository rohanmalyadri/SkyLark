"use client";

import { Plus } from "lucide-react";
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export interface Suggestion {
  name: string;
  source: string;
}

interface SuggestResponse {
  terms: Suggestion[];
  didYouMean?: Suggestion[];
  degraded: string[];
}

const SOURCE_LABEL: Record<string, string> = { skylark: "", stackoverflow: "Stack Overflow", esco: "ESCO", lightcast: "Lightcast" };

// One request per query across every input on the page.
const cache = new Map<string, Promise<SuggestResponse>>();
function fetchSuggestions(url: string) {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => (r.ok ? (r.json() as Promise<SuggestResponse>) : { terms: [], degraded: ["http"] }));
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

export interface SuggestInputHandle {
  focus(): void;
}

/**
 * Text input with server-backed suggestions (skills from recognised vocabularies, ESCO
 * occupations). Values are committed through `onPick`; with `requirePick`, free text that
 * doesn't match a suggestion is refused with an inline message instead of being accepted.
 */
export const SuggestInput = forwardRef<
  SuggestInputHandle,
  {
    id?: string;
    endpoint: string;
    onPick: (value: string) => void;
    validate?: (text: string) => string | null;
    requirePick?: boolean;
    placeholder?: string;
    disabled?: boolean;
    "aria-label"?: string;
    exclude?: string[];
    addLabel?: string;
    /** What the input holds, for messages ("skill"). */
    noun?: string;
    /** Offered when typed text matches nothing: lets the person ask staff to review it. */
    onRequest?: (text: string) => Promise<boolean>;
  }
>(function SuggestInput({ id, endpoint, onPick, validate, requirePick = true, placeholder, disabled, exclude = [], addLabel = "Add", noun = "entry", onRequest, "aria-label": ariaLabel }, ref) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [didYouMean, setDidYouMean] = useState<Suggestion[]>([]);
  const [requestable, setRequestable] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  const excluded = new Set(exclude.map((e) => e.toLowerCase()));
  const visible = items.filter((i) => !excluded.has(i.name.toLowerCase()));

  useEffect(() => {
    const q = text.trim();
    if (!q) {
      setItems([]);
      setLoading(false);
      return;
    }
    const local = validate?.(q);
    if (local) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let alive = true;
    const t = window.setTimeout(() => {
      fetchSuggestions(`${endpoint}?q=${encodeURIComponent(q)}`)
        .then((res) => {
          if (!alive) return;
          setItems(res.terms);
          setDidYouMean(res.didYouMean ?? []);
          setDegraded(res.degraded.length > 0);
          setActive(0);
        })
        .catch(() => alive && setDegraded(true))
        .finally(() => alive && setLoading(false));
    }, 180);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [text, endpoint, validate]);

  const commit = (value: string) => {
    onPick(value);
    setText("");
    setItems([]);
    setError(null);
    setDidYouMean([]);
    setRequestable(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  const tryCommitTyped = () => {
    const q = text.trim();
    if (!q) return;
    const local = validate?.(q);
    if (local) return setError(local);
    if (excluded.has(q.toLowerCase())) return setError("Already added");
    const exact = visible.find((i) => i.name.toLowerCase() === q.toLowerCase());
    if (exact) return commit(exact.name);
    if (!requirePick) return commit(q);
    if (loading) return setError("Checking…");
    if (!visible.length && !degraded) setRequestable(q);
    setError(visible.length ? "Pick one of the suggestions — free text can't be verified" : degraded ? "Suggestions are unavailable right now — try again shortly" : `“${q}” isn't a recognised ${noun}`);
  };

  const showList = open && !!text.trim() && (loading || visible.length > 0);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            id={id}
            value={text}
            disabled={disabled}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
              setError(null);
              setRequestable(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((i) => Math.min(visible.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (showList && visible[active]) commit(visible[active].name);
                else tryCommitTyped();
              } else if (e.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && visible[active] ? `${listId}-${active}` : undefined}
            aria-label={ariaLabel}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${listId}-err` : undefined}
            autoComplete="off"
            className="h-9 w-full rounded-md border border-line-strong bg-bg px-3 pr-8 text-sm text-fg placeholder:text-subtle transition-[border-color,box-shadow] duration-150 hover:border-fg/40 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-danger/60"
          />
          {loading && <Spinner className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />}
        </div>
        <button type="button" onClick={tryCommitTyped} disabled={disabled || !text.trim()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-[13px] text-fg transition-colors hover:bg-surface-2 disabled:opacity-50">
          <Plus className="size-4" /> {addLabel}
        </button>
      </div>
      {showList && (
        <ul id={listId} role="listbox" aria-label={ariaLabel ? `${ariaLabel} suggestions` : "Suggestions"} className="absolute inset-x-0 top-10 z-40 max-h-64 overflow-y-auto rounded-lg border border-line-strong bg-bg p-1 shadow-[0_18px_50px_rgb(0_0_0/0.12)]">
          {visible.length === 0 && loading && <li className="px-3 py-2 text-[13px] text-subtle">Searching…</li>}
          {visible.map((s, i) => (
            <li
              key={`${s.source}:${s.name}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setActive(i)}
              onClick={() => commit(s.name)}
              className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-[13px]", i === active ? "bg-accent-soft text-fg" : "text-muted")}
            >
              <span>{s.name}</span>
              {SOURCE_LABEL[s.source] && <span className="text-[11px] text-subtle">{SOURCE_LABEL[s.source]}</span>}
            </li>
          ))}
          {degraded && <li className="px-3 py-1.5 text-[11px] text-subtle">Some suggestion sources are unavailable right now.</li>}
        </ul>
      )}
      {error && (
        <p id={`${listId}-err`} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
      {error && didYouMean.length > 0 && (
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          Did you mean
          {didYouMean.map((d) => (
            <button key={d.name} type="button" onClick={() => commit(d.name)} className="rounded border border-line-strong px-1.5 py-0.5 text-fg hover:bg-surface-2">
              {d.name}
            </button>
          ))}
          ?
        </p>
      )}
      {requestable && onRequest && (
        <button
          type="button"
          disabled={requesting}
          onClick={async () => {
            setRequesting(true);
            const ok = await onRequest(requestable);
            setRequesting(false);
            if (ok) {
              setText("");
              setError(null);
              setRequestable(null);
              setDidYouMean([]);
            }
          }}
          className="mt-1.5 text-xs text-accent underline-offset-2 hover:underline disabled:opacity-50"
        >
          {requesting ? "Sending…" : `Not listed? Ask a reviewer to add “${requestable}”`}
        </button>
      )}
    </div>
  );
});
