import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { systemRepo } from "@/lib/data";
import type { User } from "@/lib/domain/types";
import { isDemoMode, mailerConfigured, serverEnv } from "@/lib/env";
import { AppError } from "@/lib/infra/errors";
import { logger } from "@/lib/infra/logger";
import { sendMail } from "@/lib/infra/mailer";
import { rateLimit } from "@/lib/infra/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "./audit";

/** Codes are 6 digits, valid for 10 minutes, with 5 tries each. A new code can be sent once a minute. */
export const CODE_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const RESEND_AFTER_SECONDS = 60;

/** Reason attached to the checkout error, so the browser knows to open the verification popup. */
export const EMAIL_UNVERIFIED = "email_unverified";

interface StoredCode {
  userId: string;
  email: string;
  codeHash: string;
  attempts: number;
  expiresAt: string;
  createdAt: string;
}

/* ---------- storage: a service-role-only table in Supabase, process memory in demo mode ---------- */

const g = globalThis as unknown as { __emailCodes?: Map<string, StoredCode> };
const memory = (g.__emailCodes ??= new Map());

const store = {
  async get(userId: string): Promise<StoredCode | null> {
    if (isDemoMode()) return memory.get(userId) ?? null;
    const { data, error } = await createAdminClient().from("email_verification_codes").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new AppError("internal", "Couldn't check your code. Please try again.");
    return data ? { userId: data.user_id, email: data.email, codeHash: data.code_hash, attempts: data.attempts, expiresAt: data.expires_at, createdAt: data.created_at } : null;
  },
  async put(c: StoredCode) {
    if (isDemoMode()) return void memory.set(c.userId, c);
    const { error } = await createAdminClient()
      .from("email_verification_codes")
      .upsert({ user_id: c.userId, email: c.email, code_hash: c.codeHash, attempts: c.attempts, expires_at: c.expiresAt, created_at: c.createdAt });
    if (error) throw new AppError("internal", "Couldn't create a code. Please try again.");
  },
  async setAttempts(userId: string, attempts: number) {
    if (isDemoMode()) {
      const c = memory.get(userId);
      if (c) c.attempts = attempts;
      return;
    }
    await createAdminClient().from("email_verification_codes").update({ attempts }).eq("user_id", userId);
  },
  async remove(userId: string) {
    if (isDemoMode()) return void memory.delete(userId);
    await createAdminClient().from("email_verification_codes").delete().eq("user_id", userId);
  },
};

/* ---------- rules ---------- */

/** Google has already confirmed the address of anyone who signed up or signs in with it. */
export const isEmailVerified = (user: Pick<User, "emailVerifiedAt" | "signupMethod">) => !!user.emailVerifiedAt || user.signupMethod === "google";

/**
 * Whether buying requires a verified email. On by default wherever codes can actually be delivered
 * (SMTP configured, or demo mode where they go to the server log), so payments never get stuck
 * behind a code nobody can receive.
 */
export const emailVerificationRequired = () => isDemoMode() || mailerConfigured();

/** Throws the error the checkout popup listens for when the buyer still has to verify. */
export function assertCanPurchase(user: User) {
  if (emailVerificationRequired() && !isEmailVerified(user)) {
    throw new AppError("forbidden", "Please verify your email before buying a plan.", { reason: EMAIL_UNVERIFIED });
  }
}

const hashCode = (user: Pick<User, "id" | "email">, code: string) => createHash("sha256").update(`${user.id}:${user.email.toLowerCase()}:${code}`).digest("hex");

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ---------- operations ---------- */

export type SendCodeResult = { status: "sent"; email: string; resendAfter: number } | { status: "already_verified" };

/** Emails a fresh 6-digit code to the signed-in person's address, replacing any earlier one. */
export async function sendVerificationCode(user: User): Promise<SendCodeResult> {
  if (isEmailVerified(user)) return { status: "already_verified" };
  if (!emailVerificationRequired()) throw new AppError("internal", "Email verification isn't switched on yet. Please try again later.");

  const existing = await store.get(user.id);
  if (existing) {
    const wait = RESEND_AFTER_SECONDS - Math.floor((Date.now() - Date.parse(existing.createdAt)) / 1000);
    if (wait > 0) throw new AppError("rate_limited", `Please wait ${wait} seconds before asking for another code.`);
  }
  await rateLimit("emailCode", user.id);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = Date.now();
  await store.put({ userId: user.id, email: user.email, codeHash: hashCode(user, code), attempts: 0, expiresAt: new Date(now + CODE_TTL_MINUTES * 60_000).toISOString(), createdAt: new Date(now).toISOString() });

  if (mailerConfigured()) {
    try {
      await sendMail(codeEmail(user, code));
    } catch (err) {
      await store.remove(user.id);
      throw err;
    }
  } else {
    // Demo mode without SMTP: the code goes to the server log so the flow can still be tried locally.
    logger.info("email_verification.demo_code", { email: user.email, code });
  }
  await audit(user, "email.code_sent", "user", user.id);
  return { status: "sent", email: user.email, resendAfter: RESEND_AFTER_SECONDS };
}

/** Checks a code. On a match the account is marked verified and the code is used up. */
export async function verifyEmailCode(user: User, code: string): Promise<{ verified: true }> {
  if (isEmailVerified(user)) return { verified: true };
  const stored = await store.get(user.id);
  if (!stored || Date.parse(stored.expiresAt) <= Date.now() || stored.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new AppError("validation", "That code has expired. Send a new one.");
  }
  if (stored.attempts >= MAX_ATTEMPTS) throw new AppError("validation", "Too many wrong tries. Send a new code.");

  if (!sameHash(stored.codeHash, hashCode(user, code))) {
    const attempts = stored.attempts + 1;
    await store.setAttempts(user.id, attempts);
    const left = MAX_ATTEMPTS - attempts;
    throw new AppError("validation", left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Send a new code.");
  }

  await systemRepo().updateUser(user.id, { emailVerifiedAt: new Date().toISOString() });
  await store.remove(user.id);
  await audit(user, "email.verified", "user", user.id);
  return { verified: true };
}

function codeEmail(user: User, code: string) {
  const site = serverEnv().siteUrl;
  const first = user.fullName?.split(" ")[0] || "there";
  const text = [
    `Hi ${first},`,
    "",
    `Your Skylark verification code is ${code}`,
    "",
    `It expires in ${CODE_TTL_MINUTES} minutes. If you didn't ask for it, you can ignore this email.`,
    "",
    `Skylark · ${site}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2b2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;padding:32px">
<tr><td style="font-size:15px;font-weight:600;letter-spacing:-0.01em">Skylark</td></tr>
<tr><td style="padding-top:20px;font-size:14px;line-height:1.6">Hi ${escapeHtml(first)}, here's your code to verify your email.</td></tr>
<tr><td style="padding:20px 0;font-size:32px;font-weight:600;letter-spacing:0.3em;font-variant-numeric:tabular-nums">${code}</td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#666">It expires in ${CODE_TTL_MINUTES} minutes. If you didn't ask for it, you can ignore this email.</td></tr>
<tr><td style="padding-top:24px;font-size:12px;color:#999"><a href="${site}" style="color:#999">${site.replace(/^https?:\/\//, "")}</a></td></tr>
</table></td></tr></table></body></html>`;
  return { to: user.email, subject: `${code} is your Skylark verification code`, text, html };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
