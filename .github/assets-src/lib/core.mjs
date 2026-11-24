// Shared building blocks for every README asset: palette, outlined typography and the official logo.
//
// Every SVG we ship outlines its text into paths, so GitHub (which renders README SVGs as images,
// without web fonts) shows exactly the typography we designed, on every platform.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.resolve(HERE, "..");
export const OUT = path.resolve(SRC, "../assets");

/* ------------------------------------------------------------------------------------------------
 * Palette. Ember comes straight from the logo (#F95135 measured from the official artwork); ink is
 * the wordmark's charcoal. Sky is the product's own signal blue, kept for "a human did this".
 * ---------------------------------------------------------------------------------------------- */
export const C = {
  night: "#07080B",
  deep: "#0B0D11",
  panel: "#10131A",
  panel2: "#151922",
  hair: "#FFFFFF",
  ink: "#1E1E1E",
  paper: "#F4F1EC",
  mist: "#A7ADB7",
  dim: "#666D78",
  faint: "#353B45",
  ember: "#F95135",
  ember2: "#FF7A52",
  amber: "#FFB98A",
  emberDeep: "#B8301B",
  sky: "#7CC6EE",
  skyDeep: "#2FA1D6",
  mint: "#6FD6A8",
};

/* ------------------------------------------------------------------------------------------------
 * Typography: Inter Tight (the product's display face), Instrument Serif (its numerals), and
 * JetBrains Mono for technical labels. All SIL Open Font License, outlined at build time.
 * ---------------------------------------------------------------------------------------------- */
const FONT_FILES = {
  display: (w) => `@fontsource/inter-tight/files/inter-tight-latin-${w}-normal.woff`,
  serif: () => `@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff`,
  serifItalic: () => `@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff`,
  mono: (w) => `@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${w}-normal.woff`,
};
const fontCache = new Map();
function font(family, weight = 400) {
  const key = `${family}:${weight}`;
  if (!fontCache.has(key)) {
    const file = require.resolve(FONT_FILES[family](weight));
    const buf = fs.readFileSync(file);
    fontCache.set(key, opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)));
  }
  return fontCache.get(key);
}

/**
 * Outline a string. Returns the path data and the advance width.
 * tracking is in em (0.1 = +10% of the font size between letters).
 */
export function outline(str, { family = "display", weight = 400, size = 16, x = 0, y = 0, anchor = "start", tracking = 0 } = {}) {
  const f = font(family, weight);
  const scale = size / f.unitsPerEm;
  const glyphs = f.stringToGlyphs(str);
  let width = 0;
  const advances = glyphs.map((g, i) => {
    let adv = g.advanceWidth * scale;
    if (i < glyphs.length - 1) adv += f.getKerningValue(g, glyphs[i + 1]) * scale + tracking * size;
    width += adv;
    return adv;
  });
  let cx = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  const parts = [];
  glyphs.forEach((g, i) => {
    const d = g.getPath(cx, y, size).toPathData(2);
    if (d) parts.push(d);
    cx += advances[i];
  });
  return { d: parts.join(""), width };
}

/* Glyph registry: each glyph is outlined once per document and placed with <use>, which keeps
 * text-heavy diagrams small. svgDoc() emits the registry and clears it. */
const glyphDefs = new Map();
function glyphRef(family, weight, glyph) {
  const id = `g${family[0]}${weight}_${glyph.index}`;
  if (!glyphDefs.has(id)) glyphDefs.set(id, `<path id="${id}" d="${glyph.getPath(0, 0, 100).toPathData(1)}"/>`);
  return id;
}

