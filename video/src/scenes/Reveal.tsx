import React from "react";
import { AbsoluteFill } from "remotion";
import { Logo, LOGO_ASPECT } from "../components/Logo";
import { C, F } from "../lib/theme";
import { EIO, L0, L1, lerp, tw, useT, W } from "../lib/time";
import { Eyebrow, hexA, Rise } from "../lib/ui";

// Sequence C: restraint, then the official logo assembles from its own three shards.
export const Reveal: React.FC = () => {
  const t = useT();
  const t8 = L0(8);
  const r0 = L1(8) - 0.15; // logo reveal start
  const t9 = L0(9);
  const settle = tw(t, t9 - 0.2, t9 + 1.2, 0, 1, EIO);
  const W0 = 1060;
  const W1 = 600;
  const lw = lerp(W0, W1, settle);
  const ly = lerp(540 - (W0 * LOGO_ASPECT) / 2 - 10, 250, settle);
  const push = lerp(0.96, 1.0, tw(t, r0, r0 + 3.2, 0, 1, EIO));

  const lineP = tw(t, t8 - 0.2, r0 + 0.4, 0, 1, EIO);
  const lineO = 1 - tw(t, r0 + 0.6, r0 + 1.4);

  const items: [string, string, number][] = [
    ["01", "Only roles you can actually take", W(9, "actually")],
    ["02", "Every decision explained", W(9, "explains")],
    ["03", "A human before anything is sent", W(9, "human")],
  ];
  const end = L1(9) + 0.9;
  const out = tw(t, end - 0.5, end + 0.3, 0, 1, EIO);

  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 520px at 50% ${lerp(48, 30, settle)}%, ${hexA(C.ember, 0.09 * tw(t, r0 + 0.8, r0 + 2.6))}, transparent 70%), ${C.ink}`,
        }}
      />
      {/* horizon line of light */}
      <div
        style={{
          position: "absolute",
          left: 960 - 700 * lineP,
          top: 540,
          width: 1400 * lineP,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${hexA(C.emberHi, 0.9)}, transparent)`,
          opacity: lineO,
          boxShadow: `0 0 24px ${hexA(C.ember, 0.6)}`,
        }}
      />
      <div style={{ position: "absolute", left: 960 - lw / 2, top: ly, scale: `${push}` }}>
        <Logo t={t - r0} width={lw} reflection={settle < 0.5} />
      </div>

      <div style={{ position: "absolute", left: 200, right: 200, top: 640, display: "flex", gap: 56 }}>
        {items.map(([n, s, at]) => {
          const p = tw(t, at - 0.35, at + 0.6, 0, 1, EIO);
          return (
            <div key={n} style={{ flex: 1 }}>
              <div style={{ height: 1, width: `${p * 100}%`, background: hexA(C.paper, 0.25) }} />
              <div style={{ height: 2, width: `${tw(t, at - 0.2, at + 1.2, 0, 1, EIO) * 26}%`, background: C.ember, marginTop: -1.5 }} />
              <Eyebrow size={14} color={C.ember} style={{ marginTop: 26, opacity: p }}>
                {n}
              </Eyebrow>
              <Rise p={p} style={{ marginTop: 14, fontFamily: F.display, fontSize: 40, fontWeight: 500, color: C.paper, letterSpacing: "-0.015em", lineHeight: 1.15 }}>
                {s}
              </Rise>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
