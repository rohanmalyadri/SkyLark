import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env";

/**
 * Google OpenID Connect, authorization-code flow with PKCE.
 * State, nonce and the PKCE verifier live in a short-lived signed, httpOnly cookie so the
 * callback can prove the response belongs to the browser that started the sign-in.
 */

export const GOOGLE_STATE_COOKIE = "aa_google_oauth";
export const GOOGLE_STATE_TTL_SECONDS = 600;

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

interface OAuthState {
  state: string;
  verifier: string;
  nonce: string;
  next: string;
  exp: number;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

const b64url = (buf: Buffer) => buf.toString("base64url");
const sign = (data: string) => createHmac("sha256", serverEnv().sessionSecret).update(`google:${data}`).digest("base64url");

export const googleRedirectUri = () => `${serverEnv().NEXT_PUBLIC_APP_URL}/auth/google/callback`;

/** Builds the Google consent URL and the signed cookie value that must accompany it. */
export function startGoogleSignIn(next: string) {
  const env = serverEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.sessionSecret) throw new Error("Google sign-in is not configured");

  const payload: OAuthState = {
    state: b64url(randomBytes(24)),
    verifier: b64url(randomBytes(48)),
    nonce: b64url(randomBytes(24)),
    next,
    exp: Math.floor(Date.now() / 1000) + GOOGLE_STATE_TTL_SECONDS,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const cookie = `${body}.${sign(body)}`;

  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: payload.state,
    nonce: payload.nonce,
    code_challenge: b64url(createHash("sha256").update(payload.verifier).digest()),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  return { url: url.toString(), cookie };
}

/** Validates the signed state cookie against the `state` Google echoed back. */
export function readGoogleState(cookie: string | undefined, returnedState: string | null): OAuthState | null {
  if (!cookie || !returnedState) return null;
  const [body, mac] = cookie.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as OAuthState;
    if (payload.exp * 1000 < Date.now()) return null;
    const a = Buffer.from(payload.state);
    const b = Buffer.from(returnedState);
    return a.length === b.length && timingSafeEqual(a, b) ? payload : null;
  } catch {
    return null;
  }
}

/** Exchanges the code server-to-server and verifies the ID token's signature, issuer, audience and nonce. */
export async function completeGoogleExchange(code: string, state: OAuthState): Promise<GoogleProfile> {
  const env = serverEnv();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: state.verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) throw new Error("Google did not return an ID token");

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.GOOGLE_CLIENT_ID!,
  });
  if (payload.nonce !== state.nonce) throw new Error("Google ID token nonce mismatch");
  if (typeof payload.email !== "string" || payload.email_verified !== true) throw new Error("Google account email is not verified");

  return {
    sub: String(payload.sub),
    email: payload.email.toLowerCase(),
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : payload.email.split("@")[0]!,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}
