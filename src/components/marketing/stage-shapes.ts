/*
 * The red shapes behind the "How it works" stages: a port of the reference's scroll-driven SVG
 * system (its contentscrollcenter project). Shapes are paths of named cubic-Bézier points with
 * keyframe states; "mappers" paint those states, plus per-shape translations, rotations,
 * scalings and visibility, from a 0..1 progress. Four animations (one per stage) build in and
 * out across the section's scroll. svg.js is replaced by plain SVG elements; every coordinate,
 * range and sequence is the reference's.
 */

const SVG_NS = "http://www.w3.org/2000/svg";
type Vec = [number, number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpArray = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

function group(parent: Element) {
  const g = document.createElementNS(SVG_NS, "g");
  parent.appendChild(g);
  return g;
}
const show = (el: Element) => el.removeAttribute("display");
const hide = (el: Element) => el.setAttribute("display", "none");

/* ---------- A point with keyframe states (p = anchor, c1/c2 = control points) ---------- */

interface PointState {
  p: Vec;
  c1: Vec;
  c2: Vec;
}

class Point {
  states: Record<string, PointState> = {};
  current: PointState = { p: [0, 0], c1: [0, 0], c2: [0, 0] };
  addState(id: string, s: PointState) {
    this.states[id] = s;
  }
  setCurrentState(id: string) {
    const s = this.states[id]!;
    this.current = { p: s.p, c1: s.c1, c2: s.c2 };
  }
  lerpStates(from: string, to: string, t: number) {
    const a = this.states[from]!;
    const b = this.states[to]!;
    this.current = { p: lerpArray(a.p, b.p, t), c1: lerpArray(a.c1, b.c1, t), c2: lerpArray(a.c2, b.c2, t) };
  }
}

/* ---------- A path: translate > rotate > scale groups around one <path> ---------- */

class Transition {
  constructor(
    readonly path: Shape,
    readonly fromId: string,
    readonly toId: string,
    readonly points?: string[],
  ) {}
  paintProgress(t: number) {
    for (const id of this.points ?? this.path.order) this.path.points[id]!.lerpStates(this.fromId, this.toId, t);
    this.path.plot();
  }
}

class Shape {
  points: Record<string, Point> = {};
  order: string[] = [];
  transitions: Record<string, Transition> = {};
  translate_g: SVGGElement;
  rotate_g: SVGGElement;
  scale_g: SVGGElement;
  pathEl: SVGPathElement;

  constructor(parent: Element, color: string) {
    this.translate_g = group(parent);
    this.rotate_g = group(this.translate_g);
    this.scale_g = group(this.rotate_g);
    this.pathEl = document.createElementNS(SVG_NS, "path");
    this.pathEl.setAttribute("fill", color);
    this.scale_g.appendChild(this.pathEl);
  }

  /** "rc" mode: control points are offsets from the anchor. */
  addPointState(id: string, state: string, p: Vec, c1: Vec = [0, 0], c2: Vec = [0, 0]) {
    if (!this.points[id]) {
      this.points[id] = new Point();
      this.order.push(id);
    }
    this.points[id]!.addState(state, { p, c1: [p[0] + c1[0], p[1] + c1[1]], c2: [p[0] + c2[0], p[1] + c2[1]] });
  }
  addTransition(id: string, fromId: string, toId: string, points?: string[]) {
    this.transitions[id] = new Transition(this, fromId, toId, points);
  }
  paintTransitionProgress(id: string, t: number) {
    this.transitions[id]!.paintProgress(t);
  }
  paintState(id: string) {
    for (const k of this.order) this.points[k]!.setCurrentState(id);
    this.plot();
  }
  translate(v: Vec) {
    this.translate_g.setAttribute("transform", `translate(${v[0]}, ${v[1]})`);
  }
  rotate(deg: number) {
    this.rotate_g.setAttribute("transform", `rotate(${deg})`);
  }
  scale(v: Vec) {
    this.scale_g.setAttribute("transform", `scale(${v[0]}, ${v[1]})`);
  }
  show() {
    show(this.translate_g);
  }
  hide() {
    hide(this.translate_g);
  }
  plot() {
    const pts = this.order.map((k) => this.points[k]!.current);
    const d = [`M${pts[0]!.p[0]},${pts[0]!.p[1]}`];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      d.push(`C${a.c2[0]},${a.c2[1]} ${b.c1[0]},${b.c1[1]} ${b.p[0]},${b.p[1]}`);
    }
    this.pathEl.setAttribute("d", d.join(" "));
  }
}

