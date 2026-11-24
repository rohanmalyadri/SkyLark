// Match engine motion graphic (animated SVG, 16 s loop).
//
// Two acts, both computed with the real rules in src/lib/services/matching/engine.ts:
//   Act 1  an example candidate in India targeting Germany, listing offers sponsorship → 86
//   Act 2  the same listing says it does not sponsor: eligibility and sponsorship are blocked,
//          the weighted sum (64) is capped at 35 and the summary says why.
// The factor reasons are the engine's own sentence templates filled with the example values.

import { C, EASE, backdrop, corners, eyebrow, r2, svgDoc, text, write } from "../lib/core.mjs";

const W = 1600;
const H = 940;
const T = 16;
const pct = (s) => `${r2((s / T) * 100)}%`;
const ACT2 = 8.2;

// weight, act-1 score/rating/reason, act-2 score/rating/reason (null = unchanged)
const F = [
  { n: "Skills", w: 30, s: 81, r: "strong", why: "Covers all 4 skills the listing asks for, 1 via closely related experience." },
  { n: "Experience", w: 18, s: 100, r: "strong", why: "6 years of experience at the expected senior level." },
  { n: "Education", w: 5, s: 100, r: "strong", why: "Asks for a bachelor's degree; you have a bachelor's in Computer Science." },
  { n: "Eligibility", w: 20, s: 75, r: "moderate", why: "Eligible with an employer-sponsored visa for Germany.", s2: 0, r2: "blocked", why2: "Requires existing work authorization in Germany." },
  { n: "Location", w: 12, s: 82, r: "strong", why: "Germany is one of your target countries." },
  { n: "Sponsorship", w: 8, s: 90, r: "strong", why: "Listing explicitly offers visa sponsorship in Germany.", s2: 0, r2: "blocked", why2: "The employer states it does not sponsor visas for this role." },
  { n: "Preferences", w: 7, s: 100, r: "strong", why: "Title aligns with your preferred roles; salary meets your floor." },
];
const total1 = Math.round(F.reduce((a, f) => a + (f.s * f.w) / 100, 0)); // 86
const raw2 = Math.round(F.reduce((a, f) => a + ((f.s2 ?? f.s) * f.w) / 100, 0)); // 64
const total2 = Math.min(raw2, 35);

const RATING_COLOR = { strong: C.mint, moderate: C.amber, weak: C.ember, blocked: C.ember };

