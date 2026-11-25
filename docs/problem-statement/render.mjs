// Renders problem-statement.html to problem-statement.png (1600 x 900 at 2x).
// Usage: node docs/problem-statement/render.mjs   (after npm install; uses the repo's Playwright)
import { chromium } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(here, "problem-statement.html")).href);
await page.screenshot({ path: path.join(here, "problem-statement.png") });
await browser.close();
console.log("Wrote docs/problem-statement/problem-statement.png");
