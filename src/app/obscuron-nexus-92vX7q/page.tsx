import { ArrowRight, ArrowUpRight, CheckCircle2, Clock3, IndianRupee, Inbox, MessageSquareReply, MessagesSquare, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryBars, DailyBars } from "@/components/admin/charts";
import { PaymentMix, RevenueByClient } from "@/components/admin/clients/client-charts";
import { ClientFormDialog } from "@/components/admin/clients/client-form";
import { Amount, ClientAvatar, ClientStatusBadge, PaymentBadge, PaymentSourceTag } from "@/components/admin/clients/client-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/auth/dal";
import { CLIENT_STATUS_META } from "@/lib/domain/constants";
import { CLIENT_STATUSES } from "@/lib/domain/types";
import { crmOverview } from "@/lib/services/clients";
import { cn, formatINR, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const staff = await requireStaff();
  const { summary: s, threads, latestInbound, now } = await crmOverview(staff);
  const nowMs = new Date(now).getTime();
  const manualRevenue = s.revenue - s.verifiedRevenue;

  const kpis = [
    { label: "Total clients", value: String(s.totalClients), sub: `${s.byStatus.active} active · ${s.byStatus.completed} completed`, href: "/obscuron-nexus-92vX7q/clients", icon: Users },
    { label: "Successful payments", value: String(s.paidClients), sub: s.paidClients ? `Average ${formatINR(s.averageDeal)}` : "None recorded yet", href: "/obscuron-nexus-92vX7q/payments", icon: CheckCircle2 },
    { label: "Pending discussions", value: String(s.pendingDiscussions), sub: s.unread ? `${s.unread} unread message${s.unread === 1 ? "" : "s"}` : "Inbox is clear", href: "/obscuron-nexus-92vX7q/inbox", icon: Clock3, alert: s.unread > 0 },
    { label: "Total revenue", value: formatINR(s.revenue), sub: s.verifiedRevenue === s.revenue ? "Gateway verified" : "Recorded manually", href: "/obscuron-nexus-92vX7q/payments", icon: IndianRupee },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Client management"
        title="Dashboard"
        description="Clients, payments and conversations at a glance. Every figure here is calculated live from the client records."
        actions={
          <>
            <Button asChild size="sm" variant="secondary">
              <Link href="/obscuron-nexus-92vX7q/inbox">
                <Inbox /> Inbox
                {s.unread > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">{s.unread}</span>}
              </Link>
            </Button>
            <ClientFormDialog />
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line xl:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="group relative bg-bg px-5 py-5 transition-colors hover:bg-surface">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted">{k.label}</p>
              <span className="grid size-7 place-items-center rounded-md border border-line bg-surface text-subtle transition-colors group-hover:border-line-strong group-hover:text-fg">
                <k.icon className="size-3.5" />
              </span>
            </div>
            <p className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.035em] tabular text-fg md:text-[34px]">{k.value}</p>
            <p className={cn("mt-2.5 flex items-center gap-1.5 text-xs", k.alert ? "font-medium text-accent" : "text-subtle")}>
              {k.alert && <span className="size-1.5 animate-pulse-dot rounded-full bg-accent" aria-hidden />}
              {k.sub}
            </p>
            <ArrowUpRight className="absolute bottom-4 right-4 size-3.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
          </Link>
        ))}
      </div>

      {/* Payment overview + revenue by client */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title="Payment overview"
            description="Amounts in Indian rupees"
            action={
              <Link href="/obscuron-nexus-92vX7q/payments" className="flex items-center gap-1 text-[13px] text-muted hover:text-fg">
                All payments <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="text-xs text-subtle">Received</p>
              <p className="mt-1 text-[36px] font-semibold leading-none tracking-[-0.04em] tabular text-fg">{formatINR(s.revenue)}</p>
              <dl className="mt-5 space-y-2 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Recorded manually</dt>
                  <dd className="tabular text-fg">{formatINR(manualRevenue)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Gateway verified</dt>
                  <dd className="tabular text-fg">{formatINR(s.verifiedRevenue)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Outstanding</dt>
                  <dd className="tabular text-fg">{formatINR(s.outstanding)}</dd>
                </div>
              </dl>
            </div>
            <div>
              <p className="mb-3 text-xs text-subtle">Clients by payment status</p>
              <PaymentMix byPayment={s.byPayment} total={s.totalClients} />
            </div>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {threads.map(({ client: c }) => (
              <li key={c.id}>
                <Link href={`/obscuron-nexus-92vX7q/clients/${c.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface/70">
                  <ClientAvatar name={c.name} className="size-8 text-[11px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-fg">{c.name}</span>
                    {c.paymentStatus === "paid" || c.paymentStatus === "refunded" ? <PaymentSourceTag source={c.paymentSource} className="text-[11px]" /> : <span className="text-[11px] text-subtle">{CLIENT_STATUS_META[c.status].label}</span>}
                  </span>
                  <Amount client={c} className="text-[13px]" />
                  <span className="hidden w-32 justify-end sm:flex">
                    <PaymentBadge status={c.paymentStatus} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {manualRevenue > 0 && <p className="border-t border-line px-5 py-3 text-xs text-subtle">Paid statuses shown here were entered by staff. No payment gateway is connected yet, so none are independently verified.</p>}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Revenue by client" description={`${formatINR(s.revenue)} from ${s.paidClients} paid client${s.paidClients === 1 ? "" : "s"}`} />
            <div className="p-5">
              <RevenueByClient data={s.revenueByClient} total={s.revenue} />
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Client pipeline" />
            <div className="p-5">
              <CategoryBars data={CLIENT_STATUSES.map((st) => ({ label: CLIENT_STATUS_META[st].label, value: s.byStatus[st] }))} />
            </div>
          </Panel>
        </div>
      </div>

      {/* Activity + messages */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Latest messages"
            description="Most recent from clients"
            action={
              <Link href="/obscuron-nexus-92vX7q/inbox" className="flex items-center gap-1 text-[13px] text-muted hover:text-fg">
                Open inbox <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {latestInbound.length === 0 ? (
            <EmptyState icon={<MessagesSquare />} title="No client messages yet" description="Messages you log or receive appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {latestInbound.map((m) => (
                <li key={m.id}>
                  <Link href={`/obscuron-nexus-92vX7q/inbox?c=${m.clientId}`} className={cn("flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-surface/70", !m.readAt && "bg-accent-soft/60")}>
                    <ClientAvatar name={m.clientName} unread={!m.readAt} className="size-8 text-[11px]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate text-[13px] text-fg", !m.readAt ? "font-semibold" : "font-medium")}>{m.clientName}</span>
                        <span className="shrink-0 text-[11px] text-subtle">{timeAgo(m.createdAt, nowMs)}</span>
                      </span>
                      <span className={cn("mt-0.5 line-clamp-2 text-[13px] leading-relaxed", !m.readAt ? "text-fg" : "text-muted")}>{m.body}</span>
                    </span>
                    {!m.readAt && (
                      <Badge tone="accent" className="mt-0.5 shrink-0">
                        New
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Recent client activity" />
            {threads.length === 0 ? (
              <EmptyState icon={<Users />} title="No clients yet" action={<ClientFormDialog />} />
            ) : (
              <ol className="relative px-5 py-4">
                <span className="absolute bottom-6 left-[35px] top-6 w-px bg-line" aria-hidden />
                {threads.map(({ client: c, lastMessage, unread }) => (
                  <li key={c.id} className="relative flex gap-3 py-2.5">
                    <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full border bg-bg", lastMessage?.direction === "inbound" ? "border-accent-line text-accent" : "border-line-strong text-muted")}>
                      {lastMessage?.direction === "outbound" ? <MessageSquareReply className="size-3.5" /> : <MessagesSquare className="size-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-fg">
                        <Link href={`/obscuron-nexus-92vX7q/clients/${c.id}`} className="font-medium hover:underline hover:underline-offset-4">
                          {c.name}
                        </Link>{" "}
                        <span className="text-muted">{!lastMessage ? "was added as a client" : lastMessage.direction === "inbound" ? (unread ? `sent ${unread} new message${unread === 1 ? "" : "s"}` : "sent a message") : `got a reply from ${lastMessage.sample ? "the team" : lastMessage.authorName}`}</span>
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <ClientStatusBadge status={c.status} />
                        <span className="text-[11px] text-subtle">{timeAgo(lastMessage?.createdAt ?? c.createdAt, nowMs)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <Panel>
            <PanelHeader title="Conversation volume" description="Messages logged per day, both directions" />
            <div className="p-5">
              <DailyBars data={s.messagesPerDay} label="messages" height={120} />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
