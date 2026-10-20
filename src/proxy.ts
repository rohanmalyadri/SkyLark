import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_SESSION_COOKIE, demoSessionSecret, verifyDemoToken } from "@/lib/auth/demo-session";
import { POSTS } from "@/lib/content/posts";

const PROTECTED = ["/dashboard", "/jobs", "/applications", "/profile", "/settings", "/onboarding", "/admin"];
const AUTH_PAGES = ["/login", "/signup"];

/** The blog is compiled in, so the full set of valid slugs is known here too. */
const POST_SLUGS = new Set(POSTS.map((p) => p.slug));

const supabaseConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Optimistic gate only: refreshes the Supabase session cookie and bounces signed-out
 * visitors early. Authorization is enforced again in the Data Access Layer and RLS.
 */
export async function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  let signedIn = false;

  if (supabaseConfigured()) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    signedIn = !!data?.claims?.sub;
  } else {
    const secret = demoSessionSecret();
    signedIn = !!secret && !!verifyDemoToken(request.cookies.get(DEMO_SESSION_COOKIE)?.value, secret);
  }

  const path = request.nextUrl.pathname;

  // A dead article URL must answer 404 on its first request, not stream a 200 shell.
  const blogSlug = path.startsWith("/blog/") ? path.slice("/blog/".length) : null;
  if (blogSlug && !blogSlug.includes("/") && !POST_SLUGS.has(blogSlug)) {
    const url = request.nextUrl.clone();
    url.pathname = "/blog-not-found";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (signedIn && AUTH_PAGES.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
