"use client";

import { Check, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelPlanAction, confirmCheckoutAction, startCheckoutAction, updateAccountAction, updateSettingsAction } from "@/app/actions/candidate";
import { signOutAction } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { ScoreBar } from "@/components/ui/score";
import { Switch } from "@/components/ui/switch";
import type { Plan, Subscription, UserSettings } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { VerifyEmailDialog } from "./verify-email";

/** Email verification state the settings page passes down. `required` is false until the server can send codes. */
export interface EmailVerification {
  email: string;
  verified: boolean;
  required: boolean;
  sender: string | null;
}

export function AccountForm({ name, email, verification }: { name: string; email: string; verification: EmailVerification }) {
  const [value, setValue] = useState(name);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const router = useRouter();
  const save = useAction(updateAccountAction);
  return (
    <Panel id="account" className="scroll-mt-20">
      <PanelHeader title="Account" />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="acc-name">
          <Input id="acc-name" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="acc-email" hint="Contact support to change your sign-in email.">
          <Input id="acc-email" value={email} readOnly disabled />
        </Field>
      </div>
      <div id="verify-email" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-[13px] font-medium">
            Email verification {verification.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Not verified</Badge>}
          </span>
          <span className="block text-xs text-muted">
            {verification.verified ? "Your email is confirmed." : verification.required ? "We'll email you a 6-digit code. You need a verified email to buy a plan." : "Email verification isn't available yet."}
          </span>
        </div>
        {!verification.verified && verification.required && (
          <Button size="sm" variant="secondary" onClick={() => setVerifyOpen(true)}>
            Verify email
          </Button>
        )}
      </div>
      <VerifyEmailDialog open={verifyOpen} onOpenChange={setVerifyOpen} email={verification.email} sender={verification.sender} onVerified={() => router.refresh()} />
      <div className="flex justify-end border-t border-line px-5 py-3">
        <Button size="sm" disabled={value.trim() === name || value.trim().length < 2} loading={save.pending} onClick={() => void save.execute(value)}>
          Save
        </Button>
      </div>
    </Panel>
  );
}

export function PreferencesForm({ settings }: { settings: UserSettings }) {
  const [s, setS] = useState(settings);
  const save = useAction(updateSettingsAction);
  const dirty = JSON.stringify(s) !== JSON.stringify(settings);
  const { userId: _ignored, ...payload } = s;
  void _ignored;

  const toggles: { key: "notifyNewMatches" | "notifyReviewComplete" | "notifyApplicationUpdates"; label: string; body: string }[] = [
    { key: "notifyNewMatches", label: "New high-fit matches", body: "When roles scoring 85+ appear" },
    { key: "notifyReviewComplete", label: "Human review updates", body: "When a specialist starts or completes a review" },
    { key: "notifyApplicationUpdates", label: "Application updates", body: "Submissions, status changes and reminders" },
  ];

  return (
    <Panel id="notifications" className="scroll-mt-20">
      <PanelHeader title="Notifications & matching" />
      <ul className="divide-y divide-line">
        {toggles.map((t) => (
          <li key={t.key} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <label htmlFor={t.key} className="min-w-0">
              <span className="block text-[13px] font-medium">{t.label}</span>
              <span className="block text-xs text-muted">{t.body}</span>
            </label>
            <Switch id={t.key} checked={s[t.key]} onCheckedChange={(v) => setS({ ...s, [t.key]: v })} />
          </li>
        ))}
      </ul>
      <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-3">
        <Field label="Email digest" htmlFor="digest">
          <Select id="digest" value={s.emailDigest} onChange={(e) => setS({ ...s, emailDigest: e.target.value as UserSettings["emailDigest"] })}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="off">Off</option>
          </Select>
        </Field>
        <Field label={`Hide matches below ${s.minMatchScore}%`} htmlFor="min-score">
          <input id="min-score" type="range" min={0} max={90} step={5} value={s.minMatchScore} onChange={(e) => setS({ ...s, minMatchScore: Number(e.target.value) })} className="mt-3 w-full accent-[var(--accent)]" />
        </Field>
        <Field label="Timezone" htmlFor="tz">
          <Select id="tz" value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })}>
            {["UTC", "Europe/London", "Europe/Berlin", "Europe/Amsterdam", "America/Toronto", "America/New_York", "Asia/Kolkata", "Asia/Singapore", "Asia/Dubai", "Australia/Sydney"].map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        {dirty && (
          <Button size="sm" variant="ghost" onClick={() => setS(settings)}>
            Discard
          </Button>
        )}
        <Button size="sm" disabled={!dirty} loading={save.pending} onClick={() => void save.execute(payload)}>
          Save preferences
        </Button>
      </div>
    </Panel>
  );
}

