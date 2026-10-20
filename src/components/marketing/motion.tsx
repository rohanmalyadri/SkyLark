"use client";

import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { useEffect, useRef } from "react";
import { jumpTo, registerScroller } from "@/lib/smooth-scroll";
import { StageShapes } from "./stage-shapes";

gsap.registerPlugin(ScrollTrigger, SplitText, MorphSVGPlugin);

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDesktop = () => window.innerWidth > 1100;
/** The reference designs at 1440 wide (desktop) and 360 wide (mobile), then scales. */
const px = (n: number) => (n / 1440) * window.innerWidth;

/* ---------- Smooth scroll (Lenis on the GSAP ticker) ---------- */

export function SmoothScroll() {
  useEffect(() => {
    if (reduced()) return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    registerScroller(lenis);
    const onLock = (e: Event) => ((e as CustomEvent<boolean>).detail ? lenis.stop() : lenis.start());
    window.addEventListener("skylark:lock", onLock);
    return () => {
      window.removeEventListener("skylark:lock", onLock);
      registerScroller(null);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  return null;
}

/* ---------- Cursor: a small dot that follows, a disc that says View / Drag ---------- */

export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !window.matchMedia("(hover: hover) and (min-width: 1024px)").matches) return;
    const follow = el.querySelector<HTMLElement>(".follow")!;
    const bubble = el.querySelector<HTMLElement>(".bubble")!;
    const label = bubble.querySelector("span")!;
    const fx = gsap.quickTo(follow, "x", { duration: 0.5, ease: "expo.out" });
    const fy = gsap.quickTo(follow, "y", { duration: 0.5, ease: "expo.out" });
    const bx = gsap.quickTo(bubble, "x", { duration: 0.7, ease: "expo.out" });
    const by = gsap.quickTo(bubble, "y", { duration: 0.7, ease: "expo.out" });
    const move = (e: PointerEvent) => {
      fx(e.clientX);
      fy(e.clientY);
      bx(e.clientX);
      by(e.clientY);
      const target = (e.target as Element | null)?.closest?.("[data-cursor]") as HTMLElement | null;
      const text = target?.dataset.cursor ?? "";
      if (text) {
        label.textContent = text;
        gsap.to(bubble, { scale: 1, duration: 0.6, ease: "expo.out", overwrite: "auto" });
        gsap.to(label, { opacity: 1, duration: 0.3, overwrite: "auto" });
        gsap.to(follow, { scale: 0, duration: 0.3, overwrite: "auto" });
      } else {
        gsap.to(bubble, { scale: 0, duration: 0.5, ease: "expo.out", overwrite: "auto" });
        gsap.to(label, { opacity: 0, duration: 0.2, overwrite: "auto" });
        gsap.to(follow, { scale: 1, duration: 0.3, overwrite: "auto" });
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return (
    <div ref={ref} className="cursor" aria-hidden>
      <div className="follow" />
      <div className="bubble">
        <span style={{ opacity: 0 }} />
      </div>
    </div>
  );
}

/* ---------- Shared behaviours for every marketing page ---------- */

/** Link underlines, scroll-filled titles, rising words and magnet cards inside `root`. */
function setupShared(root: HTMLElement) {
  // Link: the bar slides out to the right on hover and back in from the left on leave.
  root.querySelectorAll<HTMLElement>(".link").forEach((link) => {
    const bar = link.querySelector<HTMLElement>(".underline");
    if (!bar || !window.matchMedia("(hover: hover)").matches) return;
    link.dataset.motion = "";
    const enter = () => {
      gsap.killTweensOf(bar);
      gsap.to(bar, { x: "101%", duration: 0.6, ease: "expo.out" });
    };
    const leave = () => {
      gsap.killTweensOf(bar);
      gsap.fromTo(bar, { x: "-101%" }, { x: "0%", duration: 0.6, ease: "expo.out" });
    };
    link.addEventListener("mouseenter", enter);
    link.addEventListener("mouseleave", leave);
  });

  // Titles marked --fill light up character by character as they scroll through.
  root.querySelectorAll<HTMLElement>(".--fill").forEach((title) => {
    const split = SplitText.create(title, { type: "words, chars", wordsClass: "word", charsClass: "char" });
    const inView = title.getBoundingClientRect().top < window.innerHeight;
    gsap.fromTo(
      split.chars,
      { opacity: 0.05 },
      { opacity: 1, ease: "none", stagger: 0.02, duration: 0.2, delay: inView ? 0.2 : 0, scrollTrigger: { trigger: title, start: "top 90%", end: "bottom 60%", scrub: !inView } },
    );
  });

  // Body copy rises word by word out of its own mask, once.
  root.querySelectorAll<HTMLElement>(".--rise").forEach((block) => {
    const split = SplitText.create(block, { type: "words", wordsClass: "word" });
    gsap.set(split.words, { yPercent: 100, clipPath: "inset(0% 0% 100% 0%)" });
    ScrollTrigger.create({
      trigger: block,
      start: "top 92%",
      once: true,
      onEnter: () => gsap.to(split.words, { yPercent: 0, clipPath: "inset(0% 0% 0% 0%)", ease: "expo.out", duration: 1, stagger: 0.01 }),
    });
  });

  // Cards ease up into place, later ones a beat behind (delay follows their x position).
  root.querySelectorAll<HTMLElement>(".--magnet").forEach((el) => {
    gsap.set(el, { y: px(60), scale: 0.96, opacity: 0.0001 });
    ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      once: true,
      onEnter: () => gsap.to(el, { y: 0, scale: 1, opacity: 1, ease: "expo.out", duration: 1.2, delay: 0.00025 * el.getBoundingClientRect().left }),
    });
  });
}

export function PageMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tm");
    if (!root || reduced()) return;
    const ctx = gsap.context(() => setupShared(root), root);
    return () => ctx.revert();
  }, []);
  return null;
}

