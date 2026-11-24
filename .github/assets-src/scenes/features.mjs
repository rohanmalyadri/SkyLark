// Six feature cards, each with a small animated illustration of the capability it names.
// Shown two per row in the README; the explanation lives in the Markdown under each card so it
// stays searchable and selectable.

import { C, EASE, backdrop, r2, svgDoc, text, write } from "../lib/core.mjs";

const W = 760;
const H = 400;

function frame(id, n, title, kicker, illo, css, desc) {
  const bd = backdrop({ w: W, h: H, id, grid: 24, glow: [0.78, 0.35], glowOpacity: 0.12, radius: 22 });
  const body = `<g clip-path="${bd.clip}">
${bd.body}
<g transform="translate(330 40)">${illo}</g>
${text(n, { family: "serif", size: 34, x: 40, y: 82, fill: C.ember })}
${text(kicker.toUpperCase(), { family: "mono", weight: 500, size: 12, x: 40, y: 300, fill: C.dim, tracking: 0.18 })}
${text(title[0], { family: "display", weight: 600, size: 32, x: 40, y: 338, fill: C.paper, tracking: -0.01 })}
${title[1] ? text(title[1], { family: "serifItalic", size: 34, x: 40, y: 372, fill: C.amber }) : ""}
${bd.frame}
</g>`;
  return svgDoc({ w: W, h: H, title: `${title.join(" ")}`, desc, defs: bd.defs, style: css, body });
}

const pctOf = (T) => (s) => `${r2((s / T) * 100)}%`;

// 01 — Explainable matching -----------------------------------------------------------------------
function matching() {
  const T = 7;
  const pct = pctOf(T);
  const weights = [30, 18, 5, 20, 12, 8, 7];
  const scores = [81, 100, 100, 75, 82, 90, 100];
  const names = ["skills", "experience", "education", "eligibility", "location", "sponsorship", "preferences"];
  let css = "";
  let g = "";
  weights.forEach((w, i) => {
    const y = 22 + i * 34;
    const full = 230;
    const t0 = 0.4 + i * 0.22;
    css += `@keyframes b${i} { 0%, ${pct(t0)} { transform: scaleX(0); } ${pct(t0 + 0.9)} { transform: scaleX(1); } ${pct(6.4)} { transform: scaleX(1); opacity: 1; } ${pct(6.9)} { opacity: 0; } 100% { transform: scaleX(0); opacity: 0; } }
.b${i} { transform-box: fill-box; transform-origin: left center; animation: b${i} ${T}s ${EASE.out} infinite both; }\n`;
    g += `${text(names[i], { family: "mono", size: 12, x: 0, y: y + 5, fill: C.mist })}
${text(`${w}%`, { family: "mono", weight: 500, size: 12, x: 120, y: y + 5, fill: C.ember, anchor: "end" })}
<rect x="134" y="${y - 4}" width="${full}" height="8" rx="4" fill="#FFFFFF" fill-opacity="0.07"/>
<rect class="b${i}" x="134" y="${y - 4}" width="${r2((full * scores[i]) / 100)}" height="8" rx="4" fill="${C.ember}"/>`;
  });
  css += `@keyframes sc { 0%, ${pct(2.4)} { opacity: 0; transform: translateY(8px); } ${pct(3.0)} { opacity: 1; transform: none; } ${pct(6.4)} { opacity: 1; } ${pct(6.9)} { opacity: 0; } 100% { opacity: 0; } }
.sc { animation: sc ${T}s ${EASE.out} infinite both; }\n`;
  g += `<g class="sc"><path d="M 0 262 H 364" stroke="#FFFFFF" stroke-opacity="0.1"/>${text("weighted sum", { family: "mono", size: 12, x: 0, y: 290, fill: C.dim })}${text("86", { family: "serif", size: 44, x: 364, y: 298, anchor: "end", fill: C.paper })}</g>`;
  return frame("f1", "01", ["Matches that", "explain themselves"], "Explainable matching", g, css,
    "Seven weighted factor bars fill in turn and add up to a match score of 86, each factor carrying its own written reason.");
}

