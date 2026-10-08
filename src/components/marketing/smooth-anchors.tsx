"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { scrollToId, smoothScrollTo } from "@/lib/smooth-scroll";

export const SECTION_NAV_EVENT = "autoapply:section-nav";

function waitForElement(id: string, timeoutMs = 3000) {
  return new Promise<boolean>((resolve) => {
    const started = performance.now();
    const check = () => {
      if (document.getElementById(id)) return resolve(true);
      if (performance.now() - started > timeoutMs) return resolve(false);
      requestAnimationFrame(check);
    };
    check();
  });
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/**
 * Turns every `#section` link on the marketing site into a smooth scroll, whether the
 * section is on this page or on the landing page we have to navigate to first.
 */
export function SmoothAnchors() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onClick = async (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const id = decodeURIComponent(url.hash.slice(1));

      // A link to the page you're already on (e.g. the logo on the home page) glides back to the top.
      if (!id) {
        if (url.pathname !== window.location.pathname || url.search !== window.location.search) return;
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new Event(SECTION_NAV_EVENT));
        await nextFrame();
        if (await smoothScrollTo(0)) history.replaceState(history.state, "", url.pathname + url.search);
        return;
      }

      // Take over before Next's <Link> handler jumps instantly to the hash.
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new Event(SECTION_NAV_EVENT));

      if (url.pathname !== window.location.pathname) {
        router.push(url.pathname, { scroll: true });
        if (!(await waitForElement(id))) return;
      }
      // Let the mobile menu close and the page unlock scrolling before animating.
      await nextFrame();
      if (await scrollToId(id)) history.replaceState(history.state, "", `${url.pathname}#${id}`);
    };

    // Capture phase so this runs before React's delegated click handlers.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  // Arriving with a hash (shared link, refresh, back/forward): glide in once the page has painted.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    let cancelled = false;
    void (async () => {
      if (!(await waitForElement(id)) || cancelled) return;
      await nextFrame();
      if (!cancelled) await scrollToId(id);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
