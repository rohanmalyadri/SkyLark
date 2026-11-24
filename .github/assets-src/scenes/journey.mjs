// Product journey as a swimlane (animated SVG, 14 s loop): who does what, in order.
// Lanes and steps follow the real flow: profile verification (services/verification.ts),
// matching, tailoring with per-change approval (services/tailoring.ts), the five-point human
// review with a 24 h SLA (domain/constants.ts), recorded delivery, and the tracker statuses.

import { C, EASE, backdrop, corners, eyebrow, r2, svgDoc, text, write } from "../lib/core.mjs";

const W = 1600;
const H = 800;
const T = 14;
const pct = (s) => `${r2((s / T) * 100)}%`;

const LANES = [
  { key: "you", name: "You", sub: "the candidate", y: 290, color: C.paper },
  { key: "ai", name: "Skylark", sub: "engine + AI", y: 430, color: C.ember },
  { key: "human", name: "Specialist", sub: "a person", y: 570, color: C.sky },
];
const STEPS = [
  { lane: 0, title: "Build profile", sub: ["resume parsed, work", "authorization, answers"] },
  { lane: 2, title: "Verify profile", sub: ["automatic flags,", "approve or send back"] },
  { lane: 1, title: "Match", sub: ["7 weighted factors,", "each with a reason"] },
  { lane: 1, title: "Tailor", sub: ["summary, bullets,", "cover letter, gaps"] },
  { lane: 0, title: "Approve", sub: ["accept or reject", "every change"] },
  { lane: 2, title: "Review", sub: ["5-point checklist,", "24 h SLA, submits"] },
  { lane: 0, title: "Track", sub: ["receipt with portal", "and confirmation ref"] },
];
const STATUSES = ["saved", "preparing", "human_review", "applied", "screening", "interview", "offer"];
// which status is current once step k is reached
const STATUS_AT = [0, 0, 0, 1, 1, 2, 3];

const CX0 = 345;
const CDX = 186;
const CW = 168;
const CH = 92;
const at = (k) => 0.8 + k * 1.55;

