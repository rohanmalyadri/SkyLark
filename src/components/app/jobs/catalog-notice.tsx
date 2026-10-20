import { CloudOff, Radio } from "lucide-react";
import type { CatalogStatus } from "@/lib/services/catalog";
import { cn, timeAgo } from "@/lib/utils";

/**
 * Where listings come from and how fresh they are. When live sources are down or stale the
 * notice says so plainly instead of presenting old or sample data as current.
 */
export function CatalogNotice({ status, className }: { status: CatalogStatus; className?: string }) {
  const sources = status.sources.filter((s) => s.site);
  if (status.live) {
    return (
      <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle", className)}>
        <Radio className="size-3.5 text-success" aria-hidden />
        <span>
          Live listings · {status.activeLiveJobs} open roles · refreshed {timeAgo(status.lastSuccessAt!)}
        </span>
        <span aria-hidden>·</span>
        <span>
          Jobs by{" "}
          {sources.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ", "}
              <a href={s.site!} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-fg">
                {s.name}
              </a>
            </span>
          ))}
        </span>
      </p>
    );
  }
  return (
    <div role="status" className={cn("flex gap-3 rounded-lg border border-warning/30 bg-warning-soft/40 p-4 text-[13px]", className)}>
      <CloudOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div>
        <p className="font-medium text-fg">Live job data is unavailable right now</p>
        <p className="mt-0.5 text-muted">
          {status.problem}
          {status.activeLiveJobs > 0 && " Listings below may no longer be open."}
          {status.activeSampleJobs > 0 && " Roles marked “Sample” are fictional demo data, not real openings."}
        </p>
      </div>
    </div>
  );
}
