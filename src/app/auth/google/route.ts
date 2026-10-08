import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_STATE_COOKIE, GOOGLE_STATE_TTL_SECONDS, startGoogleSignIn } from "@/lib/auth/google";
import { nativeGoogleEnabled } from "@/lib/env";
import { logger } from "@/lib/infra/logger";

const safeNext = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/dashboard");

/** Starts Google sign-in: sets the signed state cookie and sends the browser to Google's consent screen. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!nativeGoogleEnabled()) return NextResponse.redirect(new URL("/login?error=google_unavailable", origin));
  try {
    const { url, cookie } = startGoogleSignIn(safeNext(request.nextUrl.searchParams.get("next")));
    const res = NextResponse.redirect(url);
    res.cookies.set(GOOGLE_STATE_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/auth/google",
      maxAge: GOOGLE_STATE_TTL_SECONDS,
    });
    res.headers.set("cache-control", "no-store");
    return res;
  } catch (err) {
    logger.error("auth.google.start_failed", { error: err });
    return NextResponse.redirect(new URL("/login?error=google_unavailable", origin));
  }
}
