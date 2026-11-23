"use client";

import { Info, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClientAction, updateClientAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { CLIENT_PAYMENT_META, CLIENT_STATUS_META } from "@/lib/domain/constants";
import { CLIENT_PAYMENT_STATUSES, CLIENT_STATUSES, type Client, type ClientPaymentStatus, type ClientStatus } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";

interface Values {
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  status: ClientStatus;
  amount: string;
  paymentStatus: ClientPaymentStatus;
  paidOn: string;
  paymentMethod: string;
}

const IST_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

function toValues(c?: Client): Values {
  return {
    name: c?.name ?? "",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    company: c?.company ?? "",
    city: c?.city ?? "",
    status: c?.status ?? "lead",
    amount: c?.amount != null ? String(c.amount) : "",
    paymentStatus: c?.paymentStatus ?? "unpaid",
    paidOn: c?.paidAt ? IST_DATE.format(new Date(c.paidAt)) : "",
    paymentMethod: c?.paymentMethod ?? "",
  };
}

/** Create a client, or edit one (pass `client`). Opens from its own trigger button. */
export function ClientFormDialog({ client, trigger }: { client?: Client; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ??
          (client ? (
            <Button size="sm" variant="secondary">
              <Pencil /> Edit details
            </Button>
          ) : (
            // Deliberately quiet: adding clients is occasional, so it shouldn't compete with the page.
            <button type="button" className="inline-flex items-center gap-1 text-xs text-subtle transition-colors hover:text-fg hover:underline hover:underline-offset-4">
              <Plus className="size-3" /> Add client
            </button>
          ))}
      </DialogTrigger>
      <DialogContent
        title={client ? `Edit ${client.name}` : "Add a client"}
        description={client ? "Changes are saved to the client record and the audit log." : "Only the name is required. You can fill in the rest as the conversation goes."}
        className="max-w-xl"
      >
        {/* Remount on every open so the form always starts from the saved record. */}
        {open && <ClientForm client={client} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ClientForm({ client, onDone }: { client?: Client; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(() => toValues(client));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const create = useAction(createClientAction, { onSuccess: (d) => router.push(`/obscuron-nexus-92vX7q/clients/${d.id}`) });
  const update = useAction(updateClientAction);
  const pending = create.pending || update.pending;
  const gatewayLocked = client?.paymentSource === "gateway";
  const moneyMoved = v.paymentStatus === "paid" || v.paymentStatus === "refunded";

  const set = <K extends keyof Values>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((prev) => ({ ...prev, [k]: e.target.value as Values[K] }));
  const err = (k: string) => errors[k]?.[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: v.name,
      email: v.email.trim(),
      phone: v.phone.trim(),
      company: v.company,
      city: v.city,
      status: v.status,
      ...(gatewayLocked
        ? {}
        : {
            amount: v.amount.trim() === "" ? null : v.amount.replace(/[,\s₹]/g, ""),
            paymentStatus: v.paymentStatus,
            paidOn: moneyMoved ? v.paidOn : "",
            paymentMethod: moneyMoved ? v.paymentMethod : "",
          }),
    };
    const res = client ? await update.execute(client.id, payload) : await create.execute(payload);
    if (res.ok) onDone();
    else setErrors(res.fieldErrors ?? {});
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="cf-name" error={err("name")} className="sm:col-span-2">
          <Input id="cf-name" value={v.name} onChange={set("name")} autoFocus autoComplete="off" aria-invalid={!!err("name")} />
        </Field>
        <Field label="Email" htmlFor="cf-email" optional error={err("email")}>
          <Input id="cf-email" type="email" value={v.email} onChange={set("email")} aria-invalid={!!err("email")} />
        </Field>
        <Field label="Phone" htmlFor="cf-phone" optional error={err("phone")}>
          <Input id="cf-phone" type="tel" value={v.phone} onChange={set("phone")} placeholder="+91" aria-invalid={!!err("phone")} />
        </Field>
        <Field label="Company or college" htmlFor="cf-company" optional error={err("company")}>
          <Input id="cf-company" value={v.company} onChange={set("company")} />
        </Field>
        <Field label="City" htmlFor="cf-city" optional error={err("city")}>
          <Input id="cf-city" value={v.city} onChange={set("city")} />
        </Field>
        <Field label="Client status" htmlFor="cf-status" error={err("status")} className="sm:col-span-2">
          <Select id="cf-status" value={v.status} onChange={set("status")}>
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_STATUS_META[s].label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="space-y-4 rounded-lg border border-line bg-surface/60 p-4">
        <legend className="px-1 text-[13px] font-medium text-fg">Payment</legend>
        {gatewayLocked ? (
          <p className="flex items-start gap-2 text-[13px] text-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-success" /> This payment was confirmed by the payment gateway, so its amount and status can&apos;t be edited by hand.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount (₹)" htmlFor="cf-amount" optional hint="Leave empty until a price is agreed." error={err("amount")}>
                <Input id="cf-amount" inputMode="numeric" value={v.amount} onChange={set("amount")} placeholder="e.g. 4572" aria-invalid={!!err("amount")} />
              </Field>
              <Field label="Payment status" htmlFor="cf-pay" error={err("paymentStatus")}>
                <Select id="cf-pay" value={v.paymentStatus} onChange={set("paymentStatus")}>
                  {CLIENT_PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {CLIENT_PAYMENT_META[s].label}
                    </option>
                  ))}
                </Select>
              </Field>
              {moneyMoved && (
                <>
                  <Field label="Payment date" htmlFor="cf-paidon" optional hint="Only if you know the actual date." error={err("paidOn")}>
                    <Input id="cf-paidon" type="date" value={v.paidOn} onChange={set("paidOn")} max={IST_DATE.format(new Date())} />
                  </Field>
                  <Field label="Payment method" htmlFor="cf-method" optional hint="e.g. UPI, bank transfer. Only if confirmed." error={err("paymentMethod")}>
                    <Input id="cf-method" value={v.paymentMethod} onChange={set("paymentMethod")} />
                  </Field>
                </>
              )}
            </div>
            <p className="flex items-start gap-2 text-xs text-subtle">
              <Info className="mt-px size-3.5 shrink-0" /> Statuses entered here are recorded as manual entries. They&apos;re labelled as not gateway-verified everywhere they appear.
            </p>
          </>
        )}
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {client ? "Save changes" : "Add client"}
        </Button>
      </div>
    </form>
  );
}
