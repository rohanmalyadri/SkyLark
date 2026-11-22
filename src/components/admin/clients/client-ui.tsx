import { ShieldCheck, UserPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CLIENT_PAYMENT_META, CLIENT_STATUS_META, PAYMENT_SOURCE_META } from "@/lib/domain/constants";
import type { Client, ClientPaymentStatus, ClientStatus, PaymentSource } from "@/lib/domain/types";
import { cn, formatINR, initials } from "@/lib/utils";

/* Small, server-safe pieces shared by every client screen. */

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const meta = CLIENT_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: ClientPaymentStatus }) {
  const meta = CLIENT_PAYMENT_META[status];
  return (
    <Badge tone={meta.tone} dot={status === "paid" || status === "pending"}>
      {meta.label}
    </Badge>
  );
}

/** Says who vouches for a payment status. Only shown where it matters: paid or refunded rows. */
export function PaymentSourceTag({ source, className }: { source: PaymentSource; className?: string }) {
  const meta = PAYMENT_SOURCE_META[source];
  const Icon = source === "gateway" ? ShieldCheck : UserPen;
  return (
    <span title={meta.hint} className={cn("inline-flex items-center gap-1 text-xs", source === "gateway" ? "text-success" : "text-subtle", className)}>
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

export function Amount({ client, className }: { client: Pick<Client, "amount">; className?: string }) {
  if (client.amount == null) return <span className={cn("text-subtle", className)}>Not agreed yet</span>;
  return <span className={cn("tabular font-medium text-fg", className)}>{formatINR(client.amount)}</span>;
}

const AVATAR_TONES = ["bg-[#f3e9e4] text-[#8a3b23]", "bg-[#e6eef0] text-[#2c5560]", "bg-[#ece8f3] text-[#4b3b78]", "bg-[#e9efe6] text-[#3a5a2c]", "bg-[#f2ede2] text-[#6b5320]"];

/** Initials on a soft tone picked from the name, so each client is recognisable at a glance. */
export function ClientAvatar({ name, className, unread }: { name: string; className?: string; unread?: boolean }) {
  const tone = AVATAR_TONES[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span className={cn("relative inline-grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold tracking-wide", tone, className)} aria-hidden>
      {initials(name)}
      {unread && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-bg bg-accent" />}
    </span>
  );
}

/** Deterministic in both server and browser renders: absolute, pinned to India time. */
const IST = "Asia/Kolkata";

export function formatClock(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST }).format(new Date(iso));
}

export function formatDay(iso: string, withYear = false) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: IST }).format(new Date(iso));
}

const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(new Date(iso));

/** "4:05 pm" today, "Yesterday", or "18 Nov", measured against the server's `now`. */
export function listTime(iso: string, now: string) {
  const d = dayKey(iso);
  if (d === dayKey(now)) return formatClock(iso);
  if (d === dayKey(new Date(new Date(now).getTime() - 86_400_000).toISOString())) return "Yesterday";
  return formatDay(iso);
}

/** Header for a run of messages on the same day. */
export function dayDivider(iso: string, now: string) {
  const d = dayKey(iso);
  if (d === dayKey(now)) return "Today";
  if (d === dayKey(new Date(new Date(now).getTime() - 86_400_000).toISOString())) return "Yesterday";
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: IST }).format(new Date(iso));
}

export { dayKey };
