"use client";

import { IndianRupee, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { CLIENT_PAYMENT_META } from "@/lib/domain/constants";
import { CLIENT_PAYMENT_STATUSES, type Client, type ClientPaymentStatus } from "@/lib/domain/types";
import { cn, formatINR } from "@/lib/utils";
import { Amount, ClientAvatar, formatDay, PaymentBadge, PaymentSourceTag } from "./client-ui";

type StatusFilter = "all" | ClientPaymentStatus;

/** Payments ledger: one row per client record, filterable by payment status. */
export function PaymentsTable({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const counts = useMemo(() => Object.fromEntries(CLIENT_PAYMENT_STATUSES.map((s) => [s, clients.filter((c) => c.paymentStatus === s).length])) as Record<ClientPaymentStatus, number>, [clients]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => (status === "all" || c.paymentStatus === status) && (!q || c.name.toLowerCase().includes(q) || (c.paymentMethod ?? "").toLowerCase().includes(q)))
      .toSorted((a, b) => (b.paymentStatus === "paid" ? 1 : 0) - (a.paymentStatus === "paid" ? 1 : 0) || (b.amount ?? -1) - (a.amount ?? -1));
  }, [clients, query, status]);
  const shownTotal = shown.filter((c) => c.paymentStatus === "paid").reduce((a, c) => a + (c.amount ?? 0), 0);

  return (
    <div className="rounded-lg border border-line bg-bg">
      <div className="flex flex-col gap-3 border-b border-line p-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by client or method" aria-label="Search payments" className="pl-9" />
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] lg:ml-auto" role="group" aria-label="Filter by payment status">
          {(["all", ...CLIENT_PAYMENT_STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                status === s ? "border-fg bg-fg text-white" : "border-line-strong text-muted hover:border-fg/40 hover:text-fg",
              )}
            >
              {s === "all" ? "All" : CLIENT_PAYMENT_META[s].label}
              <span className="ml-1.5 font-mono tabular opacity-70">{s === "all" ? clients.length : counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState icon={<IndianRupee />} title="No payments yet" description="Payments appear here once a client has an agreed amount." />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No payments match"
          action={
            <Button size="sm" variant="secondary" onClick={() => (setQuery(""), setStatus("all"))}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="border-b border-line text-xs text-subtle">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Client</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Payment date</th>
                  <th className="px-3 py-2.5 font-medium">Method</th>
                  <th className="px-3 py-2.5 font-medium">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((c) => {
                  const moved = c.paymentStatus === "paid" || c.paymentStatus === "refunded";
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-surface/70">
                      <td className="px-5 py-3">
                        <Link href={`/admin/clients/${c.id}`} className="flex items-center gap-3 hover:underline hover:decoration-line-strong hover:underline-offset-4">
                          <ClientAvatar name={c.name} className="size-8 text-[11px]" />
                          <span className="font-medium text-fg">{c.name}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Amount client={c} />
                      </td>
                      <td className="px-3 py-3">
                        <PaymentBadge status={c.paymentStatus} />
                      </td>
                      <td className="px-3 py-3 text-muted">{c.paidAt ? formatDay(c.paidAt, true) : <span className="text-subtle">{moved ? "Not recorded" : "—"}</span>}</td>
                      <td className="px-3 py-3 text-muted">{c.paymentMethod ?? <span className="text-subtle">{moved ? "Not verified" : "—"}</span>}</td>
                      <td className="px-3 py-3">{moved ? <PaymentSourceTag source={c.paymentSource} /> : <span className="text-xs text-subtle">Nothing received</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-[13px]">
            <span className="text-subtle">
              {shown.length} record{shown.length === 1 ? "" : "s"}
            </span>
            <span className="text-muted">
              Paid in view <span className="ml-1 font-semibold tabular text-fg">{formatINR(shownTotal)}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