/* ---------- Mapper: progress → states, transitions and transforms (reference semantics) ---------- */

interface Ranged {
  start: number;
  end: number;
  shapes: Shape[];
}
class Mapper {
  // Keyed exactly as the reference keys them, so a later entry with the same id replaces an earlier one.
  private transitions: Record<string, Ranged> = {};
  private states: Record<string, Ranged> = {};
  private translations: Record<string, Ranged & { from: Vec; to: Vec }> = {};
  private rotations: Record<string, Ranged & { from: number; to: number }> = {};
  private visibilities: Record<string, Ranged & { visible: boolean }> = {};
  private scalations: Record<string, Ranged & { from: Vec; to: Vec }> = {};

  addPointTransition(id: string, range: Vec, shapes: Shape[]) {
    this.transitions[id] = { start: range[0], end: range[1], shapes };
  }
  addPointState(id: string, range: Vec, shapes: Shape[]) {
    this.states[id] = { start: range[0], end: range[1], shapes };
  }
  addTranslation(from: Vec, to: Vec, range: Vec, shapes: Shape[]) {
    this.translations[`${from}__${to}`] = { from, to, start: range[0], end: range[1], shapes };
  }
  addRotation(from: number, to: number, range: Vec, shapes: Shape[]) {
    this.rotations[`${from}__${to}`] = { from, to, start: range[0], end: range[1], shapes };
  }
  addVisibility(visible: boolean, range: Vec, shapes: Shape[]) {
    this.visibilities[`${visible}__${range[0]}__${range[1]}`] = { visible, start: range[0], end: range[1], shapes };
  }
  addScalation(from: Vec, to: Vec, range: Vec, shapes: Shape[]) {
    this.scalations[`${from}__${to}`] = { from, to, start: range[0], end: range[1], shapes };
  }

  paintProgress(t: number) {
    const local = (r: Ranged) => (t >= r.start && t < r.end ? (t - r.start) / (r.end - r.start) : null);
    for (const [id, r] of Object.entries(this.transitions)) {
      const n = local(r);
      if (n !== null) r.shapes.forEach((s) => s.paintTransitionProgress(id, n));
    }
    for (const [id, r] of Object.entries(this.states)) if (t >= r.start && t < r.end) r.shapes.forEach((s) => s.paintState(id));
    for (const r of Object.values(this.translations)) {
      const n = local(r);
      if (n !== null) r.shapes.forEach((s) => s.translate(lerpArray(r.from, r.to, n)));
    }
    for (const r of Object.values(this.rotations)) {
      const n = local(r);
      if (n !== null) r.shapes.forEach((s) => s.rotate(lerp(r.from, r.to, n)));
    }
    for (const r of Object.values(this.visibilities)) if (t >= r.start && t < r.end) r.shapes.forEach((s) => (r.visible ? s.show() : s.hide()));
    for (const r of Object.values(this.scalations)) {
      const n = local(r);
      if (n !== null) r.shapes.forEach((s) => s.scale(lerpArray(r.from, r.to, n)));
    }
  }
}

/* ---------- The four animations ---------- */

abstract class Anim {
  cont: SVGGElement;
  rotate_g: SVGGElement;
  abstract mapperIn: Mapper;
  abstract mapperOut: Mapper;
  constructor(parent: Element) {
    this.cont = group(parent);
    this.rotate_g = group(this.cont);
    hide(this.cont);
  }
  paintProgress_IN(t: number) {
    this.mapperIn.paintProgress(t);
  }
  paintProgress_OUT(t: number) {
    this.mapperOut.paintProgress(t);
  }
  show() {
    show(this.cont);
  }
  hide() {
    hide(this.cont);
  }
}

