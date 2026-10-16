import { cn, initials } from "@/lib/utils";

/*
 * The Skylark logo is drawn as CSS masks (public/brand/*.png) so its colour is pure CSS:
 * grey at rest, the brand orange and ink on hover of the logo or its link (see .sk-logo in globals.css).
 */

/** The bird on its own. */
export function SkylarkMark({ className }: { className?: string }) {
  return (
    <span className={cn("sk-logo sk-logo--mark", className)} aria-hidden>
      <span className="sk-logo__mark" />
    </span>
  );
}

/** Bird and wordmark lockup, or the bird alone with `wordmark={false}`. */
export function Logo({ className, wordmark = true }: { className?: string; wordmark?: boolean }) {
  if (!wordmark) return <SkylarkMark className={cn("h-7", className)} />;
  return (
    <span className={cn("sk-logo sk-logo--lockup h-7", className)} role="img" aria-label="Skylark">
      <span className="sk-logo__mark" />
      <span className="sk-logo__word" />
    </span>
  );
}

/** Company monogram tinted with the company's brand colour at low opacity. */
export function CompanyMark({ name, color, size = "md", className }: { name: string; color: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: "size-7 text-[11px] rounded-md", md: "size-9 text-xs rounded-lg", lg: "size-12 text-sm rounded-xl" }[size];
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center border font-semibold tracking-tight", dims, className)}
      style={{ color: `color-mix(in srgb, ${color} 70%, #1F1F1F)`, background: `color-mix(in srgb, ${color} 10%, #FFFFFF)`, borderColor: `color-mix(in srgb, ${color} 35%, transparent)` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1 font-mono text-[10px] text-subtle", className)}>{children}</kbd>;
}
