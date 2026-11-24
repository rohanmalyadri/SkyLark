// System architecture as an exploded isometric stack (animated SVG, 12 s loop).
//
// Four glass layers, top to bottom: experience, server, domain services, data. A request packet
// travels down through the stack and each layer lights as it arrives; the response returns in sky
// blue. Then the background side of the system runs: the daily cron wakes the worker, job boards
// feed the pipeline, and the AI provider answers the tailoring service.
//
// Every label is taken from the codebase (src/app, src/lib/services, src/lib/data, vercel.json).

import { C, EASE, backdrop, corners, eyebrow, outline, r2, svgDoc, text, write } from "../lib/core.mjs";

const W = 1600;
const H = 1240;
const T = 12;
const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);

// Isometric projection. x runs to the lower right, y to the lower left, z straight up.
const OX = 700;
const OY = 880;
const iso = (x, y, z = 0) => [r2(OX + (x - y) * COS), r2(OY + (x + y) * SIN - z)];
const P = (pts) => pts.map((p) => p.join(",")).join(" ");
const planeMatrix = (x, y, z) => {
  const [tx, ty] = iso(x, y, z);
  return `matrix(${r2(COS)} ${r2(SIN)} ${r2(-COS)} ${r2(SIN)} ${tx} ${ty})`;
};

const SW = 310; // slab size along x
const SD = 176; // along y
const TH = 14; // slab thickness
const GAP = 210; // vertical distance between slabs

const LAYERS = [
  {
    key: "experience", n: "01", title: "Experience", sub: "Next.js App Router · React 19 · Tailwind v4",
    note: "Marketing site, candidate app, operations console",
    chips: ["Marketing", "Candidate app", "Ops console", "Messages"],
  },
  {
    key: "server", n: "02", title: "Server", sub: "proxy.ts · Server Components · Server Actions",
    note: "Session refresh, Zod validation, rate limits, audit",
    chips: ["proxy.ts", "Actions", "RSC", "/api/v1"],
  },
  {
    key: "services", n: "03", title: "Domain services", sub: "src/lib/services · src/lib/pipeline",
    note: "Matching, tailoring, reviews, delivery, billing",
    chips: ["Matching", "Tailoring", "Reviews", "Pipeline"],
  },
  {
    key: "data", n: "04", title: "Data", sub: "One Repository interface, two stores",
    note: "Supabase with RLS in production; in-memory in demo mode",
    chips: ["Postgres + RLS", "Auth", "Storage", "Demo store"],
  },
];

const EXTERNAL = [
  { title: "Vercel Cron", sub: "daily 09:00 UTC · /api/cron/worker", layer: 1, color: C.mist, at: 7.6 },
  { title: "Job boards", sub: "Greenhouse · Arbeitnow · Adzuna · Muse · Lever", layer: 2, color: C.amber, at: 8.4 },
  { title: "Claude", sub: "tailoring · resume extraction · rules fallback", layer: 2, color: C.ember2, at: 9.4 },
  { title: "Gemini", sub: "chat-style onboarding (optional)", layer: 2, color: C.ember2, at: 10.0 },
  { title: "Razorpay", sub: "INR subscriptions · signed webhooks", layer: 1, color: C.sky, at: 10.6 },
  { title: "Google · SMTP", sub: "OAuth sign-in · email verification codes", layer: 1, color: C.sky, at: 11.0 },
];