export function buildJourney() {
  const bd = backdrop({ w: W, h: H, id: "j", grid: 32, glow: [0.6, 0.55], glowOpacity: 0.08, radius: 28 });
  let css = "";

  // lanes
  let lanes = "";
  LANES.forEach((l) => {
    lanes += `<rect x="40" y="${l.y - 62}" width="${W - 80}" height="124" rx="16" fill="#FFFFFF" fill-opacity="0.018" stroke="#FFFFFF" stroke-opacity="0.05"/>
<circle cx="78" cy="${l.y - 10}" r="5" fill="${l.color}"/>
${text(l.name, { family: "display", weight: 600, size: 21, x: 96, y: l.y - 3, fill: C.paper })}
${text(l.sub.toUpperCase(), { family: "mono", weight: 500, size: 10.5, x: 96, y: l.y + 20, fill: C.dim, tracking: 0.18 })}`;
  });

  // connectors + token path through card centres
  const pts = STEPS.map((s, k) => [CX0 + k * CDX, LANES[s.lane].y]);
  const segs = [];
  let len = 0;
  const cum = [0];
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1];
    const [x1, y1] = pts[k];
    const d = Math.hypot(x1 - x0, y1 - y0);
    len += d;
    cum.push(len);
    segs.push(`M ${x0} ${y0} L ${x1} ${y1}`);
  }
  const path = `M ${pts.map((p) => p.join(" ")).join(" L ")}`;
  // progressive line draw
  const dashFrames = [`0%, ${pct(at(0))} { stroke-dashoffset: ${r2(len)}; }`];
  for (let k = 1; k < pts.length; k++) dashFrames.push(`${pct(at(k))} { stroke-dashoffset: ${r2(len - cum[k])}; }`);
  dashFrames.push(`${pct(13.2)} { stroke-dashoffset: 0; opacity: 1; } ${pct(13.8)} { stroke-dashoffset: 0; opacity: 0; } 100% { stroke-dashoffset: ${r2(len)}; opacity: 0; }`);
  css += `@keyframes draw { ${dashFrames.join(" ")} }\n.draw { stroke-dasharray: ${r2(len)}; animation: draw ${T}s ${EASE.inOut} infinite both; }\n`;

  // token motion (pauses on each card)
  const kp = [];
  const kt = [];
  pts.forEach((_, k) => {
    const arrive = at(k);
    const leave = k < pts.length - 1 ? arrive + 0.75 : 13.2;
    kp.push(r2(cum[k] / len), r2(cum[k] / len));
    kt.push(r2(arrive / T), r2(leave / T));
  });
  const keyTimes = [0, ...kt, 1];
  const keyPoints = [0, ...kp, 1];
  const token = `<g>
<circle r="13" fill="${C.amber}" opacity="0.18"/><circle r="6" fill="${C.amber}"/>
<animateMotion dur="${T}s" repeatCount="indefinite" path="${path}" keyPoints="${keyPoints.join(";")}" keyTimes="${keyTimes.join(";")}" calcMode="linear"/>
<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0;${r2((at(0) - 0.3) / T)};${r2(at(0) / T)};${r2(13.2 / T)};${r2(13.6 / T)};1"/>
</g>`;

  // cards
  let cards = "";
  STEPS.forEach((s, k) => {
    const [x, y] = pts[k];
    const lane = LANES[s.lane];
    const a = at(k);
    css += `@keyframes cd${k} { 0%, ${pct(a - 0.05)} { stroke: rgba(255,255,255,0.1); } ${pct(a + 0.15)} { stroke: ${lane.color}; } ${pct(a + 1.2)} { stroke: rgba(255,255,255,0.22); } 100% { stroke: rgba(255,255,255,0.22); } }
.cd${k} { animation: cd${k} ${T}s ${EASE.out} infinite both; }
@keyframes ci${k} { 0%, ${pct(a - 0.1)} { opacity: 0.35; transform: translateY(6px); } ${pct(a + 0.25)} { opacity: 1; transform: none; } ${pct(13.2)} { opacity: 1; transform: none; } ${pct(13.8)} { opacity: 0.35; } 100% { opacity: 0.35; transform: translateY(6px); } }
.ci${k} { animation: ci${k} ${T}s ${EASE.out} infinite both; }\n`;
    cards += `<g class="ci${k}">
<rect x="${x - CW / 2}" y="${y - CH / 2}" width="${CW}" height="${CH}" rx="14" fill="${C.panel}"/>
<rect class="cd${k}" x="${x - CW / 2}" y="${y - CH / 2}" width="${CW}" height="${CH}" rx="14" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.3"/>
${text(String(k + 1).padStart(2, "0"), { family: "serif", size: 20, x: x - CW / 2 + 16, y: y - CH / 2 + 30, fill: lane.color === C.paper ? C.amber : lane.color })}
${text(s.title, { family: "display", weight: 600, size: 17, x: x - CW / 2 + 44, y: y - CH / 2 + 29, fill: C.paper })}
${text(s.sub[0], { family: "mono", size: 11, x: x - CW / 2 + 16, y: y + 14, fill: C.mist })}
${text(s.sub[1], { family: "mono", size: 11, x: x - CW / 2 + 16, y: y + 31, fill: C.mist })}
</g>`;
  });

  // status rail (application lifecycle, domain/types.ts APPLICATION_STATUSES)
  const SY = 715;
  let rail = text("APPLICATION STATUS", { family: "mono", weight: 500, size: 10.5, x: 64, y: SY + 5, fill: C.dim, tracking: 0.18 });
  let sx = 250;
  const chips = [];
  STATUSES.forEach((st) => {
    const w = st.length * 7.6 + 26;
    chips.push({ st, x: sx, w });
    sx += w + 30;
  });
  chips.forEach((c, i) => {
    const firstStep = STATUS_AT.indexOf(i);
    const on = firstStep >= 0 ? at(firstStep) : null;
    const nextStep = STATUS_AT.findIndex((v) => v > i);
    const off = nextStep >= 0 ? at(nextStep) : 13.2;
    if (on != null) {
      css += `@keyframes ss${i} { 0%, ${pct(on - 0.05)} { fill-opacity: 0; stroke-opacity: 0.15; } ${pct(on + 0.2)} { fill-opacity: 0.22; stroke-opacity: 1; } ${pct(off)} { fill-opacity: 0.22; stroke-opacity: 1; } ${pct(off + 0.3)} { fill-opacity: 0.05; stroke-opacity: 0.4; } ${pct(13.2)} { fill-opacity: 0.05; stroke-opacity: 0.4; } 100% { fill-opacity: 0; stroke-opacity: 0.15; } }
.ss${i} { animation: ss${i} ${T}s ${EASE.out} infinite both; }\n`;
    }
    rail += `<rect class="${on != null ? `ss${i}` : ""}" x="${c.x}" y="${SY - 13}" width="${r2(c.w)}" height="26" rx="13" fill="${C.ember}" fill-opacity="0" stroke="${i >= 4 ? "#FFFFFF" : C.ember}" stroke-opacity="${i >= 4 ? 0.12 : 0.4}"/>
${text(c.st, { family: "mono", weight: 500, size: 12, x: c.x + c.w / 2, y: SY + 4, anchor: "middle", fill: i >= 4 ? C.dim : C.paper })}
${i < chips.length - 1 ? `<path d="M ${r2(c.x + c.w + 8)} ${SY} h 14" stroke="#FFFFFF" stroke-opacity="0.2"/>` : ""}`;
  });
  rail += text("then the employer's process", { family: "display", size: 13.5, x: chips[4].x, y: SY + 38, fill: C.dim });

  const head = eyebrow("How it works", 64, 82) +
    text("AI proposes. You decide.", { family: "display", weight: 500, size: 34, x: 64, y: 130, fill: C.paper, tracking: -0.01 }) +
    text("A specialist verifies.", { family: "serifItalic", size: 38, x: 452, y: 130, fill: C.amber });

  const body = `<g clip-path="${bd.clip}">
${bd.body}
${head}
${lanes}
<path d="${path}" fill="none" stroke="#FFFFFF" stroke-opacity="0.1" stroke-width="1.5" stroke-dasharray="2 5"/>
<path class="draw" d="${path}" fill="none" stroke="url(#jline)" stroke-width="2"/>
${token}
${cards}
${rail}
${corners(W, H, 30, 12)}
${bd.frame}
</g>`;
  const defs = `${bd.defs}
<linearGradient id="jline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.amber}"/><stop offset="0.5" stop-color="${C.ember}"/><stop offset="1" stop-color="${C.sky}"/></linearGradient>`;
  write("motion/journey.svg", svgDoc({
    w: W, h: H, title: "How Skylark works",
    desc: "Swimlane across three actors. You build a profile; a specialist verifies it; Skylark matches on seven weighted factors and tailors the materials; you accept or reject every change; a specialist reviews against a five-point checklist within 24 hours and submits; you track the application with its portal and confirmation reference. Statuses: saved, preparing, human review, applied, then screening, interview and offer.",
    defs, style: css, body,
  }));
}