/** Anim01: two bands fold out into stepped parallelograms. */
class Anim01 extends Anim {
  mapperIn = new Mapper();
  mapperOut = new Mapper();
  constructor(parent: Element, color: string) {
    super(parent);
    const shape1 = new Shape(this.rotate_g, color);
    const shape2 = new Shape(this.rotate_g, color);
    shape2.rotate(180);
    for (const s of [shape1, shape2]) {
      Anim01.addData(s);
      s.paintState("s0");
    }
    const both = [shape1, shape2];
    this.mapperIn.addPointState("s0", [0, 0.001], both);
    this.mapperIn.addPointTransition("s0_to_s1", [0.001, 0.34], both);
    this.mapperIn.addPointTransition("s1_to_s2", [0.34, 0.67], both);
    this.mapperIn.addPointState("s2", [0.67, 0.68], both);
    this.mapperIn.addPointTransition("s2_to_s3", [0.68, 0.999], both);
    this.mapperIn.addPointState("s3", [0.999, 1.001], both);
    this.mapperOut.addPointState("s3", [0, 0.001], both);
    this.mapperOut.addPointTransition("s3_to_s4", [0.001, 0.2], both);
    this.mapperOut.addPointTransition("s4_to_s5", [0.2, 0.6], both);
    this.mapperOut.addPointTransition("s5_to_s0", [0.6, 0.999], both);
    this.mapperOut.addPointState("s0", [0.999, 1.001], both);
  }
  static addData(t: Shape) {
    const e = 65;
    const i = 65;
    const o = 335;
    const set = (s: string, pts: Record<string, Vec>) => Object.entries(pts).forEach(([k, v]) => t.addPointState(k, s, v));
    set("s0", { p0: [-e, -e], p1: [e, -e], p1b: [e, -e], p2: [e, e], p3: [-e, e], p3b: [-e, e], p0z: [-e, -e] });
    set("s1", { p0: [-65, 0], p1: [65, 0], p1b: [65, 0], p2: [65, 130], p3: [-65, 130], p3b: [-65, 130], p0z: [-65, 0] });
    set("s2", { p0: [-335, 0], p1: [0, 0], p1b: [0, 0], p2: [0, 130], p3: [-335, 130], p3b: [-335, 130], p0z: [-335, 0] });
    set("s3", { p0: [-335, 0], p1: [0, 0], p1b: [o, 130], p2: [o, 260], p3: [0, 260], p3b: [-335, 130], p0z: [-335, 0] });
    set("s4", { p0: [0, 130], p1: [o, 130], p1b: [o, 130], p2: [o, 260], p3: [0, 260], p3b: [0, 260], p0z: [0, 0] });
    set("s5", { p0: [0, -65], p1: [o, -65], p1b: [o, -65], p2: [o, i], p3: [0, i], p3b: [0, i], p0z: [0, 0] });
    for (const [a, b] of [["s0", "s1"], ["s1", "s2"], ["s2", "s3"], ["s3", "s4"], ["s4", "s5"], ["s5", "s0"]] as const) t.addTransition(`${a}_to_${b}`, a, b);
  }
}