/** Outlined text placed from shared glyphs. Same options as outline(). */
export function text(str, opts = {}) {
  const { fill = C.paper, cls = "", style = "", opacity, family = "display", weight = 400, size = 16, x = 0, y = 0, anchor = "start", tracking = 0 } = opts;
  const f = font(family, weight);
  const scale = size / f.unitsPerEm;
  const glyphs = f.stringToGlyphs(str);
  const adv = glyphs.map((g, i) => g.advanceWidth * scale + (i < glyphs.length - 1 ? f.getKerningValue(g, glyphs[i + 1]) * scale + tracking * size : 0));
  const width = adv.reduce((a, b) => a + b, 0);
  let cx = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  const k = r2(size / 100);
  let uses = "";
  glyphs.forEach((g, i) => {
    if (g.path && g.path.commands && g.path.commands.length) uses += `<use href="#${glyphRef(family, weight, g)}" transform="translate(${r2(cx)} ${r2(y)}) scale(${k})"/>`;
    cx += adv[i];
  });
  return `<g${cls ? ` class="${cls}"` : ""} fill="${fill}"${opacity != null ? ` opacity="${opacity}"` : ""}${style ? ` style="${style}"` : ""}>${uses}</g>`;
}

/* ------------------------------------------------------------------------------------------------
 * The official logo, vectorised from the supplied artwork (800×800 JPG) without redrawing:
 * the three ember shards are exact polygons fitted to the artwork, the wordmark is a potrace of the
 * same file. Coordinates are kept in the artwork's own pixel space so proportions are untouched.
 * ---------------------------------------------------------------------------------------------- */
export const MARK_SHARDS = [
  // upper wing (largest shard)
  [[44.67, 306.5], [210.83, 400.33], [98.33, 411.0]],
  // lower body / tail
  [[233.5, 408.17], [108.67, 500.0], [151.83, 416.0]],
  // head / leading wing
  [[291.33, 315.33], [219.33, 392.5], [187.33, 374.67], [215.83, 338.17]],
];
export const MARK_BOX = { x: 44.67, y: 306.5, w: 291.33 - 44.67, h: 500 - 306.5 };
export const LOCKUP_BOX = { x: 44.67, y: 306.5, w: 761 - 44.67, h: 500 - 306.5 };

const WORD_RAW = fs.readFileSync(path.join(HERE, "wordmark.path.txt"), "utf8").trim();
// potrace traced the artwork at 6× from an origin of (30, 290); this maps it back to artwork space.
export const WORD_TRANSFORM = "translate(30 290) scale(0.16666667)";

/** The wordmark split into its letters (s, ky, l, a, r, k) so they can be animated individually. */
export const WORD_LETTERS = (() => {
  const subs = WORD_RAW.match(/M[^M]+/g);
  const firstX = (s) => parseFloat(s.trim().split(/\s+/)[1]) / 6 + 30;
  const groups = [
    { id: "s", from: 270, to: 350 },
    { id: "ky", from: 350, to: 515 },
    { id: "l", from: 515, to: 540 },
    { id: "a", from: 540, to: 630 },
    { id: "r", from: 630, to: 685 },
    { id: "k", from: 685, to: 800 },
  ];
  return groups.map((g) => ({ id: g.id, d: subs.filter((s) => firstX(s) >= g.from && firstX(s) < g.to).join(" ") }));
})();
export const WORD_D = WORD_RAW;

export const shardPoints = (p) => p.map(([x, y]) => `${x},${y}`).join(" ");
export const centroid = (p) => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];

/** Static lockup group in artwork coordinates. */
export function lockup({ markFill = C.ember, wordFill = C.ink } = {}) {
  return `<g fill="${markFill}">${MARK_SHARDS.map((p) => `<polygon points="${shardPoints(p)}"/>`).join("")}</g>` +
    `<path fill="${wordFill}" fill-rule="evenodd" transform="${WORD_TRANSFORM}" d="${WORD_D}"/>`;
}

export function mark({ fill = C.ember } = {}) {
  return `<g fill="${fill}">${MARK_SHARDS.map((p) => `<polygon points="${shardPoints(p)}"/>`).join("")}</g>`;
}

/* ------------------------------------------------------------------------------------------------
 * Document helpers
 * ---------------------------------------------------------------------------------------------- */
