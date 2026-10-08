"use client";

/**
 * JS-driven page scrolling. Native `scroll-behavior: smooth` uses a short, fixed curve that
 * feels abrupt on long jumps and behaves differently across Safari/iOS, Chrome and Firefox;
 * this drives window.scrollTo from requestAnimationFrame so every device gets the same motion.
 */

// Quintic ease-in-out: gentle start, decisive middle, long soft landing.
const ease = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

let cancelActive: (() => void) | null = null;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Document Y that puts `el` just below the sticky header, honouring its CSS scroll-margin-top. */
export function targetY(el: Element) {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const y = el.getBoundingClientRect().top + window.scrollY - margin;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(y, max));
}

/** Resolves true when the scroll reached its target, false if the user took over first. */
export function smoothScrollTo(y: number): Promise<boolean> {
  cancelActive?.();
  const start = window.scrollY;
  const distance = y - start;
  if (Math.abs(distance) < 2 || prefersReducedMotion()) {
    window.scrollTo(0, y);
    return Promise.resolve(true);
  }

  // Longer jumps take a little longer, but never drag.
  const duration = Math.min(1150, Math.max(520, Math.sqrt(Math.abs(distance)) * 26));

  return new Promise((resolve) => {
    let raf = 0;
    let startTime: number | null = null;

    const stop = (completed = false) => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("keydown", interrupt);
      window.removeEventListener("pointerdown", interrupt);
      cancelActive = null;
      resolve(completed);
    };
    const interrupt = () => stop(false);

    const step = (now: number) => {
      startTime ??= now;
      const p = Math.min(1, (now - startTime) / duration);
      window.scrollTo(0, start + distance * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else stop(true);
    };

    // Any deliberate user input hands control straight back to them.
    const opts = { passive: true, once: true } as const;
    window.addEventListener("wheel", interrupt, opts);
    window.addEventListener("touchstart", interrupt, opts);
    window.addEventListener("keydown", interrupt, opts);
    window.addEventListener("pointerdown", interrupt, opts);

    cancelActive = interrupt;
    raf = requestAnimationFrame(step);
  });
}

/** Scrolls to an element by id and moves focus there for keyboard and screen-reader users. */
export async function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  if (!(await smoothScrollTo(targetY(el)))) return false;
  // Correct for content that shifted during the animation (lazy images, fonts).
  const settled = targetY(el);
  if (Math.abs(window.scrollY - settled) > 2) window.scrollTo(0, settled);
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  return true;
}
