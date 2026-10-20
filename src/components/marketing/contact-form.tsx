"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";
import { submitLeadAction } from "@/app/actions/public";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";

/**
 * "Ask us to get in touch." The only write path on the site open to people who aren't
 * signed in, so it is deliberately small: enough to call someone back, nothing more.
 */

/** Dialling codes for the markets we actually operate in. */
const DIAL_CODES = [
  { code: "US", dial: "+1", label: "United States" },
  { code: "CA", dial: "+1", label: "Canada" },
  { code: "GB", dial: "+44", label: "United Kingdom" },
  { code: "IE", dial: "+353", label: "Ireland" },
  { code: "DE", dial: "+49", label: "Germany" },
  { code: "NL", dial: "+31", label: "Netherlands" },
  { code: "AE", dial: "+971", label: "United Arab Emirates" },
  { code: "SG", dial: "+65", label: "Singapore" },
  { code: "AU", dial: "+61", label: "Australia" },
  { code: "IN", dial: "+91", label: "India" },
];

type FieldErrors = Record<string, string[] | undefined>;

export function ContactForm({ source = "website:home", promoCode = "" }: { source?: string; promoCode?: string }) {
  const [v, setV] = useState({ name: "", email: "", phone: "", country: "US", city: "", message: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sent, setSent] = useState(false);
  const ids = { name: useId(), email: useId(), phone: useId(), country: useId(), city: useId(), message: useId() };
  const submit = useAction(submitLeadAction, {
    onSuccess: () => {
      setSent(true);
      setErrors({});
    },
  });

  const dial = DIAL_CODES.find((d) => d.code === v.country)?.dial ?? "+1";
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((p) => ({ ...p, [k]: value }));
  const first = (k: string) => errors[k]?.[0];

  if (sent) {
    return (
      <div className="contact-sent" role="status">
        <span className="contact-sent__mark" aria-hidden>
          <Check />
        </span>
        <p className="title --small">Thanks — we have it.</p>
        <p className="text --small">
          Someone will email <strong>{v.email}</strong> within one working day. If it&apos;s urgent, reply to that email and it comes straight to the team.
        </p>
      </div>
    );
  }

  return (
    <form
      className="contact-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await submit.execute({ ...v, phone: `${dial} ${v.phone}`.trim(), source, promoCode });
        if (!res.ok) setErrors(res.fieldErrors ?? {});
      }}
      noValidate
    >
      <div className="contact-form__grid">
        <Field label="Your name" htmlFor={ids.name} error={first("name")}>
          <Input id={ids.name} value={v.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" aria-invalid={Boolean(first("name"))} />
        </Field>
        <Field label="Email" htmlFor={ids.email} error={first("email")}>
          <Input id={ids.email} type="email" value={v.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" aria-invalid={Boolean(first("email"))} />
        </Field>
        <Field label="Country" htmlFor={ids.country} error={first("country")}>
          <Select id={ids.country} value={v.country} onChange={(e) => set("country", e.target.value)}>
            {DIAL_CODES.map((d) => (
              <option key={d.code} value={d.code}>
                {d.label} ({d.dial})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Phone" htmlFor={ids.phone} hint={`We'll prefix ${dial}.`} error={first("phone")}>
          <Input id={ids.phone} type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel-national" aria-invalid={Boolean(first("phone"))} />
        </Field>
        <Field label="City" htmlFor={ids.city} error={first("city")}>
          <Input id={ids.city} value={v.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" aria-invalid={Boolean(first("city"))} />
        </Field>
        <Field label="What do you need?" htmlFor={ids.message} optional className="contact-form__wide" error={first("message")}>
          <Textarea id={ids.message} value={v.message} onChange={(e) => set("message", e.target.value)} placeholder="The roles you're after, the countries you'd move to, anything that makes your search unusual." />
        </Field>
      </div>
      <div className="contact-form__foot">
        <p className="text --xsmall">We use this to reply to you. No newsletter, no reselling.</p>
        <Button type="submit" size="lg" loading={submit.pending}>
          Ask us to get in touch
        </Button>
      </div>
    </form>
  );
}
