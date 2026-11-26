import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "../lib/theme";
import { EO, L0, L1, rng, tw, W, WE } from "../lib/time";
import { hexA } from "../lib/ui";

// Pattern interrupts: full-frame title cards cut hard over the film at chapter turns, synced to the words that announce them.

export type Interrupt = { a: number; b: number; kind: "hood" | "rule" | "tested" | "live" };

export const INTERRUPTS: Interrupt[] = [
  { a: L0(17) - 0.12, b: L1(17) + 0.28, kind: "hood" },
  { a: W(24, "rule") - 0.08, b: WE(24, "everything") + 0.22, kind: "rule" },
  { a: L0(29) - 0.08, b: WE(29, "tested") + 0.3, kind: "tested" },
  { a: L0(32) - 0.1, b: W(32, "at") + 0.05, kind: "live" },
];

const jitter = (t: number, a: number) => {
  const d = t - a;
  if (d > 0.2) return 0;
  const g = rng(Math.floor(d * 60) + 11);
  return (g() - 0.5) * 60 * (1 - d / 0.2);
};

export const Interrupts: React.FC<{ t: number }> = ({ t }) => {
  const it = INTERRUPTS.find((x) => t >= x.a && t <= x.b);
  if (!it) return null;
  const p = tw(t, it.a, it.a + 0.14, 0, 1, EO);
  const out = tw(t, it.b - 0.06, it.b);
  const j = jitter(t, it.a);
  const base: React.CSSProperties = { fontFamily: F.display, fontWeight: 600, letterSpacing: "-0.045em", color: C.paper, lineHeight: 0.95 };
  const scan = (
    <AbsoluteFill
      style={{
        backgroundImage: `repeating-linear-gradient(0deg, ${hexA(C.paper, 0.035)} 0 1px, transparent 1px 4px)`,
        pointerEvents: "none",
      }}
    />
  );
  const flash = <AbsoluteFill style={{ background: "#fff", opacity: tw(t, it.a, it.a + 0.12, 0.5, 0) }} />;

  let body: React.ReactNode = null;
  if (it.kind === "hood") {
    // "Now, under the hood." — the frame drops into a wireframe X-ray.
    body = (
      <>
        <AbsoluteFill style={{ backgroundImage: `linear-gradient(${hexA(C.ember, 0.18)} 1px, transparent 1px), linear-gradient(90deg, ${hexA(C.ember, 0.18)} 1px, transparent 1px)`, backgroundSize: "80px 80px", backgroundPosition: `0 ${(t - it.a) * 240}px`, opacity: p }} />
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontFamily: F.mono, fontSize: 24, letterSpacing: "0.4em", color: C.ember, marginBottom: 24 }}>// 02 · ENGINEERING</div>
          <div style={{ ...base, fontSize: 230, scale: `${1.25 - 0.25 * p}`, translate: `${j}px 0` }}>
            Under the <span style={{ fontFamily: F.serif, fontStyle: "italic", fontWeight: 400, color: C.ember }}>hood.</span>
          </div>
        </AbsoluteFill>
      </>
    );
  } else if (it.kind === "rule") {
    body = (
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: "0.4em", color: C.mist, marginBottom: 28 }}>THE ONE RULE</div>
        <div style={{ ...base, fontSize: 300, color: C.ember, scale: `${1.4 - 0.4 * p}`, translate: `${j}px 0` }}>35</div>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 64, color: C.paper, marginTop: 18, opacity: tw(t, it.a + 0.3, it.a + 0.7) }}>
          the cap when a role can&apos;t sponsor you.
        </div>
      </AbsoluteFill>
    );
  } else if (it.kind === "tested") {
    const tested = W(29, "tested");
    const strike = tw(t, W(29, "assumed") + 0.15, W(29, "assumed") + 0.45, 0, 1, EO);
    const tp = tw(t, tested - 0.05, tested + 0.12, 0, 1, EO);
    body = (
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ position: "relative", ...base, fontSize: 170, color: t > tested ? hexA(C.paper, 0.3) : C.paper }}>
          Assumed.
          <div style={{ position: "absolute", left: -10, top: "52%", height: 14, width: `${strike * 104}%`, background: C.ember }} />
        </div>
        <div style={{ ...base, fontSize: 210, fontFamily: F.serif, fontStyle: "italic", fontWeight: 400, color: C.ember, marginTop: 10, opacity: tp, scale: `${1.5 - 0.5 * tp}` }}>
          Tested.
        </div>
      </AbsoluteFill>
    );
  } else if (it.kind === "live") {
    const pulse = 0.5 + 0.5 * Math.sin((t - it.a) * 9);
    body = (
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...base, fontSize: 280, scale: `${1.3 - 0.3 * p}`, translate: `${j}px 0`, display: "flex", alignItems: "flex-end" }}>
          LIVE
          <span style={{ display: "inline-block", width: 64, height: 64, borderRadius: 99, background: C.ember, marginLeft: 22, marginBottom: 30, boxShadow: `0 0 ${30 + 50 * pulse}px ${C.ember}` }} />
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: C.ink, opacity: 1 - out }}>
      {body}
      {scan}
      {flash}
    </AbsoluteFill>
  );
};
