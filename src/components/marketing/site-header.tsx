"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo, SkylarkMark } from "@/components/ui/marks";
import { cn } from "@/lib/utils";
import { NAV, STEPS_NAV } from "./nav";
import { SECTION_NAV_EVENT } from "./smooth-anchors";
import { StepIcon } from "./step-icons";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [away, setAway] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    // As on the reference: slide away while scrolling down, return after 200px of scrolling up.
    let last = window.scrollY;
    let goingDown = false;
    let turnAt = last;
    const onScroll = () => {
      const y = window.scrollY;
      const down = y > last;
      if (down !== goingDown) {
        goingDown = down;
        turnAt = y;
      }
      last = y;
      setAway(y >= 10 && !(y < turnAt - 200));
      setScrolled(y > 10);
      // Sections marked data-hide-header (the pinned process stage) take over the full screen.
      let hide = false;
      document.querySelectorAll<HTMLElement>("[data-hide-header]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= 1 && r.bottom > window.innerHeight * 0.5) hide = true;
      });
      setHidden(hide);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const close = () => {
      setOpen(false);
      setSubmenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener(SECTION_NAV_EVENT, close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(SECTION_NAV_EVENT, close);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("tm-locked", open);
    window.dispatchEvent(new CustomEvent("skylark:lock", { detail: open }));
    return () => document.documentElement.classList.remove("tm-locked");
  }, [open]);

  // As on the reference, page scrolling pauses while the tiles are open.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("skylark:lock", { detail: submenu }));
  }, [submenu]);

  const openSub = () => {
    window.clearTimeout(closeTimer.current);
    setSubmenu(true);
  };
  const closeSub = () => {
    closeTimer.current = window.setTimeout(() => setSubmenu(false), 60);
  };

  return (
    <header className={cn("header", (scrolled || submenu) && "--scrolled", open && "--open", hidden && !open && "--hidden", away && !open && !submenu && "--away")}>
      <div className="box" aria-hidden />
      <div className="cols">
        <div className="item">
          <Link href="/" aria-label="Skylark home" className="brand">
            <Logo className="brand-logo desktop-logo" />
            <SkylarkMark className="brand-logo mobile-logo" />
          </Link>
        </div>

        <nav aria-label="Primary">
          <ul className="menu">
            {NAV.map((n) =>
              n.href === "/#how-it-works" ? (
                <li key={n.href} className={cn(submenu && "--open")} onMouseEnter={openSub} onMouseLeave={closeSub} onFocus={openSub} onBlur={closeSub}>
                  <Link href={n.href} aria-haspopup="true" aria-expanded={submenu}>
                    {n.label}
                    <svg className="chev" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </Link>
                  <div className="bar" aria-hidden>
                    <span />
                  </div>
                  <span className="mask" aria-hidden onMouseEnter={() => setSubmenu(false)} />
                  <ul className="submenu">
                    {STEPS_NAV.map((s) => (
                      <li key={s.href}>
                        <Link href={s.href} className="submenu-item" tabIndex={submenu ? 0 : -1}>
                          <span className="image" aria-hidden>
                            <Image src={s.art} alt="" fill sizes="25vw" />
                          </span>
                          <span className="row tile floating-center">
                            <StepIcon name={s.icon} className="icon" />
                            <span className="title">{s.label}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={n.href}>
                  <Link href={n.href}>{n.label}</Link>
                  <div className="bar" aria-hidden>
                    <span />
                  </div>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="item">
          <Link href="/login" className="side">
            Sign in
          </Link>
          <Link href="/signup" className="button --primary">
            Get started
          </Link>
          <button className="burger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"}>
            <span className="bars" aria-hidden>
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      <div id="mobile-nav" className="navigation" inert={!open}>
        <ul>
          {NAV.map((n, i) => (
            <li key={n.href}>
              <Link href={n.href} style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/login" className="side-mobile">
          Sign in
        </Link>
        <Link href="/signup" className="button --primary">
          Get started
        </Link>
      </div>
    </header>
  );
}