export function buildArchitecture() {
  const bd = backdrop({ w: W, h: H, id: "a", grid: 32, glow: [0.36, 0.5], glowOpacity: 0.1, radius: 28 });
  const pct = (s) => `${r2((s / T) * 100)}%`;
  let css = "";
  let layers = "";
  let labels = "";

  const zOf = (i) => (LAYERS.length - 1 - i) * GAP;
  const arrive = (i) => 1.2 + i * 1.0; // request packet reaches layer i

  // Render bottom layer first so the upper glass sits in front.
  for (let i = LAYERS.length - 1; i >= 0; i--) {
    const L = LAYERS[i];
    const z = zOf(i);
    const top = [iso(0, 0, z), iso(SW, 0, z), iso(SW, SD, z), iso(0, SD, z)];
    const right = [iso(SW, 0, z), iso(SW, SD, z), iso(SW, SD, z - TH), iso(SW, 0, z - TH)];
    const left = [iso(0, SD, z), iso(SW, SD, z), iso(SW, SD, z - TH), iso(0, SD, z - TH)];

    // chips: 2×2 grid of small iso blocks with on-plane labels
    let chips = "";
    const cw = 134, cd = 64, cg = 14, ch = 9;
    const x0 = (SW - (cw * 2 + cg)) / 2, y0 = (SD - (cd * 2 + cg)) / 2;
    L.chips.forEach((name, k) => {
      const cx = x0 + (k % 2) * (cw + cg);
      const cy = y0 + Math.floor(k / 2) * (cd + cg);
      const ct = [iso(cx, cy, z + ch), iso(cx + cw, cy, z + ch), iso(cx + cw, cy + cd, z + ch), iso(cx, cy + cd, z + ch)];
      const cr = [iso(cx + cw, cy, z + ch), iso(cx + cw, cy + cd, z + ch), iso(cx + cw, cy + cd, z), iso(cx + cw, cy, z)];
      const cl = [iso(cx, cy + cd, z + ch), iso(cx + cw, cy + cd, z + ch), iso(cx + cw, cy + cd, z), iso(cx, cy + cd, z)];
      const lbl = outline(name, { family: "display", weight: 600, size: 15, x: 0, y: 0, anchor: "middle" });
      const delay = arrive(i) + 0.12 + k * 0.08;
      css += `@keyframes c${i}${k} { 0%, ${pct(delay)} { fill-opacity: 0.0; } ${pct(delay + 0.25)} { fill-opacity: 0.55; } ${pct(delay + 1.6)} { fill-opacity: 0.0; } 100% { fill-opacity: 0; } }\n.c${i}${k} { animation: c${i}${k} ${T}s ${EASE.out} infinite both; }\n`;
      chips += `<polygon points="${P(cr)}" fill="#0A0C10" fill-opacity="0.85" stroke="#FFFFFF" stroke-opacity="0.08"/>
<polygon points="${P(cl)}" fill="#0D1015" fill-opacity="0.85" stroke="#FFFFFF" stroke-opacity="0.08"/>
<polygon points="${P(ct)}" fill="${C.panel2}" fill-opacity="0.9" stroke="#FFFFFF" stroke-opacity="0.16"/>
<polygon class="c${i}${k}" points="${P(ct)}" fill="${i === 3 ? C.sky : C.ember}" fill-opacity="0"/>
<g transform="${planeMatrix(cx + cw / 2, cy + cd / 2 + 5, z + ch)}"><path d="${lbl.d}" fill="${C.paper}" opacity="0.88"/></g>`;
    });

    css += `@keyframes lit${i} { 0%, ${pct(arrive(i) - 0.1)} { stroke-opacity: 0.16; } ${pct(arrive(i) + 0.15)} { stroke-opacity: 1; } ${pct(arrive(i) + 1.4)} { stroke-opacity: 0.16; } 100% { stroke-opacity: 0.16; } }
.lit${i} { animation: lit${i} ${T}s ${EASE.out} infinite both; }
@keyframes glow${i} { 0%, ${pct(arrive(i) - 0.1)} { opacity: 0; } ${pct(arrive(i) + 0.2)} { opacity: 1; } ${pct(arrive(i) + 1.8)} { opacity: 0; } 100% { opacity: 0; } }
.glow${i} { animation: glow${i} ${T}s ${EASE.out} infinite both; }\n`;

    layers += `<g>
<polygon points="${P(right)}" fill="#0A0C11" fill-opacity="0.9" stroke="#FFFFFF" stroke-opacity="0.1"/>
<polygon points="${P(left)}" fill="#0E1117" fill-opacity="0.9" stroke="#FFFFFF" stroke-opacity="0.1"/>
<polygon points="${P(top)}" fill="url(#glass)" stroke="#FFFFFF" stroke-opacity="0.14"/>
<polygon class="glow${i}" points="${P(top)}" fill="url(#layerGlow${i === 3 ? "Sky" : ""})"/>
<g transform="${planeMatrix(0, 0, z)}"><rect x="0" y="0" width="${SW}" height="${SD}" fill="url(#plateGrid)"/></g>
${chips}
<polygon class="lit${i}" points="${P(top)}" fill="none" stroke="${i === 3 ? C.sky : C.ember}" stroke-width="1.6" stroke-opacity="0.16"/>
</g>`;

    // Flat label to the left of the slab, aligned to its left corner.
    const [lx, ly] = iso(0, SD, z);
    const ax = 64;
    const ay = ly - 34;
    labels += `<g>
<path d="M ${lx - 10} ${ly} H ${ax + 330}" stroke="#FFFFFF" stroke-opacity="0.14" stroke-dasharray="2 4"/>
<circle cx="${lx}" cy="${ly}" r="3" fill="${i === 3 ? C.sky : C.ember}"/>
${text(L.n, { family: "serif", size: 40, x: ax, y: ay + 4, fill: i === 3 ? C.sky : C.ember })}
${text(L.title, { family: "display", weight: 600, size: 24, x: ax + 52, y: ay - 8, fill: C.paper })}
${text(L.sub, { family: "mono", weight: 400, size: 12.5, x: ax + 52, y: ay + 14, fill: C.mist })}
${text(L.note, { family: "display", weight: 400, size: 14.5, x: ax + 52, y: ly + 24, fill: C.dim })}
</g>`;
  }

  // ---- The request spine: packets down, response up --------------------------------------------
  const [sx, syTop] = iso(SW / 2, SD / 2, zOf(0) + 120);
  const spinePts = LAYERS.map((_, i) => iso(SW / 2, SD / 2, zOf(i) + 10));
  const spine = `M ${sx} ${syTop} L ${spinePts.map((p) => p.join(" ")).join(" L ")}`;
  const totalLen = syTop - spinePts[3][1];
  const down = (i) => r2((spinePts[i][1] - syTop) / (spinePts[3][1] - syTop));
  const tDown = [0.5, ...LAYERS.map((_, i) => arrive(i))];
  const kpDown = [0, ...LAYERS.map((_, i) => down(i))];
  // keyTimes must be within [0,1] and start at 0 / end at 1
  const kt = (arr) => arr.map((t) => r2(t / T));
  const downKT = [0, ...kt(tDown), 1];
  const downKP = [0, ...kpDown, 1];
  const upStart = arrive(3) + 0.6;
  const upKT = [0, r2(upStart / T), r2((upStart + 2.2) / T), 1];
  const upKP = [1, 1, 0, 0];
  const packet = (color, kts, kps, visible) => `<g>
<circle r="9" fill="${color}" opacity="0.18"/><circle r="4.5" fill="${color}"/>
<animateMotion dur="${T}s" repeatCount="indefinite" path="${spine}" keyPoints="${kps.join(";")}" keyTimes="${kts.join(";")}" calcMode="linear"/>
<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" values="${visible.v}" keyTimes="${visible.t}"/>
</g>`;
  const packets =
    packet(C.amber, downKT, downKP, { v: "0;0;1;1;0;0", t: `0;${r2(0.4 / T)};${r2(0.6 / T)};${r2((arrive(3) + 0.3) / T)};${r2((arrive(3) + 0.5) / T)};1` }) +
    packet(C.sky, upKT, upKP, { v: "0;0;1;1;0;0", t: `0;${r2((upStart - 0.1) / T)};${r2(upStart / T)};${r2((upStart + 2.2) / T)};${r2((upStart + 2.5) / T)};1` });
  void totalLen;

  // user node above the stack
  const userLbl = outline("REQUEST", { family: "mono", weight: 500, size: 12, x: sx + 18, y: syTop + 4, tracking: 0.2 });
  const userNode = `<circle cx="${sx}" cy="${syTop}" r="6" fill="none" stroke="${C.paper}" stroke-opacity="0.6"/><path d="${userLbl.d}" fill="${C.mist}"/>`;

  // ---- External systems ------------------------------------------------------------------------
  let ext = "";
  const EX = 1150, EW = 390, EH = 74;
  EXTERNAL.forEach((e, k) => {
    const ey = 262 + k * 140;
    const z = zOf(e.layer);
    const [tx, ty] = iso(SW, SD / 2, z + 6); // right edge midpoint of the target layer
    const startX = EX - 8;
    const startY = ey + EH / 2;
    const midX = (tx + startX) / 2 + 40;
    const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${ty}, ${tx + 4} ${ty}`;
    const id = `ex${k}`;
    const a = e.at;
    css += `@keyframes en${k} { 0%, ${pct(a - 0.1)} { stroke-opacity: 0.12; } ${pct(a + 0.1)} { stroke-opacity: 0.9; } ${pct(a + 1.3)} { stroke-opacity: 0.12; } 100% { stroke-opacity: 0.12; } }
.en${k} { animation: en${k} ${T}s ${EASE.out} infinite both; }\n`;
    ext += `<g>
<path id="${id}" d="${path}" fill="none" stroke="${e.color}" stroke-opacity="0.18" stroke-dasharray="3 5"/>
<rect x="${EX}" y="${ey}" width="${EW}" height="${EH}" rx="12" fill="${C.panel}" stroke="#FFFFFF" stroke-opacity="0.09"/>
<rect class="en${k}" x="${EX}" y="${ey}" width="${EW}" height="${EH}" rx="12" fill="none" stroke="${e.color}" stroke-opacity="0.12"/>
<circle cx="${EX + 28}" cy="${ey + EH / 2}" r="5" fill="${e.color}"/>
<circle cx="${EX + 28}" cy="${ey + EH / 2}" r="11" fill="none" stroke="${e.color}" stroke-opacity="0.35"/>
${text(e.title, { family: "display", weight: 600, size: 19, x: EX + 52, y: ey + 32, fill: C.paper })}
${text(e.sub, { family: "mono", weight: 400, size: 11.5, x: EX + 52, y: ey + 54, fill: C.mist })}
<g><circle r="4" fill="${e.color}"/><circle r="9" fill="${e.color}" opacity="0.2"/>
<animateMotion dur="${T}s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;${r2((a - 0.7) / T)};${r2(a / T)};1" calcMode="linear"><mpath href="#${id}"/></animateMotion>
<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0;${r2((a - 0.75) / T)};${r2((a - 0.65) / T)};${r2(a / T)};${r2((a + 0.15) / T)};1"/></g>
</g>`;
  });

  const extHead = eyebrow("External services", EX, 226, { color: C.mist });
  const head =
    eyebrow("System architecture", 64, 82, { color: C.mist }) +
    text("One request, four layers.", { family: "display", weight: 500, size: 34, x: 64, y: 128, fill: C.paper, tracking: -0.01 });

  const legendY = H - 60;
  const legend = `<g>
<circle cx="72" cy="${legendY - 4}" r="4.5" fill="${C.amber}"/>${text("Request", { family: "mono", size: 12, x: 86, y: legendY, fill: C.mist })}
<circle cx="182" cy="${legendY - 4}" r="4.5" fill="${C.sky}"/>${text("Response", { family: "mono", size: 12, x: 196, y: legendY, fill: C.mist })}
<path d="M 300 ${legendY - 4} h 26" stroke="${C.mist}" stroke-dasharray="3 5"/>${text("Background work (cron, ingestion, AI)", { family: "mono", size: 12, x: 336, y: legendY, fill: C.mist })}
</g>`;

  const defs = `${bd.defs}
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A1F29" stop-opacity="0.8"/><stop offset="1" stop-color="#0D1016" stop-opacity="0.62"/></linearGradient>
<radialGradient id="layerGlow" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="${C.ember}" stop-opacity="0.32"/><stop offset="1" stop-color="${C.ember}" stop-opacity="0"/></radialGradient>
<radialGradient id="layerGlowSky" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="${C.sky}" stop-opacity="0.28"/><stop offset="1" stop-color="${C.sky}" stop-opacity="0"/></radialGradient>
<linearGradient id="beam" gradientUnits="userSpaceOnUse" x1="0" y1="${syTop}" x2="0" y2="${spinePts[3][1]}"><stop offset="0" stop-color="${C.amber}" stop-opacity="0.7"/><stop offset="0.75" stop-color="${C.ember}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.sky}" stop-opacity="0.5"/></linearGradient>
<pattern id="plateGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#FFFFFF" stroke-opacity="0.05"/></pattern>`;

  const body = `<g clip-path="${bd.clip}">
${bd.body}
${head}
${labels}
<path d="${spine}" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-dasharray="2 6"/>
${layers}
<path d="${spine}" fill="none" stroke="url(#beam)" stroke-width="1.5"/>
${userNode}
${ext}
${extHead}
${packets}
${legend}
${corners(W, H, 30, 12)}
${bd.frame}
</g>`;
  write("motion/architecture.svg", svgDoc({
    w: W, h: H, title: "Skylark system architecture",
    desc: "Exploded isometric view of four layers: Experience (Next.js App Router, React 19), Server (proxy.ts, Server Components, Server Actions, REST API), Domain services (matching, tailoring, reviews, pipeline) and Data (one Repository interface over Supabase Postgres with row level security, Auth and Storage, or an in-memory demo store). External services: Vercel Cron, job boards, Claude, Gemini, Razorpay, Google sign-in and SMTP.",
    defs, style: css, body,
  }));
}
