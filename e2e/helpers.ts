import { expect, type Page } from "@playwright/test";

export const uniqueEmail = (tag: string) => `skylark.e2e.${tag}.${Date.now()}@gmail.com`;
export const TEST_PASSWORD = "Skylark-e2e-2026";

export async function signUp(page: Page, opts: { name: string; email: string; password?: string }) {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(opts.name);
  await page.getByLabel("Email").fill(opts.email);
  await page.locator("#password").fill(opts.password ?? TEST_PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
}

export async function demoSignIn(page: Page, who: "Candidate" | "Operations") {
  await page.context().clearCookies();
  await page.goto("/login");
  // Against Supabase there are no demo buttons: sign in to the accounts `npm run seed -- --demo` created.
  const seeded = process.env.E2E_SEED_PASSWORD;
  if (seeded) {
    await page.getByLabel("Email").fill(who === "Candidate" ? "demo@skylark.dev" : "ops@skylark.dev");
    await page.locator("#password").fill(seeded);
    await page.getByRole("button", { name: /^sign in$/i }).click();
  } else {
    await page.getByRole("button", { name: new RegExp(`^${who}`) }).click();
  }
  await expect(page).toHaveURL(who === "Candidate" ? /\/dashboard/ : /\/admin/);
}

/** Types into a suggestion input and waits for the debounced lookup to settle. */
export async function typeSuggest(page: Page, label: string, text: string) {
  const input = page.getByRole("combobox", { name: label });
  await input.click();
  await input.fill(text);
  await page.waitForTimeout(1200);
  return input;
}
