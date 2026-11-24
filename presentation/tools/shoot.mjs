// Renders every slide in its final state: QA screenshots, thumbnails and the static exports.
//   node presentation/tools/shoot.mjs [baseUrl] [outDir] [scale]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:8123/index.html";
const OUT = process.argv[3] || "shots-out";
const SCALE = +(process.argv[4] || 1);
const ONLY = process.env.ONLY ? process.env.ONLY.split(",").map(Number) : null;
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: SCALE });
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
await page.goto(BASE + (BASE.includes("?") ? "&" : "?") + "export", { waitUntil: "load" });
await page.waitForFunction(() => window.__deckReady === true, null, { timeout: 60000 });
const n = await page.evaluate(() => Deck.slides.length);
const webgl = await page.evaluate(() => !!(window.World && World.ok));
console.log("slides", n, "webgl", webgl);
for (let i = 0; i < n; i++) {
  if (ONLY && !ONLY.includes(i + 1)) continue;
  await page.evaluate((i) => Deck.exportTo(i), i);
  await page.waitForTimeout(+(process.env.WAIT || 2600));
  const f = path.join(OUT, `${String(i + 1).padStart(2, "0")}.png`);
  await page.screenshot({ path: f });
  console.log("  ", f, await page.evaluate(() => document.querySelector(".slide.is-active").dataset.id));
}
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
await browser.close();
