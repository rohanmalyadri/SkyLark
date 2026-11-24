// Job pipeline motion graphic (animated SVG, 15 s loop).
//
// A single illustrative posting travels through the six stages of src/lib/pipeline/ingest.ts and
// the matching worker. The card above the track changes at every stop to show what that stage
// produces: raw HTML, structured fields, a fingerprint, a stored row, a queued batch, a score.

import { C, EASE, backdrop, corners, eyebrow, r2, svgDoc, text, write } from "../lib/core.mjs";

const W = 1600;
const H = 780;
const T = 15;
const pct = (s) => `${r2((s / T) * 100)}%`;

const STATIONS = [
  { name: "Fetch", detail: ["Source adapters", "3 attempts with backoff"] },
  { name: "Normalize", detail: ["HTML to text, title,", "location, salary, skills"] },
  { name: "Dedupe", detail: ["Fingerprint and", "(source, external_id)"] },
  { name: "Store", detail: ["Insert new, touch seen,", "close stale listings"] },
  { name: "Queue", detail: ["match_job, 100 per batch", "idempotency key"] },
  { name: "Score", detail: ["7 factors against", "every candidate"] },
];

const X0 = 170;
const DX = 252;
const TRACK_Y = 545;
const sx = (k) => X0 + k * DX;
const arriveAt = (k) => 1.0 + k * 2.0;

function icon(k, x, y, color) {
  const s = `fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  switch (k) {
    case 0: return `<path d="M ${x} ${y - 11} V ${y + 4} M ${x - 6} ${y - 2} L ${x} ${y + 4} L ${x + 6} ${y - 2} M ${x - 11} ${y + 6} V ${y + 11} H ${x + 11} V ${y + 6}" ${s}/>`;
    case 1: return `<path d="M ${x - 11} ${y - 8} H ${x + 4} M ${x - 11} ${y} H ${x + 11} M ${x - 11} ${y + 8} H ${x + 6}" ${s}/>`;
    case 2: return `<rect x="${x - 11}" y="${y - 11}" width="15" height="15" rx="3" ${s}/><rect x="${x - 4}" y="${y - 4}" width="15" height="15" rx="3" ${s}/>`;
    case 3: return `<ellipse cx="${x}" cy="${y - 8}" rx="11" ry="4" ${s}/><path d="M ${x - 11} ${y - 8} V ${y + 8} A 11 4 0 0 0 ${x + 11} ${y + 8} V ${y - 8} M ${x - 11} ${y} A 11 4 0 0 0 ${x + 11} ${y}" ${s}/>`;
    case 4: return `<path d="M ${x - 11} ${y - 8} H ${x + 11} M ${x - 11} ${y} H ${x + 11} M ${x - 11} ${y + 8} H ${x + 11}" ${s} stroke-dasharray="4 3"/>`;
    default: return `<path d="M ${x - 12} ${y + 7} A 13 13 0 0 1 ${x + 12} ${y + 7}" ${s}/><path d="M ${x} ${y + 7} L ${x + 7} ${y - 3}" ${s}/>`;
  }
}

// --- Card faces (220 × 150, origin top-left) -----------------------------------------------------
const CW = 236;
const CH = 168;
const K = 1.3; // card scale
const mono = (s, x, y, fill = C.mist, size = 12) => text(s, { family: "mono", size, x, y, fill });
const label = (s, x, y) => text(s.toUpperCase(), { family: "mono", weight: 500, size: 10.5, x, y, fill: C.dim, tracking: 0.16 });
const chip = (s, x, y, color = C.ember) => {
  const w = s.length * 7.4 + 16;
  return { w, svg: `<rect x="${x}" y="${y}" width="${r2(w)}" height="20" rx="10" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-opacity="0.5"/>${text(s, { family: "mono", weight: 500, size: 11, x: x + w / 2, y: y + 14, anchor: "middle", fill: C.paper })}` };
};

const FACES = [
  // Fetch: raw HTML as the board serves it
  () => `${label("raw posting · illustrative", 18, 28)}
${mono("<h2>Sr. Backend Eng.", 18, 56, C.amber)}
${mono("  (m/w/d)</h2>", 18, 74, C.amber)}
${mono("<p>Berlin &amp; remote", 18, 98)}
${mono("Go, Postgres, Kafka...", 18, 116)}
${mono("Visa sponsorship avail.", 18, 140)}`,
  // Normalize: structured fields
  () => {
    const a = chip("Go", 18, 126), b = chip("PostgreSQL", 18 + a.w + 6, 126), c = chip("Kafka", 18 + a.w + b.w + 12, 126);
    return `${label("normalized", 18, 28)}
${text("Backend Engineer", { family: "display", weight: 600, size: 17, x: 18, y: 54, fill: C.paper })}
${mono("senior · Berlin, DE · hybrid", 18, 76)}
${mono("sponsorship: offered", 18, 96, C.mint)}
${mono("min years: inferred", 18, 114, C.dim)}
${a.svg}${b.svg}${c.svg}`;
  },
  // Dedupe: fingerprint
  () => `${label("fingerprint", 18, 28)}
${mono("company + title + country", 18, 56)}
<rect x="18" y="70" width="${CW - 36}" height="34" rx="6" fill="#000" fill-opacity="0.35" stroke="#FFFFFF" stroke-opacity="0.08"/>
${text("sha256 · 3f9ac41e07b2…", { family: "mono", weight: 500, size: 13, x: 30, y: 92, fill: C.amber })}
${mono("+ (source, external_id)", 18, 128)}
${mono("unique, keep", 18, 150, C.mint)}`,
  // Store
  () => `${label("jobs table", 18, 28)}
${mono("insert   new rows", 18, 60, C.paper)}
${mono("touch    rows seen again", 18, 84)}
${mono("close    gone or older", 18, 108)}
${mono("         than 45 days", 18, 126, C.dim)}
${mono("ingestion_runs += 1", 18, 152, C.dim)}`,
  // Queue
  () => {
    let bars = "";
    for (let i = 0; i < 8; i++) bars += `<rect x="${18 + i * 25}" y="62" width="19" height="30" rx="4" fill="${i < 3 ? C.ember : "#FFFFFF"}" fill-opacity="${i < 3 ? 0.75 : 0.08}"/>`;
    return `${label("background_jobs", 18, 28)}
${mono("match_job", 18, 50, C.paper)}
${bars}
${mono("claimed FOR UPDATE", 18, 120)}
${mono("SKIP LOCKED, retried", 18, 138)}
${mono("with backoff", 18, 156)}`;
  },
  // Score
  () => {
    const f = [["Skills", 30, 0.9], ["Experience", 18, 0.8], ["Eligibility", 20, 1], ["Location", 12, 0.9], ["Sponsorship", 8, 1], ["Preferences", 7, 0.7], ["Education", 5, 0.8]];
    let rows = "";
    f.forEach(([n, w, v], i) => {
      const y = 42 + i * 15.5;
      rows += `${text(n, { family: "mono", size: 10, x: 18, y: y + 4, fill: C.mist })}<rect x="104" y="${y - 4}" width="${w * 3.4}" height="6" rx="3" fill="#FFFFFF" fill-opacity="0.08"/><rect x="104" y="${y - 4}" width="${r2(w * 3.4 * v)}" height="6" rx="3" fill="${C.ember}"/>`;
    });
    return `${label("match · example", 18, 24)}${rows}`;
  },
];

