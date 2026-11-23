import "server-only";
import { cookies } from "next/headers";
import { createDemoToken, DEMO_SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/demo-session";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { systemRepo } from "@/lib/data";
import { memoryStore } from "@/lib/data/memory";
import { SignInSchema, SignUpSchema } from "@/lib/domain/schemas";
import type { User } from "@/lib/domain/types";
import type { GoogleProfile } from "@/lib/auth/google";
import { nativeGoogleEnabled, serverEnv } from "@/lib/env";
import { AppError, fieldErrors } from "@/lib/infra/errors";
import { emailProblem } from "@/lib/validation/email";
import { rateLimit } from "@/lib/infra/rate-limit";
import { DEMO_ADMIN_KEY, DEMO_CANDIDATE_KEY, userIdByKey } from "@/lib/seed/people";
import { logger } from "@/lib/infra/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { audit } from "./audit";

const GENERIC_LOGIN_ERROR = "That email and password don't match an account.";
const USE_GOOGLE_ERROR = "This email is registered with Google. Use \"Continue with Google\" to sign in.";

/** Why an email sign-in failed, when the app can safely say more than "wrong email or password". */
export type SignInFailure = "no_account" | "use_google";

/**
 * Which sign-in methods an email has: null when no account uses it, otherwise identity providers
 * ("email" means it has a password). Reveals whether an account exists, so it is server-only and
 * callers must rate-limit it.
 */
export async function signInMethodsForEmail(email: string): Promise<string[] | null> {
  if (serverEnv().dataMode === "demo") {
    const user = await systemRepo().getUserByEmail(email);
    if (!user) return null;
    if (memoryStore().passwords.has(user.id)) return ["email"];
    return user.signupMethod === "google" ? ["google"] : [];
  }
  const { data, error } = await createAdminClient().rpc("account_sign_in_methods", { p_email: email });
  if (error) throw error;
  return (data as string[] | null) ?? null;
}

/**
 * Turns a failed password sign-in into the most helpful error. A wrong password on a password
 * account stays generic; an unknown email or a Google-only account gets a specific reason.
 * Lookups have their own per-IP limit, and past it (or on any lookup error) the error stays generic.
 */
async function failedSignInError(email: string, ip: string): Promise<AppError> {
  const generic = new AppError("unauthorized", GENERIC_LOGIN_ERROR);
  try {
    await rateLimit("accountLookup", ip);
    const methods = await signInMethodsForEmail(email);
    if (methods === null) return new AppError("not_found", "No account uses that email yet.", { reason: "no_account" satisfies SignInFailure });
    if (methods.length > 0 && !methods.includes("email")) return new AppError("unauthorized", USE_GOOGLE_ERROR, { reason: "use_google" satisfies SignInFailure });
  } catch (err) {
    if (!(err instanceof AppError && err.code === "rate_limited")) logger.warn("auth.lookup_failed", { error: err });
  }
  return generic;
}

async function setDemoCookie(uid: string) {
  (await cookies()).set(DEMO_SESSION_COOKIE, createDemoToken(uid, serverEnv().sessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Promote allow-listed operator emails to admin on sign-in (bootstrap for a fresh project). */
async function applyRoleAllowlist(user: User) {
  const allow = (serverEnv().ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allow.includes(user.email.toLowerCase()) && user.role !== "admin") {
    await systemRepo().updateUser(user.id, { role: "admin" });
  }
}

/** Sign-up hit an existing account: point Google-only accounts at the Google button. */
async function existingAccountError(email: string, ip: string) {
  let googleOnly = false;
  try {
    await rateLimit("accountLookup", ip);
    const methods = await signInMethodsForEmail(email);
    googleOnly = !!methods && methods.length > 0 && !methods.includes("email");
  } catch {
    // Fall through to the plain message.
  }
  return googleOnly
    ? fieldErrors({ email: "This email is registered with Google. Use \"Continue with Google\" instead." }, USE_GOOGLE_ERROR)
    : fieldErrors({ email: "An account with this email already exists. Sign in instead." }, "An account with that email already exists. Try signing in.");
}

export async function signUp(input: unknown, ip: string) {
  await rateLimit("auth", ip);
  const data = SignUpSchema.parse(input);
  const env = serverEnv();
  const emailIssue = await emailProblem(data.email);
  if (emailIssue) throw fieldErrors({ email: emailIssue });

  if (env.dataMode === "demo") {
    const repo = systemRepo();
    if (await repo.getUserByEmail(data.email)) throw await existingAccountError(data.email, ip);
    const user = await repo.createUser({ email: data.email, fullName: data.fullName, role: "candidate", avatarUrl: null, onboardedAt: null, signupMethod: "password" });
    memoryStore().passwords.set(user.id, await hashPassword(data.password));
    await setDemoCookie(user.id);
    await audit(user, "auth.signed_up", "user", user.id);
    return { needsConfirmation: false };
  }

  const supabase = await createSessionClient();
  const { data: res, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { full_name: data.fullName }, emailRedirectTo: `${env.siteUrl}/auth/callback?next=/onboarding` },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) throw await existingAccountError(data.email, ip);
    throw new AppError("validation", error.message);
  }
  // Supabase hides existing accounts behind an empty identities list instead of an error.
  if (res.user && res.user.identities?.length === 0) throw await existingAccountError(data.email, ip);
  return { needsConfirmation: !res.session };
}

export async function signIn(input: unknown, ip: string) {
  await rateLimit("auth", ip);
  const data = SignInSchema.parse(input);
  const env = serverEnv();

  if (env.dataMode === "demo") {
    const repo = systemRepo();
    const user = await repo.getUserByEmail(data.email);
    const hash = user ? memoryStore().passwords.get(user.id) : undefined;
    if (!user || !hash || !(await verifyPassword(data.password, hash))) throw await failedSignInError(data.email, ip);
    await setDemoCookie(user.id);
    await audit(user, "auth.signed_in", "user", user.id);
    return user;
  }

  const supabase = await createSessionClient();
  const { data: res, error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
  if (error || !res.user) throw await failedSignInError(data.email, ip);
  const user = await systemRepo().getUser(res.user.id);
  if (!user) throw new AppError("unauthorized", GENERIC_LOGIN_ERROR);
  await applyRoleAllowlist(user);
  await audit(user, "auth.signed_in", "user", user.id);
  return user;
}

export async function googleSignInUrl(next = "/dashboard", loginHint?: string) {
  const env = serverEnv();
  if (nativeGoogleEnabled()) return `/auth/google?next=${encodeURIComponent(next)}`;
  if (env.dataMode === "demo") throw new AppError("validation", "Google sign-in isn't configured. Use a demo account instead.");
  if (env.SUPABASE_GOOGLE_AUTH !== "on") throw new AppError("validation", "Google sign-in isn't set up yet. Use your email and password.");
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      // Preselects the right Google account when the sign-in form already knows the email.
      ...(loginHint ? { queryParams: { login_hint: loginHint } } : {}),
    },
  });
  if (error || !data.url) throw new AppError("internal", "Couldn't start Google sign-in.");
  return data.url;
}