export function svgDoc({ w, h, title, desc, defs = "", style = "", body }) {
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t d">
<title id="t">${title}</title>
<desc id="d">${desc}</desc>
<defs>${defs}${[...glyphDefs.values()].join("")}</defs>
<style>${style}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }
</style>
${body}
</svg>
`;
  glyphDefs.clear();
  return out;
}

export function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  const kb = (Buffer.byteLength(content) / 1024).toFixed(1);
  console.log(`  ${rel.padEnd(40)} ${kb} KB`);
  return file;
}

/** Deterministic pseudo-random numbers so every build produces identical files. */
export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const r2 = (n) => Math.round(n * 100) / 100;

/** Ease curves for CSS. */
export const EASE = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)", // expo-out: confident arrival
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  back: "cubic-bezier(0.34, 1.36, 0.64, 1)", // slight overshoot = follow-through
  in: "cubic-bezier(0.7, 0, 0.84, 0)",
};

/** Shared background: deep gradient, hairline grid, vignette. */
export function backdrop({ w, h, id = "bg", grid = 40, glow = [0.5, 0.42], glowColor = C.ember, glowOpacity = 0.16, radius = 24 }) {
  const defs = `
<radialGradient id="${id}-glow" cx="${glow[0]}" cy="${glow[1]}" r="0.6">
  <stop offset="0" stop-color="${glowColor}" stop-opacity="${glowOpacity}"/>
  <stop offset="0.55" stop-color="${glowColor}" stop-opacity="${glowOpacity * 0.18}"/>
  <stop offset="1" stop-color="${glowColor}" stop-opacity="0"/>
</radialGradient>
<linearGradient id="${id}-base" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#0D1015"/><stop offset="1" stop-color="${C.night}"/>
</linearGradient>
<pattern id="${id}-grid" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse">
  <path d="M ${grid} 0 L 0 0 0 ${grid}" fill="none" stroke="#FFFFFF" stroke-opacity="0.045" stroke-width="1"/>
</pattern>
<radialGradient id="${id}-vig" cx="0.5" cy="0.5" r="0.75">
  <stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/>
</radialGradient>
<clipPath id="${id}-clip"><rect width="${w}" height="${h}" rx="${radius}"/></clipPath>`;
  const body = `
<rect width="${w}" height="${h}" fill="url(#${id}-base)"/>
<rect width="${w}" height="${h}" fill="url(#${id}-grid)"/>
<rect width="${w}" height="${h}" fill="url(#${id}-glow)"/>`;
  const frame = `<rect width="${w}" height="${h}" fill="url(#${id}-vig)"/>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${radius - 0.5}" fill="none" stroke="#FFFFFF" stroke-opacity="0.09"/>`;
  return { defs, body, frame, clip: `url(#${id}-clip)` };
}

/** Small corner registration marks, a recurring motif of the system. */
export function corners(w, h, inset = 28, len = 12, color = "#FFFFFF", opacity = 0.22) {
  const s = `stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.2" fill="none"`;
  return [
    `M${inset} ${inset + len}V${inset}H${inset + len}`,
    `M${w - inset - len} ${inset}H${w - inset}V${inset + len}`,
    `M${inset} ${h - inset - len}V${h - inset}H${inset + len}`,
    `M${w - inset - len} ${h - inset}H${w - inset}V${h - inset - len}`,
  ].map((d) => `<path d="${d}" ${s}/>`).join("");
}

/** Eyebrow label: mono, tracked, with an ember tick. */
export function eyebrow(str, x, y, { color = C.mist, size = 13, tick = true, anchor = "start" } = {}) {
  return (tick && anchor === "start" ? `<rect x="${x}" y="${y - size * 0.62}" width="8" height="8" fill="${C.ember}" transform="rotate(45 ${x + 4} ${y - size * 0.62 + 4})"/>` : "") +
    text(str.toUpperCase(), { family: "mono", weight: 500, size, x: tick && anchor === "start" ? x + 16 : x, y, anchor, tracking: 0.14, fill: color });
}