/* ---------- Home page ---------- */

export function HomeMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tm");
    if (!root || reduced()) return;
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      setupShared(root);
      setupHero(root);
      setupNumbers(root);
      setupArc(root);
    }, root);
    mm.add({ desktop: "(min-width: 1101px)", mobile: "(max-width: 1100px)" }, (c) => setupProcess(root, Boolean(c.conditions?.desktop)));
    // Fonts and images change heights; re-measure once everything has settled.
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
      ctx.revert();
    };
  }, []);
  return null;
}

function setupHero(root: HTMLElement) {
  const title = root.querySelector<HTMLElement>(".component--hero .title");
  if (title) {
    title.dataset.motion = "";
    const step = isDesktop() ? px(120) : Math.min(window.innerWidth * 0.1, 39.69);
    title.querySelectorAll<HTMLElement>(".line").forEach((line, i) => {
      gsap.fromTo(line, { x: 0 }, { x: step * i, duration: 2.2, ease: "expo.out", delay: 0.15 });
    });
  }
  const scroll = root.querySelector(".component--hero .scroll");
  if (scroll) {
    gsap.to(scroll, { opacity: 0.0001, ease: "none", scrollTrigger: { trigger: ".component--hero", start: "top top", end: "50% top", scrub: true } });
  }
}

function setupNumbers(root: HTMLElement) {
  const second = root.querySelector(".component--gridnumbers .content-1");
  const first = root.querySelector(".component--gridnumbers .content-0");
  if (!second || !first || !isDesktop()) return;
  gsap.to(second, { y: px(-480), ease: "none", scrollTrigger: { trigger: first, start: "top bottom", end: "bottom top", scrub: true } });
}

/** Market tiles sit on a giant circle that turns as you scroll; names hand over one to the next. */
function setupArc(root: HTMLElement) {
  const circle = root.querySelector<HTMLElement>(".component--map .circle");
  if (!circle) return;
  const items = circle.querySelectorAll(".circle-item");
  const names = circle.querySelectorAll(".name");
  if (!items.length) return;
  const step = 360 / items.length;
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  tl.fromTo(Array.from(names).slice(0, -1), { opacity: 1, xPercent: 0 }, { opacity: 0.0001, xPercent: -20, duration: 0.5, stagger: 1 }, 0);
  tl.fromTo(Array.from(names).slice(1), { opacity: 0.0001, xPercent: 20 }, { opacity: 1, xPercent: 0, duration: 0.5, stagger: 1 }, 0.5);
  tl.fromTo(circle, { rotate: 0 }, { rotate: -360 + step, duration: tl.totalDuration() }, 0);
  // On phones only the first quarter of the turn plays, as on the reference.
  const share = isDesktop() ? 1 : 0.25;
  ScrollTrigger.create({ trigger: circle.parentElement, start: "top bottom", end: "bottom top", onUpdate: (st) => tl.progress(st.progress * share) });
}

