// Static renders: hero fallback, repository social preview, and optimised product screenshots.
//   node render-stills.mjs        (after npm run build and node capture/capture.mjs)

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launch, openSvg, seek } from "./lib/browser.mjs";
import { OUT, SRC } from "./lib/core.mjs";

const b = await launch();

// Hero at rest (8 s into the loop: everything has arrived), at 2× for sharp text.
{
  const page = await openSvg(b, path.join(OUT, "banners/hero.svg"), { width: 1600, height: 800, scale: 1 });
  await seek(page, 8);
  await page.screenshot({ path: path.join(OUT, "banners/hero-static.png"), omitBackground: true });
  await page.close();
}
// Social preview: GitHub recommends 1280 × 640.
{
  const page = await openSvg(b, path.join(OUT, "banners/hero.svg"), { width: 1280, height: 640, scale: 1, background: "#07080B" });
  await seek(page, 8);
  await page.screenshot({ path: path.join(OUT, "banners/social-preview.png") });
  await page.close();
}
await b.close();

// Screenshots → WebP, and the three phone captures composed side by side.
const shots = path.join(SRC, "frames", "shots");
if (fs.existsSync(shots)) {
  execFileSync("python3", ["-I", path.join(SRC, "capture", "stills.py"), shots, path.join(OUT, "screenshots")], { stdio: "inherit" });
}
execFileSync("python3", ["-I", "-c", `
from PIL import Image
import os
o = ${JSON.stringify(OUT)}
Image.open(o + "/banners/hero-static.png").convert("RGBA").save(o + "/banners/hero-static.webp", "WEBP", quality=90, method=6)
Image.open(o + "/banners/social-preview.png").convert("RGB").save(o + "/banners/social-preview.jpg", "JPEG", quality=92, optimize=True, progressive=True)
os.remove(o + "/banners/hero-static.png"); os.remove(o + "/banners/social-preview.png")
`]);
for (const f of ["banners/hero-static.webp", "banners/social-preview.jpg"]) {
  console.log(`  ${f.padEnd(40)} ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1)} KB`);
}
