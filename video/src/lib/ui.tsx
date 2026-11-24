import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C, F } from "./theme";
import { EIO, EO, tw } from "./time";

/** Near-black stage with soft atmospheric light pools. */
export const Backdrop: React.FC<{ glows?: { x: number; y: number; r: number; c: string; a: number }[]; base?: string }> = ({
  glows = [],
  base = C.ink,
}) => (
  <AbsoluteFill
    style={{
      background: [
        ...glows.map((g) => `radial-gradient(${g.r}px ${g.r * 0.8}px at ${g.x}px ${g.y}px, ${hexA(g.c, g.a)}, transparent 70%)`),
        base,
      ].join(","),
    }}
  />
);

export const hexA = (hex: string, a: number) => {
  if (hex.startsWith("rgba")) return hex;
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Fine technical grid, optionally in perspective. */
export const Grid: React.FC<{ opacity?: number; size?: number; style?: React.CSSProperties }> = ({ opacity = 0.5, size = 64, style }) => (
  <AbsoluteFill
    style={{
      opacity,
      backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
      backgroundSize: `${size}px ${size}px`,
      maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 75%)",
      WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 75%)",
      ...style,
    }}
  />
);

/** Film grain + vignette, applied over everything. */
export const FilmFinish: React.FC = () => {
  const f = useCurrentFrame();
  const k = f % 4;
  const ox = ((f * 137) % 512) - 256;
  const oy = ((f * 263) % 512) - 256;
  return (
    <>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 85% 80% at 50% 48%, transparent 55%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile(`fx/grain${k}.png`)})`,
          backgroundPosition: `${ox}px ${oy}px`,
          backgroundSize: "512px 512px",
          opacity: 0.055,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
    </>
  );
};

/** Small uppercase technical label. */
export const Eyebrow: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties; size?: number }> = ({
  children,
  color = C.dim,
  style,
  size = 15,
}) => (
  <div style={{ fontFamily: F.mono, fontSize: size, letterSpacing: "0.18em", textTransform: "uppercase", color, fontWeight: 500, ...style }}>
    {children}
  </div>
);

/** Text that rises out of a mask. p: 0..1 progress, out: 0..1 exit progress. */
export const Rise: React.FC<{
  p: number;
  out?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  dist?: number;
}> = ({ p, out = 0, children, style, dist = 1.1 }) => (
  <div style={{ overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em", ...style }}>
    <div
      style={{
        translate: `0 ${(1 - p) * dist * 100 + -out * dist * 100}%`,
        opacity: Math.min(1, p * 1.5) * (1 - out * 0.6),
        filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined,
      }}
    >
      {children}
    </div>
  </div>
);

/** Per-character reveal for display lines. */
export const CharReveal: React.FC<{ text: string; t: number; t0: number; dur?: number; stagger?: number; style?: React.CSSProperties }> = ({
  text,
  t,
  t0,
  dur = 0.7,
  stagger = 0.022,
  style,
}) => (
  <span style={{ display: "inline-block", whiteSpace: "pre", ...style }}>
    {text.split("").map((ch, i) => {
      const p = tw(t, t0 + i * stagger, t0 + i * stagger + dur, 0, 1, EO);
      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            opacity: p,
            translate: `0 ${(1 - p) * 0.45}em`,
            filter: p < 1 ? `blur(${(1 - p) * 8}px)` : undefined,
          }}
        >
          {ch}
        </span>
      );
    })}
  </span>
);

/** A real product screenshot as a floating panel. Children are positioned in capture CSS pixels. */
export const Screen: React.FC<{
  src: string;
  width: number; // display width in px
  capW?: number; // capture width in CSS px
  aspect?: number; // h / w of the visible window
  scrollY?: number; // capture CSS px scrolled
  imgH?: number; // full capture height in CSS px (for tall pages)
  style?: React.CSSProperties;
  children?: React.ReactNode;
  radius?: number;
  sheen?: number;
}> = ({ src, width, capW = 1600, aspect = 0.625, scrollY = 0, imgH, style, children, radius = 16, sheen = 0 }) => {
  const s = width / capW;
  const h = width * aspect;
  return (
    <div
      style={{
        position: "absolute",
        width,
        height: h,
        borderRadius: radius,
        overflow: "hidden",
        background: "#fff",
        boxShadow: `0 1px 0 rgba(255,255,255,0.15) inset, 0 0 0 1px rgba(244,241,236,0.10), 0 40px 80px rgba(0,0,0,0.55), 0 120px 200px rgba(0,0,0,0.45)`,
        ...style,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: -scrollY * s, width, height: (imgH ?? capW * aspect) * s }}>
        <Img src={staticFile(`shots/${src}`)} style={{ width: "100%", height: "100%", display: "block" }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: capW, height: imgH ?? capW * aspect, scale: `${s}`, transformOrigin: "0 0" }}>
          {children}
        </div>
      </div>
      {sheen > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(115deg, transparent ${sheen * 140 - 40}%, rgba(255,255,255,0.22) ${sheen * 140 - 25}%, transparent ${sheen * 140 - 10}%)`,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

