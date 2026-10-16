import "server-only";
import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import { serverEnv } from "@/lib/env";
import { TtlCache } from "@/lib/infra/http";

/** Throwaway inbox providers: accounts must be reachable for review outcomes and job updates. */
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "10minutemail.com", "10minutemail.net",
  "temp-mail.org", "tempmail.com", "tempmailo.com", "yopmail.com", "yopmail.net", "trashmail.com", "getnada.com",
  "dispostable.com", "maildrop.cc", "fakeinbox.com", "throwawaymail.com", "mintemail.com", "mailnesia.com",
  "emailondeck.com", "moakt.com", "mohmal.com", "burnermail.io", "spamgourmet.com", "mytemp.email", "tempr.email",
  "discard.email", "mailpoof.com", "inboxkitten.com", "1secmail.com", "byom.de",
]);

// Reserved for documentation and testing (RFC 2606 / RFC 6761): never deliverable.
const RESERVED_TLDS = /\.(example|test|invalid|localhost|local)$/i;

const cache = new TtlCache<boolean>(6 * 3600_000);

async function domainAcceptsMail(domain: string): Promise<boolean | "unknown"> {
  const hit = cache.get(domain);
  if (hit !== undefined) return hit;
  const withTimeout = <T,>(p: Promise<T>) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), 4_000))]);
  try {
    const mx = await withTimeout(resolveMx(domain));
    // RFC 7505 "null MX" (a single "." exchange) means the domain explicitly accepts no mail.
    const ok = mx.some((r) => r.exchange && r.exchange !== ".");
    cache.set(domain, ok);
    return ok;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      // No MX record: mail falls back to the domain's address record (RFC 5321 §5.1).
      const hasAddress = await withTimeout(resolve4(domain)).then((a) => a.length > 0, () => withTimeout(resolve6(domain)).then((a) => a.length > 0, () => false));
      cache.set(domain, hasAddress);
      return hasAddress;
    }
    return "unknown";
  }
}

/**
 * Server-side email checks beyond syntax: no disposable inboxes, and the domain must exist and
 * be able to receive mail. Returns an error message, or null when the address is acceptable.
 * DNS outages don't block sign-up (the address is still syntactically valid and ownership is
 * confirmed by email where Supabase Auth is configured).
 */
export async function emailProblem(email: string): Promise<string | null> {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain || !domain.includes(".")) return "Enter a valid email address";
  if (RESERVED_TLDS.test(domain)) return "Use an email address you can receive mail at";
  if (DISPOSABLE.has(domain)) return "Disposable email addresses aren't accepted — use a permanent address";
  if (serverEnv().EMAIL_DOMAIN_CHECK === "off") return null;
  const ok = await domainAcceptsMail(domain);
  if (ok === false) return `“${domain}” can't receive email — check for typos`;
  return null;
}