export function SecurityPanel({ method, demo, google }: { method: string; demo: boolean; google: boolean }) {
  return (
    <Panel id="security" className="scroll-mt-20">
      <PanelHeader title="Security & connected accounts" />
      <dl className="divide-y divide-line text-[13px]">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <dt>
            <span className="block font-medium">Sign-in method</span>
            <span className="block text-xs text-muted">{demo ? "Signed demo session (7-day, httpOnly cookie)" : "Supabase Auth session, refreshed automatically"}</span>
          </dt>
          <dd>
            <Badge>{method}</Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <dt>
            <span className="block font-medium">Google</span>
            <span className="block text-xs text-muted">{google ? "Sign in with the Google account that uses your email" : "Not configured on this server"}</span>
          </dt>
          <dd>{google ? <Badge tone="success">Available</Badge> : <Badge>Unavailable</Badge>}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <dt>
            <span className="block font-medium">Sign out</span>
            <span className="block text-xs text-muted">End your session on this device</span>
          </dt>
          <dd>
            <form action={signOutAction}>
              <Button size="sm" variant="secondary" type="submit">
                <LogOut /> Sign out
              </Button>
            </form>
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

export function BillingPanel({
  plans,
  subscription,
  current,
  usage,
  verification,
}: {
  plans: Plan[];
  subscription: Subscription | null;
  current: Plan;
  usage: { tailored: number; reviews: number };
  verification: EmailVerification;
}) {
  const [interval, setBillingInterval] = useState<"month" | "year">(subscription?.interval ?? "month");
  const [target, setTarget] = useState<Plan | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const router = useRouter();
  const [paying, startPaying] = useTransition();
  const closeDialog = () => (setTarget(null), setAgreed(false));
  // An unverified buyer always sees the verification popup first; the plan they picked is kept for after.
  const [verified, setVerified] = useState(verification.verified);
  const [verifyFor, setVerifyFor] = useState<Plan | null>(null);
  const choosePlan = (p: Plan) => (verification.required && !verified ? setVerifyFor(p) : setTarget(p));

  const pay = (plan: Plan) =>
    startPaying(async () => {
      try {
        const started = await startCheckoutAction(plan.id, interval, agreed);
        if (!started.ok) {
          // The server is the source of truth: if it says the email isn't verified, open the popup.
          if (started.reason === "email_unverified") return closeDialog(), setVerified(false), setVerifyFor(plan);
          return void toast.error(started.error);
        }
        if (started.data.kind === "activated") {
          toast.success(`You're on ${started.data.planName}`);
          return closeDialog(), router.refresh();
        }
        closeDialog();
        const outcome = await openRazorpayCheckout(started.data);
        if (outcome.kind === "dismissed") return void toast("Payment cancelled. You haven't been charged.");
        const confirmed = await confirmCheckoutAction({ subscriptionId: outcome.result.razorpay_subscription_id, paymentId: outcome.result.razorpay_payment_id, signature: outcome.result.razorpay_signature });
        if (!confirmed.ok) return void toast.error(confirmed.error);
        if (confirmed.data.status === "pending") toast("Payment received. Your plan will switch on as soon as Razorpay confirms it.");
        else toast.success(`Payment received. You're on ${confirmed.data.planName}.`);
        router.refresh();
      } catch {
        toast.error("The payment window couldn't open. Check your connection and try again.");
      }
    });
  const cancel = useAction(cancelPlanAction, { onSuccess: () => setCancelOpen(false) });

  const meter = (label: string, used: number, limit: number | null) => (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-muted">{label}</span>
        <span className="tabular text-fg">
          {used}
          <span className="text-subtle"> / {limit === null ? "∞" : limit}</span>
        </span>
      </div>
      <ScoreBar className="mt-2" value={limit === null ? 8 : limit === 0 ? 0 : Math.min(100, (used / limit) * 100)} tone={limit !== null && used >= limit ? "warning" : "accent"} />
    </div>
  );

  return (
    <Panel id="billing" className="scroll-mt-20">
      <PanelHeader
        title="Subscription & billing"
        description={
          subscription
            ? `${current.name} · ${subscription.cancelAtPeriodEnd ? "ends" : "renews"} ${formatDate(subscription.currentPeriodEnd, { month: "long", day: "numeric" })}${subscription.status === "past_due" ? " · payment overdue" : ""}`
            : "You're on the Entry allowance"
        }
        action={
          subscription && !subscription.cancelAtPeriodEnd ? (
            <Button size="sm" variant="ghost" onClick={() => setCancelOpen(true)}>
              Cancel plan
            </Button>
          ) : null
        }
      />
      <div className="grid gap-5 border-b border-line p-5 sm:grid-cols-2">
        {meter("Tailored applications this month", usage.tailored, current.limits.tailoredPerMonth)}
        {meter("Human reviews this month", usage.reviews, current.limits.humanReviewsPerMonth)}
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[13px] font-medium">Plans</p>
          <div role="radiogroup" aria-label="Billing interval" className="inline-flex rounded-md border border-line-strong p-0.5">
            {(["month", "year"] as const).map((i) => (
              <button key={i} role="radio" aria-checked={interval === i} onClick={() => setBillingInterval(i)} className={cn("h-7 rounded px-3 text-xs", interval === i ? "bg-surface-3 text-fg" : "text-muted")}>
                {i === "month" ? "Monthly" : "Annual"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = p.id === current.id && (subscription?.interval ?? "month") === interval && !subscription?.cancelAtPeriodEnd;
            const price = interval === "year" ? p.priceYearly : p.priceMonthly;
            return (
              <div key={p.id} className={cn("flex flex-col rounded-lg border p-4", p.id === current.id ? "border-accent-line bg-accent-soft/20" : "border-line")}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{p.name}</p>
                  {p.id === current.id && <Badge tone="accent">Current</Badge>}
                </div>
                <p className="mt-2 text-xl font-semibold tabular">
                  {formatMoney(price, p.currency)}
                  <span className="text-xs font-normal text-subtle"> / {interval === "year" ? "year" : "month"}</span>
                </p>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {p.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex gap-2 text-xs text-muted">
                      <Check className="mt-0.5 size-3 shrink-0 text-accent" /> {f}
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant={isCurrent ? "secondary" : "outline"} disabled={isCurrent || p.priceMonthly <= 0} className="mt-4" onClick={() => choosePlan(p)}>
                  {isCurrent ? "Current plan" : p.sortOrder > current.sortOrder ? "Upgrade" : "Switch"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent
          title={`Switch to ${target?.name}?`}
          description={
            target
              ? `${formatMoney(interval === "year" ? target.priceYearly : target.priceMonthly, target.currency)} today, then every ${interval === "year" ? "year" : "month"} until you cancel. You'll set up the payment securely with Razorpay (card or UPI).${subscription && subscription.planId !== target.id ? " Your current plan stops billing once the new one starts." : ""}`
              : ""
          }
        >
          <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-md border border-[#e5e5e5] bg-[#f7f7f7] p-3 text-[13px] leading-relaxed text-[#555]">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#aaaaaa]" />
            <span>
              I have read and agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener" className="text-[#2b2b2b] underline underline-offset-2 hover:text-black">
                Terms &amp; Conditions
              </a>
              , including automatic renewal until I cancel and the no-refund policy.
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button disabled={!agreed} loading={paying} onClick={() => target && agreed && pay(target)}>
              Continue to payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <VerifyEmailDialog
        open={!!verifyFor}
        onOpenChange={(o) => !o && setVerifyFor(null)}
        email={verification.email}
        sender={verification.sender}
        reason="Please verify your email before buying a plan. It only takes a minute."
        onVerified={() => {
          const plan = verifyFor;
          setVerified(true);
          setVerifyFor(null);
          if (plan) setTarget(plan);
        }}
      />
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent title="Cancel your plan?" description="You'll keep access until the end of the current period. Your profile, matches and applications stay intact.">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep plan
            </Button>
            <Button variant="danger" loading={cancel.pending} onClick={() => void cancel.execute()}>
              Cancel at period end
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
