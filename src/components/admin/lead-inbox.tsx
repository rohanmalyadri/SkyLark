"use client";

import { Inbox, Mail, Phone, UserPlus } from "lucide-react";
import { useState } from "react";
import { updateLeadAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { countryName } from "@/lib/domain/constants";
import type { Tone } from "@/lib/domain/constants";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { cn, formatDate } from "@/lib/utils";

const STATUS_TONE: Record<LeadStatus, Tone> = { new: "accent", contacted: "warning", qualified: "success", won: "success", lost: "neutral" };

function LeadRow({ lead }: { lead: Lead }) {
  const [note, setNote] = useState(lead.note);
  const [editing, setEditing] = useState(false);
  const update = useAction(updateLeadAction, { onSuccess: () => setEditing(false) });

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
            {lead.name}
            <Badge tone={STATUS_TONE[lead.status]} dot={lead.status === "new"}>
              {lead.status}
            </Badge>
            {lead.promoCode && <Badge tone="accent">{lead.promoCode}</Badge>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-fg">
              <Mail className="size-3.5 text-subtle" aria-hidden /> {lead.email}
            </a>
            {lead.phone && (
              <a href={`tel:${lead.phone.replace(/[^+0-9]/g, "")}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-fg">
                <Phone className="size-3.5 text-subtle" aria-hidden /> {lead.phone}
              </a>
            )}
            {lead.city && (
              <span>
                {lead.city}
                {lead.country ? `, ${countryName(lead.country)}` : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Absolute and pinned to UTC: a relative time reads Date.now(), which differs
              between the server render and hydration and tears the markup. */}
          <span className="text-xs text-subtle">{formatDate(lead.createdAt, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</span>
          <Select
            value={lead.status}
            onChange={(e) => void update.execute(lead.id, { status: e.target.value as LeadStatus })}
            aria-label={`Status for ${lead.name}`}
            className="h-8 w-32 text-[13px]"
            disabled={update.pending}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </Select>
          {!lead.ownerId && (
            <Button size="sm" variant="secondary" loading={update.pending} onClick={() => void update.execute(lead.id, { claim: true })}>
              <UserPlus className="size-3.5" /> Claim
            </Button>
          )}
        </div>
      </div>

      {lead.message && <p className="mt-2.5 rounded-md border border-line bg-surface-2/60 px-3 py-2 text-[13px] leading-relaxed text-muted">{lead.message}</p>}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-subtle">From {lead.source}</p>
        {editing ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-14 sm:w-72" placeholder="What did they say on the call?" aria-label="Internal note" />
            <div className="flex gap-2">
              <Button size="sm" loading={update.pending} onClick={() => void update.execute(lead.id, { note })}>
                Save note
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className={cn("text-xs transition-colors hover:text-fg", lead.note ? "text-muted" : "text-subtle")}>
            {lead.note || "Add an internal note"}
          </button>
        )}
      </div>
    </li>
  );
}

export function LeadInbox({ leads }: { leads: Lead[] }) {
  const [filter, setFilter] = useState<"all" | LeadStatus>("all");
  const shown = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  return (
    <Panel>
      <PanelHeader
        title="Enquiries"
        description="People who asked us to get in touch. Reply within one working day — that's what the form promises them."
      />
      <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3">
        {(["all", ...LEAD_STATUSES] as const).map((f) => {
          const count = f === "all" ? leads.length : leads.filter((l) => l.status === f).length;
          return (
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
              {f} <span className="font-mono tabular-nums opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={<Inbox />} title="Nothing here" description="New enquiries from the website land in this inbox." />
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((l) => (
            <LeadRow key={l.id} lead={l} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
