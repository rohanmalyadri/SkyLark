import React from "react";
import { C } from "../lib/theme";
import { EIO, EO, rng, tw } from "../lib/time";
import { LOGO_VIEWBOX, MARK_POLYS, WORDMARK_D, WORDMARK_TRANSFORM } from "../data/wordmark";

// The official logo: three ember polygons (the mark) and the paper-white wordmark, used verbatim.
// Its proportions are never changed; only each part's entrance is animated.
const VB = LOGO_VIEWBOX.split(" ").map(Number);
const [VX, VY, VW, VH] = VB;
const ASPECT = VH / VW;

const polyPts = MARK_POLYS.map((p) => p.split(" ").map((xy) => xy.split(",").map(Number) as [number, number]));
const centroid = (pts: [number, number][]) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
const perim = (pts: [number, number][]) => pts.reduce((a, p, i) => a + Math.hypot(p[0] - pts[(i + 1) % pts.length][0], p[1] - pts[(i + 1) % pts.length][1]), 0);

// Where each shard comes from (in logo units, plus 3D rotation) before it settles.
const FROM = [
  { x: -260, y: -140, z: -900, rx: 50, ry: -70, rz: -30 },
  { x: -120, y: 260, z: -700, rx: -60, ry: 40, rz: 25 },
  { x: 240, y: -220, z: -1100, rx: 35, ry: 80, rz: 40 },
];

const DUST = (() => {
  const r = rng(42);
  return Array.from({ length: 140 }, () => {
    const poly = Math.floor(r() * 3);
    const pts = polyPts[poly];
    // random point inside the polygon (fan triangulation)
    const k = 1 + Math.floor(r() * (pts.length - 2));
    let a = r(), b = r();
    if (a + b > 1) { a = 1 - a; b = 1 - b; }
    const p0 = pts[0], p1 = pts[k], p2 = pts[k + 1];
    const tx = p0[0] + a * (p1[0] - p0[0]) + b * (p2[0] - p0[0]);
    const ty = p0[1] + a * (p1[1] - p0[1]) + b * (p2[1] - p0[1]);
    const ang = r() * Math.PI * 2, rad = 260 + r() * 520;
    return { tx, ty, sx: tx + Math.cos(ang) * rad, sy: ty + Math.sin(ang) * rad * 0.6, delay: r() * 0.7, size: 1.2 + r() * 2.6 };
  });
})();

