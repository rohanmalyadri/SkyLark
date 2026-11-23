"use server";

import { redirect } from "next/navigation";
import { requestIp } from "@/lib/auth/dal";
import { AppError, toActionError, type ActionResult } from "@/lib/infra/errors";
import { demoSignIn, googleSignInUrl, signIn, signOut, signUp, type SignInFailure } from "@/lib/services/auth";

export type AuthState = (ActionResult<{ needsConfirmation?: boolean }> & { values?: { email?: string; fullName?: string }; reason?: SignInFailure }) | null;

/** Only allow same-site relative redirects after sign-in. */
function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

export async function signInAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  let destination: string;
  try {
    const user = await signIn({ email, password: form.get("password") }, (await requestIp()) ?? "unknown");
    destination = safeNext(form.get("next"), user.role === "candidate" ? (user.onboardedAt ? "/dashboard" : "/onboarding") : "/obscuron-nexus-92vX7q");
  } catch (err) {
    const reason = err instanceof AppError ? (err.details?.reason as SignInFailure | undefined) : undefined;
    // No account uses this email: go straight to sign-up with the email already filled in.
    if (reason !== "no_account") return { ...toActionError(err, "auth.signIn"), values: { email }, ...(reason ? { reason } : {}) };
    destination = `/signup?${new URLSearchParams({ email: email.trim().toLowerCase(), from: "login" })}`;
  }
  redirect(destination);
}

export async function signUpAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const fullName = String(form.get("fullName") ?? "");
  try {
    const res = await signUp({ email, fullName, password: form.get("password") }, (await requestIp()) ?? "unknown");
    if (res.needsConfirmation) return { ok: true, data: { needsConfirmation: true }, values: { email } };
  } catch (err) {
    return { ...toActionError(err, "auth.signUp"), values: { email, fullName } };
  }
  redirect("/onboarding");
}

export async function googleAction(form: FormData): Promise<void> {
  let url: string;
  try {
    const hint = String(form.get("loginHint") ?? "").trim();
    url = await googleSignInUrl(safeNext(form.get("next"), "/dashboard"), hint.length <= 254 && hint.includes("@") ? hint : undefined);
  } catch {
    redirect("/login?error=google_unavailable");
  }
  redirect(url);
}

export async function demoAction(form: FormData): Promise<void> {
  const who = form.get("who") === "admin" ? "admin" : "candidate";
  await demoSignIn(who);
  redirect(who === "admin" ? "/obscuron-nexus-92vX7q" : "/dashboard");
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/");
}
