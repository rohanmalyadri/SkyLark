import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "../lib/theme";
import { EIO, EO, L0, L1, lerp, tw, useT, W, win } from "../lib/time";
import { Caption, Eyebrow, hexA, Rise, Screen } from "../lib/ui";

// Sequence G: what is live today (each item verified on www.skylarkgo.in or in the merged code),
// then the two roadmap items the README lists next.
const ITEMS: { label: string; word: string; shot: string; sub: string }[] = [
  { label: "Live job listings", word: "Live", shot: "live-landing.png", sub: "Arbeitnow + Greenhouse boards" },
  { label: "Google sign-in", word: "Google", shot: "live-jobs.png", sub: "Supabase Auth" },
  { label: "Chat-style onboarding", word: "Chat-style", shot: "live-landing.png", sub: "same validators as the form" },
  { label: "Subscriptions in rupees", word: "Subscriptions", shot: "live-pricing.png", sub: "Razorpay · signed webhooks" },
  { label: "Specialist review queue", word: "specialist", shot: "ops-reviews.png", sub: "24-hour target" },
];

export const Results: React.FC = () => {
  const t = useT();
  const a = L0(32) - 0.6;
  const s34 = L0(34);
  const end = L1(34) + 1.0;
  const urlP = tw(t, W(32, "skylark") - 0.4, W(32, "in") + 0.3, 0, 1, EIO);
  const at = ITEMS.map((it) => W(33, it.word));
  let idx = -1;
  at.forEach((x, i) => {
    if (t >= x - 0.3) idx = i;
  });
  const listOut = tw(t, s34 - 0.4, s34 + 0.4, 0, 1, EIO);
  const push = tw(t, a, s34, 0, 1, EIO);

  return (
    <AbsoluteFill style={{ opacity: tw(t, a, a + 0.7) * (1 - tw(t, end - 0.6, end)) }}>
      <AbsoluteFill style={{ background: `radial-gradient(1400px 900px at 75% 40%, ${hexA("#2A1710", 0.6)}, ${C.ink} 72%)` }} />

      {/* screens */}
      <AbsoluteFill style={{ perspective: 2200, opacity: 1 - listOut }}>
        {["live-landing.png", "live-jobs.png", "live-pricing.png", "ops-reviews.png"].map((src) => {
          const active = idx < 0 ? src === "live-landing.png" : ITEMS[idx].shot === src;
          const changeAt = idx < 0 ? a : at[idx] - 0.3;
          const o = active ? tw(t, changeAt, changeAt + 0.5) : 0;
          if (o <= 0 && !active) return null;
          return (
            <Screen
              key={src}
              src={src}
              width={1120}
              style={{ left: 720, top: 210, transform: `rotateY(${lerp(-18, -10, push)}deg) translateZ(${lerp(-200, -40, push)}px)`, opacity: o }}
              sheen={src === "live-landing.png" ? tw(t, a + 0.4, a + 2.4) : 0}
            />
          );
        })}
      </AbsoluteFill>

      <div style={{ position: "absolute", left: 120, top: 150, opacity: 1 - listOut }}>
        <Eyebrow size={15} color={C.ember} style={{ opacity: tw(t, a, a + 0.6) }}>
          Live today
        </Eyebrow>
        <Rise p={urlP} style={{ fontFamily: F.serif, fontSize: 104, color: C.paper, marginTop: 10, letterSpacing: "-0.01em" }}>
          skylarkgo<span style={{ color: C.ember }}>.</span>in
        </Rise>
        <div style={{ marginTop: 40 }}>
          {ITEMS.map((it, i) => {
            const p = tw(t, at[i] - 0.3, at[i] + 0.4, 0, 1, EO);
            const cur = idx === i;
            return (
              <div key={it.label} style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 20, opacity: p * (cur ? 1 : 0.55), translate: `${(1 - p) * -20}px 0` }}>
                <div style={{ width: 10, height: 10, borderRadius: 9, background: cur ? C.ember : C.mint, boxShadow: cur ? `0 0 16px ${C.ember}` : undefined, translate: "0 -6px" }} />
                <div style={{ fontFamily: F.display, fontSize: 36, fontWeight: 500, color: C.paper }}>{it.label}</div>
                <div style={{ fontFamily: F.mono, fontSize: 16, color: C.faint }}>{it.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* next */}
      <AbsoluteFill style={{ opacity: listOut }}>
        <div style={{ position: "absolute", left: 120, top: 150 }}>
          <Eyebrow size={15} color={C.ember}>
            Next · from the roadmap
          </Eyebrow>
        </div>
        <div style={{ position: "absolute", left: 120, right: 120, top: 560, height: 2, background: `linear-gradient(90deg, ${hexA(C.paper, 0.4)}, ${hexA(C.paper, 0.05)})`, scale: `${tw(t, s34 - 0.2, s34 + 1.2, 0, 1, EIO)} 1`, transformOrigin: "0 50%" }} />
        {[
          { x: 360, label: "More job sources for India", word: "sources" },
          { x: 1120, label: "Match every candidate against the whole catalogue", word: "matching" },
        ].map((n) => {
          const p = tw(t, W(34, n.word) - 0.4, W(34, n.word) + 0.5, 0, 1, EIO);
          return (
            <div key={n.label} style={{ position: "absolute", left: n.x, top: 560 }}>
              <div style={{ position: "absolute", left: -18, top: -18, width: 36, height: 36, borderRadius: 99, border: `2px dashed ${hexA(C.ember, p)}`, rotate: `${t * 20}deg` }} />
              <Rise p={p} style={{ position: "absolute", left: -10, top: 50, width: 560, fontFamily: F.display, fontSize: 40, fontWeight: 500, color: C.paper, letterSpacing: "-0.015em", lineHeight: 1.15 }}>
                {n.label}
              </Rise>
            </div>
          );
        })}
      </AbsoluteFill>
      <Caption opacity={win(t, a + 0.5, s34, 0.6, 0.4)}>Captured from www.skylarkgo.in · review queue from demo mode</Caption>
    </AbsoluteFill>
  );
};
