import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: { to: string; subject: string; text: string }[] = [];
vi.mock("@/lib/infra/mailer", () => ({ sendMail: async (m: { to: string; subject: string; text: string }) => void sent.push(m) }));

beforeEach(() => {
  vi.resetModules();
  vi.useRealTimers();
  sent.length = 0;
  delete (globalThis as { __autoapplyStore?: unknown }).__autoapplyStore;
  delete (globalThis as { __rl?: unknown }).__rl;
  delete (globalThis as { __emailCodes?: unknown }).__emailCodes;
  for (const k of ["SMTP_USER", "SMTP_PASSWORD"]) delete process.env[k];
});

async function setup(over: { signupMethod?: string } = {}) {
  // Turn on SMTP so codes go through the (mocked) mailer, the way they do in production.
  process.env.SMTP_USER = "sender@example.org";
  process.env.SMTP_PASSWORD = "abcd efgh ijkl mnop";
  const svc = await import("./email-verification");
  const { systemRepo } = await import("@/lib/data");
  const user = await systemRepo().createUser({ email: `v${Math.random()}@example.org`, fullName: "Vera Fy", role: "candidate", avatarUrl: null, onboardedAt: null, ...over });
  const codeFromEmail = () => /\b(\d{6})\b/.exec(sent.at(-1)!.text)![1]!;
  return { svc, repo: systemRepo(), user, codeFromEmail };
}

describe("email verification codes", () => {
  it("emails a 6-digit code and verifies the account with it", async () => {
    const { svc, repo, user, codeFromEmail } = await setup();
    expect(svc.isEmailVerified(user)).toBe(false);
    expect(await svc.sendVerificationCode(user)).toMatchObject({ status: "sent", email: user.email });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe(user.email);
    await expect(svc.verifyEmailCode(user, codeFromEmail())).resolves.toEqual({ verified: true });
    const after = (await repo.getUser(user.id))!;
    expect(after.emailVerifiedAt).toBeTruthy();
    expect(svc.isEmailVerified(after)).toBe(true);
  });

  it("rejects wrong codes and locks the code after five tries", async () => {
    const { svc, user, codeFromEmail } = await setup();
    await svc.sendVerificationCode(user);
    const right = codeFromEmail();
    const wrong = right === "000000" ? "111111" : "000000";
    await expect(svc.verifyEmailCode(user, wrong)).rejects.toThrow(/4 tries left/);
    for (let i = 0; i < 4; i++) await svc.verifyEmailCode(user, wrong).catch(() => {});
    await expect(svc.verifyEmailCode(user, right)).rejects.toThrow(/Too many wrong tries/);
  });

  it("expires codes after 10 minutes", async () => {
    const { svc, user, codeFromEmail } = await setup();
    await svc.sendVerificationCode(user);
    vi.useFakeTimers({ now: Date.now() + 11 * 60_000 });
    await expect(svc.verifyEmailCode(user, codeFromEmail())).rejects.toThrow(/expired/);
  });

  it("makes people wait a minute between codes, and the newest code replaces the old one", async () => {
    const { svc, user, codeFromEmail } = await setup();
    await svc.sendVerificationCode(user);
    const first = codeFromEmail();
    await expect(svc.sendVerificationCode(user)).rejects.toMatchObject({ code: "rate_limited" });
    vi.useFakeTimers({ now: Date.now() + 61_000 });
    await svc.sendVerificationCode(user);
    const second = codeFromEmail();
    if (first !== second) await expect(svc.verifyEmailCode(user, first)).rejects.toThrow(/isn't right/);
    await expect(svc.verifyEmailCode(user, second)).resolves.toEqual({ verified: true });
  });

  it("treats Google accounts as verified and sends them nothing", async () => {
    const { svc, user } = await setup({ signupMethod: "google" });
    expect(svc.isEmailVerified(user)).toBe(true);
    expect(await svc.sendVerificationCode(user)).toEqual({ status: "already_verified" });
    expect(sent).toHaveLength(0);
    expect(() => svc.assertCanPurchase(user)).not.toThrow();
  });

  it("blocks purchases for unverified accounts", async () => {
    const { svc, user } = await setup();
    expect(() => svc.assertCanPurchase(user)).toThrow(/verify your email/);
  });
});
