import { Clock3, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChatThread } from "@/components/admin/clients/chat-thread";
import { Logo } from "@/components/ui/marks";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { isStaff, requireCandidate } from "@/lib/auth/dal";
import { myConversation } from "@/lib/services/support-chat";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <>
      <PageHeader eyebrow="Support" title="Messages" description={<span className="hidden sm:inline">Talk to the Skylark team about your plan, your profile or an application. Everything stays in one conversation.</span>} />
      <Suspense fallback={<Skeleton className="h-[560px] w-full rounded-lg" />}>
        <Conversation />
      </Suspense>
    </>
  );
}

async function Conversation() {
  const user = await requireCandidate();
  // Staff talk to clients from the other side.
  if (isStaff(user)) redirect("/obscuron-nexus-92vX7q/inbox");
  const { client, messages } = await myConversation(user);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Panel className="flex h-[calc(100dvh-13rem)] min-h-[460px] flex-col overflow-hidden md:h-[calc(100dvh-300px)] md:min-h-[540px]">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <span className="grid size-9 place-items-center rounded-full border border-line-strong bg-bg" aria-hidden>
            <Logo wordmark={false} className="h-4 w-auto" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-fg">Skylark team</p>
            <p className="text-xs text-subtle">Specialists reply here, usually within one working day</p>
          </div>
        </header>
        <ChatThread viewer="client" client={client ?? { id: "new", name: user.fullName, userId: user.id }} messages={messages} now={new Date().toISOString()} staffName={user.fullName} className="flex-1" />
      </Panel>

      <aside className="hidden space-y-3 text-[13px] lg:block">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="flex items-center gap-2 font-medium text-fg">
            <Clock3 className="size-4 text-subtle" /> Reply times
          </p>
          <p className="mt-1.5 leading-relaxed text-muted">We answer within one working day. You&apos;ll get a notification as soon as someone replies.</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="flex items-center gap-2 font-medium text-fg">
            <ShieldCheck className="size-4 text-subtle" /> Keep it safe
          </p>
          <p className="mt-1.5 leading-relaxed text-muted">Never send passwords, card numbers or OTPs here. Our team will never ask for them.</p>
        </div>
      </aside>
    </div>
  );
}
