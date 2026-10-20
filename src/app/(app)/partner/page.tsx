import { Handshake } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel, PanelHeader, SectionLabel } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/dal";
import { myPartnerStats } from "@/lib/services/partners";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Partner dashboard" };

export default function PartnerPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PartnerDashboard />
    </Suspense>
  );
}

async function PartnerDashboard() {
  const user = await requireUser();
  const [stats, h] = await Promise.all([myPartnerStats(user), headers()]);

  if (!stats) {
    return (
      <>
        <PageHeader eyebrow="Partners" title="Partner dashboard" />
        <Panel>
          <EmptyState
            icon={<Handshake />}
            title="You're not a partner yet"
            description="Partners get a promo code for their audience and a share link that credits every sign-up back to them. Email partners@skylark.dev if you'd like to join."
          />
        </Panel>
      </>
    );
  }

  const { partner } = stats;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "skylark.dev";
  const shareLink = `${h.get("x-forwarded-proto") ?? "https"}://${host}/r/${partner.linkToken}`;
  const peak = Math.max(1, ...stats.byDay.map((d) => d.signUps));
  const rate = stats.signUps === 0 ? 0 : Math.round((stats.conversions / stats.signUps) * 100);

  return (
    <>
      <PageHeader
        eyebrow="Partners"
        title={partner.name}
        description="Everyone who came to Skylark through you, and what you've earned."
        actions={
          <Badge tone={partner.status === "active" ? "success" : "neutral"} dot>
            {partner.status === "active" ? "Active" : "Paused"}
          </Badge>
        }
      />

      <Panel className="grid grid-cols-2 gap-px overflow-hidden bg-line lg:grid-cols-4">
        {[
          { label: "Sign-ups", value: String(stats.signUps), sub: "accounts created through your link" },
          { label: "Converted", value: String(stats.conversions), sub: `${rate}% of sign-ups subscribed` },
          { label: "Revenue generated", value: `${stats.currency} ${stats.revenue.toFixed(2)}`, sub: "what your referrals paid" },
          {
            label: "You've earned",
            value: partner.payout.barter ? "In kind" : `${stats.currency} ${stats.earnings.toFixed(2)}`,
            sub: partner.payout.barter ? "co-marketing, not cash" : `${stats.currency} ${partner.payout.perReferral} per conversion`,
          },
        ].map((k) => (
          <div key={k.label} className="bg-surface px-5 py-4">
            <p className="text-[13px] text-muted">{k.label}</p>
            <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.03em] tabular">{k.value}</p>
            <p className="mt-2 text-xs text-subtle">{k.sub}</p>
          </div>
        ))}
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <PanelHeader title="Last 30 days" description="Sign-ups, and the ones that became subscriptions." />
          <div className="px-5 py-5">
            <div className="flex items-end gap-1" role="img" aria-label="Sign-ups per day over the last 30 days">
              {stats.byDay.map((d) => (
                <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5" title={`${d.day}: ${d.signUps} sign-ups, ${d.conversions} converted`}>
                  {d.conversions > 0 && <span className="w-full rounded-sm bg-success" style={{ height: `${(d.conversions / peak) * 72}px` }} />}
                  <span className="w-full rounded-sm bg-accent/50" style={{ height: `${Math.max(2, ((d.signUps - d.conversions) / peak) * 72)}px` }} />
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-4 text-xs text-subtle">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-accent/50" aria-hidden /> Sign-up
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-success" aria-hidden /> Converted
              </span>
            </p>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Your links" />
            <div className="space-y-4 px-5 py-4">
              <div>
                <SectionLabel>Promo code</SectionLabel>
                <p className="mt-1 rounded-md border border-line-strong bg-surface px-2.5 py-1.5 font-mono text-sm text-fg">{partner.promoCode}</p>
              </div>
              <div className="min-w-0">
                <SectionLabel>Share link</SectionLabel>
                <p className="mt-1 break-all rounded-md border border-line-strong bg-surface px-2.5 py-1.5 font-mono text-xs text-fg">{shareLink}</p>
                <p className="mt-1.5 text-xs text-muted">Anyone who arrives here is credited to you for 30 days, even if they sign up later.</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Recent referrals" />
            {stats.recent.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-muted">Nothing yet. Share your link to get started.</p>
            ) : (
              <ul className="divide-y divide-line">
                {stats.recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-[13px] text-fg">{r.status === "converted" ? `Subscribed to ${r.planId}` : "Signed up"}</p>
                      <p className="text-xs text-subtle">{formatDate(r.convertedAt ?? r.createdAt)}</p>
                    </div>
                    {r.status === "converted" ? (
                      <Badge tone="success">
                        {r.currency} {r.amount.toFixed(2)}
                      </Badge>
                    ) : (
                      <Badge>Pending</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