export const Logo: React.FC<{
  t: number; // seconds since the reveal began (large value = fully settled)
  width: number;
  showWord?: boolean;
  reflection?: boolean;
  speed?: number;
}> = ({ t: t0, width, showWord = true, reflection = true, speed = 1 }) => {
  const t = t0 * speed;
  const h = width * ASPECT;
  const s = width / VW;
  const markLayer = (reflect: boolean) =>
    polyPts.map((pts, i) => {
      const st = i * 0.16;
      const p = tw(t, st, st + 1.35, 0, 1, EO);
      const fill = tw(t, 0.95 + i * 0.12, 1.7 + i * 0.12, 0, 1, EIO);
      const f = FROM[i];
      const [cx, cy] = centroid(pts);
      const len = perim(pts);
      const draw = tw(t, st, st + 1.1, 0, 1, EIO);
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: `${(cx - VX) * s}px ${(cy - VY) * s}px`,
            transform: `translate3d(${f.x * (1 - p) * s * 3}px, ${f.y * (1 - p) * s * 3}px, ${f.z * (1 - p)}px) rotateX(${f.rx * (1 - p)}deg) rotateY(${f.ry * (1 - p)}deg) rotateZ(${f.rz * (1 - p)}deg)`,
            opacity: tw(t, st, st + 0.4),
          }}
        >
          <svg viewBox={LOGO_VIEWBOX} width={width} height={h} style={{ position: "absolute", overflow: "visible" }}>
            <defs>
              <linearGradient id={`g${i}${reflect ? "r" : ""}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={C.emberHi} />
                <stop offset="0.55" stopColor={C.ember} />
                <stop offset="1" stopColor={C.emberDeep} />
              </linearGradient>
            </defs>
            <polygon points={MARK_POLYS[i]} fill={`url(#g${i}${reflect ? "r" : ""})`} opacity={fill} />
            <polygon
              points={MARK_POLYS[i]}
              fill="none"
              stroke={C.emberHi}
              strokeWidth={1.6 / Math.max(0.3, s)}
              strokeLinejoin="round"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - draw)}
              opacity={1 - fill * 0.9}
            />
          </svg>
        </div>
      );
    });

  // Light sweep across the settled mark.
  const sweep = tw(t, 1.75, 2.75, -0.3, 1.3, EIO);
  const wordP = tw(t, 1.9, 3.0, 0, 1, EIO);
  const word = (reflect: boolean) =>
    showWord && (
      <svg
        viewBox={LOGO_VIEWBOX}
        width={width}
        height={h}
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(-10% ${(1 - wordP) * 62}% -10% 38%)`,
          opacity: tw(t, 1.9, 2.4),
          filter: wordP < 1 ? `blur(${(1 - wordP) * 5}px)` : undefined,
        }}
      >
        <path fill={C.paper} fillRule="evenodd" transform={WORDMARK_TRANSFORM} d={WORDMARK_D} />
        {!reflect && (
          <>
            <defs>
              <linearGradient id="wsweep" x1="0" y1="0" x2="1" y2="0.2">
                <stop offset={Math.max(0, sweep - 0.12)} stopColor="#fff" stopOpacity="0" />
                <stop offset={Math.max(0, Math.min(1, sweep))} stopColor="#fff" stopOpacity="0.85" />
                <stop offset={Math.min(1, sweep + 0.12)} stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </>
        )}
      </svg>
    );

  const dust = DUST.map((d, i) => {
    const p = tw(t, 0.15 + d.delay, 1.25 + d.delay, 0, 1, EIO);
    const o = Math.min(tw(t, 0.15 + d.delay, 0.4 + d.delay), 1 - p);
    if (o <= 0.01) return null;
    const x = (d.sx + (d.tx - d.sx) * p - VX) * s;
    const y = (d.sy + (d.ty - d.sy) * p - VY) * s;
    return <div key={i} style={{ position: "absolute", left: x, top: y, width: d.size, height: d.size, borderRadius: 9, background: C.emberHi, opacity: o * 0.9, boxShadow: `0 0 6px ${C.ember}` }} />;
  });

  const markOnly = (
    <svg viewBox={LOGO_VIEWBOX} width={width} height={h} style={{ position: "absolute", inset: 0, mixBlendMode: "screen", opacity: sweep > -0.2 && sweep < 1.25 ? 1 : 0 }}>
      <defs>
        <linearGradient id="msweep" x1="0" y1="0" x2="1" y2="0.35">
          <stop offset={Math.max(0, sweep - 0.14)} stopColor="#fff" stopOpacity="0" />
          <stop offset={Math.max(0, Math.min(1, sweep))} stopColor="#FFE3D6" stopOpacity="0.75" />
          <stop offset={Math.min(1, sweep + 0.14)} stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {MARK_POLYS.map((p, i) => (
        <polygon key={i} points={p} fill="url(#msweep)" />
      ))}
      {showWord && <path fill="url(#msweep)" fillRule="evenodd" transform={WORDMARK_TRANSFORM} d={WORDMARK_D} opacity={wordP} />}
    </svg>
  );

  return (
    <div style={{ position: "relative", width, height: h, perspective: 1400 }}>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>{markLayer(false)}</div>
      {word(false)}
      {markOnly}
      {dust}
      {reflection && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: h * 1.02,
            width,
            height: h,
            scale: "1 -1",
            opacity: 0.1 * tw(t, 1.6, 2.6),
            maskImage: "linear-gradient(to top, black 0%, transparent 55%)",
            WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 55%)",
            filter: "blur(2px)",
          }}
        >
          <div style={{ position: "absolute", inset: 0 }}>{markLayer(true)}</div>
          {word(true)}
        </div>
      )}
    </div>
  );
};

export const LOGO_ASPECT = ASPECT;
