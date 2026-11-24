// Product tour: composes the real screenshots from capture.mjs into an animated walkthrough.
//
//   node capture/tour.mjs            → ../assets/motion/product-tour.gif (+ a poster PNG)
//
// Layers per frame: brand backdrop + browser chrome (vector, rendered once), the screenshot with
// a slow push-in toward the part of the page the caption talks about, and a caption overlay
// (vector, rendered once per scene). Frames are assembled and palette-optimised with FFmpeg.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launch } from "../lib/browser.mjs";
import { C, MARK_BOX, OUT, SRC, backdrop, mark, r2, svgDoc, text } from "../lib/core.mjs";

const W = 1200;
const H = 760;
const WIN = { x: 100, y: 28, w: 1000, bar: 34 };
WIN.vh = Math.round((WIN.w * 900) / 1440); // 625, the viewport keeps the 16:10 capture ratio
const FPS = 10;
const SCENE = 3.2; // seconds each
const XFADE = 0.4;

const SCENES = [
  { shot: "landing", addr: "skylarkgo.in", cap: "Matched roles for people applying across borders", focal: [0, 0, 1440, 900], push: 0.08 },
  { shot: "dashboard", addr: "skylarkgo.in/dashboard", cap: "Your matches, applications and today's progress", focal: [0, 0, 1440, 620], push: 0.25 },
  { shot: "jobs", addr: "skylarkgo.in/jobs", cap: "Every role ranked, with eligibility up front", focal: [200, 300, 1440, 900], push: 0.28 },
  { shot: "job-detail", addr: "skylarkgo.in/jobs/…", cap: "Seven factors, each with a written reason", focal: [240, 330, 1100, 900], push: 0.35 },
  { shot: "tailoring", addr: "skylarkgo.in/jobs/…/tailor", cap: "AI suggests. You accept or reject each change", focal: [250, 380, 1300, 900], push: 0.32 },
  { shot: "tracker", addr: "skylarkgo.in/applications", cap: "Every application on one board", focal: [200, 150, 1440, 800], push: 0.2 },
  { shot: "ops-review-detail", addr: "Operations console · review", cap: "A specialist reviews against a checklist", focal: [650, 280, 1440, 900], push: 0.3 },
  { shot: "ops-delivery", addr: "Operations console · delivery", cap: "Each submission is recorded with proof", focal: [250, 120, 1440, 760], push: 0.25 },
];

const FR = path.join(SRC, "frames", "tour");
fs.rmSync(FR, { recursive: true, force: true });
fs.mkdirSync(FR, { recursive: true });

// ---- Vector layers ------------------------------------------------------------------------------
function chromeSvg() {
  const bd = backdrop({ w: W, h: H, id: "t", grid: 28, glow: [0.5, 0.3], glowOpacity: 0.12, radius: 0 });
  const { x, y, w, bar, vh } = WIN;
  const ms = 0.075;
  const body = `${bd.body}
<rect x="${x - 1}" y="${y - 1}" width="${w + 2}" height="${bar + vh + 2}" rx="13" fill="none" stroke="#FFFFFF" stroke-opacity="0.14"/>
<path d="M ${x} ${y + bar} V ${y + 12} a 12 12 0 0 1 12 -12 H ${x + w - 12} a 12 12 0 0 1 12 12 V ${y + bar} Z" fill="#16191F"/>
<circle cx="${x + 20}" cy="${y + 17}" r="5.5" fill="#FFFFFF" fill-opacity="0.16"/><circle cx="${x + 38}" cy="${y + 17}" r="5.5" fill="#FFFFFF" fill-opacity="0.16"/><circle cx="${x + 56}" cy="${y + 17}" r="5.5" fill="#FFFFFF" fill-opacity="0.16"/>
<rect x="${x + w / 2 - 210}" y="${y + 7}" width="420" height="20" rx="10" fill="#000" fill-opacity="0.35"/>
<g transform="translate(${r2(x + w - 30 - (MARK_BOX.x + MARK_BOX.w / 2) * ms)} ${r2(y + 17 - (MARK_BOX.y + MARK_BOX.h / 2) * ms)}) scale(${ms})">${mark()}</g>
${text("DEMO MODE · FICTIONAL SAMPLE DATA", { family: "mono", weight: 500, size: 10, x: W - 100, y: H - 14, anchor: "end", fill: C.dim, tracking: 0.18 })}`;
  // punch the viewport out with an even-odd mask so the screenshot shows through
  return svgDoc({ w: W, h: H, title: "tour chrome", desc: "", defs: `${bd.defs}<mask id="hole"><rect width="${W}" height="${H}" fill="#fff"/><rect x="${x}" y="${y + bar}" width="${w}" height="${vh}" fill="#000"/></mask>`, body: `<g mask="url(#hole)">${body}</g>` });
}

function overlaySvg(k) {
  const s = SCENES[k];
  const { x, y, w, bar, vh } = WIN;
  const capY = y + bar + vh + 30;
  let segs = "";
  const segW = 26;
  SCENES.forEach((_, i) => {
    segs += `<rect x="${x + w - SCENES.length * (segW + 6) + i * (segW + 6)}" y="${capY - 6}" width="${segW}" height="3" rx="1.5" fill="${i === k ? C.ember : "#FFFFFF"}" fill-opacity="${i === k ? 1 : i < k ? 0.45 : 0.15}"/>`;
  });
  const body = `
${text(s.addr, { family: "mono", size: 11.5, x: x + w / 2, y: y + 21, anchor: "middle", fill: C.mist })}
${text(String(k + 1).padStart(2, "0"), { family: "serif", size: 26, x: x, y: capY + 4, fill: C.ember })}
${text(s.cap, { family: "display", weight: 500, size: 19, x: x + 40, y: capY + 1, fill: C.paper })}
${segs}`;
  return svgDoc({ w: W, h: H, title: "caption", desc: "", body });
}

const b = await launch();
async function renderSvg(svg, file) {
  const page = await b.newPage({ viewport: { width: W, height: H } });
  await page.setContent(`<!doctype html><body style="margin:0;background:transparent">${svg}</body>`);
  await page.screenshot({ path: file, omitBackground: true });
  await page.close();
}
await renderSvg(chromeSvg(), path.join(FR, "chrome.png"));
for (let k = 0; k < SCENES.length; k++) await renderSvg(overlaySvg(k), path.join(FR, `cap${k}.png`));
await b.close();

// ---- Compose frames in Python (Pillow) ----------------------------------------------------------
const spec = { W, H, WIN, FPS, SCENE, XFADE, scenes: SCENES, shots: path.join(SRC, "frames", "shots"), dir: FR };
fs.writeFileSync(path.join(FR, "spec.json"), JSON.stringify(spec));
execFileSync("python3", ["-I", path.join(SRC, "capture", "compose_tour.py"), path.join(FR, "spec.json")], { stdio: "inherit" });

const gif = path.join(OUT, "motion", "product-tour.gif");
const pal = path.join(FR, "palette.png");
const scale = "scale=1000:-1:flags=lanczos";
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(FR, "f%04d.png"), "-vf", `${scale},palettegen=max_colors=128:stats_mode=diff`, pal]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(FR, "f%04d.png"), "-i", pal, "-lavfi", `[0:v]${scale}[v];[v][1:v]paletteuse=dither=none:diff_mode=rectangle`, "-loop", "0", gif]);
console.log(`  motion/product-tour.gif  ${(fs.statSync(gif).size / 1024 / 1024).toFixed(2)} MB`);