// 02 — Eligibility first --------------------------------------------------------------------------
function eligibility() {
  const T = 8;
  const pct = pctOf(T);
  const home = [70, 210];
  const ok = [300, 70];
  const no = [330, 250];
  const arc = (a, b, bend) => `M ${a[0]} ${a[1]} Q ${(a[0] + b[0]) / 2 + bend[0]} ${(a[1] + b[1]) / 2 + bend[1]} ${b[0]} ${b[1]}`;
  const css = `@keyframes d1 { 0%, ${pct(0.4)} { stroke-dashoffset: 400; } ${pct(1.8)} { stroke-dashoffset: 0; } ${pct(7.4)} { stroke-dashoffset: 0; opacity: 1; } ${pct(7.8)} { opacity: 0; } 100% { stroke-dashoffset: 400; opacity: 0; } }
@keyframes d2 { 0%, ${pct(2.4)} { stroke-dashoffset: 400; } ${pct(3.6)} { stroke-dashoffset: 120; } ${pct(7.4)} { stroke-dashoffset: 120; opacity: 1; } ${pct(7.8)} { opacity: 0; } 100% { stroke-dashoffset: 400; opacity: 0; } }
.d1 { stroke-dasharray: 400; animation: d1 ${T}s ${EASE.inOut} infinite both; }
.d2 { stroke-dasharray: 400; animation: d2 ${T}s ${EASE.inOut} infinite both; }
@keyframes p1 { 0%, ${pct(1.7)} { opacity: 0; transform: scale(0.6); } ${pct(2.1)} { opacity: 1; transform: none; } ${pct(7.4)} { opacity: 1; } ${pct(7.8)} { opacity: 0; } 100% { opacity: 0; } }
@keyframes p2 { 0%, ${pct(3.5)} { opacity: 0; transform: scale(0.6); } ${pct(3.9)} { opacity: 1; transform: none; } ${pct(7.4)} { opacity: 1; } ${pct(7.8)} { opacity: 0; } 100% { opacity: 0; } }
.p1 { transform-box: fill-box; transform-origin: center; animation: p1 ${T}s ${EASE.back} infinite both; }
.p2 { transform-box: fill-box; transform-origin: center; animation: p2 ${T}s ${EASE.back} infinite both; }
@keyframes ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.6); opacity: 0; } }
.rg { transform-box: fill-box; transform-origin: center; animation: ring 2.4s ${EASE.out} infinite; }`;
  // dotted globe
  let dots = "";
  for (let y = -130; y <= 130; y += 14) {
    const half = Math.sqrt(Math.max(0, 140 * 140 - y * y));
    for (let x = -half; x <= half; x += 14) dots += `<circle cx="${r2(200 + x)}" cy="${r2(160 + y)}" r="1.4"/>`;
  }
  const g = `<g fill="#FFFFFF" fill-opacity="0.12">${dots}</g>
<path class="d1" d="${arc(home, ok, [-10, -60])}" fill="none" stroke="${C.mint}" stroke-width="2"/>
<path class="d2" d="${arc(home, no, [60, 40])}" fill="none" stroke="${C.ember}" stroke-width="2" stroke-dasharray="400"/>
<circle class="rg" cx="${home[0]}" cy="${home[1]}" r="6" fill="none" stroke="${C.paper}"/>
<circle cx="${home[0]}" cy="${home[1]}" r="6" fill="${C.paper}"/>
${text("home", { family: "mono", size: 12, x: home[0] - 8, y: home[1] + 28, fill: C.mist })}
<g class="p1"><circle cx="${ok[0]}" cy="${ok[1]}" r="7" fill="${C.mint}"/>
<rect x="${ok[0] - 112}" y="${ok[1] - 46}" width="150" height="28" rx="14" fill="${C.mint}" fill-opacity="0.12" stroke="${C.mint}" stroke-opacity="0.6"/>
${text("sponsor offered", { family: "mono", weight: 500, size: 12, x: ok[0] - 37, y: ok[1] - 27, anchor: "middle", fill: C.mint })}</g>
<g class="p2"><circle cx="${no[0]}" cy="${no[1]}" r="7" fill="none" stroke="${C.ember}" stroke-width="2"/><path d="M ${no[0] - 4} ${no[1] - 4} l 8 8 M ${no[0] + 4} ${no[1] - 4} l -8 8" stroke="${C.ember}" stroke-width="2"/>
<rect x="${no[0] - 160}" y="${no[1] + 18}" width="196" height="28" rx="14" fill="${C.ember}" fill-opacity="0.12" stroke="${C.ember}" stroke-opacity="0.6"/>
${text("no sponsorship, capped 35", { family: "mono", weight: 500, size: 12, x: no[0] - 62, y: no[1] + 37, anchor: "middle", fill: C.ember })}</g>`;
  return frame("f2", "02", ["Eligibility comes", "before everything"], "Work authorization", g, css,
    "From the candidate's home, a route to a country where the listing offers sponsorship lights up; a route to a listing that will not sponsor is blocked and capped at 35.");
}

