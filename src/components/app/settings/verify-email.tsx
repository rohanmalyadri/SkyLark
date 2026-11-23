"use client";

import { MailCheck } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { sendEmailCodeAction, verifyEmailCodeAction } from "@/app/actions/candidate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlay";

/**
 * Two-step popup: send a 6-digit code to the account's email, then type it in.
 * Opening it sends the first code straight away, so there is one less click.
 */
export function VerifyEmailDialog({
  open,
  onOpenChange,
  email,
  sender,
  reason,
  onVerified,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  /** The address codes come from, so people know what to look for in their inbox. */
  sender?: string | null;
  /** Shown under the title, e.g. why verification is needed before paying. */
  reason?: string;
  onVerified?: () => void;
}) {
  const [step, setStep] = useState<"send" | "code">("send");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sending, startSending] = useTransition();
  const [checking, startChecking] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const autoSent = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const close = (next: boolean) => {
    if (!next) {
      autoSent.current = false;
      setStep("send");
      setError(null);
    }
    onOpenChange(next);
  };

  const send = () =>
    startSending(async () => {
      setError(null);
      try {
        const res = await sendEmailCodeAction();
        if (!res.ok) return void setError(res.error);
        if (res.data.status === "already_verified") {
          onVerified?.();
          return close(false);
        }
        setStep("code");
        setCode("");
        setCooldown(res.data.resendAfter);
        setTimeout(() => input.current?.focus(), 50);
      } catch {
        setError("We couldn't reach the server. Check your connection and try again.");
      }
    });

  const verify = (value = code) =>
    startChecking(async () => {
      setError(null);
      try {
        const res = await verifyEmailCodeAction(value);
        if (!res.ok) return void setError(res.fieldErrors ? Object.values(res.fieldErrors)[0]?.[0] ?? res.error : res.error);
        toast.success("Email verified");
        close(false);
        onVerified?.();
      } catch {
        setError("We couldn't reach the server. Check your connection and try again.");
      }
    });

  // Send the first code as soon as the popup opens.
  useEffect(() => {
    if (open && !autoSent.current) {
      autoSent.current = true;
      send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent title="Verify your email" description={reason}>
        <div className="flex items-start gap-3 rounded-md border border-line bg-surface-2 p-3 text-[13px] leading-relaxed text-muted">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-fg" />
          <p>
            {step === "code" ? "We sent a 6-digit code to " : "We'll send a 6-digit code to "}
            <span className="font-medium text-fg">{email}</span>.{sender ? ` It comes from ${sender} and` : " It"} expires in 10 minutes. Check your spam folder if it doesn&apos;t arrive.
          </p>
        </div>

        {step === "code" && (
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6) verify();
            }}
          >
            <label htmlFor="otp" className="mb-1.5 block text-[13px] font-medium">
              Verification code
            </label>
            <input
              ref={input}
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                if (v.length === 6 && !checking) verify(v);
              }}
              placeholder="000000"
              aria-invalid={!!error}
              aria-describedby={error ? "otp-error" : undefined}
              className="h-12 w-full rounded-md border border-line-strong bg-surface px-3 text-center text-2xl font-semibold tracking-[0.5em] tabular placeholder:text-subtle focus:border-fg focus:outline-none"
            />
          </form>
        )}

        {error && (
          <p id="otp-error" role="alert" className="mt-3 text-[13px] text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          {step === "code" ? (
            <Button variant="ghost" size="sm" disabled={cooldown > 0 || sending} loading={sending} onClick={send}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            {step === "code" ? (
              <Button disabled={code.length !== 6} loading={checking} onClick={() => verify()}>
                Verify
              </Button>
            ) : (
              <Button loading={sending} onClick={send}>
                Send code
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