/**
 * The "How it works" stages: a port of the reference's contentscrollcenter.setItems. Four panels
 * share one pinned screen; a 7-unit timeline (labels at 1/3/5, a closing pause) cross-fades them
 * with each tween lasting a third of the run, while the scripted red shapes play off three
 * scroll phases (entering, pinned, leaving).
 */
function setupProcess(root: HTMLElement, desktop: boolean) {
  const section = root.querySelector<HTMLElement>(".component--scroll");
  const container = section?.querySelector<HTMLElement>("#morphings-svg");
  if (!section || !container) return;
  section.dataset.motion = "";
  const sticky = section.querySelector<HTMLElement>(".sticky")!;
  const contents = Array.from(section.querySelectorAll<HTMLElement>(".content"));
  const imgs = contents.map((c) => c.querySelector<HTMLElement>(".image img")!);
  const infos = contents.map((c) => c.querySelector<HTMLElement>(".info")!);
  const titles = contents.map((c) => c.querySelector<HTMLElement>(".title")!);
  const anchors = Array.from(section.querySelectorAll<HTMLButtonElement>(".anchors button"));
  const notFirst = <T,>(arr: T[]) => arr.slice(1);
  const notLast = <T,>(arr: T[]) => arr.slice(0, -1);
  const color = getComputedStyle(section).getPropertyValue("--main").trim() || "#E41613";
  const shapes = new StageShapes(container, desktop, color);

  // Entering: the first panel settles while the shapes start to build.
  const pre = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: section, start: "top bottom", end: "top top", scrub: true, onUpdate: (st) => shapes.update("scroll_pre", st.progress) },
  });
  pre.fromTo(imgs[0]!, { y: "-10%" }, { y: "0%", duration: 1 }, 0);
  pre.fromTo(infos[0]!, { y: "15%", opacity: -3 }, { y: "0%", opacity: 1, duration: 1 }, 0);

  const setActive = (i: number) => anchors.forEach((el, k) => el.classList.toggle("--active", k === i));
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      // Phones fade the anchor row out once the section is passed, and back in on return.
      onLeave: () => !desktop && gsap.to(anchors, { opacity: 0.0001, duration: 0.2, ease: "power2.out" }),
      onEnterBack: () => !desktop && gsap.to(anchors, { opacity: 1, duration: 0.2, ease: "power2.out" }),
      onUpdate: (st) => {
        shapes.update("scroll_main", st.progress);
        // The active anchor changes at the "show" labels (1, 3, 5 of 7).
        const t = st.progress * 7;
        setActive(contents.reduce((n, _, o) => (o > 0 && t >= 2 * o - 1 ? o : n), 0));
      },
    },
  });
  contents.forEach((_, o) => {
    if (2 * o - 1 > 0) {
      tl.addLabel("show" + o, 2 * o - 1);
      tl.addLabel("postshow" + o, 2 * o);
    }
  });
  tl.addPause(">1");
  const d = tl.totalDuration() / notFirst(imgs).length;
  const step = { duration: d, stagger: d };
  if (desktop) {
    tl.fromTo(notLast(contents), { opacity: 1 }, { opacity: 0.0001, ...step }, 0);
    tl.fromTo(notLast(imgs), { y: "0%" }, { y: "-20%", ...step }, 0);
    tl.fromTo(notLast(infos), { y: "0%", opacity: 1 }, { y: "-30%", opacity: -1, ...step }, 0);
    tl.fromTo(notLast(titles), { opacity: 1 }, { opacity: -3, ...step }, 0);
    tl.fromTo(notFirst(contents), { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ...step }, 0);
    tl.fromTo(notFirst(imgs), { y: "20%" }, { y: "0%", ...step }, 0);
    tl.fromTo(notFirst(infos), { y: "30%" }, { y: "0%", ...step }, 0);
    tl.fromTo(notFirst(titles), { opacity: -3 }, { opacity: 1, ...step }, 0);
  } else {
    tl.fromTo(sticky, { backgroundColor: "#d5d5d500" }, { backgroundColor: "#2B2B2B", duration: d }, 0);
    tl.fromTo(notLast(contents), { opacity: 1 }, { opacity: 0.3, ...step }, 0);
    tl.fromTo(notLast(imgs), { y: "0%" }, { y: "-10%", opacity: 0.3, ...step }, 0);
    tl.fromTo(notLast(infos), { y: "0%", opacity: 1 }, { y: "-20%", opacity: 0.3, scale: 0.95, ...step }, 0);
    tl.fromTo(notLast(titles), { opacity: 1 }, { opacity: 0.3, scale: 0.95, ...step }, 0);
    tl.fromTo(notFirst(imgs), { y: "10%" }, { y: "0%", ...step }, 0);
    tl.fromTo(notFirst(infos), { y: "20%" }, { y: "0%", ...step }, 0);
    tl.fromTo(notFirst(titles), { opacity: 0.4 }, { opacity: 1, ...step }, 0);
  }

  // Leaving: the last shape unbuilds.
  const post = ScrollTrigger.create({ trigger: section, start: "bottom bottom", end: "bottom top", scrub: true, onUpdate: (st) => shapes.update("scroll_pos", st.progress) });

  // Anchors jump straight to their panel.
  const st = tl.scrollTrigger!;
  anchors.forEach((el, i) => {
    el.onclick = () => jumpTo(st.start + (st.end - st.start) * (i / (contents.length - 1)));
  });

  // Desktop settles on each panel, as measured on the reference (every 100vh of the pinned run).
  const snap = desktop
    ? ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        snap: { snapTo: [0, 1 / 3, 2 / 3, 1], duration: { min: 0.3, max: 0.8 }, delay: 0.1, ease: "power2.inOut" },
      })
    : null;

  return () => {
    snap?.kill();
    post.kill();
    shapes.destroy();
    anchors.forEach((el) => (el.onclick = null));
    delete section.dataset.motion;
  };
}