/** Anim02: four quads spread to the corners and twist into a pinwheel. */
class Anim02 extends Anim {
  mapperIn = new Mapper();
  mapperOut = new Mapper();
  constructor(parent: Element, color: string) {
    super(parent);
    const TL = new Shape(this.rotate_g, color);
    const TR = new Shape(this.rotate_g, color);
    const BR = new Shape(this.rotate_g, color);
    const BL = new Shape(this.rotate_g, color);
    const n = [TL, TR, BR, BL];
    for (const s of n) {
      Anim02.addData(s);
      s.paintState("s0");
    }
    const o = 32.5;
    const r = 145;
    const s = 72.5;
    const a = 32.5;
    const m = this.mapperIn;
    m.addPointState("s0", [0, 0.001], n);
    m.addTranslation([-o, -o], [-o, -o], [0, 0.001], [TL]);
    m.addTranslation([o, -o], [o, -o], [0, 0.001], [TR]);
    m.addTranslation([o, o], [o, o], [0, 0.001], [BR]);
    m.addTranslation([-o, o], [-o, o], [0, 0.001], [BL]);
    m.addPointTransition("s0_to_s1", [0.001, 0.5], n);
    m.addTranslation([-o, -o], [-145, -145], [0.001, 0.5], [TL]);
    m.addTranslation([o, -o], [r, -145], [0.001, 0.5], [TR]);
    m.addTranslation([o, o], [r, r], [0.001, 0.5], [BR]);
    m.addTranslation([-o, o], [-145, r], [0.001, 0.5], [BL]);
    m.addTranslation([-145, -145], [-145, -145], [0.5, 1.001], [TL]);
    m.addTranslation([r, -145], [r, -145], [0.5, 1.001], [TR]);
    m.addTranslation([r, r], [r, r], [0.5, 1.001], [BR]);
    m.addTranslation([-145, r], [-145, r], [0.5, 1.001], [BL]);
    m.addPointTransition("s1_to_s2", [0.5, 0.999], n);
    m.addPointState("s2", [0.999, 1.001], n);
    const q = this.mapperOut;
    q.addPointState("s2", [0, 0.001], n);
    q.addPointTransition("s2_to_s0", [0.001, 0.5], n);
    q.addTranslation([-145, -145], [-72.5, -72.5], [0.001, 0.5], [TL]);
    q.addTranslation([r, -145], [a, -32.5], [0.001, 0.5], [TR]);
    q.addTranslation([r, r], [s, s], [0.001, 0.5], [BR]);
    q.addTranslation([-145, r], [-32.5, a], [0.001, 0.5], [BL]);
    q.addTranslation([-72.5, -72.5], [-o, -o], [0.5, 1], [TL]);
    q.addTranslation([a, -32.5], [o, -o], [0.5, 1], [TR]);
    q.addTranslation([s, s], [o, o], [0.5, 1], [BR]);
    q.addTranslation([-32.5, a], [-o, o], [0.5, 1], [BL]);
    q.addPointState("s0", [0.5, 1.001], n);
  }
  static addData(t: Shape) {
    const set = (s: string, pts: Record<string, Vec>) => Object.entries(pts).forEach(([k, v]) => t.addPointState(k, s, v));
    let e = 32.5;
    set("s0", { p0: [-e, -e], p1: [e, -e], p2: [e, e], p2b: [e, e], p3: [-e, e], p0b: [-e, -e] });
    e = 65;
    set("s0b", { p0: [-e, -e], p1: [e, -e], p2: [e, e], p2b: [e, e], p3: [-e, e], p0b: [-e, -e] });
    e = 72.5;
    set("s1", { p0: [-e, -e], p1: [e, -e], p2: [e, e], p2b: [e, e], p3: [-e, e], p0b: [-e, -e] });
    set("s2", { p0: [0, 2 * -e], p1: [2 * e, 2 * -e], p2: [2 * e, 0], p2b: [0, 2 * e], p3: [2 * -e, 2 * e], p0b: [2 * -e, 0] });
    for (const [a, b] of [["s0", "s1"], ["s0", "s2"], ["s1", "s2"], ["s2", "s0"], ["s2", "s0b"]] as const) t.addTransition(`${a}_to_${b}`, a, b);
  }
}

