import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientFormDialog } from "@/components/admin/clients/client-form";
import { ClientInbox } from "@/components/admin/clients/client-inbox";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { inbox } from "@/lib/services/clients";

export const metadata: Metadata = { title: "Client inbox" };

export default function InboxPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <Inbox />
    </Suspense>
  );
}

async function Inbox() {
  const staff = await requireStaff();
  const { threads, messages } = await inbox(staff);
  const unread = threads.reduce((a, t) => a + t.unread, 0);
  return (
    <>
      <PageHeader
        eyebrow="Client management"
        title="Inbox"
        description={<span className="hidden sm:inline">Every client conversation in one place. Reply, or log what a client said on a call so the history stays complete.</span>}
        actions={
          <>
            {unread > 0 ? (
              <Badge tone="accent" dot pulse>
                {unread} unread
              </Badge>
            ) : (
              <Badge tone="success">All caught up</Badge>
            )}
            <ClientFormDialog />
          </>
        }
      />
      <ClientInbox threads={threads} messages={messages} now={new Date().toISOString()} staffName={staff.fullName} />
    </>
  );
}

function InboxSkeleton() {
  return (
    <>
      <div className="pb-10">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-10 w-48" />
      </div>
      <div className="grid h-[560px] overflow-hidden rounded-lg border border-line md:grid-cols-[360px_1fr]">
        <div className="space-y-4 border-r border-line p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden space-y-4 p-6 md:block">
          <Skeleton className="h-10 w-2/3 rounded-2xl" />
          <Skeleton className="ml-auto h-14 w-1/2 rounded-2xl" />
          <Skeleton className="h-10 w-3/5 rounded-2xl" />
        </div>
      </div>
    </>
  );
}
