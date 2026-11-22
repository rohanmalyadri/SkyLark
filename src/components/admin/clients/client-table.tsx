"use client";

import { MessageSquareText, MoreHorizontal, Search, SearchX, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteClientAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/states";
import { CLIENT_PAYMENT_META, CLIENT_STATUS_META } from "@/lib/domain/constants";
import { CLIENT_PAYMENT_STATUSES, CLIENT_STATUSES, type Client, type ClientPaymentStatus, type ClientStatus } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import type { ThreadSummary } from "@/lib/services/client-stats";
import { cn } from "@/lib/utils";
import { ClientFormDialog } from "./client-form";
import { Amount, ClientAvatar, ClientStatusBadge, listTime, PaymentBadge, PaymentSourceTag } from "./client-ui";

/** Client list with search, status and payment filters, and per-row actions. */
export function ClientTable({ rows, now, canDelete }: { rows: ThreadSummary[]; now: string; canDelete: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ClientStatus>("all");
  const [payment, setPayment] = useState<"all" | ClientPaymentStatus>("all");
  const [deleting, setDeleting] = useState<Client | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      ({ client: c }) =>
        (status === "all" || c.status === status) &&
        (payment === "all" || c.paymentStatus === payment) &&
        (!q || [c.name, c.email, c.phone, c.company, c.city].some((f) => f.toLowerCase().includes(q))),
    );
  }, [rows, query, status, payment]);

  const filtered = query || status !== "all" || payment !== "all";

  return (
    <div className="rounded-lg border border-line bg-bg">
      <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, phone or city" aria-label="Search clients" className="pl-9" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filter by client status" className="sm:w-40">
            <option value="all">All statuses</option>
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_STATUS_META[s].label}
              </option>
            ))}
          </Select>
          <Select value={payment} onChange={(e) => setPayment(e.target.value as typeof payment)} aria-label="Filter by payment status" className="sm:w-44">
            <option value="all">All payments</option>
            {CLIENT_PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_PAYMENT_META[s].label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Users />} title="No clients yet" description="Add your first client to track payments and conversations." action={<ClientFormDialog />} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No clients match"
          description="Try a different search or clear the filters."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setPayment("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {/* Table from md up */}
          <table className="hidden w-full text-left text-[13px] md:table">
            <thead className="border-b border-line text-xs text-subtle">
              <tr>
                <th className="px-5 py-2.5 font-medium">Client</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                <th className="px-3 py-2.5 font-medium">Payment</th>
                <th className="px-3 py-2.5 font-medium">Last interaction</th>
                <th className="w-12 px-3 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map(({ client: c, unread }) => (
                <tr key={c.id} className="group transition-colors hover:bg-surface/70">
                  <td className="px-5 py-3">
                    <Link href={`/obscuron-nexus-92vX7q/clients/${c.id}`} className="flex items-center gap-3 outline-none">
                      <ClientAvatar name={c.name} unread={unread > 0} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-fg group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">{c.name}</span>
                        <span className="block truncate text-xs text-subtle">{[c.company, c.city].filter(Boolean).join(" · ") || c.email || "No contact details yet"}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <ClientStatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Amount client={c} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <PaymentBadge status={c.paymentStatus} />
                      {(c.paymentStatus === "paid" || c.paymentStatus === "refunded") && <PaymentSourceTag source={c.paymentSource} />}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {c.lastInteractionAt ? listTime(c.lastInteractionAt, now) : <span className="text-subtle">None yet</span>}
                    {unread > 0 && <span className="ml-2 rounded-full bg-accent px-1.5 py-px text-[10px] font-semibold text-white">{unread} new</span>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <RowMenu client={c} canDelete={canDelete} onDelete={() => setDeleting(c)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Cards on phones */}
          <ul className="divide-y divide-line md:hidden">
            {shown.map(({ client: c, unread }) => (
              <li key={c.id} className="flex items-start gap-3 px-4 py-3.5">
                <Link href={`/obscuron-nexus-92vX7q/clients/${c.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                  <ClientAvatar name={c.name} unread={unread > 0} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] font-medium text-fg">{c.name}</span>
                      <Amount client={c} className="shrink-0 text-[13px]" />
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      <ClientStatusBadge status={c.status} />
                      <PaymentBadge status={c.paymentStatus} />
                    </span>
                    <span className="mt-1.5 block text-xs text-subtle">{c.lastInteractionAt ? `Last interaction ${listTime(c.lastInteractionAt, now)}` : "No interactions yet"}</span>
                  </span>
                </Link>
                <RowMenu client={c} canDelete={canDelete} onDelete={() => setDeleting(c)} />
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-2.5 text-xs text-subtle">
            {filtered ? `Showing ${shown.length} of ${rows.length} clients` : `${rows.length} client${rows.length === 1 ? "" : "s"}`}
          </p>
        </>
      )}

      <DeleteClientDialog client={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function RowMenu({ client, canDelete, onDelete }: { client: Client; canDelete: boolean; onDelete: () => void }) {
  const router = useRouter();
  return (
    <Menu>
      <MenuTrigger asChild>
        <button type="button" className="grid size-8 place-items-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-fg" aria-label={`Actions for ${client.name}`}>
          <MoreHorizontal className="size-4" />
        </button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={() => router.push(`/obscuron-nexus-92vX7q/clients/${client.id}`)}>
          <Users className="size-4" /> Open profile
        </MenuItem>
        <MenuItem onSelect={() => router.push(`/obscuron-nexus-92vX7q/inbox?c=${client.id}`)}>
          <MessageSquareText className="size-4" /> Open conversation
        </MenuItem>
        {canDelete && (
          <>
            <MenuSeparator />
            <MenuItem onSelect={onDelete} className="text-danger data-[highlighted]:text-danger">
              <Trash2 className="size-4" /> Delete client
            </MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );
}

/** Confirmation before a delete that takes the conversation and notes with it. */
export function DeleteClientDialog({ client, onClose, onDeleted }: { client: Client | null; onClose: () => void; onDeleted?: () => void }) {
  const remove = useAction(deleteClientAction, { onSuccess: () => (onClose(), onDeleted?.()) });
  return (
    <Dialog open={!!client} onOpenChange={(o) => !o && onClose()}>
      {client && (
        <DialogContent title={`Delete ${client.name}?`} description="This removes the client record together with its conversation history and internal notes. It can't be undone.">
          <div className={cn("flex justify-end gap-2")}>
            <DialogClose asChild>
              <Button variant="ghost" disabled={remove.pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="danger" loading={remove.pending} onClick={() => void remove.execute(client.id)}>
              <Trash2 /> Delete client
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
