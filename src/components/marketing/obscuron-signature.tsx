"use client";

import { useEffect, useRef } from "react";

/**
 * "A Obscuron X Labs Product" sign-off under the footer.
 *
 * A canvas paints a skylark gliding over a ridge line, both built from small red mono glyphs.
 * The pointer heats blocks of glyphs to solid red as it passes (they cool off on their own),
 * and hovering or focusing the link sends a heat wave across the whole scene. Without a pointer
 * (touch, or an idle mouse) a faint ember drifts through the scene instead.
 *
 * Performance: glyphs come from a pre-rendered atlas (one drawImage per cell, no fillText in the
 * loop), the bird mask is rasterised at grid resolution only, the loop runs only while the
 * section is on screen, and idle frames are capped at ~30 fps. Reduced motion paints one still.
 */

const URL = "https://www.obscuronxlabs.in/";

// Glyph ramp, sparse to dense. Index 0 is never drawn.
const RAMP = [" ", ".", "·", ":", "-", "~", "=", "+", "/", "\\", "<", ">", "[", "]", "{", "}", "?", "*", "#", "%", "X", "&"];
const BANDS = [
  [1, 3],
  [3, 6],
  [6, 10],
  [10, 16],
  [16, 21],
]; // ramp slices per density band
const LEVELS = 8; // red alpha levels in the atlas
const BG = "#0b0b0b";
const RED = "216, 20, 19";
const HOT = "#e8391d";

// Bird, facing right, in a 400 x 200 box. Body and the two wings are separate so the wings can flap.
const BODY_D =
  "M338 106 C333 99 324 95 314 95 C292 95 272 99 250 100 C214 101 172 97 128 93 L74 86 L82 97 L70 104 L132 111 C180 118 230 121 276 120 C298 119 316 116 328 111 L346 108 Z";
const NEAR_WING_D =
  "M262 103 C246 78 214 46 166 22 C142 10 116 4 92 2 C110 12 126 22 138 32 C130 32 122 31 114 30 C132 42 148 52 160 62 C152 63 144 63 136 62 C156 76 172 86 186 96 C200 102 216 106 232 108 Z";
const FAR_WING_D =
  "M252 99 C262 80 276 58 296 36 C304 28 312 22 320 18 C314 30 308 42 304 52 C310 50 316 48 322 46 C314 60 304 74 294 86 C284 96 272 101 262 104 Z";
const NEAR_SHOULDER = [236, 104] as const;
const FAR_SHOULDER = [258, 100] as const;

const hash = (n: number) => {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967295;
};

// Cheap smooth 1D value noise for the ridges.
const noise1 = (x: number, seed: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i * 374761 + seed * 668265);
  const b = hash((i + 1) * 374761 + seed * 668265);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
};

