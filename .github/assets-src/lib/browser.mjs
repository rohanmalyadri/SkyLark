// Headless Chromium helpers: freeze an animated SVG at any moment and capture it.
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

export async function launch() {
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  return chromium.launch(executablePath ? { executablePath } : {});
}

/** Open an SVG file inside a page sized to it. */
export async function openSvg(browser, file, { width, height, scale = 1, background = "transparent" }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  const svg = fs.readFileSync(file, "utf8");
  await page.setContent(`<!doctype html><html><body style="margin:0;background:${background}">${svg.replace(/<svg /, `<svg style="display:block;width:${width}px;height:${height}px" `)}</body></html>`);
  await page.waitForTimeout(100);
  return page;
}

/** Pause every CSS and SMIL animation and move them to time t (seconds). */
export async function seek(page, t) {
  await page.evaluate((t) => {
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = t * 1000 + (a.effect?.getTiming?.().delay < 0 ? -a.effect.getTiming().delay : 0); }
    for (const s of document.querySelectorAll("svg")) { if (s.pauseAnimations) { s.pauseAnimations(); s.setCurrentTime(t); } }
  }, t);
  await page.waitForTimeout(30);
}
