import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a running app (demo data mode by default).
 *   npm run test:e2e                      # starts `next dev` on :3000 if it isn't running
 *   E2E_BASE_URL=https://staging… npm run test:e2e
 *   E2E_SEED_PASSWORD=… npm run test:e2e   # against a Supabase project seeded with `npm run seed -- --demo`
 * Uses an installed browser channel (Edge by default) so no browser download is needed;
 * set PW_CHANNEL=chrome, or run `npx playwright install chromium` and PW_CHANNEL=chromium.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const channel = process.env.PW_CHANNEL ?? "msedge";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure", ...(channel === "chromium" ? {} : { channel }) },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...(channel === "chromium" ? {} : { channel }) } },
    { name: "mobile", use: { ...devices["Pixel 7"], ...(channel === "chromium" ? {} : { channel }) }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
