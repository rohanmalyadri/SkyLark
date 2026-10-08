"use client";

import { ArrowRight, Eye, EyeOff, LayoutDashboard, MailCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { demoAction, googleAction, signInAction, signUpAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { InlineError } from "@/components/ui/states";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" loading={pending}>
      {children}
    </Button>
  );
}

function PasswordInput({ id, invalid, autoComplete }: { id: string; invalid?: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name="password" type={show ? "text" : "password"} autoComplete={autoComplete} required aria-invalid={invalid || undefined} aria-describedby={`${id}-${invalid ? "error" : "hint"}`} className="h-10 pr-10" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-subtle hover:text-fg" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

const fieldError = (state: AuthState, key: string) => (state && !state.ok ? state.fieldErrors?.[key]?.[0] : undefined);

function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={googleAction}>
      <input type="hidden" name="next" value={next ?? ""} />
      <GoogleSubmit />
    </form>
  );
}

/** Google's four-colour "G" mark, as published in Google's sign-in branding guidelines. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px] shrink-0" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Google's dark-theme button: #131314 fill, #8E918F outline, #E3E3E3 label. */
function GoogleSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="relative flex h-11 w-full items-center justify-center gap-3 rounded-md border border-[#8E918F] bg-[#131314] px-4 text-[14px] font-medium text-[#E3E3E3] transition-[background-color,border-color] duration-150 hover:border-[#B4B7B5] hover:bg-[#1C1C1E] active:translate-y-px disabled:opacity-70"
    >
      {pending ? <Spinner className="text-[#E3E3E3]" /> : <GoogleMark />}
      {pending ? "Redirecting to Google…" : "Continue with Google"}
    </button>
  );
}

const GOOGLE_ERRORS: Record<string, { title: string; message: string }> = {
  google_unavailable: { title: "Google sign-in unavailable", message: "Try email and password, or a demo account." },
  google_cancelled: { title: "Google sign-in cancelled", message: "No problem. Choose another way to sign in, or try again." },
  google_expired: { title: "Sign-in link expired", message: "That Google sign-in took too long or was opened in another browser. Please try again." },
  google_failed: { title: "Couldn't sign in with Google", message: "Google didn't confirm your account. Please try again." },
  rate_limited: { title: "Too many attempts", message: "Please wait a few minutes before trying again." },
  callback: { title: "Couldn't complete sign-in", message: "That sign-in link is invalid or expired. Please try again." },
};

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-subtle">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function DemoAccounts() {
  return (
    <div className="mt-8 rounded-xl border border-line bg-surface p-4">
      <p className="text-[13px] font-medium text-fg">Explore with demo data</p>
      <p className="mt-0.5 text-xs text-muted">Pre-loaded profile, matches and applications. No password needed.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <form action={demoAction}>
          <input type="hidden" name="who" value="candidate" />
          <DemoButton icon={<UserRound />} label="Candidate" />
        </form>
        <form action={demoAction}>
          <input type="hidden" name="who" value="admin" />
          <DemoButton icon={<LayoutDashboard />} label="Operations" />
        </form>
      </div>
    </div>
  );
}

function DemoButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" className="w-full" loading={pending}>
      {icon}
      {label}
    </Button>
  );
}

export function SignInForm({ next, demo, google, error }: { next?: string; demo: boolean; google: boolean; error?: string }) {
  const authError = error ? GOOGLE_ERRORS[error] : undefined;
  const [state, action] = useActionState(signInAction, null);
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.025em]">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted">Sign in to your career command center.</p>

      <div className="mt-8">
        {authError && (
          <div className="mb-4">
            <InlineError title={authError.title} message={authError.message} />
          </div>
        )}
        {google && <GoogleButton next={next} />}
        {google && <Divider />}
        <form action={action} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={next ?? ""} />
          {state && !state.ok && !state.fieldErrors && <InlineError title="Couldn't sign you in" message={state.error} />}
          <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
            <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} aria-invalid={!!fieldError(state, "email") || undefined} className="h-10" />
          </Field>
          <Field label="Password" htmlFor="password" error={fieldError(state, "password")}>
            <PasswordInput id="password" autoComplete="current-password" invalid={!!fieldError(state, "password")} />
          </Field>
          <SubmitButton>
            Sign in <ArrowRight />
          </SubmitButton>
        </form>
      </div>

      {demo && <DemoAccounts />}

      <p className="mt-8 text-center text-sm text-muted">
        New to AutoApply?{" "}
        <Link href="/signup" className="font-medium text-fg underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function SignUpForm({ demo, google, plan }: { demo: boolean; google: boolean; plan?: string }) {
  const [state, action] = useActionState(signUpAction, null);

  if (state?.ok && state.data.needsConfirmation) {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-xl border border-line-strong bg-surface-2">
          <MailCheck className="size-5 text-accent" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted">
          We sent a confirmation link to <span className="text-fg">{state.values?.email}</span>. Open it on this device to continue to onboarding.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.025em]">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted">
        {plan ? `You picked ${plan[0]!.toUpperCase()}${plan.slice(1)}. ` : ""}Five minutes to your first ranked matches.
      </p>
      <div className="mt-8">
        {google && <GoogleButton next="/onboarding" />}
        {google && <Divider />}
        <form action={action} className="space-y-4" noValidate>
          {state && !state.ok && !state.fieldErrors && <InlineError title="Couldn't create your account" message={state.error} />}
          <Field label="Full name" htmlFor="fullName" error={fieldError(state, "fullName")}>
            <Input id="fullName" name="fullName" autoComplete="name" required defaultValue={state?.values?.fullName} aria-invalid={!!fieldError(state, "fullName") || undefined} className="h-10" />
          </Field>
          <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
            <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} aria-invalid={!!fieldError(state, "email") || undefined} className="h-10" />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 10 characters, with a letter and a number." error={fieldError(state, "password")}>
            <PasswordInput id="password" autoComplete="new-password" invalid={!!fieldError(state, "password")} />
          </Field>
          <SubmitButton>
            Create account <ArrowRight />
          </SubmitButton>
        </form>
        <p className="mt-4 text-center text-xs text-subtle">By continuing you agree to the Terms and acknowledge the Privacy Policy.</p>
      </div>
      {demo && <DemoAccounts />}
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-fg underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
