import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/demo-session";
import { serverEnv } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Clears a session whose account no longer exists (deleted, or a reset demo store) and sends
 * the visitor to sign in. Without this, the proxy and the page guards would bounce forever.
 * A session for an existing account is left untouched, so this GET can't be used to sign people out.
 */
export async function GET(req: NextRequest) {
  if (await getCurrentUser()) return NextResponse.redirect(new URL("/dashboard", req.url));
  const res = NextResponse.redirect(new URL("/login", req.url));
  if (serverEnv().dataMode === "demo") res.cookies.delete(DEMO_SESSION_COOKIE);
  else await (await createSessionClient()).auth.signOut().catch(() => undefined);
  return res;
}
