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
import { createSessionClient } from "@/lib/supabase/server";
import { audit } from "./audit";

const GENERIC_LOGIN_ERROR = "That email and password don't match an account.";

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

export async function signUp(input: unknown, ip: string) {
  await rateLimit("auth", ip);
  const data = SignUpSchema.parse(input);
  const env = serverEnv();
  const emailIssue = await emailProblem(data.email);
  if (emailIssue) throw fieldErrors({ email: emailIssue });

  if (env.dataMode === "demo") {
    const repo = systemRepo();
    if (await repo.getUserByEmail(data.email)) throw fieldErrors({ email: "An account with this email already exists — sign in instead" }, "An account with that email already exists. Try signing in.");
    const user = await repo.createUser({ email: data.email, fullName: data.fullName, role: "candidate", avatarUrl: null, onboardedAt: null });
    memoryStore().passwords.set(user.id, await hashPassword(data.password));
    await setDemoCookie(user.id);
    await audit(user, "auth.signed_up", "user", user.id);
    return { needsConfirmation: false };
  }

  const supabase = await createSessionClient();
  const { data: res, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { full_name: data.fullName }, emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/onboarding` },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) throw fieldErrors({ email: "An account with this email already exists — sign in instead" }, "An account with that email already exists. Try signing in.");
    throw new AppError("validation", error.message);
  }
  // Supabase hides existing accounts behind an empty identities list instead of an error.
  if (res.user && res.user.identities?.length === 0) throw fieldErrors({ email: "An account with this email already exists — sign in instead" }, "An account with that email already exists. Try signing in.");
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
    if (!user || !hash || !(await verifyPassword(data.password, hash))) throw new AppError("unauthorized", GENERIC_LOGIN_ERROR);
    await setDemoCookie(user.id);
    await audit(user, "auth.signed_in", "user", user.id);
    return user;
  }

  const supabase = await createSessionClient();
  const { data: res, error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
  if (error || !res.user) throw new AppError("unauthorized", GENERIC_LOGIN_ERROR);
  const user = await systemRepo().getUser(res.user.id);
  if (!user) throw new AppError("unauthorized", GENERIC_LOGIN_ERROR);
  await applyRoleAllowlist(user);
  await audit(user, "auth.signed_in", "user", user.id);
  return user;
}

export async function googleSignInUrl(next = "/dashboard") {
  const env = serverEnv();
  if (nativeGoogleEnabled()) return `/auth/google?next=${encodeURIComponent(next)}`;
  if (env.dataMode === "demo") throw new AppError("validation", "Google sign-in isn't configured. Use a demo account instead.");
  if (env.SUPABASE_GOOGLE_AUTH !== "on") throw new AppError("validation", "Google sign-in isn't set up yet. Use your email and password.");
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}` },
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
    user = await repo.createUser({ email: profile.email, fullName: profile.name, role: "candidate", avatarUrl: profile.picture, onboardedAt: null });
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
