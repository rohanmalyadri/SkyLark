// Hero title sequence (animated SVG, 14 s seamless loop).
//
// Beat sheet
//   0.0 s  dark stage, floor grid already travelling, particles drifting
//   0.8 s  eyebrow types on
//   0.9 s  the three shards of the mark fly in from three directions and lock together (overshoot)
//   3.3 s  a ring of light leaves the assembled mark
//   3.1 s  the wordmark letters rise out of a baseline mask, staggered
//   3.9 s  light reflection sweeps across the full lockup
//   4.8 s  tagline, then the capability line
//  12.6 s  everything settles out and the sequence starts again
//
// Everything that animates has its finished state as its base style, so a renderer that ignores
// CSS animation still shows the complete composition.

import { C, EASE, MARK_SHARDS, WORD_LETTERS, WORD_TRANSFORM, backdrop, centroid, corners, outline, r2, rng, shardPoints, svgDoc, write } from "../lib/core.mjs";

const W = 1600;
const H = 800;
const T = 14; // seconds per loop
const pct = (s) => `${r2((s / T) * 100)}%`;

export function buildHero() {
  const bd = backdrop({ w: W, h: H, id: "h", grid: 40, glow: [0.5, 0.36], glowOpacity: 0.11, radius: 28 });
  const rand = rng(11);

  // ---- Lockup placement (artwork space → stage) ------------------------------------------------
  const S = 1.02;
  const LX = 800 - (44.67 + 716.33 / 2) * S;
  const LY = 292 - (306.5 + 96.75) * S;
  const lockT = `translate(${r2(LX)} ${r2(LY)}) scale(${S})`;

  // ---- Shards ----------------------------------------------------------------------------------
  const shardFrom = [
    { dx: -260, dy: -150, rot: -38, at: 0.9 },
    { dx: -170, dy: 190, rot: 32, at: 1.25 },
    { dx: 250, dy: -170, rot: 46, at: 1.6 },
  ];
  let css = "";
  const shards = MARK_SHARDS.map((p, i) => {
    const f = shardFrom[i];
    const start = f.at;
    const land = start + 1.5;
    css += `
@keyframes shard${i} {
  0%, ${pct(start)} { opacity: 0; transform: translate(${f.dx}px, ${f.dy}px) rotate(${f.rot}deg) scale(0.55); }
  ${pct(start + 0.25)} { opacity: 1; }
  ${pct(land)} { opacity: 1; transform: none; }
  ${pct(12.5)} { opacity: 1; transform: none; }
  ${pct(13.4)} { opacity: 0; transform: translate(${f.dx * 0.12}px, ${f.dy * 0.12}px) rotate(${f.rot * 0.15}deg) scale(0.96); }
  100% { opacity: 0; transform: translate(${f.dx}px, ${f.dy}px) rotate(${f.rot}deg) scale(0.55); }
}
.sh${i} { transform-box: fill-box; transform-origin: center; animation: shard${i} ${T}s ${EASE.back} infinite both; }`;
    return `<polygon class="sh${i}" points="${shardPoints(p)}" fill="url(#emberFill${i})"/>`;
  }).join("");

  const shardGrads = MARK_SHARDS.map((p, i) => {
    const xs = p.map((q) => q[0]);
    const ys = p.map((q) => q[1]);
    return `<linearGradient id="emberFill${i}" gradientUnits="userSpaceOnUse" x1="${Math.min(...xs)}" y1="${Math.min(...ys)}" x2="${Math.max(...xs)}" y2="${Math.max(...ys)}">
  <stop offset="0" stop-color="${C.ember}"/><stop offset="1" stop-color="${i === 2 ? C.ember2 : "#F2482D"}"/></linearGradient>`;
  }).join("");

  // ---- Wordmark letters ------------------------------------------------------------------------
  const letters = WORD_LETTERS.map((l, i) => {
    const start = 3.1 + i * 0.13;
    css += `
@keyframes ltr${i} {
  0%, ${pct(start)} { transform: translateY(${r2(150 / 0.1667)}px); }
  ${pct(start + 1.1)} { transform: none; }
  ${pct(12.4)} { transform: none; opacity: 1; }
  ${pct(13.3)} { transform: translateY(-120px); opacity: 0; }
  100% { transform: translateY(${r2(150 / 0.1667)}px); opacity: 0; }
}
.l${i} { animation: ltr${i} ${T}s ${EASE.out} infinite both; }`;
    return `<path class="l${i}" d="${l.d}"/>`;
  }).join("");

  // Mark centroid in artwork space for the ring.
  const all = MARK_SHARDS.flat();
  const [mcx, mcy] = centroid([[Math.min(...all.map((p) => p[0])), Math.min(...all.map((p) => p[1]))], [Math.max(...all.map((p) => p[0])), Math.max(...all.map((p) => p[1]))]]);

  css += `
@keyframes ring { 0%, ${pct(3.2)} { opacity: 0; transform: scale(0.4); } ${pct(3.4)} { opacity: 0.45; } ${pct(5.0)} { opacity: 0; transform: scale(2.1); } 100% { opacity: 0; transform: scale(2.1); } }
.ring { transform-box: fill-box; transform-origin: center; animation: ring ${T}s ${EASE.out} infinite both; opacity: 0; }
@keyframes sweep { 0%, ${pct(3.9)} { transform: translateX(-420px); } ${pct(5.6)} { transform: translateX(1000px); } 100% { transform: translateX(1000px); } }
.sweep { animation: sweep ${T}s ${EASE.inOut} infinite both; }
@keyframes fadeUpEb { 0%, ${pct(0.6)} { opacity: 0; transform: translateY(10px); } ${pct(1.6)} { opacity: 1; transform: none; } ${pct(12.6)} { opacity: 1; transform: none; } ${pct(13.3)} { opacity: 0; } 100% { opacity: 0; } }
.eb { animation: fadeUpEb ${T}s ${EASE.out} infinite both; }
@keyframes tag { 0%, ${pct(4.6)} { opacity: 0; transform: translateY(22px); } ${pct(6.0)} { opacity: 1; transform: none; } ${pct(12.6)} { opacity: 1; transform: none; } ${pct(13.3)} { opacity: 0; transform: translateY(-8px); } 100% { opacity: 0; } }
.tag { animation: tag ${T}s ${EASE.out} infinite both; }
@keyframes tag2 { 0%, ${pct(5.1)} { opacity: 0; transform: translateY(22px); } ${pct(6.5)} { opacity: 1; transform: none; } ${pct(12.6)} { opacity: 1; transform: none; } ${pct(13.3)} { opacity: 0; transform: translateY(-8px); } 100% { opacity: 0; } }
.tag2 { animation: tag2 ${T}s ${EASE.out} infinite both; }
@keyframes caps { 0%, ${pct(5.8)} { opacity: 0; } ${pct(7.0)} { opacity: 1; } ${pct(12.6)} { opacity: 1; } ${pct(13.3)} { opacity: 0; } 100% { opacity: 0; } }
.caps { animation: caps ${T}s ${EASE.out} infinite both; }
@keyframes rule { 0%, ${pct(5.4)} { transform: scaleX(0); } ${pct(7.2)} { transform: scaleX(1); } ${pct(12.6)} { transform: scaleX(1); opacity: 1; } ${pct(13.3)} { opacity: 0; } 100% { transform: scaleX(0); opacity: 0; } }
.rule { transform-box: fill-box; transform-origin: center; animation: rule ${T}s ${EASE.out} infinite both; }
@keyframes glow { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; } }
.glow { animation: glow 7s ${EASE.inOut} infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes spinRev { to { transform: rotate(-360deg); } }
.orb1 { transform-origin: 800px 292px; animation: spin 90s linear infinite; }
.orb2 { transform-origin: 800px 292px; animation: spinRev 140s linear infinite; }
@keyframes twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
@keyframes drift { from { transform: translateY(0); } to { transform: translateY(-140px); } }
`;

  // ---- Perspective floor (pseudo-3D travelling grid) -------------------------------------------
  const HZ = 612; // horizon
  const floorDepth = (z) => HZ + 200 / z;
  let floor = "";
  // radial lines
  for (let k = -22; k <= 22; k++) {
    const x0 = 800 + k * 14;
    const x1 = 800 + k * 150;
    floor += `<line x1="${x0}" y1="${HZ}" x2="${x1}" y2="${H + 40}"/>`;
  }
  // travelling depth lines
  const N = 14;
  const P = 3.2; // seconds per step
  let lines = "";
  for (let i = 0; i < N; i++) {
    const z0 = 0.9 + i * 0.9;
    const frames = [];
    for (let s = 0; s <= 16; s++) {
      const t = s / 16;
      const z = Math.max(0.35, z0 - t * 0.9);
      const y = floorDepth(z);
      const o = Math.max(0, Math.min(1, (12.6 - z) / 8)) * 0.9;
      frames.push(`${r2(t * 100)}% { transform: translateY(${r2(y)}px); opacity: ${r2(o)}; }`);
    }
    css += `@keyframes fl${i} { ${frames.join(" ")} }\n.fl${i} { animation: fl${i} ${P}s linear infinite; }\n`;
    lines += `<line class="fl${i}" x1="0" y1="0" x2="${W}" y2="0"/>`;
  }

  // ---- Orbits and travelling nodes -------------------------------------------------------------
  const orbit = (rx, ry, rot, cls, nodes, dur, dash) => {
    const id = `op${cls}`;
    const d = `M ${800 - rx} 292 a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
    let out = `<g transform="rotate(${rot} 800 292)"><path id="${id}" d="${d}" fill="none" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
    nodes.forEach((n, j) => {
      out += `<g><circle r="${n.r}" fill="${n.c}" opacity="${n.o}"/>${n.halo ? `<circle r="${n.r * 3.2}" fill="${n.c}" opacity="0.12"/>` : ""}<animateMotion dur="${dur}s" repeatCount="indefinite" begin="${-(dur * j) / nodes.length}s" rotate="auto"><mpath href="#${id}"/></animateMotion></g>`;
    });
    return out + `</g>`;
  };
  const orbits =
    orbit(560, 128, -7, "a", [{ r: 3.2, c: C.ember, o: 0.95, halo: true }, { r: 2, c: C.paper, o: 0.6 }, { r: 2, c: C.paper, o: 0.45 }], 26) +
    orbit(700, 175, 5, "b", [{ r: 2.6, c: C.sky, o: 0.8, halo: true }, { r: 1.8, c: C.paper, o: 0.4 }], 38, "2 7") +
    orbit(430, 92, -14, "c", [{ r: 2.2, c: C.amber, o: 0.8 }], 19);

  // ---- Particles -------------------------------------------------------------------------------
  let particles = "";
  for (let i = 0; i < 70; i++) {
    const x = r2(rand() * W);
    const y = r2(120 + rand() * 640);
    const r = r2(0.6 + rand() * 1.4);
    const dur = r2(14 + rand() * 18);
    const tw = r2(2.5 + rand() * 5);
    const warm = rand() < 0.22;
    particles += `<g style="animation: drift ${dur}s linear ${-r2(rand() * dur)}s infinite"><circle cx="${x}" cy="${y}" r="${r}" fill="${warm ? C.amber : C.paper}" style="animation: twinkle ${tw}s ${EASE.inOut} ${-r2(rand() * tw)}s infinite"/></g>`;
  }

  // ---- Type ------------------------------------------------------------------------------------
  const eyebrowStr = "HUMAN-ASSISTED JOB MATCHING";
  const eb = outline(eyebrowStr, { family: "mono", weight: 500, size: 15, x: 800, y: 118, anchor: "middle", tracking: 0.32 });
  const line1 = outline("Your next move,", { family: "display", weight: 500, size: 52, x: 0, y: 0 });
  const line2 = outline("already in motion.", { family: "serifItalic", size: 60, x: 0, y: 0 });
  const gap = 16;
  const total = line1.width + gap + line2.width;
  const tx = 800 - total / 2;
  const tagY = 486;
  const tag1 = outline("Your next move,", { family: "display", weight: 500, size: 52, x: tx, y: tagY, tracking: -0.02 });
  const tag2 = outline("already in motion.", { family: "serifItalic", size: 60, x: tx + line1.width + gap - 8, y: tagY });
  const capParts = ["EXPLAINABLE MATCHES", "TAILORED BY AI, APPROVED BY YOU", "REVIEWED BY A HUMAN"].map((s) => outline(s, { family: "mono", weight: 400, size: 14, tracking: 0.16 }));
  const sep = 46;
  const capsW = capParts.reduce((a, p) => a + p.width, 0) + sep * (capParts.length - 1);
  let cx = 800 - capsW / 2;
  let capsD = "";
  let seps = "";
  capParts.forEach((p, i) => {
    capsD += outline(["EXPLAINABLE MATCHES", "TAILORED BY AI, APPROVED BY YOU", "REVIEWED BY A HUMAN"][i], { family: "mono", weight: 400, size: 14, x: cx, y: 548, tracking: 0.16 }).d;
    cx += p.width;
    if (i < capParts.length - 1) { seps += `<rect x="${r2(cx + sep / 2 - 2.5)}" y="540" width="5" height="5" fill="${C.ember}" transform="rotate(45 ${r2(cx + sep / 2)} 542.5)"/>`; cx += sep; }
  });
  const caps = { d: capsD };

  const footL = outline("SKYLARKGO.IN", { family: "mono", weight: 500, size: 12.5, x: 64, y: 748, tracking: 0.24 });
  const footR = outline("NEXT.JS 16  ·  SUPABASE  ·  CLAUDE", { family: "mono", weight: 400, size: 12.5, x: W - 64, y: 748, anchor: "end", tracking: 0.2 });

  const defs = `${bd.defs}
${shardGrads}
<linearGradient id="tagGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.amber}"/><stop offset="0.5" stop-color="${C.ember2}"/><stop offset="1" stop-color="${C.ember}"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.75"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
</linearGradient>
<linearGradient id="floorFade" x1="0" y1="${HZ}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="1"/>
</linearGradient>
<radialGradient id="floorSide" cx="0.5" cy="0" r="0.75"><stop offset="0.25" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
<mask id="floorMask" maskUnits="userSpaceOnUse" x="0" y="${HZ}" width="${W}" height="${H - HZ}">
  <rect x="0" y="${HZ}" width="${W}" height="${H - HZ}" fill="url(#floorFade)"/>
</mask>
<mask id="floorMask2" maskUnits="userSpaceOnUse" x="0" y="${HZ}" width="${W}" height="${H - HZ}">
  <rect x="0" y="${HZ}" width="${W}" height="${H - HZ}" fill="url(#floorSide)"/>
</mask>
<clipPath id="lockClip">${MARK_SHARDS.map((p) => `<polygon points="${shardPoints(p)}"/>`).join("")}<path transform="${WORD_TRANSFORM}" d="${WORD_LETTERS.map((l) => l.d).join(" ")}"/></clipPath>
<clipPath id="wordClip"><rect x="250" y="330" width="540" height="162"/></clipPath>
<radialGradient id="markHalo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.ember}" stop-opacity="0.2"/><stop offset="1" stop-color="${C.ember}" stop-opacity="0"/></radialGradient>
<linearGradient id="ruleGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.ember}" stop-opacity="0"/><stop offset="0.5" stop-color="${C.ember}"/><stop offset="1" stop-color="${C.ember}" stop-opacity="0"/></linearGradient>`;

  const body = `<g clip-path="${bd.clip}">
${bd.body}
<rect class="glow" x="0" y="0" width="${W}" height="${H}" fill="url(#h-glow)"/>
<g mask="url(#floorMask2)"><g mask="url(#floorMask)" stroke="${C.ember}" stroke-opacity="0.55" stroke-width="1">${floor}${lines}</g></g>
<line x1="0" y1="${HZ}" x2="${W}" y2="${HZ}" stroke="url(#ruleGrad)" stroke-opacity="0.5"/>
<g>${orbits}</g>
<g>${particles}</g>
<g transform="${lockT}">
  <ellipse class="glow" cx="${mcx}" cy="${mcy}" rx="230" ry="190" fill="url(#markHalo)"/>
  <circle class="ring" cx="${mcx}" cy="${mcy}" r="80" fill="none" stroke="${C.amber}" stroke-width="1"/>
  ${shards}
  <g clip-path="url(#wordClip)"><g transform="${WORD_TRANSFORM}" fill="${C.paper}" fill-rule="evenodd">${letters}</g></g>
  <g clip-path="url(#lockClip)"><g transform="skewX(-18)"><rect class="sweep" x="-20" y="250" width="150" height="320" fill="url(#sheen)" opacity="0.85"/></g></g>
</g>
<g class="eb"><path d="${eb.d}" fill="${C.mist}"/><rect x="${r2(800 - eb.width / 2 - 26)}" y="108" width="7" height="7" fill="${C.ember}" transform="rotate(45 ${r2(800 - eb.width / 2 - 22.5)} 111.5)"/><rect x="${r2(800 + eb.width / 2 + 19)}" y="108" width="7" height="7" fill="${C.ember}" transform="rotate(45 ${r2(800 + eb.width / 2 + 22.5)} 111.5)"/></g>
<path class="tag" d="${tag1.d}" fill="${C.paper}"/>
<path class="tag2" d="${tag2.d}" fill="url(#tagGrad)"/>
<rect class="rule" x="${800 - 210}" y="515" width="420" height="1" fill="url(#ruleGrad)"/>
<g class="caps"><path d="${caps.d}" fill="${C.mist}"/>${seps}</g>
<g class="caps"><path d="${footL.d}" fill="${C.dim}"/><path d="${footR.d}" fill="${C.dim}"/></g>
${corners(W, H, 34, 14)}
${bd.frame}
</g>`;

  const svg = svgDoc({
    w: W, h: H,
    title: "Skylark: your next move, already in motion",
    desc: "Animated title sequence. The three shards of the Skylark mark assemble, the wordmark rises, and the tagline appears: explainable matches, tailored by AI and approved by you, reviewed by a human.",
    defs, style: css, body,
  });
  return write("banners/hero.svg", svg);
}
