import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "../lib/theme";
import { EI, EIO, EO, L0, L1, lerp, rng, tw, useT, W, WE } from "../lib/time";
import { Eyebrow, hexA, Rise } from "../lib/ui";

// Sequence B: the volume treadmill. Cards are abstract (illustrative), not real listings.
const COLS = 16;
const ROWS = 12;
const CW = 260;
const CH = 168;
const GAP = 26;

type Card = { i: number; c: number; r: number; group: "permit" | "sponsor" | "open"; hue: number; w1: number; w2: number; seed: number };

export const Problem: React.FC = () => {
  const t = useT();
  const cards = useMemo<Card[]>(() => {
    const r = rng(11);
    const out: Card[] = [];
    for (let rr = 0; rr < ROWS; rr++)
      for (let c = 0; c < COLS; c++) {
        const x = r();
        out.push({ i: out.length, c, r: rr, group: x < 0.46 ? "permit" : x < 0.86 ? "sponsor" : "open", hue: r(), w1: 0.55 + r() * 0.35, w2: 0.3 + r() * 0.3, seed: r() });
      }
    return out;
  }, []);

  const a = L0(3) - 0.5;
  const tSearch = W(3, "Search"), tClick = W(3, "click"), tApply = W(3, "apply"), tRepeat = W(3, "repeat");
  const tVolume = W(4, "volume"), tProblem = W(4, "problem");
  const tPermit = W(5, "permit"), tSponsor = W(5, "sponsor"), tScore = W(5, "score");
  const tEverywhere = W(6, "everywhere"), tNothing = W(6, "nothing"), tBurn = W(6, "burn");
  const t7 = L0(7);
  const end7 = L1(7) + 1.4;

  // camera over the wall
  const pull = tw(t, tVolume - 0.4, tProblem + 0.9, 0, 1, EIO);
  const push = tw(t, L1(6) - 0.2, t7 + 0.6, 0, 1, EI);
  const scale = lerp(1.55, 0.62, pull) * lerp(1, 1.6, push);
  const rotX = lerp(48, 56, pull);
  const rotZ = lerp(-16, -24, pull) + (t - a) * -0.25;
  const panX = lerp(260, 0, pull) + (t - a) * -6;
  const wallOpacity = tw(t, a, a + 0.9) * (1 - tw(t, L1(6) - 0.1, t7 + 0.4, 0, 1, EIO));

  // the hand-held sequence of applications early in the shot
  const focus = [61, 62, 77, 78, 46, 93];
  const flyStart = [tApply, tRepeat, tRepeat + 0.22, tRepeat + 0.42, tRepeat + 0.6, tRepeat + 0.76];

  const permitP = tw(t, tPermit - 0.2, tPermit + 0.7, 0, 1, EIO);
  const sponsorP = tw(t, tSponsor - 0.2, tSponsor + 0.7, 0, 1, EIO);
  const scoreP = tw(t, tScore - 0.25, tScore + 0.5, 0, 1, EO);
  const everywhere = tw(t, tEverywhere - 0.3, tEverywhere + 1.6, 0, 1, EIO);

  const sent = Math.floor(lerp(0, 1, tw(t, tApply, tRepeat + 0.8, 0, 1, EIO)) * 6 + Math.max(0, (t - tRepeat - 0.8) * 9) * (t < tEverywhere ? 1 : 0)) + Math.floor(everywhere * 140);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(1400px 900px at 55% 45%, ${hexA("#1E1612", 0.9)}, ${C.ink} 70%)` }} />

      {/* the wall */}
      <AbsoluteFill style={{ perspective: 1700, perspectiveOrigin: "50% 40%", opacity: wallOpacity }}>
        <div
          style={{
            position: "absolute",
            left: 960 + panX,
            top: 560,
            width: COLS * (CW + GAP),
            height: ROWS * (CH + GAP),
            translate: "-50% -50%",
            transform: `rotateX(${rotX}deg) rotateZ(${rotZ}deg) scale(${scale})`,
            transformStyle: "preserve-3d",
          }}
        >
          {cards.map((cd) => {
            const fi = focus.indexOf(cd.i);
            const fly = fi >= 0 ? tw(t, flyStart[fi], flyStart[fi] + 0.9, 0, 1, EI) : 0;
            const appearAt = a + 0.1 + (cd.c + cd.r) * 0.025;
            const ap = tw(t, appearAt, appearAt + 0.6);
            const dimmed = (cd.group === "permit" ? permitP : cd.group === "sponsor" ? sponsorP : 0) * (fi >= 0 ? 0 : 1);
            const badge = cd.group !== "open" && cd.seed > 0.45 ? scoreP : 0;
            const pressed = fi === 0 ? tw(t, tClick, tClick + 0.25) : 0;
            const out = cd.seed < 0.85 ? everywhere : 0;
            const glowSel = fi === 0 ? tw(t, tSearch + 0.2, tClick) * (1 - fly) : 0;
            return (
              <div
                key={cd.i}
                style={{
                  position: "absolute",
                  left: cd.c * (CW + GAP),
                  top: cd.r * (CH + GAP),
                  width: CW,
                  height: CH,
                  borderRadius: 14,
                  background: dimmed > 0 ? `rgba(20,20,22,${1 - dimmed * 0.35})` : "#151517",
                  border: `1px solid ${glowSel > 0 ? hexA(C.ember, 0.5 + glowSel * 0.5) : hexA(C.paper, 0.09 + 0.05 * (1 - dimmed))}`,
                  boxShadow: glowSel > 0 ? `0 0 40px ${hexA(C.ember, 0.35 * glowSel)}` : undefined,
                  opacity: ap * (1 - fly) * (1 - dimmed * 0.62) * (1 - out * 0.25),
                  transform: `translate3d(${fly * 300}px, ${-fly * 120}px, ${fly * 700 + pressed * -6}px) rotateX(${-fly * 40}deg)`,
                  padding: 20,
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: hexA(cd.hue > 0.5 ? C.mist : C.paper, 0.16) }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 10, width: `${cd.w1 * 100}%`, borderRadius: 5, background: hexA(C.paper, 0.55) }} />
                    <div style={{ height: 8, width: `${cd.w2 * 100}%`, borderRadius: 4, background: hexA(C.paper, 0.22), marginTop: 9 }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
                  {[0.28, 0.2, 0.24].map((w, k) => (
                    <div key={k} style={{ height: 18, width: `${w * 100}%`, borderRadius: 99, border: `1px solid ${hexA(C.paper, 0.14)}` }} />
                  ))}
                </div>
                <div
                  style={{
                    position: "absolute",
                    right: 18,
                    bottom: 16,
                    padding: "6px 16px",
                    borderRadius: 99,
                    fontFamily: F.display,
                    fontSize: 15,
                    fontWeight: 600,
                    color: C.ink,
                    background: pressed > 0 ? C.emberHi : hexA(C.paper, 0.85),
                  }}
                >
                  Apply
                </div>
                {dimmed > 0.05 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 18,
                      bottom: 18,
                      fontFamily: F.mono,
                      fontSize: 12.5,
                      letterSpacing: "0.06em",
                      color: hexA(C.ember, dimmed),
                      textTransform: "uppercase",
                    }}
                  >
                    {cd.group === "permit" ? "Work permit required" : "No sponsorship"}
                  </div>
                )}
                {badge > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      right: 16,
                      top: 14,
                      scale: `${lerp(0.6, 1, badge)}`,
                      opacity: badge,
                      fontFamily: F.display,
                      fontWeight: 600,
                      fontSize: 18,
                      color: C.paper,
                      background: "#2A2A2E",
                      border: `1px solid ${hexA(C.paper, 0.25)}`,
                      borderRadius: 8,
                      padding: "3px 9px",
                    }}
                  >
                    {80 + Math.floor(cd.seed * 18)}% match
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* search field */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 96,
          opacity: tw(t, tSearch - 0.3, tSearch + 0.2) * (1 - tw(t, tVolume - 0.3, tVolume + 0.3)),
          width: 560,
          height: 64,
          borderRadius: 14,
          background: "rgba(20,20,22,0.9)",
          border: `1px solid ${C.line2}`,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          fontFamily: F.display,
          fontSize: 26,
          color: C.paper,
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" style={{ marginRight: 16 }}>
          <circle cx="10" cy="10" r="7" stroke={C.mist} strokeWidth="2" fill="none" />
          <path d="M15 15 L21 21" stroke={C.mist} strokeWidth="2" />
        </svg>
        {"software engineer · europe".slice(0, Math.floor(tw(t, tSearch, tSearch + 0.8, 0, 1, EIO) * 26))}
        <span style={{ opacity: Math.floor(t * 2.5) % 2 ? 1 : 0, color: C.ember, marginLeft: 2 }}>|</span>
      </div>

      {/* sent counter */}
      <div style={{ position: "absolute", right: 120, top: 96, textAlign: "right", opacity: tw(t, tApply - 0.2, tApply + 0.3) * (1 - tw(t, L1(6), t7 + 0.2)) }}>
        <Eyebrow size={14}>Applications sent</Eyebrow>
        <div style={{ fontFamily: F.serif, fontSize: 96, color: C.paper, lineHeight: 1, marginTop: 6 }}>{sent}</div>
      </div>

      {/* reply inbox */}
      <div
        style={{
          position: "absolute",
          right: 120,
          top: 300,
          width: 420,
          opacity: tw(t, tNothing - 0.3, tNothing + 0.3) * (1 - tw(t, L1(6), t7 + 0.2)),
          background: "rgba(18,18,20,0.92)",
          border: `1px solid ${C.line2}`,
          borderRadius: 16,
          padding: "22px 26px",
          fontFamily: F.display,
          color: C.paper,
        }}
      >
        <Eyebrow size={13}>Replies</Eyebrow>
        <div style={{ fontSize: 26, marginTop: 12, color: C.mist }}>Nothing yet.</div>
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ height: 12, width: `${80 - k * 18}%`, background: hexA(C.paper, 0.06), borderRadius: 6, marginTop: 16 }} />
        ))}
      </div>

      {/* a name, burning */}
      <NameBurn t={t} t0={tBurn - 0.3} />

      {/* line 7: typography */}
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 180, opacity: 1 - tw(t, end7 - 0.6, end7) }}>
        <Rise p={tw(t, t7 - 0.1, t7 + 0.7)} style={{ fontFamily: F.display, fontSize: 92, fontWeight: 500, color: C.mist, letterSpacing: "-0.03em" }}>
          <span>
            Not a{" "}
            <span style={{ position: "relative" }}>
              skills
              <span
                style={{
                  position: "absolute",
                  left: -6,
                  top: "56%",
                  height: 5,
                  width: `${tw(t, W(7, "skills") + 0.3, W(7, "skills") + 0.8, 0, 108, EIO)}%`,
                  background: C.ember,
                }}
              />
            </span>{" "}
            problem.
          </span>
        </Rise>
        <Rise p={tw(t, W(7, "information") - 0.35, W(7, "information") + 0.5)} style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 132, color: C.paper, letterSpacing: "-0.01em", marginTop: 10 }}>
          An <span style={{ color: C.ember }}>information</span> problem.
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const NameBurn: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const parts = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 90 }, () => ({ x: r() * 340, y: r() * 60, vx: (r() - 0.3) * 120, vy: -40 - r() * 140, d: 0.8 + r() * 1.4, s: 1 + r() * 3 }));
  }, []);
  const p = tw(t, t0, t0 + 2.2, 0, 1, EIO);
  if (t < t0 - 0.6) return null;
  const appear = tw(t, t0 - 0.6, t0);
  return (
    <div style={{ position: "absolute", left: 120, top: 860, opacity: appear * (1 - tw(t, t0 + 2.8, t0 + 3.4)) }}>
      <Eyebrow size={13}>Your reputation with recruiters</Eyebrow>
      <div
        style={{
          fontFamily: F.serif,
          fontSize: 76,
          color: C.paper,
          marginTop: 6,
          maskImage: `linear-gradient(90deg, transparent ${p * 110 - 10}%, black ${p * 110 + 8}%)`,
          WebkitMaskImage: `linear-gradient(90deg, transparent ${p * 110 - 10}%, black ${p * 110 + 8}%)`,
        }}
      >
        Your name
      </div>
      {parts.map((q, i) => {
        const st = t0 + (q.x / 340) * 1.8;
        const lt = t - st;
        if (lt < 0 || lt > q.d) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: q.x + q.vx * lt,
              top: 40 + q.y + q.vy * lt,
              width: q.s,
              height: q.s,
              borderRadius: 9,
              background: i % 3 ? C.ember : C.emberHi,
              opacity: 1 - lt / q.d,
              boxShadow: `0 0 8px ${C.ember}`,
            }}
          />
        );
      })}
    </div>
  );
};

export const _unused = [WE];
