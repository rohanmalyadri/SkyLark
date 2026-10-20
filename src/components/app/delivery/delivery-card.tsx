"use client";

import { AlertTriangle, ArrowRight, Flame, Pause, Play, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { pauseDeliveryAction, resumeDeliveryAction } from "@/app/actions/candidate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/ui/panel";
import type { DeliverySummary } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { cn } from "@/lib/utils";

/**
 * The promise, kept visible: how many applications went out today, how the week looks, and
 * what — if anything — is stopping us. The bars are real submissions, each backed by an
 * application row with its confirmation reference.
 */
export function DeliveryCard({ summary }: { summary: DeliverySummary }) {
  const [reason, setReason] = useState("");
  const [pausing, setPausing] = useState(false);
  const pause = useAction(pauseDeliveryAction, { onSuccess: () => setPausing(false) });
  const resume = useAction(resumeDeliveryAction);

  const { today, target, last7Days, streakDays, submittedTotal, paused, blocking } = summary;
  const pct = target === 0 ? 0 : Math.min(100, Math.round((today.submitted / target) * 100));
  const peak = Math.max(1, ...last7Days.map((d) => Math.max(d.submitted, d.target)));
  const blocked = blocking.length > 0;

  return (
    <Panel>
      <PanelHeader
        title="Applications sent for you"
        description={paused ? "Paused at your request." : target === 0 ? "No target today." : `${target} a working day on your plan.`}
        action={
          streakDays > 0 ? (
            <Badge tone="success">
              <Flame className="size-3" /> {streakDays}-day streak
            </Badge>
          ) : undefined
        }
      />

      {blocked && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-warning-soft/50 px-5 py-3">
          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
          <p className="min-w-0 flex-1 text-[13px] text-fg">
            {blocking.length} application {blocking.length === 1 ? "question" : "questions"} still need an answer — we can&apos;t submit forms until they&apos;re done.
          </p>
          <Button asChild size="sm" variant="secondary">
            <Link href="/answers">
              Finish answers <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <div className="px-5 py-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[32px] leading-none tabular-nums text-fg">
              {today.submitted}
              <span className="text-lg text-subtle">/{target}</span>
            </p>
            <p className="mt-1.5 text-[13px] text-muted">
              {paused ? "Paused" : today.status === "delivered" ? "Today's target met" : today.status === "short" ? "Closed short today" : today.status === "skipped" ? "Not a working day" : "In progress today"}
            </p>
          </div>
          <p className="text-right text-[13px] text-muted">
            <span className="font-mono tabular-nums text-fg">{submittedTotal}</span> sent in total
          </p>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className={cn("h-full rounded-full transition-[width] duration-500", pct >= 100 ? "bg-success" : "bg-accent")} style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-5 flex items-end gap-1.5" role="img" aria-label="Applications sent each of the last seven days">
          {last7Days.map((d) => {
            const met = d.target > 0 && d.submitted >= d.target;
            return (
              <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-mono tabular-nums text-subtle">{d.submitted || ""}</span>
                <span
                  className={cn("w-full rounded-sm transition-colors", d.target === 0 ? "bg-surface-3" : met ? "bg-success/70" : d.submitted > 0 ? "bg-accent/60" : "bg-surface-3")}
                  style={{ height: `${Math.max(3, (Math.max(d.submitted, 0) / peak) * 56)}px` }}
                  title={`${d.day}: ${d.submitted} of ${d.target}`}
                />
                <span className="text-[10px] text-subtle">{new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en", { weekday: "narrow", timeZone: "UTC" })}</span>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <Button asChild size="sm" variant="ghost">
          <Link href="/applications">
            <Send className="size-3.5" /> See every application
          </Link>
        </Button>
        {paused ? (
          <Button size="sm" variant="secondary" onClick={() => void resume.execute()} loading={resume.pending}>
            <Play className="size-3.5" /> Resume
          </Button>
        ) : pausing ? (
          <div className="flex items-center gap-2">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why? e.g. on holiday" aria-label="Reason for pausing" className="h-8 w-48 text-[13px]" />
            <Button size="sm" onClick={() => void pause.execute(reason)} loading={pause.pending} disabled={reason.trim().length < 3}>
              Pause
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPausing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setPausing(true)}>
            <Pause className="size-3.5" /> Pause applications
          </Button>
        )}
      </footer>
    </Panel>
  );
}