// 03 — Tailoring you approve ------------------------------------------------------------------------
function tailoring() {
  const T = 8;
  const pct = pctOf(T);
  const css = `@keyframes ins { 0%, ${pct(0.8)} { opacity: 0; transform: translateY(-6px); } ${pct(1.4)} { opacity: 1; transform: none; } ${pct(7.4)} { opacity: 1; } ${pct(7.8)} { opacity: 0; } 100% { opacity: 0; } }
.ins { animation: ins ${T}s ${EASE.out} infinite both; }
@keyframes strike { 0%, ${pct(1.6)} { transform: scaleX(0); } ${pct(2.2)} { transform: scaleX(1); } ${pct(7.4)} { transform: scaleX(1); } 100% { transform: scaleX(0); } }
.strike { transform-box: fill-box; transform-origin: left center; animation: strike ${T}s ${EASE.out} infinite both; }
@keyframes cur { 0%, ${pct(2.4)} { transform: translate(240px, 300px); opacity: 0; } ${pct(2.7)} { opacity: 1; } ${pct(3.8)} { transform: translate(84px, 232px); } ${pct(4.0)} { transform: translate(84px, 232px) scale(0.86); } ${pct(4.2)} { transform: translate(84px, 232px); } ${pct(7.0)} { transform: translate(84px, 232px); opacity: 1; } ${pct(7.4)} { opacity: 0; } 100% { transform: translate(240px, 300px); opacity: 0; } }
.cur { animation: cur ${T}s ${EASE.inOut} infinite both; }
@keyframes acc { 0%, ${pct(4.0)} { fill: transparent; } ${pct(4.15)} { fill: rgba(111,214,168,0.25); } ${pct(7.4)} { fill: rgba(111,214,168,0.25); } 100% { fill: transparent; } }
.acc { animation: acc ${T}s linear infinite both; }
@keyframes ok { 0%, ${pct(4.1)} { opacity: 0; } ${pct(4.4)} { opacity: 1; } ${pct(7.4)} { opacity: 1; } 100% { opacity: 0; } }
.ok { animation: ok ${T}s linear infinite both; }`;
  const g = `<rect x="0" y="0" width="390" height="250" rx="14" fill="${C.panel}" stroke="#FFFFFF" stroke-opacity="0.09"/>
${text("RESUME BULLET · ORIGINAL VS SUGGESTED", { family: "mono", weight: 500, size: 10.5, x: 20, y: 30, fill: C.dim, tracking: 0.14 })}
<g>${text("−  Worked on backend services", { family: "mono", size: 12.5, x: 20, y: 66, fill: C.mist })}
<rect class="strike" x="36" y="61" width="196" height="1.6" fill="${C.ember}"/></g>
<g class="ins">${text("+  Built Go services on PostgreSQL", { family: "mono", size: 12.5, x: 20, y: 96, fill: C.mint })}
${text("   for the payments team", { family: "mono", size: 12.5, x: 20, y: 116, fill: C.mint })}</g>
${text("Why: the listing asks for Go and PostgreSQL.", { family: "display", size: 13.5, x: 20, y: 152, fill: C.dim })}
${text("No invented employers, titles or numbers.", { family: "display", size: 13.5, x: 20, y: 172, fill: C.dim })}
<rect class="acc" x="20" y="200" width="96" height="32" rx="16" fill="transparent" stroke="${C.mint}" stroke-opacity="0.7"/>
${text("Accept", { family: "display", weight: 600, size: 14, x: 68, y: 221, anchor: "middle", fill: C.mint })}
<rect x="128" y="200" width="96" height="32" rx="16" fill="none" stroke="#FFFFFF" stroke-opacity="0.2"/>
${text("Reject", { family: "display", weight: 600, size: 14, x: 176, y: 221, anchor: "middle", fill: C.mist })}
<g class="ok">${text("accepted by you", { family: "mono", size: 11.5, x: 240, y: 221, fill: C.mint })}</g>
<g class="cur"><path d="M 0 0 L 0 18 L 5 13 L 9 22 L 12 21 L 8 12 L 15 12 Z" fill="${C.paper}" stroke="${C.night}" stroke-width="1"/></g>`;
  return frame("f3", "03", ["Tailored by AI,", "approved by you"], "Tailoring", g, css,
    "A resume bullet is rewritten with the reason shown; nothing changes until the candidate presses Accept.");
}