export function buildMatching() {
  const bd = backdrop({ w: W, h: H, id: "m", grid: 32, glow: [0.22, 0.75], glowOpacity: 0.1, radius: 28 });
  let css = "";

  // ---- Factor rows -------------------------------------------------------------------------------
  const RX = 640;
  const RY = 250;
  const RH = 86;
  const BAR_X = RX + 240;
  const BAR_W = 420;
  let rows = "";
  F.forEach((f, i) => {
    const y = RY + i * RH;
    const t0 = 0.9 + i * 0.28;
    const blocked = f.s2 != null;
    const w1 = r2((BAR_W * f.s) / 100);
    css += `@keyframes row${i} { 0%, ${pct(t0)} { opacity: 0; transform: translateX(-14px); } ${pct(t0 + 0.6)} { opacity: 1; transform: none; } ${pct(15.2)} { opacity: 1; transform: none; } ${pct(15.8)} { opacity: 0; } 100% { opacity: 0; } }
.row${i} { animation: row${i} ${T}s ${EASE.out} infinite both; }
@keyframes bar${i} { 0%, ${pct(t0 + 0.2)} { transform: scaleX(0); } ${pct(t0 + 1.3)} { transform: scaleX(1); } ${blocked ? `${pct(ACT2 + 0.3)} { transform: scaleX(1); } ${pct(ACT2 + 1.2)} { transform: scaleX(0); }` : ""} 100% { transform: scaleX(${blocked ? 0 : 1}); } }
.bar${i} { transform-box: fill-box; transform-origin: left center; animation: bar${i} ${T}s ${EASE.out} infinite both; }\n`;
    const a1 = `<g class="${blocked ? "act1" : ""}">
${text(String(f.s), { family: "mono", weight: 500, size: 15, x: BAR_X + BAR_W + 52, y: y + 8, anchor: "end", fill: C.paper })}
<rect x="${BAR_X + BAR_W + 70}" y="${y - 8}" width="${f.r.length * 8 + 18}" height="22" rx="11" fill="${RATING_COLOR[f.r]}" fill-opacity="0.12" stroke="${RATING_COLOR[f.r]}" stroke-opacity="0.5"/>
${text(f.r.toUpperCase(), { family: "mono", weight: 500, size: 10.5, x: BAR_X + BAR_W + 79, y: y + 7, fill: RATING_COLOR[f.r], tracking: 0.1 })}
${text(f.why, { family: "display", size: 15, x: RX + 52, y: y + 36, fill: C.mist })}
</g>`;
    const a2 = blocked ? `<g class="act2">
${text("0", { family: "mono", weight: 500, size: 15, x: BAR_X + BAR_W + 52, y: y + 8, anchor: "end", fill: C.ember })}
<rect x="${BAR_X + BAR_W + 70}" y="${y - 8}" width="${7 * 8 + 18}" height="22" rx="11" fill="${C.ember}" fill-opacity="0.18" stroke="${C.ember}"/>
${text("BLOCKED", { family: "mono", weight: 500, size: 10.5, x: BAR_X + BAR_W + 79, y: y + 7, fill: C.ember, tracking: 0.1 })}
${text(f.why2, { family: "display", size: 15, x: RX + 52, y: y + 36, fill: C.amber })}
<rect x="${BAR_X}" y="${y - 3}" width="${BAR_W}" height="8" rx="4" fill="url(#hatch)"/>
</g>` : "";
    rows += `<g class="row${i}">
${text(`${f.w}%`, { family: "mono", weight: 500, size: 13, x: RX, y: y + 8, fill: C.ember })}
${text(f.n, { family: "display", weight: 600, size: 20, x: RX + 52, y: y + 9, fill: C.paper })}
<rect x="${BAR_X}" y="${y - 3}" width="${BAR_W}" height="8" rx="4" fill="#FFFFFF" fill-opacity="0.07"/>
<rect class="bar${i}" x="${BAR_X}" y="${y - 3}" width="${w1}" height="8" rx="4" fill="url(#barGrad)"/>
${a1}${a2}
<path d="M ${RX} ${y + 54} H ${BAR_X + BAR_W + 160}" stroke="#FFFFFF" stroke-opacity="0.06"/>
</g>`;
  });
  css += `@keyframes act1 { 0%, ${pct(ACT2 + 0.2)} { opacity: 1; } ${pct(ACT2 + 0.6)} { opacity: 0; } ${pct(15.6)} { opacity: 0; } 100% { opacity: 1; } }
.act1 { animation: act1 ${T}s ${EASE.out} infinite both; }
@keyframes act2 { 0%, ${pct(ACT2 + 0.5)} { opacity: 0; } ${pct(ACT2 + 1.0)} { opacity: 1; } ${pct(15.2)} { opacity: 1; } ${pct(15.6)} { opacity: 0; } 100% { opacity: 0; } }
.act2 { animation: act2 ${T}s ${EASE.out} infinite both; opacity: 0; }\n`;

  // ---- Inputs (left column) ----------------------------------------------------------------------
  const card = (x, y, title, lines, extra = "") => `<g>
<rect x="${x}" y="${y}" width="480" height="${44 + lines.length * 26}" rx="16" fill="${C.panel}" stroke="#FFFFFF" stroke-opacity="0.09"/>
${text(title.toUpperCase(), { family: "mono", weight: 500, size: 11, x: x + 24, y: y + 30, fill: C.dim, tracking: 0.18 })}
${lines.map((l, k) => text(l, { family: "display", size: 16.5, x: x + 24, y: y + 60 + k * 26, fill: k === 0 ? C.paper : C.mist })).join("")}
${extra}</g>`;
  const LX = 64;
  const cand = card(LX, 230, "Candidate · example", ["Backend engineer, 6 years, senior", "Lives in India, targets Germany", "Open to relocation", "Go · PostgreSQL · Docker · GCP"]);
  const lyY = 410;
  const listing = card(LX, lyY, "Listing · example", ["Backend Engineer · Berlin, Germany", "Asks for Go, PostgreSQL, Docker, AWS", "Bachelor's degree", "Visa sponsorship:"],
    `<g class="act1">${text("offered", { family: "display", weight: 600, size: 16.5, x: LX + 160, y: lyY + 60 + 3 * 26, fill: C.mint })}</g>
<g class="act2">${text("not offered", { family: "display", weight: 600, size: 16.5, x: LX + 160, y: lyY + 60 + 3 * 26, fill: C.ember })}</g>`);

  // ---- Score gauge -------------------------------------------------------------------------------
  const GX = LX + 150;
  const GY = 760;
  const GR = 92;
  const circ = 2 * Math.PI * GR;
  const off = (v) => r2(circ * (1 - v / 100));
  const tScore = 0.9 + F.length * 0.28 + 1.2;
  css += `@keyframes gauge { 0%, ${pct(tScore - 0.4)} { stroke-dashoffset: ${off(0)}; stroke: ${C.ember}; } ${pct(tScore + 1.2)} { stroke-dashoffset: ${off(total1)}; stroke: ${C.ember}; } ${pct(ACT2 + 0.9)} { stroke-dashoffset: ${off(total1)}; stroke: ${C.ember}; } ${pct(ACT2 + 2.0)} { stroke-dashoffset: ${off(total2)}; stroke: ${C.mist}; } ${pct(15.2)} { stroke-dashoffset: ${off(total2)}; stroke: ${C.mist}; } 100% { stroke-dashoffset: ${off(0)}; stroke: ${C.mist}; } }
.gauge { animation: gauge ${T}s ${EASE.inOut} infinite both; }\n`;

  // number roll-up: discrete frames shown one at a time
  const ups = [0, 9, 21, 34, 47, 58, 68, 76, 81, 84, 86];
  const downs = [86, 79, 70, 61, 53, 46, 40, 37, 35];
  const frames = [];
  ups.forEach((v, k) => frames.push({ v, t: tScore - 0.3 + k * 0.14 }));
  downs.forEach((v, k) => frames.push({ v, t: ACT2 + 0.9 + k * 0.13 }));
  let nums = "";
  frames.forEach((fr, k) => {
    const start = fr.t;
    const end = k < frames.length - 1 ? frames[k + 1].t : 15.4;
    const isFinal1 = fr.v === total1 && k === ups.length - 1;
    css += `@keyframes n${k} { 0%, ${pct(start)} { opacity: 0; } ${pct(start + 0.03)} { opacity: 1; } ${pct(end)} { opacity: 1; } ${pct(end + 0.03)} { opacity: 0; } 100% { opacity: 0; } }
.n${k} { animation: n${k} ${T}s linear infinite both; opacity: ${isFinal1 ? 1 : 0}; }\n`;
    nums += `<g class="n${k}">${text(String(fr.v), { family: "serif", size: 86, x: GX, y: GY + 26, anchor: "middle", fill: k >= ups.length ? C.paper : C.paper })}</g>`;
  });
  const gauge = `<g>
<circle cx="${GX}" cy="${GY}" r="${GR}" fill="none" stroke="#FFFFFF" stroke-opacity="0.07" stroke-width="10"/>
<circle class="gauge" cx="${GX}" cy="${GY}" r="${GR}" fill="none" stroke="${C.ember}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${r2(circ)}" stroke-dashoffset="${off(total1)}" transform="rotate(-90 ${GX} ${GY})"/>
${nums}
${text("MATCH SCORE", { family: "mono", weight: 500, size: 11, x: GX, y: GY + 56, anchor: "middle", fill: C.dim, tracking: 0.2 })}
</g>`;

  // ---- Summary lines -------------------------------------------------------------------------------
  const SX = GX + 140;
  const sum1 = `<g class="act1 sum1">
${text("WELL-ROUNDED FIT", { family: "mono", weight: 500, size: 11.5, x: SX, y: GY - 34, fill: C.mint, tracking: 0.18 })}
${text("Led by skills. Weighted sum of", { family: "display", size: 16, x: SX, y: GY - 6, fill: C.mist })}
${text("seven factors: 86.", { family: "display", size: 16, x: SX, y: GY + 16, fill: C.mist })}
</g>`;
  const sum2 = `<g class="act2">
${text("BLOCKED ON ELIGIBILITY", { family: "mono", weight: 500, size: 11.5, x: SX, y: GY - 34, fill: C.ember, tracking: 0.18 })}
${text(`Weighted sum ${raw2}, capped at 35:`, { family: "display", size: 16, x: SX, y: GY - 6, fill: C.mist })}
${text("a role you can't legally take", { family: "display", size: 16, x: SX, y: GY + 16, fill: C.mist })}
${text("never outranks one you can.", { family: "display", size: 16, x: SX, y: GY + 38, fill: C.mist })}
</g>`;
  css += `@keyframes sum1 { 0%, ${pct(tScore + 1.0)} { opacity: 0; } ${pct(tScore + 1.6)} { opacity: 1; } ${pct(ACT2 + 0.2)} { opacity: 1; } ${pct(ACT2 + 0.6)} { opacity: 0; } 100% { opacity: 0; } }
.sum1 { animation: sum1 ${T}s ${EASE.out} infinite both; }\n`;

  // Act-2 caption over the rows
  css += `@keyframes cap2 { 0%, ${pct(ACT2 - 0.2)} { opacity: 0; transform: translateY(8px); } ${pct(ACT2 + 0.3)} { opacity: 1; transform: none; } ${pct(15.2)} { opacity: 1; } ${pct(15.6)} { opacity: 0; } 100% { opacity: 0; } }
.cap2 { animation: cap2 ${T}s ${EASE.out} infinite both; opacity: 0; }
@keyframes cap1 { 0%, ${pct(0.5)} { opacity: 0; } ${pct(1.0)} { opacity: 1; } ${pct(ACT2 - 0.3)} { opacity: 1; } ${pct(ACT2)} { opacity: 0; } 100% { opacity: 0; } }
.cap1 { animation: cap1 ${T}s ${EASE.out} infinite both; }\n`;
  const caps = `<g class="cap1">${text("ACT 1 · THE LISTING OFFERS SPONSORSHIP", { family: "mono", weight: 500, size: 11.5, x: RX, y: 206, fill: C.mist, tracking: 0.18 })}</g>
<g class="cap2">${text("ACT 2 · SAME ROLE, BUT THE LISTING SAYS IT WILL NOT SPONSOR", { family: "mono", weight: 500, size: 11.5, x: RX, y: 206, fill: C.ember, tracking: 0.18 })}</g>`;

  const head = eyebrow("Match engine · match-v2.0", 64, 82) +
    text("Seven published weights.", { family: "display", weight: 500, size: 34, x: 64, y: 130, fill: C.paper, tracking: -0.01 }) +
    text("Every score shows its working.", { family: "serifItalic", size: 38, x: 64, y: 172, fill: C.amber });
  const src = text("src/lib/services/matching/engine.ts", { family: "mono", size: 12.5, x: W - 64, y: 82, anchor: "end", fill: C.dim });

  const defs = `${bd.defs}
<linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.emberDeep}"/><stop offset="1" stop-color="${C.ember2}"/></linearGradient>
<pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="${C.ember}" fill-opacity="0.08"/><path d="M 0 0 V 8" stroke="${C.ember}" stroke-opacity="0.7" stroke-width="2"/></pattern>`;
  const body = `<g clip-path="${bd.clip}">
${bd.body}
${head}${src}
${caps}
${cand}
${listing}
${rows}
${gauge}
${sum1}${sum2}
${corners(W, H, 30, 12)}
${bd.frame}
</g>`;
  write("motion/match-engine.svg", svgDoc({
    w: W, h: H, title: "Skylark match engine",
    desc: `Seven weighted factors: skills 30, experience 18, education 5, eligibility 20, location 12, sponsorship 8, preferences 7. Example: a candidate in India targeting Germany scores ${total1} on a Berlin listing that offers sponsorship. When the listing says it will not sponsor, eligibility and sponsorship are blocked and the weighted sum of ${raw2} is capped at 35.`,
    defs, style: css, body,
  }));
}
