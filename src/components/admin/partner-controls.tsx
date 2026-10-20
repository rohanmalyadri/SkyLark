"use client";

import { Copy, Handshake, Plus, Tag } from "lucide-react";
import { useState } from "react";
import { createPartnerAction, savePromoCodeAction, updatePartnerAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Panel, PanelHeader, SectionLabel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import type { PartnerStats, PlanId, PromoCode } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { cn } from "@/lib/utils";

type FieldErrors = Record<string, string[] | undefined>;
const first = (e: FieldErrors | undefined, k: string) => e?.[k]?.[0];

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="min-w-0">
      <SectionLabel>{label}</SectionLabel>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="mt-1 flex w-full items-center gap-2 rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-left font-mono text-xs text-fg transition-colors hover:border-fg/40"
      >
        <span className="min-w-0 flex-1 truncate">{value}</span>
        <Copy className="size-3.5 shrink-0 text-subtle" aria-hidden />
        <span className="sr-only">Copy {label}</span>
      </button>
      {copied && <p className="mt-1 text-[11px] text-success">Copied</p>}
    </div>
  );
}

/* ---------- New partner ---------- */

const EMPTY = { name: "", email: "", promoCode: "", perReferral: 25, flatMonthly: 0, currency: "USD", barter: false, note: "", discountPercent: 15 };

