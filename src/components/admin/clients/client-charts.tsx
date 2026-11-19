import Link from "next/link";
import { CLIENT_PAYMENT_META } from "@/lib/domain/constants";
import { CLIENT_PAYMENT_STATUSES, type ClientPaymentStatus } from "@/lib/domain/types";
import type { ClientSummary } from "@/lib/services/client-stats";
import { cn, formatINR } from "@/lib/utils";

/** Paid revenue per client: one hue, labelled rows, exact ₹ value on each. */
export function RevenueByClient({ data, total }: { data: ClientSummary["revenueByClient"]; total: number }) {
  if (data.length === 0) return <p className="py-6 text-center text-[13px] text-muted">No paid clients yet.</p>;
  const max = Math.max(...data.map((d) => d.amount));
  return (
    <ul className="space-y-4">
      {data.map((d) => (
        <li key={d.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <Link href={`/admin/clients/${d.id}`} className="truncate text-fg hover:underline hover:underline-offset-4">
              {d.name}
            </Link>
            <span className="shrink-0 tabular">
              <span className="font-medium text-fg">{formatINR(d.amount)}</span>
              <span className="ml-1.5 text-[11px] text-subtle">{Math.round((d.amount / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.05]" aria-hidden>
            <div className="h-full rounded-full bg-fg/85 transition-[width] duration-700 ease-out" style={{ width: `${(d.amount / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const MIX_FILL: Record<ClientPaymentStatus, string> = { paid: "bg-success", pending: "bg-[#c9a227]", unpaid: "bg-black/15", refunded: "bg-danger" };

/** Share of clients in each payment state as one stacked bar with a legend. */
export function PaymentMix({ byPayment, total }: { byPayment: ClientSummary["byPayment"]; total: number }) {
  const present = CLIENT_PAYMENT_STATUSES.filter((s) => byPayment[s].count > 0);
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-black/[0.05]" role="img" aria-label={present.map((s) => `${CLIENT_PAYMENT_META[s].label}: ${byPayment[s].count}`).join(", ")}>
        {present.map((s) => (
          <div key={s} className={cn("h-full first:rounded-l-full last:rounded-r-full", MIX_FILL[s])} style={{ width: `${(byPayment[s].count / Math.max(1, total)) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-[13px]">
        {CLIENT_PAYMENT_STATUSES.map((s) => (
          <li key={s} className={cn("flex items-center gap-2", byPayment[s].count === 0 && "opacity-50")}>
            <span className={cn("size-2 shrink-0 rounded-full", MIX_FILL[s])} aria-hidden />
            <span className="flex-1 truncate text-muted">{CLIENT_PAYMENT_META[s].label}</span>
            <span className="tabular font-medium text-fg">{byPayment[s].count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
