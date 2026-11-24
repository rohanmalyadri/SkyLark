// Captures real Skylark screens for the film from a running instance in demo mode.
//
//   npm run dev                          (repo root, no Supabase env → labelled sample data)
//   BASE_URL=http://localhost:3000 OPS_PATH=/<operations-path> node video/capture/capture.mjs
//
// OPS_PATH is the operations console route; it is deliberately never written into the repo.
// Screens are captured without browser chrome, so no URL ever appears on screen.
// Output: video/public/shots/<name>.png (2x device pixels) and boxes.json (element rectangles
// in CSS pixels, used to aim the synthetic cursor and callouts at real elements).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const LIVE = process.env.LIVE_URL || "https://www.skylarkgo.in";
const OPS = process.env.OPS_PATH || "";
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../public/shots");
fs.mkdirSync(OUT, { recursive: true });
const VIEW = { width: 1600, height: 1000 };
const boxes = {};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const hide = "*{caret-color:transparent!important} [data-sonner-toaster]{display:none!important} nextjs-portal{display:none!important} [data-nextjs-toast]{display:none!important} *::-webkit-scrollbar{display:none!important} html{scrollbar-width:none!important}";
async function settle(page, ms = 1200) {
  await page.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => {});
  await page.addStyleTag({ content: hide });
  await page.waitForTimeout(ms);
}
async function shot(page, name, opts = {}) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });
  console.log("captured", name);
}
async function box(page, name, key, locator) {
  const b = await locator.first().boundingBox().catch(() => null);
  if (b) { boxes[name] ??= {}; boxes[name][key] = b; }
  return b;
}
async function session(role, viewport = VIEW, opts = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, ...opts });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 180000 });
  await page.getByRole("button", { name: new RegExp(role) }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 180000 });
  return { ctx, page };
}

// Public pages from the live site
if (!process.env.SKIP_LIVE) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${LIVE}/`, { waitUntil: "networkidle", timeout: 180000 }).catch(() => {});
  await settle(page, 5000);
  await shot(page, "live-landing");
  await page.goto(`${LIVE}/jobs`, { waitUntil: "networkidle", timeout: 180000 }).catch(() => {});
  await settle(page, 2500);
  await shot(page, "live-jobs");
  await page.goto(`${LIVE}/pricing`, { waitUntil: "networkidle", timeout: 180000 }).catch(() => {});
  await settle(page, 2500);
  await shot(page, "live-pricing");
  await ctx.close();
}

// Candidate journey (demo mode, labelled sample data)
{
  const { ctx, page } = await session("Candidate");
  await page.goto(`${BASE}/profile`); await settle(page);
  await shot(page, "profile");
  await shot(page, "profile-full", { fullPage: true });
  await page.goto(`${BASE}/dashboard`); await settle(page);
  await shot(page, "dashboard");
  await page.goto(`${BASE}/jobs`); await settle(page);
  await shot(page, "jobs");
  const jobLink = page.locator('a[href^="/jobs/"]:not([href$="/tailor"])').first();
  await box(page, "jobs", "firstJob", jobLink);
  const jobHref = await jobLink.getAttribute("href");
  await page.goto(BASE + jobHref); await settle(page);
  await shot(page, "job-detail");
  await shot(page, "job-detail-full", { fullPage: true });
  await box(page, "job-detail-full", "factors", page.locator("table").first());
  await page.goto(`${BASE}/dashboard`); await settle(page, 300);
  const tailorHref = await page.$eval('a[href$="/tailor"]', (a) => a.getAttribute("href")).catch(() => `${jobHref}/tailor`);
  await page.goto(BASE + tailorHref); await settle(page, 1500);
  await shot(page, "tailor-before");
  const accept = page.getByRole("button", { name: /^Accept/ }).first();
  await accept.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await shot(page, "tailor-a");
  const acceptBox = await box(page, "tailor-a", "accept", accept);
  if (acceptBox) {
    await accept.click();
    await page.waitForTimeout(1200);
    await shot(page, "tailor-b");
  }
  await page.goto(`${BASE}/applications`); await settle(page);
  await shot(page, "tracker");
  await page.goto(`${BASE}/answers`); await settle(page);
  await shot(page, "answers");
  await page.goto(`${BASE}/messages`); await settle(page);
  await shot(page, "messages");
  await ctx.close();
}

// Phone
{
  const { ctx, page } = await session("Candidate", { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  for (const [p, n] of [["/dashboard", "mobile-dashboard"], ["/jobs", "mobile-jobs"], ["/applications", "mobile-tracker"]]) {
    await page.goto(BASE + p); await settle(page); await shot(page, n);
  }
  await ctx.close();
}

// Operations console (only when its route is supplied)
if (OPS) {
  const { ctx, page } = await session("Operations");
  await page.goto(`${BASE}${OPS}/reviews`); await settle(page);
  await shot(page, "ops-reviews");
  const reviewHref = await page.$eval(`a[href^="${OPS}/reviews/"]`, (a) => a.getAttribute("href")).catch(() => null);
  if (reviewHref) { await page.goto(BASE + reviewHref); await settle(page); await shot(page, "ops-review-detail"); await shot(page, "ops-review-full", { fullPage: true }); }
  await page.goto(`${BASE}${OPS}/delivery`); await settle(page);
  await shot(page, "ops-delivery");
  await page.goto(`${BASE}${OPS}/pipeline`); await settle(page);
  await shot(page, "ops-pipeline");
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, "boxes.json"), JSON.stringify(boxes, null, 2));
await browser.close();