export function ObscuronSignature() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    // Path2D only exists in the browser, so build the bird here rather than at module scope.
    const BODY = new Path2D(BODY_D);
    const NEAR_WING = new Path2D(NEAR_WING_D);
    const FAR_WING = new Path2D(FAR_WING_D);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Grid state, rebuilt on resize.
    let cols = 0;
    let rows = 0;
    let cell = 10; // css px
    let dpr = 1;
    let cw = 0; // device px per cell
    let terrain = new Float32Array(0); // static ridge density
    let heat = new Float32Array(0);
    let cool = new Float32Array(0); // per-cell cooling rate
    let seedA = new Float32Array(0);
    let mask = new Uint8ClampedArray(0); // bird alpha at grid resolution
    let bird = { x: 0, y: 0, w: 0 }; // bird box in cells

    // Atlas: LEVELS rows of red glyphs + one row of dark glyphs (for heated cells).
    const atlas = document.createElement("canvas");
    const actx = atlas.getContext("2d")!;
    const maskCanvas = document.createElement("canvas");
    const mctx = maskCanvas.getContext("2d", { willReadFrequently: true })!;

    const buildAtlas = () => {
      const family = getComputedStyle(canvas).fontFamily || "monospace";
      atlas.width = cw * RAMP.length;
      atlas.height = cw * (LEVELS + 1);
      actx.clearRect(0, 0, atlas.width, atlas.height);
      actx.font = `500 ${Math.round(cw * 0.92)}px ${family}`;
      actx.textAlign = "center";
      actx.textBaseline = "middle";
      for (let l = 0; l <= LEVELS; l++) {
        actx.fillStyle = l === LEVELS ? "rgba(11, 11, 11, 0.9)" : `rgba(${RED}, ${0.3 + (0.7 * (l + 1)) / LEVELS})`;
        for (let c = 1; c < RAMP.length; c++) actx.fillText(RAMP[c], c * cw + cw / 2, l * cw + cw / 2 + cw * 0.04);
      }
    };

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const narrow = w < 700;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cell = narrow ? 7 : Math.max(8, Math.min(11, w / 170));
      cw = Math.max(6, Math.round(cell * dpr));
      cols = Math.ceil((w * dpr) / cw);
      rows = Math.ceil((h * dpr) / cw);
      canvas.width = cols * cw;
      canvas.height = rows * cw;
      const n = cols * rows;
      heat = new Float32Array(n);
      cool = new Float32Array(n);
      seedA = new Float32Array(n);
      terrain = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        cool[i] = 0.9 + hash(i * 7 + 3) * 1.6;
        seedA[i] = hash(i * 13 + 11);
      }
      // Two ridges: a far, faint one and a near, denser one that rises toward the right.
      for (let x = 0; x < cols; x++) {
        const u = x / cols;
        const far =
          rows * (0.62 - 0.12 * Math.sin(u * 2.4 + 0.6)) - rows * 0.16 * (noise1(u * 5, 1) - 0.5) - rows * 0.05 * (noise1(u * 17, 2) - 0.5);
        const near =
          rows * (0.86 - 0.18 * u) - rows * 0.2 * (noise1(u * 3.2 + 4, 3) - 0.5) - rows * 0.05 * (noise1(u * 21, 4) - 0.5);
        for (let y = 0; y < rows; y++) {
          const i = y * cols + x;
          let d = 0;
          if (y >= far) d = Math.max(d, 0.32 * Math.max(0.35, 1 - (y - far) / (rows * 0.5)));
          if (y >= near) d = Math.max(d, 0.75 * Math.max(0.45, 1 - (y - near) / (rows * 0.35)));
          // Ragged edges: drop some cells near each crest.
          const r = seedA[i];
          if (d > 0 && ((y - far < 2 && r < 0.45) || (y - near < 2 && y >= near && r < 0.35))) d *= 0.4;
          terrain[i] = d;
        }
      }
      const bw = Math.round(cols * (narrow ? 0.8 : 0.5));
      bird = { x: Math.round(cols * (narrow ? 0.08 : 0.24)), y: Math.round(rows * (narrow ? 0.12 : 0.06)), w: bw };
      maskCanvas.width = cols;
      maskCanvas.height = rows;
      mask = new Uint8ClampedArray(cols * rows);
      buildAtlas();
    };

    const rasterBird = (t: number) => {
      const s = bird.w / 400;
      const bob = still ? 0 : Math.sin(t * 0.9) * rows * 0.025;
      // Glide most of the time, with a couple of slow wing beats every few seconds.
      const cycle = (t % 5.2) / 5.2;
      const flap = still ? 0 : cycle < 0.38 ? Math.sin((cycle / 0.38) * Math.PI * 2) * 0.22 : 0;
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.clearRect(0, 0, cols, rows);
      mctx.setTransform(s, 0, 0, s, bird.x, bird.y + bob);
      mctx.fillStyle = "rgba(255,255,255,0.55)";
      mctx.save();
      mctx.translate(FAR_SHOULDER[0], FAR_SHOULDER[1]);
      mctx.rotate(flap * 0.7);
      mctx.translate(-FAR_SHOULDER[0], -FAR_SHOULDER[1]);
      mctx.fill(FAR_WING);
      mctx.restore();
      mctx.fillStyle = "#fff";
      mctx.fill(BODY);
      mctx.save();
      mctx.translate(NEAR_SHOULDER[0], NEAR_SHOULDER[1]);
      mctx.rotate(-flap);
      mctx.translate(-NEAR_SHOULDER[0], -NEAR_SHOULDER[1]);
      const g = mctx.createLinearGradient(240, 100, 100, 0);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0.6)");
      mctx.fillStyle = g;
      mctx.fill(NEAR_WING);
      mctx.restore();
      const data = mctx.getImageData(0, 0, cols, rows).data;
      for (let i = 0, j = 3; i < mask.length; i++, j += 4) mask[i] = data[j];
    };

    // Heat a ragged block of cells around (cx, cy), in cells.
    const ignite = (cx: number, cy: number, radius: number, strength: number) => {
      const r = Math.ceil(radius);
      const x0 = Math.max(0, Math.floor(cx - r));
      const x1 = Math.min(cols - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r));
      const y1 = Math.min(rows - 1, Math.ceil(cy + r));
      const jitter = Math.floor(performance.now() / 90);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = y * cols + x;
          const dist = Math.hypot(x - cx, (y - cy) * 1.15) / radius;
          if (dist > 1) continue;
          const filled = terrain[i] > 0 || mask[i] > 20;
          const p = (1 - dist * dist) * (filled ? 0.95 : 0.12) * strength;
          if (hash(i * 31 + jitter) < p) heat[i] = Math.max(heat[i], 0.7 + 0.3 * strength);
        }
      }
    };

    // Pointer tracking, in cells.
    let px = -1;
    let py = -1;
    let lastMove = -1e9;
    let visible = false;
    let sweepStart = -1;

    const toCells = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return [((e.clientX - rect.left) * dpr) / cw, ((e.clientY - rect.top) * dpr) / cw] as const;
    };
    const radius = () => (cols < 110 ? 4.2 : 3.6);
    const onMove = (e: PointerEvent) => {
      const [x, y] = toCells(e);
      if (px >= 0) {
        // Fill in along the path so fast swipes leave a continuous trail.
        const steps = Math.min(40, Math.ceil(Math.hypot(x - px, y - py) / 1.5));
        for (let k = 1; k <= steps; k++) ignite(px + ((x - px) * k) / steps, py + ((y - py) * k) / steps, radius(), 1);
      } else ignite(x, y, radius(), 1);
      px = x;
      py = y;
      lastMove = performance.now();
      wake();
    };
    const onDown = (e: PointerEvent) => {
      const [x, y] = toCells(e);
      ignite(x, y, radius() * 1.8, 1);
      lastMove = performance.now();
      wake();
    };
    const onLeave = () => {
      px = -1;
      py = -1;
    };
    const onSweep = () => {
      sweepStart = performance.now();
      wake();
    };

    // Render loop.
    let raf = 0;
    let lastDraw = 0;
    let lastT = performance.now();
    const t0 = performance.now();

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      if (!still) rasterBird(t);

      // Idle ember: a faint wandering spark when nobody is pointing at the scene.
      if (!still && now - lastMove > 2500) {
        const ex = cols * (0.5 + 0.42 * Math.sin(t * 0.21) * Math.cos(t * 0.13));
        const ey = rows * (0.45 + 0.3 * Math.sin(t * 0.37 + 1));
        ignite(ex, ey, radius() * 0.8, 0.35);
      }
      // Link hover: a heat wave sweeping left to right.
      if (sweepStart > 0) {
        const p = (now - sweepStart) / 1100;
        if (p >= 1) sweepStart = -1;
        else {
          const bx = p * (cols + 12) - 6;
          for (let y = 0; y < rows; y += 1) {
            const x = bx + Math.sin(y * 0.35 + p * 6) * 3;
            if (hash(y * 977 + Math.floor(now / 40)) < 0.3) ignite(x, y, 1.8, 0.8);
          }
        }
      }

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const shimmer = still ? 0 : Math.floor(t * 2);
      let hot = 0;
      for (let y = 0, i = 0; y < rows; y++) {
        const dy = y * cw;
        for (let x = 0; x < cols; x++, i++) {
          const b = mask[i] / 255;
          let d = Math.max(terrain[i], b);
          if (b > 0.05) d = Math.max(d, 0.4 + 0.6 * b * (0.6 + 0.4 * seedA[i]));
          const hv = heat[i];
          if (d < 0.08 && hv < 0.02) continue;
          const r = seedA[i];
          if (d > 0 && r < 0.12 && hv < 0.02) continue; // sparse holes read as texture
          // Glyph pick: band from density, member from a slowly changing per-cell hash.
          const band = BANDS[Math.min(BANDS.length - 1, Math.floor(d * BANDS.length))];
          const turn = hv > 0.05 ? Math.floor(now / 70) : Math.floor(shimmer * (0.3 + r));
          const g = band[0] + Math.floor(hash(i * 17 + turn * 131) * (band[1] - band[0]));
          const dx = x * cw;
          if (hv > 0.02) {
            hot++;
            ctx.globalAlpha = Math.min(1, hv * 1.2);
            ctx.fillStyle = HOT;
            ctx.fillRect(dx, dy, cw, cw);
            ctx.drawImage(atlas, g * cw, LEVELS * cw, cw, cw, dx, dy, cw, cw);
            ctx.globalAlpha = 1;
            heat[i] = Math.max(0, hv - dt * cool[i]);
          }
          if (d >= 0.08 && hv < 0.6) {
            const lvl = Math.min(LEVELS - 1, Math.floor(d * LEVELS * (0.75 + 0.25 * r)));
            ctx.drawImage(atlas, g * cw, lvl * cw, cw, cw, dx, dy, cw, cw);
          }
        }
      }
      return hot;
    };

    const tick = (now: number) => {
      raf = 0;
      if (!visible) return;
      const busy = sweepStart > 0 || now - lastMove < 1200;
      // Cap idle frames at ~30 fps; run every frame while the pointer is active.
      if (busy || now - lastDraw > 32) {
        draw(now);
        lastDraw = now;
      }
      raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!still && visible && !raf) raf = requestAnimationFrame(tick);
      if (still) {
        // Reduced motion: still honour the pointer, but paint only on demand and without trails.
        requestAnimationFrame((n) => draw(n));
      }
    };

    const init = () => {
      layout();
      rasterBird(0);
      draw(performance.now());
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
      },
      { rootMargin: "100px" },
    );
    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(init);
    });

    init();
    document.fonts?.ready.then(() => {
      buildAtlas();
      draw(performance.now());
    });
    io.observe(canvas);
    ro.observe(canvas);
    const link = section.querySelector("a");
    if (!still) {
      section.addEventListener("pointermove", onMove, { passive: true });
      section.addEventListener("pointerdown", onDown, { passive: true });
      section.addEventListener("pointerleave", onLeave);
      link?.addEventListener("pointerenter", onSweep);
      link?.addEventListener("focus", onSweep);
    }

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      io.disconnect();
      ro.disconnect();
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerdown", onDown);
      section.removeEventListener("pointerleave", onLeave);
      link?.removeEventListener("pointerenter", onSweep);
      link?.removeEventListener("focus", onSweep);
    };
  }, []);

  return (
    <section ref={sectionRef} className="obscuron" aria-label="Obscuron X Labs">
      <canvas ref={canvasRef} className="obscuron-stage" aria-hidden />
      <a
        href={URL}
        target="_blank"
        rel="noopener"
        className="obscuron-link"
        aria-label="A Obscuron X Labs Product (opens obscuronxlabs.in in a new tab)"
      >
        <span className="obscuron-sans" aria-hidden>
          A Obscuron X
        </span>
        <span className="obscuron-serif" aria-hidden>
          Labs Product
          <span className="obscuron-dot" />
          <svg className="obscuron-arrow" viewBox="0 0 24 24" aria-hidden>
            <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </span>
      </a>
    </section>
  );
}