/* ---------- Carousels ---------- */

/** A drag-to-scroll row with momentum (the reference's "Drag" carousel). Touch uses native scroll. */
export function Draggable({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const inner = el?.querySelector<HTMLElement>(".inner");
    if (!el || !inner || !window.matchMedia("(hover: hover) and (min-width: 1101px)").matches) return;
    let x = 0;
    let start = 0;
    let origin = 0;
    let velocity = 0;
    let last = 0;
    let dragging = false;
    let moved = false;
    const max = () => Math.min(0, el.clientWidth - inner.scrollWidth);
    const setX = gsap.quickSetter(inner, "x", "px");
    const down = (e: PointerEvent) => {
      dragging = true;
      moved = false;
      start = e.clientX;
      origin = x;
      last = e.clientX;
      velocity = 0;
      gsap.killTweensOf(inner);
      el.classList.add("--dragging");
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - start;
      if (Math.abs(dx) > 4) moved = true;
      velocity = e.clientX - last;
      last = e.clientX;
      x = Math.max(max() - 80, Math.min(80, origin + dx));
      setX(x);
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("--dragging");
      const target = Math.max(max(), Math.min(0, x + velocity * 18));
      const state = { v: x };
      gsap.to(state, { v: target, duration: 1.2, ease: "expo.out", onUpdate: () => ((x = state.v), setX(x)) });
    };
    const click = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("click", click, true);
    el.addEventListener("dragstart", (e) => e.preventDefault());
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("click", click, true);
    };
  }, []);
  return (
    <div ref={ref} className={className ?? "draggable"} data-cursor="Drag">
      {children}
    </div>
  );
}

/** Endless strip of images that drifts with your scroll direction, with a gentle parallax. */
export function AutoCarousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const inner = el?.querySelector<HTMLElement>(".inner");
    if (!el || !inner || reduced()) return;
    let x = 0;
    let dir = -1;
    let lastY = window.scrollY;
    const speed = isDesktop() ? 1 : 0.8;
    const half = () => inner.scrollWidth / 2;
    const tick = () => {
      const y = window.scrollY;
      if (y !== lastY) dir = y > lastY ? -1 : 1;
      lastY = y;
      x += dir * speed;
      const h = half();
      if (x <= -h) x += h;
      if (x > 0) x -= h;
      gsap.set(inner, { x });
    };
    gsap.ticker.add(tick);
    const parallax = isDesktop()
      ? gsap.fromTo(el, { x: "-10vw" }, { x: "10vw", ease: "none", scrollTrigger: { trigger: el.closest("footer"), start: "top bottom", end: "bottom top", scrub: true } })
      : null;
    return () => {
      gsap.ticker.remove(tick);
      parallax?.scrollTrigger?.kill();
      parallax?.kill();
    };
  }, []);
  return (
    <div ref={ref} className="carousel">
      {children}
    </div>
  );
}