/** Spotlight a rectangle of a Screen (capture CSS px); everything else dims. */
export const Spot: React.FC<{ x: number; y: number; w: number; h: number; a: number; dim?: number; color?: string; r?: number }> = ({
  x,
  y,
  w,
  h,
  a,
  dim = 0.5,
  color = C.ember,
  r = 10,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: r,
      boxShadow: `0 0 0 3px ${hexA(color, 0.9 * a)}, 0 0 40px ${hexA(color, 0.35 * a)}, 0 0 0 6000px rgba(10,10,12,${dim * a})`,
    }}
  />
);

/** Pointer with click ripple. x, y in the coordinate space of its parent. */
export const Cursor: React.FC<{ x: number; y: number; click?: number; opacity?: number; scale?: number }> = ({ x, y, click = -1, opacity = 1, scale = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, opacity, scale: `${scale}`, transformOrigin: "0 0" }}>
    {click >= 0 && click <= 1 && (
      <div
        style={{
          position: "absolute",
          left: -40,
          top: -40,
          width: 80,
          height: 80,
          borderRadius: 999,
          border: `3px solid ${hexA(C.ember, 1 - click)}`,
          scale: `${0.2 + click * 1.1}`,
        }}
      />
    )}
    <svg width="34" height="40" viewBox="0 0 34 40" style={{ position: "absolute", left: -4, top: -3, filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))", scale: click >= 0 && click < 0.25 ? "0.9" : "1" }}>
      <path d="M4 3 L4 31 L11.5 24.5 L16.5 36 L21.5 33.8 L16.6 22.6 L26.5 22.6 Z" fill="#111" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  </div>
);

/** Thin connector line with a dot, for callouts. */
export const Callout: React.FC<{ x: number; y: number; dx: number; dy: number; p: number; label: React.ReactNode; color?: string; align?: "left" | "right" }> = ({
  x,
  y,
  dx,
  dy,
  p,
  label,
  color = C.ember,
  align = "left",
}) => {
  const len = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, p * 3) }}>
      <div style={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, borderRadius: 99, background: color, boxShadow: `0 0 18px ${color}` }} />
      <div style={{ position: "absolute", left: 0, top: -1, width: len * tw(p, 0, 0.5, 0, 1, EIO), height: 2, background: color, rotate: `${ang}deg`, transformOrigin: "0 50%" }} />
      <div
        style={{
          position: "absolute",
          left: dx + (align === "left" ? 14 : -14),
          top: dy - 22,
          translate: align === "right" ? "-100% 0" : undefined,
          opacity: tw(p, 0.35, 0.8),
          whiteSpace: "nowrap",
          fontFamily: F.display,
          fontSize: 30,
          fontWeight: 500,
          color: C.paper,
          background: "rgba(14,14,16,0.82)",
          border: `1px solid ${C.line2}`,
          padding: "8px 16px",
          borderRadius: 10,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Caption: React.FC<{ children: React.ReactNode; opacity: number }> = ({ children, opacity }) => (
  <div style={{ position: "absolute", left: 72, bottom: 54, opacity }}>
    <Eyebrow size={14} color={C.faint}>
      {children}
    </Eyebrow>
  </div>
);

export const easeOut = EO;
export const easeInOut = EIO;
