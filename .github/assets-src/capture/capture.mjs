// Captures real product screenshots from a running Skylark instance in demo mode.
//
//   npm run dev                      (in the repo root, without Supabase env vars → demo data)
//   OPS_PATH=/<operations-console-path> node capture/capture.mjs
//
// OPS_PATH is the operations console's route; it is deliberately not written into this repo's docs.
// Raw PNGs land in ./frames (git-ignored); render-stills.mjs turns them into ../assets/screenshots.

import fs from "node:fs";
import path from "node:path";
import { launch } from "../lib/browser.mjs";
import { SRC } from "../lib/core.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OPS = process.env.OPS_PATH || "";
const RAW = path.join(SRC, "frames", "shots");
fs.mkdirSync(RAW, { recursive: true });

const b = await launch();
const settle = async (page, ms = 1200) => {
  await page.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => {});
  await page.addStyleTag({ content: "*{caret-color:transparent!important} [data-sonner-toaster]{display:none!important} nextjs-portal{display:none!important}" });
  await page.waitForTimeout(ms);
};

async function session(role, viewport = { width: 1440, height: 900 }, opts = {}) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "no-preference", ...opts });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("button", { name: new RegExp(role) }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120000 });
  return { ctx, page };
}

const shots = [];
async function shot(page, name, { full = false, clip } = {}) {
  const file = path.join(RAW, `${name}.png`);
  await page.screenshot({ path: file, fullPage: full, clip });
  shots.push(name);
  console.log("  captured", name);
}

// Public pages
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120000 });
  await settle(page, 3500);
  await shot(page, "landing");
  await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle", timeout: 120000 });
  await settle(page, 1500);
  await shot(page, "pricing");
  await ctx.close();
}

// Candidate
{
  const { ctx, page } = await session("Candidate");
  await page.goto(`${BASE}/dashboard`); await settle(page);
  await shot(page, "dashboard");
  await page.goto(`${BASE}/jobs`); await settle(page);
  await shot(page, "jobs");
  const jobHref = await page.$eval('a[href^="/jobs/"]:not([href$="/tailor"])', (a) => a.getAttribute("href"));
  await page.goto(BASE + jobHref); await settle(page);
  await shot(page, "job-detail");
  await page.goto(`${BASE}/dashboard`); await settle(page, 300);
  const tailorHref = await page.$eval('a[href$="/tailor"]', (a) => a.getAttribute("href")).catch(() => `${jobHref}/tailor`);
  await page.goto(BASE + tailorHref); await settle(page, 1500);
  await shot(page, "tailoring");
  await page.goto(`${BASE}/applications`); await settle(page);
  await shot(page, "tracker");
  await page.goto(`${BASE}/answers`); await settle(page);
  await shot(page, "answers");
  await page.goto(`${BASE}/messages`); await settle(page);
  await shot(page, "messages");
  await ctx.close();
}

// Candidate on a phone
{
  const { ctx, page } = await session("Candidate", { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/dashboard`); await settle(page);
  await shot(page, "mobile-dashboard");
  await page.goto(`${BASE}/jobs`); await settle(page);
  await shot(page, "mobile-jobs");
  await page.goto(`${BASE}/applications`); await settle(page);
  await shot(page, "mobile-tracker");
  await ctx.close();
}

// Operations console (only when its route is supplied)
if (OPS) {
  const { ctx, page } = await session("Operations");
  await page.goto(`${BASE}${OPS}/reviews`); await settle(page);
  await shot(page, "ops-reviews");
  const reviewHref = await page.$eval(`a[href^="${OPS}/reviews/"]`, (a) => a.getAttribute("href")).catch(() => null);
  if (reviewHref) { await page.goto(BASE + reviewHref); await settle(page); await shot(page, "ops-review-detail"); }
  await page.goto(`${BASE}${OPS}/delivery`); await settle(page);
  await shot(page, "ops-delivery");
  await page.goto(`${BASE}${OPS}/pipeline`); await settle(page);
  await shot(page, "ops-pipeline");
  await ctx.close();
}

await b.close();
console.log(`\n${shots.length} screenshots in ${path.relative(process.cwd(), RAW)}`);