/** Anim03: a square rounds into a disc, splits into halves that turn and stack, then grow. */
class Anim03 extends Anim {
  mapperIn = new Mapper();
  mapperOut = new Mapper();
  constructor(parent: Element, color: string) {
    super(parent);
    const cuad = new Shape(this.rotate_g, color);
    Anim03.addDataOriginalCuad(cuad);
    cuad.paintState("s0");
    const top = new Shape(this.rotate_g, color);
    Anim03.addDataSlice5(top);
    top.paintState("s0");
    top.hide();
    const bottom = new Shape(this.rotate_g, color);
    Anim03.addDataSlice5(bottom);
    bottom.paintState("s0");
    bottom.rotate(180);
    bottom.hide();
    const o = [top, bottom];
    const m = this.mapperIn;
    m.addVisibility(true, [0, 0.35], [cuad]);
    m.addVisibility(false, [0, 0.35], o);
    m.addPointState("s0", [0, 0.001], [cuad]);
    m.addRotation(180, 180, [0.001, 0.35], [bottom]);
    m.addPointTransition("s0_to_s1", [0.001, 0.35], [cuad]);
    m.addVisibility(false, [0.35, 1.001], [cuad]);
    m.addVisibility(true, [0.35, 1.001], o);
    m.addPointState("s0", [0, 0.001], o);
    m.addTranslation([0, 0], [0, 0], [0.35, 0.75], [top]);
    m.addTranslation([0, 0], [0, 290], [0.35, 0.75], [bottom]);
    m.addTranslation([0, 0], [0, 0], [0.75, 1.001], [top]);
    m.addTranslation([0, 290], [0, 290], [0.75, 1.001], [bottom]);
    m.addRotation(180, -0, [0.35, 0.75], [bottom]);
    m.addRotation(-0, -0, [0.75, 1.001], [bottom]);
    m.addScalation([1, 1], [3.19, 3.19], [0.75, 1.001], o);
    const q = this.mapperOut;
    q.addTranslation([0, 0], [0, 0], [0, 0.7], [top]);
    q.addTranslation([0, 290], [0, 0], [0, 0.7], [bottom]);
    q.addRotation(-0, 180, [0, 0.7], [bottom]);
    q.addScalation([3.19, 3.19], [1, 1], [0, 0.7], o);
    q.addTranslation([0, 0], [0, 0], [0.7, 1.001], [top]);
    q.addTranslation([0, 0], [0, 0], [0.7, 1.001], [bottom]);
    q.addRotation(-180, -180, [0.7, 1.001], [bottom]);
    q.addScalation([1, 1], [1, 1], [0.7, 1.001], o);
    q.addVisibility(false, [0, 0.7], [cuad]);
    q.addVisibility(true, [0, 0.7], o);
    q.addVisibility(true, [0.7, 1.001], [cuad]);
    q.addVisibility(false, [0.7, 1.001], o);
    q.addPointTransition("s1_to_s0", [0.7, 1.001], [cuad]);
  }
  static addDataSlice5(t: Shape) {
    const e = 1.35;
    t.addPointState("p0", "s0", [-91.125, 0], [0, 0], [0, -14.41 * e]);
    t.addPointState("p1", "s0", [-73.791, -39.71 * e], [-11.394, 11.56 * e], [11.394, -11.56 * e]);
    t.addPointState("p2", "s0", [-20.87 * e, -86.697], [-18.36, 6.021], [18.36, -6.021]);
    t.addPointState("p3", "s0", [20.87 * e, -86.697], [-18.36, -6.021], [18.36, 6.021]);
    t.addPointState("p4", "s0", [73.791, -39.71 * e], [-11.394, -11.56 * e], [11.394, 11.56 * e]);
    t.addPointState("p5", "s0", [91.125, 0], [0, -14.41 * e], [0, 0]);
    t.addPointState("p5z", "s0", [-91.125, 0], [0, 0], [0, 0]);
  }
  static addDataOriginalCuad(t: Shape) {
    const e = 65;
    t.addPointState("p0", "s0", [-e, -e]);
    t.addPointState("p1", "s0", [e, -e]);
    t.addPointState("p2", "s0", [e, e]);
    t.addPointState("p3", "s0", [-e, e]);
    t.addPointState("p3z", "s0", [-e, -e]);
    const i = 0.552284749831 * e;
    t.addPointState("p0", "s1", [-e, -e], [0, 0], [i, -i]);
    t.addPointState("p1", "s1", [e, -e], [-i, -i], [i, i]);
    t.addPointState("p2", "s1", [e, e], [i, -i], [-i, i]);
    t.addPointState("p3", "s1", [-e, e], [i, i], [-i, -i]);
    t.addPointState("p3z", "s1", [-e, -e], [-i, i], [0, 0]);
    t.addTransition("s0_to_s1", "s0", "s1");
    t.addTransition("s1_to_s0", "s1", "s0");
  }
}

