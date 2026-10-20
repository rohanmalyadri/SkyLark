import "server-only";
import { cookies } from "next/headers";

/**
 * Where a referral is parked between a visitor clicking a partner's link and that visitor
 * becoming an account. ApplyWizz keeps this in `sessionStorage`, which a visitor can edit
 * and which dies on a new tab; a signed-path, httpOnly cookie survives the real journey
 * (land → read → sign up → confirm email → onboard) and can't be forged from the page.
 */
export const REFERRAL_COOKIE = "sl_ref";
const MAX_AGE_SECONDS = 30 * 86_400;

export async function setReferralCookie(value: { linkToken?: string; promoCode?: string }) {
  const payload = JSON.stringify({ t: value.linkToken ?? null, c: value.promoCode ?? null });
  (await cookies()).set(REFERRAL_COOKIE, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readReferralCookie(): Promise<{ linkToken?: string; promoCode?: string } | null> {
  const raw = (await cookies()).get(REFERRAL_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { t?: string | null; c?: string | null };
    const linkToken = typeof parsed.t === "string" && parsed.t.length <= 64 ? parsed.t : undefined;
    const promoCode = typeof parsed.c === "string" && parsed.c.length <= 24 ? parsed.c : undefined;
    return linkToken || promoCode ? { linkToken, promoCode } : null;
  } catch {
    // A malformed cookie means no attribution, never an error for the visitor.
    return null;
  }
}

export async function clearReferralCookie() {
  (await cookies()).delete(REFERRAL_COOKIE);
}
