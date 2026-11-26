// Renders sample-summary.html to sample-summary.png (1600 x 900 at 2x).
// Usage: node docs/interview-notes/samples/render.mjs   (after npm install; uses the repo's Playwright)
import { chromium } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(here, "sample-summary.html")).href);
await page.screenshot({ path: path.join(here, "sample-summary.png") });
await browser.close();
console.log("Wrote docs/interview-notes/samples/sample-summary.png");
