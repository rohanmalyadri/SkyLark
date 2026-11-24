import React from "react";
import { AbsoluteFill } from "remotion";
import { Logo } from "./components/Logo";
import { C, F } from "./lib/theme";
import { Eyebrow, hexA, Screen } from "./lib/ui";

// Video thumbnail: official logo, one line of positioning, two real screens.
export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(1200px 800px at 78% 40%, ${hexA("#3A1C12", 0.8)}, transparent 70%), ${C.ink}` }}>
    <AbsoluteFill style={{ perspective: 2000 }}>
      <Screen src="dashboard.png" width={900} style={{ left: 880, top: 120, transform: "rotateY(-18deg) rotateX(4deg) translateZ(-260px)", filter: "brightness(0.55)" }} />
      <Screen src="job-detail.png" width={1040} style={{ left: 980, top: 330, transform: "rotateY(-18deg) rotateX(4deg)" }} />
    </AbsoluteFill>
    <AbsoluteFill style={{ background: `linear-gradient(90deg, ${C.ink} 30%, transparent 62%)` }} />
    <div style={{ position: "absolute", left: 110, top: 250 }}>
      <Logo t={99} width={560} reflection={false} />
    </div>
    <div style={{ position: "absolute", left: 110, top: 500, width: 820 }}>
      <div style={{ fontFamily: F.serif, fontSize: 92, lineHeight: 1.02, color: C.paper }}>
        Apply where you can <span style={{ fontStyle: "italic", color: C.ember }}>actually work.</span>
      </div>
      <Eyebrow size={20} color={C.mist} style={{ marginTop: 36 }}>
        The product film · skylarkgo.in
      </Eyebrow>
    </div>
  </AbsoluteFill>
);
