// Captures real product screenshots and a recorded demo from a running Skylark instance in demo mode.
//
//   npm run dev                                   (repo root, no Supabase variables → labelled sample data)
//   OPS_PATH=<operations console route> node presentation/tools/capture-product.mjs
//
// OPS_PATH is read from the environment so the operations console's route never lands in the repo.
// Output: presentation/assets/shots/*.webp (2x, for projectors) and frames for the recorded demo.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../assets/shots");
const RAW = path.resolve(HERE, ".frames");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OPS = process.env.OPS_PATH || "";
const ONLY = process.env.ONLY || ""; // "shots" | "demo"
const VIEW = { width: 1600, height: 1000 };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

const CLEAN = "*{caret-color:transparent!important} [data-sonner-toaster]{display:none!important} nextjs-portal{display:none!important}";
async function settle(page, ms = 1200) {
  await page.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => {});
  await page.addStyleTag({ content: CLEAN }).catch(() => {});
  await page.waitForTimeout(ms);
}
async function session(role, viewport = VIEW, opts = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, ...opts });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("button", { name: new RegExp(role) }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120000 });
  return { ctx, page };
}
async function shot(page, name, opts = {}) {
  const png = path.join(RAW, `${name}.png`);
  await page.screenshot({ path: png, ...opts });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", png, "-c:v", "libwebp", "-quality", "86", path.join(OUT, `${name}.webp`)]);
  console.log("  shot", name);
}

if (ONLY !== "demo") {
  {
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120000 });
    await settle(page, 4000);
    await shot(page, "landing");
    await page.goto(`${BASE}/pricing`); await settle(page, 1500);
    await shot(page, "pricing");
    await page.goto(`${BASE}/login`); await settle(page, 800);
    await shot(page, "login");
    await ctx.close();
  }
  {
    const { ctx, page } = await session("Candidate");
    await page.goto(`${BASE}/dashboard`); await settle(page);
    await shot(page, "dashboard");
    await page.goto(`${BASE}/jobs`); await settle(page);
    await shot(page, "jobs");
    const jobHref = await page.$eval('a[href^="/jobs/"]:not([href$="/tailor"])', (a) => a.getAttribute("href"));
    await page.goto(BASE + jobHref); await settle(page);
    await shot(page, "job-detail");
    await shot(page, "job-detail-full", { fullPage: true });
    await page.goto(`${BASE}/dashboard`); await settle(page, 300);
    const tailorHref = await page.$eval('a[href$="/tailor"]', (a) => a.getAttribute("href")).catch(() => `${jobHref}/tailor`);
    await page.goto(BASE + tailorHref); await settle(page, 1500);
    await shot(page, "tailoring");
    await shot(page, "tailoring-full", { fullPage: true });
    await page.goto(`${BASE}/applications`); await settle(page);
    await shot(page, "tracker");
    await page.goto(`${BASE}/answers`); await settle(page);
    await shot(page, "answers");
    await page.goto(`${BASE}/messages`); await settle(page);
    await shot(page, "messages");
    await page.goto(`${BASE}/profile`); await settle(page);
    await shot(page, "profile");
    await ctx.close();
  }
  {
    const { ctx, page } = await session("Candidate", { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
    for (const [p, n] of [["/dashboard", "mobile-dashboard"], ["/jobs", "mobile-jobs"], ["/applications", "mobile-tracker"]]) {
      await page.goto(BASE + p); await settle(page);
      await shot(page, n);
    }
    await ctx.close();
  }
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
}

// Recorded demo: CDP screencast of a scripted candidate journey, encoded to H.264.
if (ONLY !== "shots") {
  const dir = path.join(RAW, "demo");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async (f) => {
    frames.push({ t: f.metadata.timestamp, data: f.data });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  const glide = async (sel, steps = 30) => {
    const box = await page.locator(sel).first().boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
    await page.waitForTimeout(350);
  };
  const scroll = async (dy, n = 24) => { for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy / n); await page.waitForTimeout(28); } await page.waitForTimeout(600); };

  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120000 });
  await page.addStyleTag({ content: CLEAN });
  await page.waitForTimeout(1500);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1600, maxHeight: 1000, everyNthFrame: 1 });
  await page.waitForTimeout(3500);
  await scroll(900, 40); await page.waitForTimeout(1500);
  await page.goto(`${BASE}/login`); await settle(page, 900);
  await glide('button:has-text("Candidate")');
  await page.getByRole("button", { name: /Candidate/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120000 });
  await settle(page, 2200);
  await scroll(500); await page.waitForTimeout(900);
  await page.goto(`${BASE}/jobs`); await settle(page, 1600);
  await scroll(600); await page.waitForTimeout(700); await scroll(-600);
  const jobHref = await page.$eval('a[href^="/jobs/"]:not([href$="/tailor"])', (a) => a.getAttribute("href"));
  await glide(`a[href="${jobHref}"]`);
  await page.goto(BASE + jobHref); await settle(page, 1800);
  await scroll(700, 40); await page.waitForTimeout(1600); await scroll(500, 30); await page.waitForTimeout(1200);
  await page.goto(`${BASE}/dashboard`); await settle(page, 200);
  const tailorHref = await page.$eval('a[href$="/tailor"]', (a) => a.getAttribute("href")).catch(() => `${jobHref}/tailor`);
  await page.goto(BASE + tailorHref); await settle(page, 2000);
  await scroll(500, 30); await page.waitForTimeout(1200);
  const accept = page.getByRole("button", { name: /^Accept/ }).first();
  if (await accept.count()) { const b = await accept.boundingBox(); if (b) { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 30 }); await page.waitForTimeout(400); await accept.click().catch(() => {}); await page.waitForTimeout(1500); } }
  await page.goto(`${BASE}/applications`); await settle(page, 2200);
  await page.goto(`${BASE}/answers`); await settle(page, 1800);
  await scroll(500, 30); await page.waitForTimeout(1500);
  await cdp.send("Page.stopScreencast");
  await ctx.close();

  // Constant 30 fps timeline from the screencast's own timestamps.
  const fps = 30;
  const t0 = frames[0].t;
  const dur = frames.at(-1).t - t0 + 0.8;
  let k = 0;
  for (let i = 0; i < Math.ceil(dur * fps); i++) {
    const t = t0 + i / fps;
    while (k + 1 < frames.length && frames[k + 1].t <= t) k++;
    fs.writeFileSync(path.join(dir, `f${String(i).padStart(5, "0")}.jpg`), Buffer.from(frames[k].data, "base64"));
  }
  const media = path.resolve(HERE, "../assets/media");
  fs.mkdirSync(media, { recursive: true });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "f%05d.jpg"),
    "-vf", "scale=1600:1000:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-movflags", "+faststart",
    path.join(media, "demo-recording.mp4")]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(dir, "f00030.jpg"), "-c:v", "libwebp", "-quality", "80", path.join(media, "demo-poster.webp")]);
  console.log(`  demo: ${frames.length} screencast frames, ${dur.toFixed(1)} s`);
}

await browser.close();
