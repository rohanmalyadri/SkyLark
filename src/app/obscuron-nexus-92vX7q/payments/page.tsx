import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsTable } from "@/components/admin/clients/payments-table";
import { PageHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { crmOverview } from "@/lib/services/clients";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Payments />
    </Suspense>
  );
}

async function Payments() {
  const staff = await requireStaff();
  const { clients, summary } = await crmOverview(staff);
  const awaitingPrice = clients.filter((c) => c.amount == null && c.paymentStatus !== "paid").length;

  const cards = [
    { label: "Received", value: formatINR(summary.revenue), sub: `${summary.paidClients} paid client${summary.paidClients === 1 ? "" : "s"}` },
    { label: "Outstanding", value: formatINR(summary.outstanding), sub: "Agreed but not yet paid" },
    { label: "Awaiting a price", value: String(awaitingPrice), sub: "No amount agreed yet" },
    { label: "Gateway verified", value: formatINR(summary.verifiedRevenue), sub: summary.verifiedRevenue ? "Confirmed by the provider" : "No gateway connected" },
  ];

  return (
    <>
      <PageHeader eyebrow="Client management" title="Payments" description="What each client has paid or agreed to pay, and who vouches for it." />

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-bg px-5 py-4">
            <p className="text-[13px] text-muted">{c.label}</p>
            <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.03em] tabular">{c.value}</p>
            <p className="mt-2 text-xs text-subtle">{c.sub}</p>
          </div>
        ))}
      </div>

      {summary.revenue > summary.verifiedRevenue && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-[13px] leading-relaxed text-muted">
            <span className="font-medium text-fg">{formatINR(summary.revenue - summary.verifiedRevenue)} is recorded manually.</span> These statuses were entered by staff and haven&apos;t been confirmed by a payment gateway. Dates and methods only appear when someone recorded the real ones.
          </p>
        </div>
      )}

      <PaymentsTable clients={clients} />
    </>
  );
}
