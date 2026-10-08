import { NextResponse, type NextRequest } from "next/server";
import { completeGoogleExchange, GOOGLE_STATE_COOKIE, readGoogleState } from "@/lib/auth/google";
import { nativeGoogleEnabled } from "@/lib/env";
import { AppError } from "@/lib/infra/errors";
import { logger } from "@/lib/infra/logger";
import { completeGoogleSignIn } from "@/lib/services/auth";

/** Google redirects here with ?code&state. Verify, exchange, sign in, then route to onboarding or the app. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
    res.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/auth/google" });
    return res;
  };

  if (!nativeGoogleEnabled()) return fail("google_unavailable");
  // The user pressed "Cancel" on Google's screen.
  if (searchParams.get("error")) return fail("google_cancelled");

  const state = readGoogleState(request.cookies.get(GOOGLE_STATE_COOKIE)?.value, searchParams.get("state"));
  const code = searchParams.get("code");
  if (!state || !code) return fail("google_expired");

  try {
    const profile = await completeGoogleExchange(code, state);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const user = await completeGoogleSignIn(profile, ip);
    const destination = user.role !== "candidate" ? (state.next.startsWith("/admin") ? state.next : "/admin") : user.onboardedAt ? state.next : "/onboarding";
    const res = NextResponse.redirect(new URL(destination, origin));
    res.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/auth/google" });
    return res;
  } catch (err) {
    logger.warn("auth.google.callback_failed", { error: err });
    return fail(err instanceof AppError && err.code === "rate_limited" ? "rate_limited" : "google_failed");
  }
}
