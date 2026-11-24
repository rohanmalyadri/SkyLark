import React from "react";
import { AbsoluteFill } from "remotion";
import { Logo, LOGO_ASPECT } from "../components/Logo";
import { C, F } from "../lib/theme";
import { EIO, L0, L1, tw, useT, W, TL } from "../lib/time";
import { CharReveal, Eyebrow, hexA, Rise } from "../lib/ui";

// Sequence H: the thesis, then the official logo and the address.
export const Close: React.FC = () => {
  const t = useT();
  const a = L0(35) - 0.7;
  const s36 = L0(36);
  const logo0 = L1(36) + 0.15;
  const tag = W(37, "Your");
  const total = TL.total;

  const p35 = 1 - tw(t, s36 - 0.4, s36 + 0.1, 0, 1, EIO);
  const p36 = 1 - tw(t, logo0 - 0.5, logo0 + 0.2, 0, 1, EIO);
  const lw = 820;

  return (
    <AbsoluteFill style={{ opacity: tw(t, a, a + 0.6) * (1 - tw(t, total - 1.4, total - 0.1, 0, 1, EIO)) }}>
      <AbsoluteFill style={{ background: `radial-gradient(1100px 700px at 50% 45%, ${hexA(C.ember, 0.07 * tw(t, logo0, logo0 + 3))}, transparent 70%), ${C.ink}` }} />

      {/* 35 */}
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 180, opacity: p35 }}>
        <Rise p={tw(t, W(35, "send") - 0.3, W(35, "send") + 0.5)} style={{ fontFamily: F.display, fontSize: 84, fontWeight: 500, color: C.mist, letterSpacing: "-0.03em" }}>
          Not more applications.
        </Rise>
        <Rise p={tw(t, W(35, "right") - 0.4, W(35, "right") + 0.4)} style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 128, color: C.paper, marginTop: 6 }}>
          The right ones<span style={{ color: C.ember }}>,</span>
        </Rise>
        <Rise p={tw(t, W(35, "show") - 0.3, W(35, "show") + 0.4)} style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 128, color: C.ember, marginTop: -6 }}>
          and why.
        </Rise>
      </AbsoluteFill>

      {/* 36 */}
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", opacity: p36 * tw(t, s36 - 0.2, s36 + 0.2) }}>
        {[
          ["Fewer applications.", "Fewer"],
          ["Better reasons.", "Better"],
          ["A person checking every one.", "person"],
        ].map(([s, w], i) => {
          const at = W(36, w);
          const next = i < 2 ? W(36, ["Better", "person"][i]) : 1e9;
          return (
            <div key={s} style={{ fontFamily: F.serif, fontSize: 104, lineHeight: 1.12, color: t > next - 0.2 ? hexA(C.paper, 0.35) : C.paper, textAlign: "center" }}>
              <CharReveal text={s} t={t} t0={at - 0.15} stagger={0.018} dur={0.55} />
            </div>
          );
        })}
      </AbsoluteFill>

      {/* 37 · logo + address */}
      {t > logo0 - 0.1 && (
        <>
          <div style={{ position: "absolute", left: 960 - lw / 2, top: 380 - (lw * LOGO_ASPECT) / 2 }}>
            <Logo t={t - logo0} width={lw} speed={1.25} reflection={false} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center" }}>
            <Rise p={tw(t, tag - 0.2, tag + 0.8, 0, 1, EIO)} style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 64, color: C.paper }}>
              Your next move, already in motion.
            </Rise>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 790, display: "flex", justifyContent: "center", gap: 56, opacity: tw(t, W(37, "motion") + 0.4, W(37, "motion") + 1.4) }}>
            <span style={{ fontFamily: F.display, fontSize: 34, fontWeight: 500, color: C.paper }}>
              www.skylarkgo<span style={{ color: C.ember }}>.</span>in
            </span>
            <span style={{ fontFamily: F.mono, fontSize: 24, color: C.mist, alignSelf: "center" }}>github.com/rohanmalyadri/SkyLark</span>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center", opacity: tw(t, W(37, "motion") + 1.0, W(37, "motion") + 2.0) }}>
            <Eyebrow size={13} color={C.faint}>
              Team Synapse X · Rohan Malyadri · Meda Abhiram · An Obscuron X Labs product
            </Eyebrow>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