export function buildPipeline() {
  const bd = backdrop({ w: W, h: H, id: "p", grid: 32, glow: [0.5, 0.6], glowOpacity: 0.08, radius: 28 });
  let css = "";
  let stations = "";

  STATIONS.forEach((st, k) => {
    const x = sx(k);
    const a = arriveAt(k);
    css += `@keyframes st${k} { 0%, ${pct(a - 0.15)} { stroke: rgba(255,255,255,0.16); fill: ${C.panel}; } ${pct(a + 0.1)} { stroke: ${C.ember}; fill: #2A140F; } ${pct(a + 1.6)} { stroke: ${C.ember}; fill: #2A140F; } ${pct(a + 2.2)} { stroke: rgba(249,81,53,0.45); fill: ${C.panel}; } ${pct(13.6)} { stroke: rgba(249,81,53,0.45); fill: ${C.panel}; } 100% { stroke: rgba(255,255,255,0.16); fill: ${C.panel}; } }
.st${k} { animation: st${k} ${T}s ${EASE.out} infinite both; }
@keyframes tx${k} { 0%, ${pct(a - 0.2)} { opacity: 0.45; } ${pct(a + 0.15)} { opacity: 1; } ${pct(13.6)} { opacity: 1; } 100% { opacity: 0.45; } }
.tx${k} { animation: tx${k} ${T}s ${EASE.out} infinite both; }\n`;
    stations += `<g>
<circle class="st${k}" cx="${x}" cy="${TRACK_Y}" r="30" stroke-width="1.5" fill="${C.panel}" stroke="rgba(249,81,53,0.45)"/>
<g class="tx${k}">${icon(k, x, TRACK_Y, C.paper)}
${text(`0${k + 1}`, { family: "serif", size: 24, x, y: TRACK_Y + 74, anchor: "middle", fill: C.ember })}
${text(st.name, { family: "display", weight: 600, size: 21, x, y: TRACK_Y + 104, anchor: "middle", fill: C.paper })}
${text(st.detail[0], { family: "mono", size: 12, x, y: TRACK_Y + 130, anchor: "middle", fill: C.mist })}
${text(st.detail[1], { family: "mono", size: 12, x, y: TRACK_Y + 148, anchor: "middle", fill: C.mist })}</g>
</g>`;
  });

  // Track with progress fill
  const trackStart = sx(0);
  const trackEnd = sx(STATIONS.length - 1);
  css += `@keyframes prog { 0%, ${pct(arriveAt(0))} { transform: scaleX(0); } ${STATIONS.map((_, k) => `${pct(arriveAt(k) + 0.2)} { transform: scaleX(${r2(k / (STATIONS.length - 1))}); }`).join(" ")} ${pct(13.6)} { transform: scaleX(1); opacity: 1; } ${pct(14.4)} { transform: scaleX(1); opacity: 0; } 100% { transform: scaleX(0); opacity: 0; } }
.prog { transform-box: fill-box; transform-origin: left center; animation: prog ${T}s ${EASE.inOut} infinite both; }\n`;
  const track = `<rect x="${trackStart}" y="${TRACK_Y - 1}" width="${trackEnd - trackStart}" height="2" fill="#FFFFFF" fill-opacity="0.1"/>
<rect class="prog" x="${trackStart}" y="${TRACK_Y - 1}" width="${trackEnd - trackStart}" height="2" fill="url(#progGrad)"/>`;

  // Travelling card: moves between stations, holds above each one, swaps its face.
  const cardY = 236;
  const kf = [];
  STATIONS.forEach((_, k) => {
    const a = arriveAt(k);
    const x = sx(k) - (CW * K) / 2;
    if (k === 0) kf.push(`0% { transform: translate(${x - 60}px, 0); opacity: 0; }`, `${pct(a - 0.5)} { transform: translate(${x - 60}px, 0); opacity: 0; }`);
    kf.push(`${pct(a)} { transform: translate(${x}px, 0); opacity: 1; }`);
    kf.push(`${pct(a + 1.4)} { transform: translate(${x}px, 0); opacity: 1; }`);
  });
  const lastX = sx(STATIONS.length - 1) - (CW * K) / 2;
  kf.push(`${pct(13.6)} { transform: translate(${lastX}px, 0); opacity: 1; }`, `${pct(14.3)} { transform: translate(${lastX + 40}px, 0); opacity: 0; }`, `100% { transform: translate(${lastX + 40}px, 0); opacity: 0; }`);
  css += `@keyframes card { ${kf.join(" ")} }\n.card { animation: card ${T}s ${EASE.inOut} infinite both; }\n`;

  let faces = "";
  FACES.forEach((face, k) => {
    const a = arriveAt(k);
    const on = k === 0 ? `0%, ${pct(a + 1.5)} { opacity: 1; }` : `0%, ${pct(a - 0.45)} { opacity: 0; } ${pct(a - 0.1)} { opacity: 1; }`;
    const off = k === FACES.length - 1 ? `${pct(14.4)} { opacity: 1; } 100% { opacity: 1; }` : `${pct(a + 1.5)} { opacity: 1; } ${pct(a + 1.75)} { opacity: 0; } 100% { opacity: 0; }`;
    css += `@keyframes face${k} { ${on} ${off} }\n.face${k} { animation: face${k} ${T}s linear infinite both; }\n`;
    faces += `<g class="face${k}"${k === FACES.length - 1 ? "" : ""}>${face()}</g>`;
  });
  // Static (no-animation) fallback shows the final face only.
  css += STATIONS.slice(0, -1).map((_, k) => `.face${k} { opacity: 0; }`).join("\n") + "\n";

  const card = `<g class="card" style="transform: translate(${lastX}px, 0)">
<path d="M ${(CW * K) / 2} ${cardY + CH * K} V ${TRACK_Y - 34}" stroke="${C.ember}" stroke-opacity="0.45" stroke-dasharray="2 4"/>
<g transform="translate(0 ${cardY}) scale(${K})">
<rect x="0" y="0" width="${CW}" height="${CH}" rx="14" fill="url(#cardGrad)" stroke="#FFFFFF" stroke-opacity="0.14"/>
<rect x="0.5" y="0.5" width="${CW - 1}" height="${CH - 1}" rx="13.5" fill="none" stroke="url(#cardEdge)"/>
${faces}
</g></g>`;

  // Duplicate ghost: a second copy that is rejected at the dedupe stage.
  const d = arriveAt(2);
  css += `@keyframes ghost { 0%, ${pct(d - 0.3)} { opacity: 0; transform: translate(${sx(2) - (CW * K) / 2 + 22}px, -18px); } ${pct(d + 0.1)} { opacity: 0.55; transform: translate(${sx(2) - (CW * K) / 2 + 22}px, -18px); } ${pct(d + 0.8)} { opacity: 0.55; transform: translate(${sx(2) - (CW * K) / 2 + 22}px, -18px) rotate(0deg); } ${pct(d + 1.7)} { opacity: 0; transform: translate(${sx(2) - (CW * K) / 2 + 80}px, 140px) rotate(8deg); } 100% { opacity: 0; transform: translate(${sx(2) - (CW * K) / 2 + 80}px, 140px) rotate(8deg); } }
.ghost { animation: ghost ${T}s ${EASE.in} infinite both; opacity: 0; }\n`;
  const ghost = `<g class="ghost"><g transform="translate(0 ${cardY}) scale(${K})"><rect width="${CW}" height="${CH}" rx="14" fill="${C.panel}" stroke="${C.ember}" stroke-opacity="0.6" stroke-dasharray="4 4"/>
${text("DUPLICATE", { family: "mono", weight: 500, size: 12, x: CW / 2, y: 70, anchor: "middle", fill: C.ember, tracking: 0.24 })}
${text("cross-posted copy, dropped", { family: "mono", size: 11, x: CW / 2, y: 94, anchor: "middle", fill: C.mist })}</g></g>`;

  // Notification burst after scoring (HIGH_FIT = 85 in matching/service.ts)
  const n = arriveAt(5) + 0.9;
  const nx = sx(5);
  css += `@keyframes bell { 0%, ${pct(n)} { opacity: 0; transform: translateY(12px); } ${pct(n + 0.4)} { opacity: 1; transform: none; } ${pct(13.6)} { opacity: 1; transform: none; } ${pct(14.3)} { opacity: 0; } 100% { opacity: 0; } }
.bell { animation: bell ${T}s ${EASE.out} infinite both; }
@keyframes burst { 0%, ${pct(n)} { opacity: 0; transform: scale(0.6); } ${pct(n + 0.2)} { opacity: 0.8; } ${pct(n + 1.4)} { opacity: 0; transform: scale(2.2); } 100% { opacity: 0; transform: scale(2.2); } }
.burst { transform-box: fill-box; transform-origin: center; animation: burst ${T}s ${EASE.out} infinite both; }\n`;
  const notify = `<circle class="burst" cx="${nx}" cy="${TRACK_Y}" r="30" fill="none" stroke="${C.amber}"/>
<g class="bell"><rect x="${nx - 110}" y="${cardY - 54}" width="220" height="38" rx="20" fill="${C.ember}" fill-opacity="0.14" stroke="${C.ember}" stroke-opacity="0.6"/>
${text("85%+ fit, candidate notified", { family: "mono", weight: 500, size: 12, x: nx, y: cardY - 30, anchor: "middle", fill: C.paper })}</g>`;

  const head = eyebrow("Job pipeline", 64, 82) +
    text("From a posting on a job board", { family: "display", weight: 500, size: 34, x: 64, y: 130, fill: C.paper, tracking: -0.01 }) +
    text("to a ranked match that explains itself.", { family: "serifItalic", size: 38, x: 64, y: 172, fill: C.amber });
  const cron = `<g>${text("TRIGGER", { family: "mono", weight: 500, size: 11, x: W - 64, y: 82, anchor: "end", fill: C.dim, tracking: 0.2 })}
${text("Vercel Cron · daily 09:00 UTC", { family: "mono", size: 13, x: W - 64, y: 106, anchor: "end", fill: C.mist })}
${text("GET /api/cron/worker (Bearer CRON_SECRET)", { family: "mono", size: 13, x: W - 64, y: 126, anchor: "end", fill: C.dim })}</g>`;

  const defs = `${bd.defs}
<linearGradient id="progGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.amber}"/><stop offset="1" stop-color="${C.ember}"/></linearGradient>
<linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#181C25"/><stop offset="1" stop-color="#0F1218"/></linearGradient>
<linearGradient id="cardEdge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.ember}" stop-opacity="0.7"/><stop offset="0.4" stop-color="${C.ember}" stop-opacity="0"/></linearGradient>`;
  const body = `<g clip-path="${bd.clip}">
${bd.body}
${head}
${cron}
${track}
${stations}
${ghost}
${card}
${notify}
${corners(W, H, 30, 12)}
${bd.frame}
</g>`;
  write("motion/pipeline.svg", svgDoc({
    w: W, h: H, title: "Skylark job pipeline",
    desc: "An illustrative job posting moves through six stages: fetch from source adapters with retries, normalize HTML into structured fields, dedupe by fingerprint and source id, store and close stale listings, queue match jobs in batches of 100, and score against every candidate on seven factors. Matches of 85 percent or more notify the candidate.",
    defs, style: css, body,
  }));
}