/** Anim04: two plates; the lower drops away while both rise into peaked roofs. */
class Anim04 extends Anim {
  mapperIn = new Mapper();
  mapperOut = new Mapper();
  constructor(parent: Element, color: string) {
    super(parent);
    const cuad = new Shape(this.rotate_g, color);
    Anim04.addDataOriginalCuad(cuad);
    cuad.paintState("s0");
    const T = new Shape(this.rotate_g, color);
    Anim04.addData(T);
    T.paintState("s0");
    T.hide();
    const B = new Shape(this.rotate_g, color);
    Anim04.addData(B);
    B.paintState("s0");
    B.hide();
    const o = [T, B];
    const m = this.mapperIn;
    m.addPointState("s0", [0, 0.5], o);
    m.addVisibility(false, [0, 1], [cuad]);
    m.addVisibility(true, [0, 1], o);
    m.addTranslation([0, 65], [0, 290], [0, 0.5], [B]);
    m.addTranslation([0, 290], [0, 290], [0.5, 1.001], [B]);
    m.addPointTransition("s0_to_s2", [0.5, 1.001], o);
    const q = this.mapperOut;
    q.addPointTransition("s2_to_s0", [0, 1.001], o);
    q.addTranslation([0, 290], [0, 65], [0, 1.001], [B]);
  }
  static addData(t: Shape) {
    const set = (s: string, pts: Record<string, Vec>) => Object.entries(pts).forEach(([k, v]) => t.addPointState(k, s, v));
    const e = 65;
    set("s0", { p0: [-65, -65], p0b: [0, -65], p1: [e, -65], p2: [e, 0], p3: [-65, 0], p3z: [-65, -65] });
    const i = 290;
    const o = 185;
    set("s1", { p0: [-i, -o], p0b: [0, -o], p1: [i, -o], p2: [i, 0], p3: [-i, 0], p3z: [-i, -o] });
    set("s2", { p0: [-i, -o], p0b: [0, -290], p1: [i, -o], p2: [i, 0], p3: [-i, 0], p3z: [-i, -o] });
    for (const [a, b] of [["s0", "s1"], ["s0", "s2"], ["s1", "s2"], ["s2", "s0"]] as const) t.addTransition(`${a}_to_${b}`, a, b);
  }
  static addDataOriginalCuad(t: Shape) {
    const e = 65;
    const set = (s: string, pts: Record<string, Vec>) => Object.entries(pts).forEach(([k, v]) => t.addPointState(k, s, v));
    set("s0", { p0: [-65, -65], p1: [e, -65], p2: [e, e], p3: [-65, e], p3z: [-65, -65] });
  }
}

/* ---------- Section progress → animation segment (the reference's progress class) ---------- */

const PRE = 1 / 8;
const MAIN = 6 / 8;
const STEP = MAIN / 6;
const SECTIONS: [string, number][] = [
  ["anim01_in", 0],
  ["anim01", PRE],
  ["anim01_out", PRE],
  ["anim02_in", PRE + 1 * STEP],
  ["anim02", PRE + 2 * STEP],
  ["anim02_out", PRE + 2 * STEP],
  ["anim03_in", PRE + 3 * STEP],
  ["anim03", PRE + 4 * STEP],
  ["anim03_out", PRE + 4 * STEP],
  ["anim04_in", PRE + 5 * STEP],
  ["anim04", PRE + 6 * STEP],
  ["anim04_out", PRE + 6 * STEP],
  ["end", 1],
];
const VALUES = SECTIONS.map(([, v]) => v);

function getSection(t: number) {
  if (t < VALUES[0]!) return -1;
  if (t >= VALUES[VALUES.length - 1]!) return VALUES.length - 1;
  for (let e = 0; e < VALUES.length; e++) if (t >= VALUES[e]! && t < VALUES[e + 1]!) return e;
  return -1;
}
function getSectionProgress(t: number) {
  const e = getSection(t);
  if (e === -1) return 0;
  if (e >= VALUES.length - 1) return 1;
  const [a, b] = [VALUES[e]!, VALUES[e + 1]!];
  if (t <= a) return 0;
  if (t >= b) return 1;
  return (t - a) / (b - a);
}

/* ---------- The project: an SVG sized to its container, origin at the centre ---------- */

export class StageShapes {
  private svg: SVGSVGElement;
  private contSVG: SVGGElement;
  private scale_g: SVGGElement;
  private anims: Anim[];
  private pre = 0;
  private main = 0;
  private post = 0;
  private onResize = () => this.resize();

  constructor(
    private container: HTMLElement,
    private desktop: boolean,
    color = "#E41613",
    /** On phones the reference's SVG container spans every panel (count x 100lvh). */
    private heightFactor = 1,
  ) {
    this.svg = document.createElementNS(SVG_NS, "svg");
    this.svg.classList.add("svg-darken");
    this.svg.setAttribute("aria-hidden", "true");
    container.appendChild(this.svg);
    this.contSVG = group(this.svg);
    this.scale_g = group(this.contSVG);
    this.anims = [new Anim01(this.scale_g, color), new Anim02(this.scale_g, color), new Anim03(this.scale_g, color), new Anim04(this.scale_g, color)];
    this.anims[0]!.paintProgress_IN(0);
    this.resize();
    window.addEventListener("resize", this.onResize);
    this.paint();
  }