// 04 — Human review ------------------------------------------------------------------------------
function review() {
  const T = 8;
  const pct = pctOf(T);
  const items = ["Work authorization verified", "Resume accurate and truthful", "Cover letter specific to role", "Hard requirements addressed", "Portal details confirmed"];
  let css = "";
  let g = `<rect x="0" y="0" width="390" height="260" rx="14" fill="${C.panel}" stroke="#FFFFFF" stroke-opacity="0.09"/>
${text("REVIEW CHECKLIST", { family: "mono", weight: 500, size: 10.5, x: 20, y: 30, fill: C.dim, tracking: 0.14 })}`;
  items.forEach((it, i) => {
    const y = 64 + i * 36;
    const t = 0.7 + i * 0.75;
    css += `@keyframes k${i} { 0%, ${pct(t)} { opacity: 0; transform: scale(0.4); } ${pct(t + 0.3)} { opacity: 1; transform: none; } ${pct(7.4)} { opacity: 1; } 100% { opacity: 0; } }
.k${i} { transform-box: fill-box; transform-origin: center; animation: k${i} ${T}s ${EASE.back} infinite both; }\n`;
    g += `<rect x="20" y="${y - 13}" width="20" height="20" rx="6" fill="none" stroke="#FFFFFF" stroke-opacity="0.25"/>
<g class="k${i}"><rect x="20" y="${y - 13}" width="20" height="20" rx="6" fill="${C.sky}"/><path d="M ${25} ${y - 3} l 4 4 l 7 -8" fill="none" stroke="${C.night}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
${text(it, { family: "display", size: 15, x: 54, y: y + 2, fill: C.paper })}`;
  });
  // SLA ring
  const R = 34, circ = 2 * Math.PI * R;
  css += `@keyframes sla { 0% { stroke-dashoffset: ${r2(circ)}; } ${pct(4.6)} { stroke-dashoffset: ${r2(circ * 0.62)}; } ${pct(7.4)} { stroke-dashoffset: ${r2(circ * 0.62)}; } 100% { stroke-dashoffset: ${r2(circ)}; } }
.sla { animation: sla ${T}s ${EASE.inOut} infinite both; }`;
  g += `<g transform="translate(330 70)"><circle r="${R}" fill="none" stroke="#FFFFFF" stroke-opacity="0.1" stroke-width="5"/>
<circle class="sla" r="${R}" fill="none" stroke="${C.sky}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${r2(circ)}" transform="rotate(-90)"/>
${text("24h", { family: "serif", size: 26, x: 0, y: 9, anchor: "middle", fill: C.paper })}
${text("SLA", { family: "mono", weight: 500, size: 10, x: 0, y: 56, anchor: "middle", fill: C.dim, tracking: 0.2 })}</g>`;
  return frame("f4", "04", ["A person checks", "before anything is sent"], "Human review", g, css,
    "Five checklist items tick off in turn while a 24-hour SLA ring fills.");
}

