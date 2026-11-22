"use client";

import { ArrowDown, CheckCheck, MessageSquareDashed, SendHorizontal } from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { markClientReadAction, markMyMessagesReadAction, sendClientMessageAction, sendMyMessageAction } from "@/app/actions/clients";
import { Logo } from "@/components/ui/marks";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { Client, ClientMessage, ClientMessageDirection } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { ClientAvatar, dayDivider, dayKey, formatClock } from "./client-ui";

type Pending = ClientMessage & { pending?: boolean };

/** Who is looking at the thread. Staff write "outbound"; the client writes "inbound". */
export type ChatViewer = "staff" | "client";

/**
 * One client's conversation with a composer, for either side of it.
 *
 * Staff: replies are stored on the client record. A client with a Skylark account sees them
 * in their Messages page (and gets a notification); a client without one doesn't, and the
 * composer says so. "Log client's message" records something said on another channel.
 *
 * Client: the signed-in user's own conversation with the team.
 */
export function ChatThread({
  client,
  messages,
  now,
  staffName,
  className,
  markRead = true,
  viewer = "staff",
}: {
  client: Pick<Client, "id" | "name" | "userId">;
  messages: ClientMessage[];
  now: string;
  /** The author name for what this viewer sends: the staff member, or the user themselves. */
  staffName: string;
  className?: string;
  /** False when the thread is only shown by default, not opened by the viewer. */
  markRead?: boolean;
  viewer?: ChatViewer;
}) {
  const isStaff = viewer === "staff";
  const ownDirection: ClientMessageDirection = isStaff ? "outbound" : "inbound";
  const [optimistic, addOptimistic] = useOptimistic<Pending[], Pending>(messages, (state, m) => [...state, m]);
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [direction, setDirection] = useState<ClientMessageDirection>(ownDirection);
  const [sending, setSending] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const unreadIds = messages.filter((m) => m.direction !== ownDirection && !m.readAt).map((m) => m.id);
  const unreadKey = unreadIds.join(",");
  // Remembered from when the thread opened, so the "New messages" line stays put after it's marked read.
  const [firstUnread] = useState(unreadIds[0]);

  // Opening a conversation reads it.
  useEffect(() => {
    if (!unreadKey || !markRead) return;
    const t = setTimeout(() => void (isStaff ? markClientReadAction(client.id) : markMyMessagesReadAction()), 600);
    return () => clearTimeout(t);
  }, [client.id, unreadKey, markRead, isStaff]);

  // Land on the first unread message, otherwise the latest one.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const target = firstUnread ? el.querySelector<HTMLElement>(`[data-msg="${firstUnread}"]`) : null;
    el.scrollTop = target ? target.offsetTop - 72 : el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  // Follow new messages when already at the bottom.
  useEffect(() => {
    const el = scroller.current;
    if (el && atBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimistic.length]);

  function onScroll() {
    const el = scroller.current;
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }

  function send() {
    const body = draft.trim();
    if (!body || sending) return;
    const logging = isStaff && direction === "inbound";
    const temp: Pending = {
      id: `temp-${Date.now()}`,
      clientId: client.id,
      direction,
      authorName: direction === "inbound" ? (isStaff ? client.name : staffName) : staffName,
      authorId: null,
      body,
      sample: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setDraft("");
    setSending(true);
    setAtBottom(true);
    startTransition(async () => {
      addOptimistic(temp);
      const call = isStaff ? sendClientMessageAction({ clientId: client.id, body, direction }) : sendMyMessageAction({ body });
      const res = await call.catch(() => ({ ok: false as const, error: "Network error — check your connection and try again." }));
      setSending(false);
      if (!res.ok) {
        toast.error(res.error);
        setDraft(body);
      } else if (logging) {
        toast.success(`Logged a message from ${client.name}`);
        setDirection("outbound");
      }
      input.current?.focus();
    });
  }

  const sampleCount = optimistic.filter((m) => m.sample).length;
  const footer = isStaff
    ? client.userId
      ? "Enter to send, Shift+Enter for a new line. Replies appear in the client's Skylark Messages and they get a notification."
      : "Enter to send, Shift+Enter for a new line. This client has no Skylark account, so replies are saved here only; they aren't delivered by email or WhatsApp."
    : "Enter to send, Shift+Enter for a new line. Our team usually replies within one working day.";

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div ref={scroller} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface/50 px-3 py-4 sm:px-6" aria-live="polite" aria-label={isStaff ? `Conversation with ${client.name}` : "Conversation with the Skylark team"}>
        {sampleCount > 0 && (
          <p className="mx-auto mb-4 max-w-md rounded-md border border-dashed border-line-strong bg-bg px-3 py-2 text-center text-xs text-subtle">
            Messages marked <span className="font-medium text-muted">Sample</span> are illustrative demo content, not a record of a real exchange.
          </p>
        )}
        {optimistic.length === 0 ? (
          isStaff ? (
            <EmptyState icon={<MessageSquareDashed />} title="No messages yet" description={`Start the conversation with ${client.name}, or log something they said on a call.`} />
          ) : (
            <EmptyState icon={<MessageSquareDashed />} title="Start a conversation" description="Ask about plans, your profile or an application. A specialist from our team will reply here." />
          )
        ) : (
          <ol className="space-y-1.5">
            {optimistic.map((m, i) => {
              const prev = optimistic[i - 1];
              const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
              const grouped = !newDay && prev && prev.direction === m.direction && prev.authorName === m.authorName && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 10 * 60_000;
              const mine = m.direction === ownDirection;
              const fromTeam = m.direction === "outbound";
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <li className="sticky top-0 z-10 flex justify-center py-2" aria-hidden>
                      <span className="rounded-full border border-line bg-bg/95 px-2.5 py-0.5 text-[11px] font-medium text-subtle shadow-sm backdrop-blur">{dayDivider(m.createdAt, now)}</span>
                    </li>
                  )}
                  {m.id === firstUnread && (
                    <li className="flex items-center gap-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent" role="separator">
                      <span className="h-px flex-1 bg-accent/30" /> New messages <span className="h-px flex-1 bg-accent/30" />
                    </li>
                  )}
                  <li data-msg={m.id} className={cn("flex items-end gap-2 animate-[rise-in_220ms_var(--ease-out)]", mine ? "justify-end" : "justify-start", !grouped && "pt-2")} style={{ "--rise": "4px" } as React.CSSProperties}>
                    {!mine &&
                      (grouped ? (
                        <span className="w-8 shrink-0" />
                      ) : fromTeam ? (
                        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-bg" aria-hidden>
                          <Logo wordmark={false} className="h-3.5 w-auto" />
                        </span>
                      ) : (
                        <ClientAvatar name={m.authorName} className="size-8 text-[11px]" />
                      ))}
                    <div className={cn("max-w-[82%] sm:max-w-[68%]", mine && "items-end")}>
                      {!grouped && (
                        <p className={cn("mb-1 flex items-center gap-1.5 px-1 text-[11px] text-subtle", mine && "justify-end")}>
                          <span className="font-medium text-muted">{!isStaff && mine ? "You" : m.authorName}</span>
                          {fromTeam && <span>· {isStaff ? "Team" : "Skylark team"}</span>}
                          {m.sample && <span className="rounded-sm border border-line-strong px-1 py-px text-[10px] uppercase tracking-wider">Sample</span>}
                        </p>
                      )}
                      <div
                        className={cn(
                          "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed shadow-[0_1px_0_rgb(0_0_0/0.03)]",
                          mine ? "rounded-br-md bg-fg text-white" : "rounded-bl-md border border-line bg-bg text-fg",
                          m.pending && "opacity-70",
                        )}
                      >
                        {m.body}
                        <span className={cn("ml-3 inline-flex translate-y-1 items-center gap-1 float-right text-[10px] tabular", mine ? "text-white/60" : "text-subtle")}>
                          {m.pending ? "Sending…" : formatClock(m.createdAt)}
                          {mine && !m.pending && <CheckCheck className="size-3" aria-label={m.readAt ? "Read" : "Sent"} />}
                        </span>
                      </div>
                    </div>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
        {!atBottom && (
          <button
            type="button"
            onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })}
            className="sticky bottom-2 left-full grid size-9 place-items-center rounded-full border border-line-strong bg-bg text-muted shadow-md transition-colors hover:text-fg"
            aria-label="Jump to latest message"
          >
            <ArrowDown className="size-4" />
          </button>
        )}
      </div>

      <form
        className="border-t border-line bg-bg px-3 pb-3 pt-2.5 sm:px-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        {isStaff && (
          <div className="mb-2 flex items-center gap-1" role="radiogroup" aria-label="Who is this message from?">
            {(
              [
                ["outbound", "Reply as team"],
                ["inbound", "Log client's message"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={direction === value}
                onClick={() => setDirection(value)}
                className={cn("h-7 rounded-full border px-3 text-xs font-medium transition-colors", direction === value ? "border-fg bg-fg text-white" : "border-line-strong text-muted hover:border-fg/40 hover:text-fg")}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className={cn("flex items-end gap-2 rounded-xl border bg-bg p-1.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]", isStaff && direction === "inbound" ? "border-dashed border-line-strong" : "border-line-strong")}>
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={!isStaff ? "Write to the Skylark team…" : direction === "outbound" ? `Message ${client.name}…` : `What did ${client.name} say?`}
            aria-label={!isStaff ? "Message" : direction === "outbound" ? "Reply" : "Client's message"}
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed text-fg placeholder:text-subtle focus:outline-none [field-sizing:content]"
          />
          <Button type="submit" size="icon" variant={draft.trim() ? "accent" : "secondary"} disabled={!draft.trim() || sending} aria-label="Send">
            <SendHorizontal />
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-subtle">{footer}</p>
      </form>
    </div>
  );
}
