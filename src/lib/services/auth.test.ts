import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ set: () => {}, delete: () => {} }) }));
vi.mock("@/lib/validation/email", () => ({ emailProblem: async () => null }));

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as { __autoapplyStore?: unknown }).__autoapplyStore;
  delete (globalThis as { __rl?: unknown }).__rl;
});

async function setup() {
  const auth = await import("./auth");
  const { systemRepo } = await import("@/lib/data");
  const ip = `10.0.0.${Math.floor(Math.random() * 250)}`;
  await auth.signUp({ email: "pass.user@example.org", fullName: "Pass User", password: "correct-horse-9" }, ip);
  await systemRepo().createUser({ email: "google.user@example.org", fullName: "Gee User", role: "candidate", avatarUrl: null, onboardedAt: null, signupMethod: "google" });
  return { auth, repo: systemRepo(), ip };
}

const reasonOf = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    return { message: (err as Error).message, reason: (err as { details?: { reason?: string } }).details?.reason };
  }
  throw new Error("expected sign-in to fail");
};

describe("email sign-in failures", () => {
  it("records how each account signed up", async () => {
    const { repo } = await setup();
    expect((await repo.getUserByEmail("pass.user@example.org"))?.signupMethod).toBe("password");
    expect((await repo.getUserByEmail("google.user@example.org"))?.signupMethod).toBe("google");
  });

  it("sends an unknown email to sign-up", async () => {
    const { auth, ip } = await setup();
    expect((await reasonOf(auth.signIn({ email: "nobody@example.org", password: "whatever-1" }, ip))).reason).toBe("no_account");
  });

  it("tells a Google account to use Google", async () => {
    const { auth, ip } = await setup();
    const r = await reasonOf(auth.signIn({ email: "Google.User@example.org", password: "whatever-1" }, ip));
    expect(r.reason).toBe("use_google");
    expect(r.message).toMatch(/Continue with Google/);
  });

  it("keeps a wrong password on a password account generic", async () => {
    const { auth, ip } = await setup();
    const r = await reasonOf(auth.signIn({ email: "pass.user@example.org", password: "wrong-pass-1" }, ip));
    expect(r.reason).toBeUndefined();
    expect(r.message).toBe("That email and password don't match an account.");
  });

  it("stops revealing account status past the lookup limit", async () => {
    const { auth, ip } = await setup();
    const { RATE_LIMITS } = await import("@/lib/infra/rate-limit");
    const { rateLimit } = await import("@/lib/infra/rate-limit");
    for (let i = 0; i < RATE_LIMITS.accountLookup.limit; i++) await rateLimit("accountLookup", ip);
    const r = await reasonOf(auth.signIn({ email: "nobody@example.org", password: "whatever-1" }, ip));
    expect(r.reason).toBeUndefined();
  });

  it("locks password guessing on one account even when it comes from many IPs", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { auth } = await setup();
    const { RATE_LIMITS } = await import("@/lib/infra/rate-limit");
    for (let i = 0; i < RATE_LIMITS.authAccount.limit; i++) {
      await reasonOf(auth.signIn({ email: "pass.user@example.org", password: `wrong-pass-${i}` }, `192.0.2.${i}`));
    }
    const r = await reasonOf(auth.signIn({ email: "PASS.user@example.org", password: "correct-horse-9" }, "198.51.100.7"));
    expect(r.message).toMatch(/too often/);
    // Other accounts are unaffected.
    await expect(auth.signIn({ email: "nobody@example.org", password: "whatever-1" }, "198.51.100.8")).rejects.toMatchObject({ details: { reason: "no_account" } });
  });

  it("never puts the email address itself in the rate-limit key", async () => {
    const { accountKey } = await import("./auth");
    expect(accountKey("Pass.User@example.org ")).toBe(accountKey("pass.user@example.org"));
    expect(accountKey("pass.user@example.org")).not.toContain("example");
  });
});