// 05 — Answer vault ------------------------------------------------------------------------------
function vault() {
  const T = 8;
  const pct = pctOf(T);
  const qs = [["Authorized to work here?", "Yes"], ["Need sponsorship now?", "No"], ["Need sponsorship later?", "Yes"], ["Over 18?", "Yes"], ["Related to an employee?", null]];
  let css = "";
  let g = `<rect x="0" y="0" width="390" height="268" rx="14" fill="${C.panel}" stroke="#FFFFFF" stroke-opacity="0.09"/>
${text("ANSWER VAULT", { family: "mono", weight: 500, size: 10.5, x: 20, y: 30, fill: C.dim, tracking: 0.14 })}`;
  qs.forEach(([q, a], i) => {
    const y = 62 + i * 32;
    const t = 0.6 + i * 0.5;
    css += `@keyframes q${i} { 0%, ${pct(t)} { opacity: 0; transform: translateX(8px); } ${pct(t + 0.4)} { opacity: 1; transform: none; } ${pct(7.4)} { opacity: 1; } 100% { opacity: 0; } }
.q${i} { animation: q${i} ${T}s ${EASE.out} infinite both; }\n`;
    g += `${text(q, { family: "display", size: 14.5, x: 20, y, fill: C.mist })}
<g class="q${i}">${a ? `<rect x="314" y="${y - 15}" width="56" height="22" rx="11" fill="${C.mint}" fill-opacity="0.12"/>${text(a, { family: "mono", weight: 500, size: 12, x: 342, y: y + 1, anchor: "middle", fill: C.mint })}` : `<rect x="262" y="${y - 15}" width="108" height="22" rx="11" fill="none" stroke="${C.amber}" stroke-dasharray="3 3"/>${text("unanswered", { family: "mono", weight: 500, size: 11.5, x: 316, y: y + 1, anchor: "middle", fill: C.amber })}`}</g>`;
  });
  css += `@keyframes lk { 0%, ${pct(3.6)} { opacity: 0; } ${pct(4.1)} { opacity: 1; } ${pct(7.4)} { opacity: 1; } 100% { opacity: 0; } }
.lk { animation: lk ${T}s ${EASE.out} infinite both; }`;
  g += `<path d="M 20 222 H 370" stroke="#FFFFFF" stroke-opacity="0.08"/>
<g class="lk"><rect x="20" y="234" width="350" height="24" rx="8" fill="${C.sky}" fill-opacity="0.08"/>
<rect x="30" y="242" width="10" height="9" rx="2" fill="${C.sky}"/><path d="M 32 242 v -3 a 3 3 0 0 1 6 0 v 3" fill="none" stroke="${C.sky}" stroke-width="1.6"/>
${text("EEO self-identification: no browser session can read it", { family: "display", size: 12.5, x: 50, y: 251, fill: C.sky })}</g>`;
  return frame("f5", "05", ["Answer the forms", "once"], "Answer vault", g, css,
    "Common employer form questions fill with saved answers; one stays visibly unanswered rather than defaulting to No; the EEO self-identification row is locked.");
}

