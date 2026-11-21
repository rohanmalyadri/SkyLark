"use client";

import { Link2, MessageSquareText, StickyNote, Trash2, Unlink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addClientNoteAction, linkClientAccountAction, updateClientAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { CLIENT_PAYMENT_META, CLIENT_STATUS_META } from "@/lib/domain/constants";
import { CLIENT_PAYMENT_STATUSES, CLIENT_STATUSES, type Client, type ClientNote, type ClientPaymentStatus, type ClientStatus } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { ClientFormDialog } from "./client-form";
import { DeleteClientDialog } from "./client-table";
import { formatClock, formatDay } from "./client-ui";

/** Header actions on a client profile: edit, open conversation, delete. */
export function ProfileActions({ client, canDelete }: { client: Client; canDelete: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Button asChild size="sm" variant="secondary">
        <Link href={`/admin/inbox?c=${client.id}`}>
          <MessageSquareText /> Open in inbox
        </Link>
      </Button>
      <ClientFormDialog client={client} />
      {canDelete && (
        <Button size="sm" variant="danger" onClick={() => setConfirm(true)}>
          <Trash2 /> Delete
        </Button>
      )}
      <DeleteClientDialog client={confirm ? client : null} onClose={() => setConfirm(false)} onDeleted={() => router.push("/admin/clients")} />
    </>
  );
}

/** One-click status changes without opening the full edit form. */
export function StatusControls({ client }: { client: Client }) {
  const update = useAction(updateClientAction);
  const locked = client.paymentSource === "gateway";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1.5">
        <span className="block text-xs font-medium text-muted">Client status</span>
        <Select value={client.status} disabled={update.pending} onChange={(e) => void update.execute(client.id, { status: e.target.value as ClientStatus })} aria-label="Client status">
          {CLIENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CLIENT_STATUS_META[s].label}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1.5">
        <span className="block text-xs font-medium text-muted">Payment status</span>
        <Select value={client.paymentStatus} disabled={update.pending || locked} onChange={(e) => void update.execute(client.id, { paymentStatus: e.target.value as ClientPaymentStatus })} aria-label="Payment status">
          {CLIENT_PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CLIENT_PAYMENT_META[s].label}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}

/** Internal notes: never shown to the client. Newest first. */
export function NotesPanel({ client, notes }: { client: Client; notes: ClientNote[] }) {
  const [body, setBody] = useState("");
  const add = useAction(addClientNoteAction, { onSuccess: () => setBody("") });
  return (
    <div>
      <form
        className="space-y-2 border-b border-line p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) void add.execute({ clientId: client.id, body });
        }}
      >
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Add a note about ${client.name}. Only your team can see it.`} aria-label="New internal note" className="min-h-20 text-[13px]" maxLength={2000} />
        <div className="flex justify-end">
          <Button size="sm" type="submit" loading={add.pending} disabled={!body.trim()}>
            Save note
          </Button>
        </div>
      </form>
      {notes.length === 0 ? (
        <EmptyState icon={<StickyNote />} title="No notes yet" description="Context for the team: what they want, what was promised, what to watch for." className="py-10" />
      ) : (
        <ol className="divide-y divide-line">
          {notes.map((n) => (
            <li key={n.id} className="px-4 py-3.5">
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-fg">{n.body}</p>
              <p className="mt-1.5 text-[11px] text-subtle">
                {n.authorName} · {formatDay(n.createdAt, true)}, {formatClock(n.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Connects this client to the Skylark account they chat from, or disconnects it. */
export function AccountLink({ client, account }: { client: Client; account: { name: string; email: string } | null }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const link = useAction(linkClientAccountAction, { onSuccess: () => setEmail("") });

  if (account) {
    return (
      <div className="space-y-3 p-4 text-[13px]">
        <p className="flex items-start gap-2 text-muted">
          <Link2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>
            Linked to <span className="font-medium text-fg">{account.name}</span> ({account.email}). They see this conversation in their Messages page.
          </span>
        </p>
        <Button size="sm" variant="ghost" loading={link.pending} onClick={() => void link.execute({ clientId: client.id, email: "" })}>
          <Unlink /> Unlink account
        </Button>
      </div>
    );
  }
  return (
    <form
      className="space-y-2 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const res = await link.execute({ clientId: client.id, email });
        if (!res.ok) setError(res.fieldErrors?.email?.[0] ?? null);
      }}
    >
      <p className="text-[13px] text-muted">Not linked. Enter the email of their Skylark account so they can chat with you from the app.</p>
      <div className="flex gap-2">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" aria-label="Account email" aria-invalid={!!error} className="h-8 text-[13px]" />
        <Button size="sm" type="submit" loading={link.pending} disabled={!email.trim()}>
          Link
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
