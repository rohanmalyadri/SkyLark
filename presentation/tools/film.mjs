// QA: plays the deck live and samples frames over time, to check choreography (not used for exports).
//   node presentation/tools/film.mjs <url> <outDir> "<plan>"   plan: "wait:0.5x20,key:Space,wait:0.6x8"
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const [URL, OUT, PLAN] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(2500);
let n = 0;
for (const cmd of PLAN.split(",")) {
  const [k, v] = cmd.split(":");
  if (k === "key") { await page.keyboard.press(v); continue; }
  if (k === "wait") { const [s, rep] = v.split("x"); for (let i = 0; i < (+rep || 1); i++) { await page.waitForTimeout(+s * 1000); await page.screenshot({ path: path.join(OUT, `f${String(n++).padStart(3, "0")}.png`) }); } }
}
console.log(n, "frames", errs.length ? errs : "no errors");
await browser.close();
