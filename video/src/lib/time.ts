import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import timeline from "../data/timeline.json";

export type Word = { w: string; t: number; d: number };
export type Line = { id: number; scene: string; text: string; start: number; end: number; words: Word[] };
export const TL = timeline as unknown as {
  fps: number;
  total: number;
  lead: number;
  lines: Line[];
  scenes: Record<string, { start: number; end: number; lines: number[] }>;
};

export const SCENE_ORDER = ["hook", "problem", "reveal", "product", "pipeline", "engine", "arch", "results", "close"] as const;
export type SceneName = (typeof SCENE_ORDER)[number];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export const line = (id: number): Line => {
  const l = TL.lines.find((x) => x.id === id);
  if (!l) throw new Error(`no line ${id}`);
  return l;
};
export const L0 = (id: number) => line(id).start;
export const L1 = (id: number) => line(id).end;

/** Start time (s) of the nth occurrence of a word in a line. Falls back to the line start. */
export const W = (id: number, word: string, nth = 0): number => {
  const ws = line(id).words.filter((w) => norm(w.w) === norm(word));
  const hit = ws[nth] ?? ws[ws.length - 1];
  return hit ? hit.t : line(id).start;
};
/** End time of a word. */
export const WE = (id: number, word: string, nth = 0): number => {
  const ws = line(id).words.filter((w) => norm(w.w) === norm(word));
  const hit = ws[nth] ?? ws[ws.length - 1];
  return hit ? hit.t + hit.d : line(id).end;
};

// Scene windows: each scene starts a little before its first line and overlaps the next for cross-fades.
const PRE: Record<SceneName, number> = { hook: 2.4, problem: 0.5, reveal: 0.2, product: 0.6, pipeline: 0.7, engine: 0.6, arch: 0.7, results: 0.6, close: 0.7 };
export const XF = 0.8;
export const sceneWin = (name: SceneName): [number, number] => {
  const i = SCENE_ORDER.indexOf(name);
  const start = Math.max(0, TL.scenes[name].start - PRE[name]);
  const next = SCENE_ORDER[i + 1];
  const end = next ? TL.scenes[next].start - PRE[next] + XF : TL.total;
  return [start, end];
};

export const useT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};

export const EO = Easing.bezier(0.16, 1, 0.3, 1); // expo-ish out
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const EI = Easing.bezier(0.5, 0, 0.75, 0);

/** Clamped interpolation over time. */
export const tw = (t: number, t0: number, t1: number, a = 0, b = 1, ease = EO) =>
  interpolate(t, [t0, t1], [a, b], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** Fade window: 0 → 1 over [a, a+fi], 1 → 0 over [b-fo, b]. */
export const win = (t: number, a: number, b: number, fi = 0.5, fo = 0.5) =>
  Math.min(tw(t, a, a + fi, 0, 1, EIO), tw(t, b - fo, b, 1, 0, EIO));

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Deterministic PRNG. */
export const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};