// 06 — Proof of delivery ---------------------------------------------------------------------------
function delivery() {
  const T = 8;
  const pct = pctOf(T);
  const css = `@keyframes print { 0%, ${pct(0.6)} { transform: translateY(-190px); } ${pct(2.2)} { transform: none; } ${pct(7.3)} { transform: none; opacity: 1; } ${pct(7.8)} { opacity: 0; } 100% { transform: translateY(-190px); opacity: 0; } }
.print { animation: print ${T}s ${EASE.out} infinite both; }
@keyframes cnt { 0%, ${pct(2.3)} { transform: scaleX(0.6); } ${pct(2.8)} { transform: scaleX(0.7); } ${pct(7.4)} { transform: scaleX(0.7); } 100% { transform: scaleX(0.6); } }
.cnt { transform-box: fill-box; transform-origin: left center; animation: cnt ${T}s ${EASE.out} infinite both; }
@keyframes n7 { 0%, ${pct(2.3)} { opacity: 0; } ${pct(2.35)} { opacity: 1; } ${pct(7.4)} { opacity: 1; } 100% { opacity: 0; } }
@keyframes n6 { 0%, ${pct(2.3)} { opacity: 1; } ${pct(2.35)} { opacity: 0; } 100% { opacity: 0; } }
.n7 { animation: n7 ${T}s linear infinite both; }
.n6 { animation: n6 ${T}s linear infinite both; opacity: 0; }`;
  const g = `<rect x="40" y="0" width="310" height="14" rx="7" fill="#000" fill-opacity="0.6" stroke="#FFFFFF" stroke-opacity="0.12"/>
<clipPath id="slot"><rect x="40" y="8" width="310" height="260"/></clipPath>
<g clip-path="url(#slot)"><g class="print">
<path d="M 56 8 H 334 V 196 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -10 8 l -10 -8 l -8 6 Z" fill="#EDEAE4"/>
${text("SUBMITTED", { family: "mono", weight: 500, size: 11, x: 76, y: 40, fill: "#6B6F76", tracking: 0.2 })}
${text("Backend Engineer", { family: "display", weight: 600, size: 18, x: 76, y: 68, fill: C.ink })}
${text("portal", { family: "mono", size: 12, x: 76, y: 100, fill: "#6B6F76" })}${text("employer ATS", { family: "mono", weight: 500, size: 12, x: 316, y: 100, anchor: "end", fill: C.ink })}
${text("reference", { family: "mono", size: 12, x: 76, y: 124, fill: "#6B6F76" })}${text("from employer", { family: "mono", weight: 500, size: 12, x: 316, y: 124, anchor: "end", fill: C.ink })}
${text("recorded by", { family: "mono", size: 12, x: 76, y: 148, fill: "#6B6F76" })}${text("specialist", { family: "mono", weight: 500, size: 12, x: 316, y: 148, anchor: "end", fill: C.ink })}
<path d="M 76 166 H 316" stroke="${C.ink}" stroke-opacity="0.15" stroke-dasharray="3 3"/>
${text("illustrative receipt", { family: "mono", size: 10.5, x: 76, y: 184, fill: "#8A8F96" })}
</g></g>
${text("TODAY", { family: "mono", weight: 500, size: 11, x: 40, y: 252, fill: C.dim, tracking: 0.2 })}
<rect x="100" y="243" width="180" height="8" rx="4" fill="#FFFFFF" fill-opacity="0.08"/>
<rect class="cnt" x="100" y="243" width="180" height="8" rx="4" fill="${C.ember}"/>
<g class="n6">${text("6 / 10", { family: "mono", weight: 500, size: 12, x: 350, y: 252, anchor: "end", fill: C.paper })}</g>
<g class="n7">${text("7 / 10", { family: "mono", weight: 500, size: 12, x: 350, y: 252, anchor: "end", fill: C.paper })}</g>`;
  return frame("f6", "06", ["Every application", "comes with a receipt"], "Managed delivery", g, css,
    "A submission receipt prints with the portal, the employer's confirmation reference and who recorded it, and the day's counter moves from 6 to 7 of 10.");
}

export function buildFeatures() {
  write("features/matching.svg", matching());
  write("features/eligibility.svg", eligibility());
  write("features/tailoring.svg", tailoring());
  write("features/review.svg", review());
  write("features/answer-vault.svg", vault());
  write("features/delivery.svg", delivery());
}