/**
 * Signs in (or signs up) from a verified Google identity when running without Supabase.
 * Accounts are matched on Google-verified email, so an existing email/password user lands in the same account.
 */
export async function completeGoogleSignIn(profile: GoogleProfile, ip: string) {
  await rateLimit("auth", ip);
  const repo = systemRepo();
  let user = await repo.getUserByEmail(profile.email);
  const created = !user;
  if (!user) {
    user = await repo.createUser({ email: profile.email, fullName: profile.name, role: "candidate", avatarUrl: profile.picture, onboardedAt: null, signupMethod: "google" });
  } else if (!user.avatarUrl && profile.picture) {
    user = await repo.updateUser(user.id, { avatarUrl: profile.picture });
  }
  await applyRoleAllowlist(user);
  user = (await repo.getUser(user.id)) ?? user;
  await setDemoCookie(user.id);
  await audit(user, created ? "auth.signed_up" : "auth.signed_in", "user", user.id, { method: "google" });
  return user;
}

export async function exchangeOAuthCode(code: string) {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) throw new AppError("unauthorized", "Sign-in link is invalid or expired.");
  const user = await systemRepo().getUser(data.user.id);
  if (user) {
    await applyRoleAllowlist(user);
    await audit(user, "auth.signed_in", "user", user.id, { method: "oauth" });
  }
  return user;
}

export async function demoSignIn(who: "candidate" | "admin") {
  if (serverEnv().dataMode !== "demo") throw new AppError("forbidden", "Demo accounts are disabled.");
  const uid = userIdByKey(who === "admin" ? DEMO_ADMIN_KEY : DEMO_CANDIDATE_KEY);
  const user = await systemRepo().getUser(uid);
  if (!user) throw new AppError("not_found", "Demo account missing.");
  await setDemoCookie(uid);
  await audit(user, "auth.signed_in", "user", uid, { method: "demo" });
  return user;
}

export async function signOut() {
  if (serverEnv().dataMode === "demo") {
    (await cookies()).delete(DEMO_SESSION_COOKIE);
    return;
  }
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
}
