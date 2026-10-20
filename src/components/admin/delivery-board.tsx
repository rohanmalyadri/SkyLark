"use client";

import { Check, ClipboardCheck, Hand, Lock, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { claimDeliveryRunAction, closeDeliveryRunAction, recordSubmissionAction, unlockSelfIdentificationAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Panel, PanelHeader, SectionLabel } from "@/components/ui/panel";
import type { DeliveryRunStatus, DeliveryRunWithContext, SelfIdentification } from "@/lib/domain/types";
import type { Tone } from "@/lib/domain/constants";
import { useAction } from "@/lib/hooks/use-action";
import { cn } from "@/lib/utils";

const RUN_TONE: Record<DeliveryRunStatus, { tone: Tone; label: string }> = {
  scheduled: { tone: "neutral", label: "Scheduled" },
  in_progress: { tone: "accent", label: "In progress" },
  delivered: { tone: "success", label: "Delivered" },
  short: { tone: "warning", label: "Short" },
  skipped: { tone: "neutral", label: "Skipped" },
};

/** Logs one submission against a run, with the proof the candidate will see. */
function RecordSubmission({ onDone }: { onDone: () => void }) {
  const [v, setV] = useState({ applicationId: "", portal: "", confirmationRef: "" });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const record = useAction(recordSubmissionAction, {
    onSuccess: () => {
      setV({ applicationId: "", portal: "", confirmationRef: "" });
      setErrors({});
      onDone();
    },
  });

  return (
    <div className="space-y-3 border-t border-line bg-surface-2/50 px-5 py-4">
      <SectionLabel>Record a submission</SectionLabel>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Application ID" error={errors.applicationId?.[0]}>
          <Input value={v.applicationId} onChange={(e) => setV({ ...v, applicationId: e.target.value })} placeholder="From the tracker" />
        </Field>
        <Field label="Portal" error={errors.portal?.[0]}>
          <Input value={v.portal} onChange={(e) => setV({ ...v, portal: e.target.value })} placeholder="Workday, Greenhouse…" />
        </Field>
        <Field label="Confirmation ref" optional error={errors.confirmationRef?.[0]}>
          <Input value={v.confirmationRef} onChange={(e) => setV({ ...v, confirmationRef: e.target.value })} placeholder="If the portal gave one" />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">The candidate sees the portal and reference against the application.</p>
        <Button
          size="sm"
          loading={record.pending}
          disabled={!v.applicationId.trim() || v.portal.trim().length < 2}
          onClick={async () => {
            const res = await record.execute(v);
            if (!res.ok) setErrors(res.fieldErrors ?? {});
          }}
        >
          <Check className="size-3.5" /> Record
        </Button>
      </div>
    </div>
  );
}

/** Self-identification is hidden until a specialist states which form needs it. */
function SelfIdUnlock({ userId }: { userId: string }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SelfIdentification | null>(null);
  const unlock = useAction(unlockSelfIdentificationAction, { onSuccess: (d) => setData(d) });

  if (data) {
    const rows: [string, string][] = [
      ["Gender", data.gender ?? "Not answered"],
      ["Self-described", data.genderSelfDescribed || "—"],
      ["Hispanic or Latino", data.hispanicOrLatino ?? "Not answered"],
      ["Race or ethnicity", data.raceEthnicity.length ? data.raceEthnicity.join(", ") : "Not answered"],
      ["Veteran status", data.veteranStatus ?? "Not answered"],
      ["Disability status", data.disabilityStatus ?? "Not answered"],
    ];
    return (
      <div className="border-t border-line bg-warning-soft/40 px-5 py-4">
        <p className="flex items-center gap-2 text-xs text-fg">
          <ShieldAlert className="size-3.5 text-warning" aria-hidden /> Unlocked and recorded in the audit log. Use it for the named form only.
        </p>
        <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
          {rows.map(([k, val]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-line/60 py-1">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right text-fg">{val.replace(/_/g, " ")}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <div className="border-t border-line px-5 py-3.5">
      {open ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Which form needs this?" className="min-w-56 flex-1">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Workday EEO step for Northwind req 4821" />
          </Field>
          <Button size="sm" loading={unlock.pending} disabled={reason.trim().length < 10} onClick={() => void unlock.execute(userId, reason)}>
            Unlock
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg">
          <Lock className="size-3.5" /> Unlock self-identification for a form
        </button>
      )}
    </div>
  );
}

function RunRow({ run, mine }: { run: DeliveryRunWithContext; mine: boolean }) {
  const [note, setNote] = useState(run.note);
  const [closing, setClosing] = useState(false);
  const claim = useAction(claimDeliveryRunAction);
  const close = useAction(closeDeliveryRunAction, { onSuccess: () => setClosing(false) });
  const meta = RUN_TONE[run.status];
  const pct = run.target === 0 ? 0 : Math.min(100, Math.round((run.submitted / run.target) * 100));
  const short = run.submitted < run.target;

  return (
    <Panel as="article" className={cn(mine && "border-accent-line")}>
      <PanelHeader
        title={run.candidateName}
        description={run.candidateEmail}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={meta.tone} dot pulse={run.status === "in_progress"}>
              {meta.label}
            </Badge>
            <span className="font-mono text-sm tabular-nums text-fg">
              {run.submitted}/{run.target}
            </span>
          </div>
        }
      />
      <div className="px-5 py-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className={cn("h-full rounded-full", pct >= 100 ? "bg-success" : "bg-accent")} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{run.operatorName ? `Specialist: ${run.operatorName}` : "Unclaimed"}</span>
          {run.note && <span className="text-subtle">· {run.note}</span>}
        </p>
      </div>

      {mine && run.status !== "delivered" && run.status !== "skipped" && <RecordSubmission onDone={() => setClosing(false)} />}
      {mine && <SelfIdUnlock userId={run.userId} />}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        {!run.operatorId ? (
          <Button size="sm" variant="secondary" loading={claim.pending} onClick={() => void claim.execute(run.id)}>
            <Hand className="size-3.5" /> Claim this run
          </Button>
        ) : (
          <span className="text-xs text-muted">{mine ? "Yours for today" : `Claimed by ${run.operatorName}`}</span>
        )}
        {mine && run.status !== "delivered" && (
          closing ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
              <Field label={short ? "Explain the shortfall" : "Closing note"} optional={!short} className="min-w-56 flex-1">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" placeholder={short ? "Only 9 new postings cleared their score floor today." : ""} />
              </Field>
              <div className="flex gap-2">
                <Button size="sm" loading={close.pending} disabled={short && note.trim().length < 10} onClick={() => void close.execute({ runId: run.id, note })}>
                  Close day
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setClosing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setClosing(true)}>
              <ClipboardCheck className="size-3.5" /> Close out the day
            </Button>
          )
        )}
      </footer>
    </Panel>
  );
}

export function DeliveryBoard({ runs, operatorId }: { runs: DeliveryRunWithContext[]; operatorId: string }) {
  const [filter, setFilter] = useState<"all" | "mine" | "unclaimed" | "short">("all");
  const shown = runs.filter((r) =>
    filter === "mine" ? r.operatorId === operatorId : filter === "unclaimed" ? !r.operatorId : filter === "short" ? r.status === "short" || (r.status !== "delivered" && r.submitted < r.target) : true,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["all", "mine", "unclaimed", "short"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "h-7 rounded-sm border px-2.5 text-xs font-medium capitalize transition-colors",
              filter === f ? "border-accent bg-accent-soft text-accent" : "border-line-strong bg-bg text-muted hover:border-fg/40 hover:text-fg",
            )}
          >
            {f === "mine" ? "My runs" : f === "short" ? "Behind target" : f}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Panel className="px-5 py-10 text-center text-[13px] text-muted">Nothing here right now.</Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((r) => (
            <RunRow key={r.id} run={r} mine={r.operatorId === operatorId} />
          ))}
        </div>
      )}
    </div>
  );
}
