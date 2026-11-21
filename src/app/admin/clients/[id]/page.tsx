import { ArrowLeft, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChatThread } from "@/components/admin/clients/chat-thread";
import { AccountLink, NotesPanel, ProfileActions, StatusControls } from "@/components/admin/clients/client-profile-controls";
import { Amount, ClientAvatar, ClientStatusBadge, formatClock, formatDay, PaymentBadge, PaymentSourceTag } from "@/components/admin/clients/client-ui";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { AppError } from "@/lib/infra/errors";
import { clientDetail } from "@/lib/services/clients";

export const metadata: Metadata = { title: "Client" };

export default function ClientPage({ params }: PageProps<"/admin/clients/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <ClientProfile params={params} />
    </Suspense>
  );
}

const when = (iso: string) => `${formatDay(iso, true)}, ${formatClock(iso)}`;

async function ClientProfile({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const detail = await clientDetail(staff, id).catch((err) => {
    if (err instanceof AppError && err.code === "not_found") notFound();
    throw err;
  });
  const { client, messages, notes, account } = detail;
  const now = new Date().toISOString();
  const moneyMoved = client.paymentStatus === "paid" || client.paymentStatus === "refunded";
  const unread = messages.filter((m) => m.direction === "inbound" && !m.readAt).length;

  const details: [string, React.ReactNode][] = [
    ["Amount", <Amount key="a" client={client} />],
    ["Payment", <PaymentBadge key="p" status={client.paymentStatus} />],
    ...(moneyMoved
      ? ([
          ["Recorded as", <PaymentSourceTag key="s" source={client.paymentSource} />],
          ["Payment date", client.paidAt ? formatDay(client.paidAt, true) : <span key="d" className="text-subtle">Not recorded</span>],
          ["Method", client.paymentMethod ?? <span key="m" className="text-subtle">Not verified</span>],
        ] as [string, React.ReactNode][])
      : []),
    ["Email", client.email ? <a key="e" href={`mailto:${client.email}`} className="hover:underline">{client.email}</a> : <span key="e" className="text-subtle">Not added</span>],
    ["Phone", client.phone ? <a key="t" href={`tel:${client.phone.replace(/[^+0-9]/g, "")}`} className="hover:underline">{client.phone}</a> : <span key="t" className="text-subtle">Not added</span>],
    ["Company", client.company || <span key="c" className="text-subtle">Not added</span>],
    ["City", client.city || <span key="ci" className="text-subtle">Not added</span>],
    ["Last interaction", client.lastInteractionAt ? when(client.lastInteractionAt) : <span key="l" className="text-subtle">None yet</span>],
    ["Client since", formatDay(client.createdAt, true)],
  ];

  return (
    <>
      <Link href="/admin/clients" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg">
        <ArrowLeft className="size-3.5" /> All clients
      </Link>

      <div className="flex flex-col gap-5 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <ClientAvatar name={client.name} className="size-14 text-base" />
          <div className="min-w-0">
            <h1 className="headline text-[30px] text-fg md:text-[40px]">{client.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ClientStatusBadge status={client.status} />
              <PaymentBadge status={client.paymentStatus} />
              {unread > 0 && <span className="text-xs font-medium text-accent">{unread} unread message{unread === 1 ? "" : "s"}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProfileActions client={client} canDelete={staff.role === "admin"} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel className="flex h-[640px] flex-col overflow-hidden">
          <PanelHeader title="Conversation" description={`${messages.length} message${messages.length === 1 ? "" : "s"}${client.lastInteractionAt ? ` · last ${when(client.lastInteractionAt)}` : ""}`} />
          <ChatThread client={client} messages={messages} now={now} staffName={staff.fullName} className="flex-1" />
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Status" description="Changes save immediately." />
            <div className="p-4">
              <StatusControls client={client} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Details" />
            <dl className="divide-y divide-line text-[13px]">
              {details.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="min-w-0 truncate text-right text-fg">{value}</dd>
                </div>
              ))}
            </dl>
            {moneyMoved && client.paymentSource === "manual" && (
              <p className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-subtle">
                <Info className="mt-px size-3.5 shrink-0" /> Entered by staff. No payment gateway has confirmed this payment.
              </p>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Skylark account" description="Lets the client chat with you from the app." />
            <AccountLink client={client} account={account} />
          </Panel>

          <Panel>
            <PanelHeader title="Internal notes" description="Visible to your team only." />
            <NotesPanel client={client} notes={notes} />
          </Panel>
        </div>
      </div>
    </>
  );
}
