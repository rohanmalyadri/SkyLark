"use client";

import { ArrowLeft, ExternalLink, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import type { ClientMessage } from "@/lib/domain/types";
import type { ThreadSummary } from "@/lib/services/client-stats";
import { cn, formatINR } from "@/lib/utils";
import { ChatThread } from "./chat-thread";
import { ClientAvatar, ClientStatusBadge, listTime, PaymentBadge } from "./client-ui";

type Filter = "all" | "unread";

/**
 * CRM inbox: conversations on the left, the open one on the right. On phones the list and
 * the conversation are separate screens, driven by the `?c=` parameter so Back works.
 */
export function ClientInbox({ threads, messages, now, staffName }: { threads: ThreadSummary[]; messages: ClientMessage[]; now: string; staffName: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const selectedId = params.get("c");
  const selected = threads.find((t) => t.client.id === selectedId) ?? null;
  // On wide screens, open the most recent conversation when none is chosen.
  const active = selected ?? threads[0] ?? null;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => (filter === "all" || t.unread > 0) && (!q || t.client.name.toLowerCase().includes(q) || t.lastMessage?.body.toLowerCase().includes(q)));
  }, [threads, query, filter]);

  const totalUnread = threads.reduce((a, t) => a + t.unread, 0);
  const open = (id: string) => router.push(`${pathname}?c=${id}`, { scroll: false });

  return (
    <div className="grid h-[calc(100dvh-13rem)] min-h-[460px] md:h-[calc(100dvh-300px)] md:min-h-[540px] overflow-hidden rounded-lg border border-line bg-bg md:grid-cols-[320px_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* Conversation list */}
      <aside className={cn("flex min-h-0 flex-col border-line md:border-r", selected && "hidden md:flex")} aria-label="Conversations">
        <div className="space-y-3 border-b border-line p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="pl-9" />
          </div>
          <div className="flex gap-1.5">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn("h-7 rounded-full border px-3 text-xs font-medium capitalize transition-colors", filter === f ? "border-fg bg-fg text-white" : "border-line-strong text-muted hover:border-fg/40 hover:text-fg")}
              >
                {f}
                {f === "unread" && totalUnread > 0 && <span className="ml-1.5 font-mono tabular">{totalUnread}</span>}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={<SearchX />} title={filter === "unread" ? "You're all caught up" : "No conversations match"} description={filter === "unread" ? "New client messages will show up here." : "Try a different name or phrase."} />
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
            {shown.map((t) => {
              const isActive = active?.client.id === t.client.id;
              return (
                <li key={t.client.id}>
                  <button
                    type="button"
                    onClick={() => open(t.client.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                      isActive ? "bg-surface-2/70 md:bg-surface" : "hover:bg-surface/70",
                    )}
                  >
                    {isActive && <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-r bg-accent md:block" aria-hidden />}
                    <ClientAvatar name={t.client.name} unread={t.unread > 0} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate text-[14px]", t.unread ? "font-semibold text-fg" : "font-medium text-fg")}>{t.client.name}</span>
                        {t.lastMessage && <span className={cn("shrink-0 text-[11px] tabular", t.unread ? "font-medium text-accent" : "text-subtle")}>{listTime(t.lastMessage.createdAt, now)}</span>}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={cn("line-clamp-1 flex-1 text-[13px]", t.unread ? "text-fg" : "text-muted")}>
                          {t.lastMessage ? (
                            <>
                              {t.lastMessage.direction === "outbound" && <span className="text-subtle">You: </span>}
                              {t.lastMessage.body}
                            </>
                          ) : (
                            <span className="italic text-subtle">No messages yet</span>
                          )}
                        </span>
                        {t.unread > 0 && (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold tabular text-white" aria-label={`${t.unread} unread`}>
                            {t.unread}
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 flex items-center gap-1.5">
                        <ClientStatusBadge status={t.client.status} />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Conversation */}
      <section className={cn("min-h-0 flex-col", selected ? "flex" : "hidden md:flex")} aria-label="Conversation">
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
              <Link href={pathname} className="-ml-1 grid size-8 place-items-center rounded-md text-muted hover:bg-surface hover:text-fg md:hidden" aria-label="Back to conversations">
                <ArrowLeft className="size-4" />
              </Link>
              <ClientAvatar name={active.client.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-fg">{active.client.name}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-subtle">
                  <span>{active.total} message{active.total === 1 ? "" : "s"}</span>
                  {active.client.amount != null && <span className="tabular">· {formatINR(active.client.amount)}</span>}
                  <span className={active.client.userId ? "text-success" : undefined}>· {active.client.userId ? "Chats from the app" : "No app account"}</span>
                </p>
              </div>
              <div className="hidden items-center gap-1.5 sm:flex">
                <ClientStatusBadge status={active.client.status} />
                <PaymentBadge status={active.client.paymentStatus} />
              </div>
              <Link href={`/obscuron-nexus-92vX7q/clients/${active.client.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong px-2.5 text-[13px] text-fg transition-colors hover:border-fg/40 hover:bg-surface">
                Profile <ExternalLink className="size-3.5 text-subtle" />
              </Link>
            </header>
            <ChatThread key={active.client.id} client={active.client} messages={messages.filter((m) => m.clientId === active.client.id)} now={now} staffName={staffName} markRead={!!selected} className="flex-1" />
          </>
        ) : (
          <EmptyState title="No clients yet" description="Add a client to start a conversation." className="m-auto" />
        )}
      </section>
    </div>
  );
}