  private resize() {
    const w = this.container.offsetWidth;
    const h = this.container.offsetHeight * this.heightFactor;
    // The element is sized by CSS; the default "meet" fit then scales the viewBox as on the reference.
    this.svg.setAttribute("viewBox", `${-0.5 * w} ${-0.5 * h} ${w} ${h}`);
    // Desktop draws at 1:1; phones scale the forms to 35% of the width and lift them toward the title.
    let scale = 1;
    let offsetY = 0;
    if (!this.desktop) {
      scale = (0.35 * w) / 70;
      offsetY = -h * (0.5 - ((219 / 360) * window.innerWidth) / window.innerHeight);
    }
    this.contSVG.setAttribute("transform", `translate(0, ${offsetY})`);
    this.scale_g.setAttribute("transform", `scale(${scale})`);
  }

  /** The three scroll phases: entering (pre), pinned (main) and leaving (post). */
  update(id: "scroll_pre" | "scroll_main" | "scroll_pos", progress: number) {
    if (id === "scroll_pre") [this.pre, this.main, this.post] = [progress, 0, 0];
    else if (id === "scroll_main") [this.pre, this.main, this.post] = [1, progress, 0];
    else [this.pre, this.main, this.post] = [1, 1, progress];
    this.paint();
  }

  private paint() {
    const general = this.pre * PRE + this.main * MAIN + this.post * PRE;
    const id = SECTIONS[getSection(general)]?.[0] ?? "anim01_in";
    const e = getSectionProgress(general);
    const [a1, a2, a3, a4] = this.anims as [Anim, Anim, Anim, Anim];
    const only = (a: Anim) => this.anims.forEach((x) => (x === a ? x.show() : x.hide()));
    switch (id) {
      case "anim01_in": a1.paintProgress_IN(e); a2.paintProgress_IN(0); a3.paintProgress_IN(0); a4.paintProgress_IN(0); only(a1); break;
      case "anim01": a1.paintProgress_IN(1); a2.paintProgress_IN(0); a3.paintProgress_IN(0); a4.paintProgress_IN(0); only(a1); break;
      case "anim01_out": a1.paintProgress_OUT(e); a2.paintProgress_IN(0); a3.paintProgress_IN(0); a4.paintProgress_IN(0); only(a1); break;
      case "anim02_in": a1.paintProgress_OUT(1); a2.paintProgress_IN(e); a3.paintProgress_IN(0); a4.paintProgress_IN(0); only(a2); break;
      case "anim02": a1.paintProgress_OUT(1); a2.paintProgress_IN(1); a3.paintProgress_IN(0); a4.paintProgress_IN(0); only(a2); break;
      case "anim02_out": a1.paintProgress_OUT(1); a2.paintProgress_OUT(e); a3.paintProgress_IN(0); a4.paintProgress_IN(0); only(a2); break;
      case "anim03_in": a1.paintProgress_OUT(1); a2.paintProgress_OUT(1); a3.paintProgress_IN(e); a4.paintProgress_IN(0); only(a3); break;
      case "anim03": a1.paintProgress_OUT(1); a2.paintProgress_OUT(1); a3.paintProgress_IN(1); a4.paintProgress_IN(0); only(a3); break;
      case "anim03_out": a1.paintProgress_OUT(1); a2.paintProgress_OUT(1); a3.paintProgress_OUT(e); a4.paintProgress_IN(0); only(a3); break;
      case "anim04_in": a1.paintProgress_OUT(1); a2.paintProgress_OUT(1); a3.paintProgress_OUT(1); a4.paintProgress_IN(e); only(a4); break;
      case "anim04": a1.paintProgress_OUT(1); a2.paintProgress_OUT(1); a3.paintProgress_OUT(1); a4.paintProgress_IN(1); only(a4); break;
      case "anim04_out": a1.paintProgress_OUT(1); a2.paintProgress_OUT(1); a3.paintProgress_OUT(1); a4.paintProgress_OUT(e); only(a4); break;
    }
  }

  destroy() {
    window.removeEventListener("resize", this.onResize);
    this.svg.remove();
  }
}