export function NewPartnerForm({ origin }: { origin: string }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [created, setCreated] = useState<{ promoCode: string; linkToken: string } | null>(null);
  const create = useAction(createPartnerAction, {
    onSuccess: (d) => {
      setCreated({ promoCode: d.promoCode, linkToken: d.linkToken });
      setV(EMPTY);
      setErrors({});
    },
  });
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((p) => ({ ...p, [k]: value }));

  if (!open) {
    return (
      <Button size="md" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New partner
      </Button>
    );
  }

  return (
    <Panel className="w-full">
      <PanelHeader title="New partner" description="They get a promo code and a share link. Both are created now." />
      {created && (
        <div className="grid gap-3 border-b border-line bg-success-soft/40 px-5 py-4 sm:grid-cols-2">
          <CopyField label="Promo code" value={created.promoCode} />
          <CopyField label="Share link" value={`${origin}/r/${created.linkToken}`} />
        </div>
      )}
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
        <Field label="Partner name" error={first(errors, "name")}>
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Career Compass" />
        </Field>
        <Field label="Contact email" error={first(errors, "email")}>
          <Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@partner.example" />
        </Field>
        <Field label="Promo code" hint="Upper-case, 3-24 characters." error={first(errors, "promoCode")}>
          <Input value={v.promoCode} onChange={(e) => set("promoCode", e.target.value.toUpperCase())} placeholder="COMPASS20" className="font-mono" />
        </Field>
        <Field label="Audience discount" hint="Percent off the first month." error={first(errors, "discountPercent")}>
          <Input type="number" min={1} max={50} value={v.discountPercent} onChange={(e) => set("discountPercent", Number(e.target.value))} />
        </Field>
        <Field label="Pay per referral" error={first(errors, "perReferral")}>
          <Input type="number" min={0} value={v.perReferral} onChange={(e) => set("perReferral", Number(e.target.value))} />
        </Field>
        <Field label="Flat monthly fee" optional error={first(errors, "flatMonthly")}>
          <Input type="number" min={0} value={v.flatMonthly} onChange={(e) => set("flatMonthly", Number(e.target.value))} />
        </Field>
        <Field label="Currency" error={first(errors, "currency")}>
          <Select value={v.currency} onChange={(e) => set("currency", e.target.value)}>
            {["USD", "EUR", "GBP", "INR", "AED", "CAD"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-end justify-between gap-3 pb-1">
          <span className="text-[13px] text-fg">
            Paid in kind
            <span className="mt-0.5 block text-xs text-muted">Co-marketing rather than cash.</span>
          </span>
          <Switch checked={v.barter} onCheckedChange={(c) => set("barter", c)} aria-label="Paid in kind" />
        </label>
        <Field label="Notes" optional className="sm:col-span-2" error={first(errors, "note")}>
          <Textarea value={v.note} onChange={(e) => set("note", e.target.value)} className="min-h-16" placeholder="Newsletter with 40k international job seekers." />
        </Field>
      </div>
      <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
        <Button size="md" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
        <Button
          size="md"
          loading={create.pending}
          onClick={async () => {
            const res = await create.execute(v);
            if (!res.ok) setErrors(res.fieldErrors ?? {});
          }}
        >
          Create partner
        </Button>
      </footer>
    </Panel>
  );
}

/* ---------- Partner list ---------- */

export function PartnerCard({ stats, origin }: { stats: PartnerStats; origin: string }) {
  const { partner } = stats;
  const toggle = useAction(updatePartnerAction);
  const paused = partner.status === "paused";

  return (
    <Panel as="article">
      <PanelHeader
        title={partner.name}
        description={partner.email}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={paused ? "neutral" : "success"} dot>
              {paused ? "Paused" : "Active"}
            </Badge>
            {partner.payout.barter && <Badge tone="accent">Barter</Badge>}
          </div>
        }
      />
      <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {[
          ["Sign-ups", String(stats.signUps)],
          ["Converted", String(stats.conversions)],
          ["Revenue", `${stats.currency} ${stats.revenue.toFixed(2)}`],
          ["Owed", partner.payout.barter ? "In kind" : `${stats.currency} ${stats.earnings.toFixed(2)}`],
        ].map(([k, val]) => (
          <div key={k} className="bg-surface px-4 py-3">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="mt-1 font-mono text-base tabular-nums text-fg">{val}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
        <CopyField label="Promo code" value={partner.promoCode} />
        <CopyField label="Share link" value={`${origin}/r/${partner.linkToken}`} />
      </div>
      {partner.note && <p className="border-t border-line px-5 py-3 text-[13px] text-muted">{partner.note}</p>}
      <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <p className="text-xs text-subtle">
          {partner.payout.barter ? "Paid in kind" : `${partner.payout.currency} ${partner.payout.perReferral}/referral`}
          {partner.payout.flatMonthly > 0 && ` + ${partner.payout.currency} ${partner.payout.flatMonthly}/month`}
        </p>
        <Button size="sm" variant="secondary" loading={toggle.pending} onClick={() => void toggle.execute(partner.id, { status: paused ? "active" : "paused" })}>
          {paused ? "Reactivate" : "Pause"}
        </Button>
      </footer>
    </Panel>
  );
}

/* ---------- Promo codes ---------- */

const PLAN_IDS: PlanId[] = ["entry", "professional", "executive"];

export function PromoCodeEditor({ codes }: { codes: PromoCode[] }) {
  const [draft, setDraft] = useState<Partial<PromoCode> | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useAction(savePromoCodeAction, {
    onSuccess: () => {
      setDraft(null);
      setErrors({});
    },
  });

  const blank: PromoCode = {
    code: "",
    kind: "percent",
    value: 15,
    currency: "USD",
    description: "",
    partnerId: null,
    appliesToPlans: [],
    firstPeriodOnly: true,
    maxRedemptions: null,
    redemptions: 0,
    startsAt: new Date().toISOString().slice(0, 10),
    expiresAt: null,
    active: true,
    createdAt: "",
  };
  const v = { ...blank, ...draft } as PromoCode;

  return (
    <Panel>
      <PanelHeader
        title="Promo codes"
        description="Standalone campaign codes, plus the codes created with each partner."
        action={
          <Button size="sm" variant="secondary" onClick={() => setDraft(draft ? null : { ...blank })}>
            <Plus className="size-3.5" /> New code
          </Button>
        }
      />

      {draft && (
        <div className="border-b border-line bg-surface-2/50 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Code" error={first(errors, "code")}>
              <Input value={v.code} onChange={(e) => setDraft({ ...v, code: e.target.value.toUpperCase() })} className="font-mono" placeholder="LAUNCH25" />
            </Field>
            <Field label="Type" error={first(errors, "kind")}>
              <Select value={v.kind} onChange={(e) => setDraft({ ...v, kind: e.target.value as PromoCode["kind"] })}>
                <option value="percent">Percent off</option>
                <option value="amount">Fixed amount off</option>
              </Select>
            </Field>
            <Field label={v.kind === "percent" ? "Percent" : "Amount"} error={first(errors, "value")}>
              <Input type="number" min={1} value={v.value} onChange={(e) => setDraft({ ...v, value: Number(e.target.value) })} />
            </Field>
            <Field label="Description" className="sm:col-span-2" error={first(errors, "description")}>
              <Input value={v.description} onChange={(e) => setDraft({ ...v, description: e.target.value })} placeholder="$25 off your first month" />
            </Field>
            <Field label="Currency" error={first(errors, "currency")}>
              <Select value={v.currency} onChange={(e) => setDraft({ ...v, currency: e.target.value })}>
                {["USD", "EUR", "GBP", "INR"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Max redemptions" optional hint="Blank for unlimited." error={first(errors, "maxRedemptions")}>
              <Input type="number" min={1} value={v.maxRedemptions ?? ""} onChange={(e) => setDraft({ ...v, maxRedemptions: e.target.value === "" ? null : Number(e.target.value) })} />
            </Field>
            <Field label="Starts" error={first(errors, "startsAt")}>
              <Input type="date" value={v.startsAt.slice(0, 10)} onChange={(e) => setDraft({ ...v, startsAt: e.target.value })} />
            </Field>
            <Field label="Expires" optional error={first(errors, "expiresAt")}>
              <Input type="date" value={v.expiresAt?.slice(0, 10) ?? ""} onChange={(e) => setDraft({ ...v, expiresAt: e.target.value || null })} />
            </Field>
            <div className="sm:col-span-3">
              <SectionLabel>Applies to</SectionLabel>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PLAN_IDS.map((p) => {
                  const on = v.appliesToPlans.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDraft({ ...v, appliesToPlans: on ? v.appliesToPlans.filter((x) => x !== p) : [...v.appliesToPlans, p] })}
                      className={cn("h-7 rounded-sm border px-2.5 text-xs capitalize transition-colors", on ? "border-accent bg-accent-soft text-accent" : "border-line-strong bg-bg text-muted hover:text-fg")}
                    >
                      {p}
                    </button>
                  );
                })}
                {v.appliesToPlans.length === 0 && <span className="self-center text-xs text-subtle">Every plan</span>}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 sm:col-span-2">
              <span className="text-[13px] text-fg">First billing period only</span>
              <Switch checked={v.firstPeriodOnly} onCheckedChange={(c) => setDraft({ ...v, firstPeriodOnly: c })} aria-label="First billing period only" />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-fg">Active</span>
              <Switch checked={v.active} onCheckedChange={(c) => setDraft({ ...v, active: c })} aria-label="Active" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={save.pending}
              onClick={async () => {
                const { redemptions: _r, createdAt: _c, ...payload } = v;
                void _r;
                void _c;
                const res = await save.execute(payload);
                if (!res.ok) setErrors(res.fieldErrors ?? {});
              }}
            >
              Save code
            </Button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-line">
        {codes.map((c) => {
          const expired = c.expiresAt !== null && new Date(c.expiresAt) <= new Date();
          const full = c.maxRedemptions !== null && c.redemptions >= c.maxRedemptions;
          return (
            <li key={c.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
              <span className="font-mono text-[13px] font-medium text-fg">{c.code}</span>
              <Badge tone={!c.active || expired || full ? "neutral" : "success"}>{!c.active ? "Inactive" : expired ? "Expired" : full ? "Fully claimed" : "Live"}</Badge>
              <span className="text-[13px] text-muted">{c.kind === "percent" ? `${c.value}% off` : `${c.currency} ${c.value} off`}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-subtle">{c.description}</span>
              <span className="font-mono text-xs tabular-nums text-muted">
                {c.redemptions}
                {c.maxRedemptions !== null ? `/${c.maxRedemptions}` : ""} used
              </span>
              <Button size="sm" variant="ghost" onClick={() => setDraft({ ...c })}>
                Edit
              </Button>
            </li>
          );
        })}
        {codes.length === 0 && (
          <li className="px-5 py-10 text-center">
            <Tag className="mx-auto size-5 text-subtle" aria-hidden />
            <p className="mt-2 text-[13px] text-muted">No promo codes yet.</p>
          </li>
        )}
      </ul>
    </Panel>
  );
}

export function PartnerEmpty() {
  return (
    <Panel className="px-6 py-14 text-center">
      <Handshake className="mx-auto size-6 text-subtle" aria-hidden />
      <p className="mt-3 text-sm font-medium text-fg">No partners yet</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">A partner gets a promo code for their audience and a share link that attributes every sign-up back to them.</p>
    </Panel>
  );
}
