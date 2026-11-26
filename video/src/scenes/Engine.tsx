import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "../lib/theme";
import { EIO, EO, L0, L1, lerp, tw, useT, W } from "../lib/time";
import { Eyebrow, hexA, Rise } from "../lib/ui";

// Sequence E (part 2): the match engine. Arc WIDTH is the published weight; arc DEPTH is the
// factor's score. Example values are the README's worked example (India → Germany, score 86;
// the same role without sponsorship sums to 64 and is capped at 35).
const FACTORS = [
  { key: "skills", n: "Skills", w: 30, s: 81, word: "Skills" },
  { key: "eligibility", n: "Eligibility", w: 20, s: 75, s2: 0, word: "Eligibility" },
  { key: "experience", n: "Experience", w: 18, s: 100, word: "Experience" },
  { key: "location", n: "Location", w: 12, s: 82, word: "Location" },
  { key: "sponsorship", n: "Sponsorship", w: 8, s: 90, s2: 0, word: "Sponsorship" },
  { key: "preferences", n: "Preferences", w: 7, s: 100, word: "Preferences" },
  { key: "education", n: "Education", w: 5, s: 100, word: "education" },
];
const CODE = ["export const FACTOR_WEIGHTS = {", "  skills: 0.3,", "  experience: 0.18,", "  education: 0.05,", "  eligibility: 0.2,", "  location: 0.12,", "  sponsorship: 0.08,", "  preferences: 0.07,", "} as const;"];
const CODE_LINE: Record<string, number> = { skills: 1, experience: 2, education: 3, eligibility: 4, location: 5, sponsorship: 6, preferences: 7 };

const CX = 640;
const CY = 560;
const R0 = 175;
const R1 = 360;

const arcPath = (a0: number, a1: number, r0: number, r1: number) => {
  const p = (a: number, r: number) => [CX + Math.sin(a) * r, CY - Math.cos(a) * r];
  const [x0, y0] = p(a0, r1), [x1, y1] = p(a1, r1), [x2, y2] = p(a1, r0), [x3, y3] = p(a0, r0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0},${y0} A${r1},${r1} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 0 ${x3},${y3} Z`;
};

export const Engine: React.FC = () => {
  const t = useT();
  const a = L0(21) - 0.6;
  const tSum = W(23, "weighted");
  const tWont = W(24, "won't");
  const tCap = W(24, "capped");
  const t25 = L0(25);
  const end = L1(25) + 1.1;

  // angular layout
  let acc = 0;
  const GAP = 0.014;
  const segs = FACTORS.map((f) => {
    const a0 = acc * Math.PI * 2 + GAP;
    acc += f.w / 100;
    const a1 = acc * Math.PI * 2 - GAP;
    return { ...f, a0, a1, at: W(22, f.word) };
  });

  const fillP = tw(t, tSum - 0.4, tSum + 1.3, 0, 1, EIO);
  const blockP = tw(t, tWont - 0.1, tWont + 1.0, 0, 1, EIO);
  const capP = tw(t, tCap - 0.1, tCap + 0.6, 0, 1, EO);
  const score1 = Math.round(segs.reduce((s, f) => s + (f.s * f.w) / 100, 0) * fillP);
  const raw2 = Math.round(segs.reduce((s, f) => s + (((f.s2 ?? f.s) * blockP + f.s * (1 - blockP)) * f.w) / 100, 0));
  const shown = t < tWont - 0.1 ? score1 : t < tCap - 0.1 ? raw2 : Math.round(lerp(64, 35, capP));
  const ladder = tw(t, t25 - 0.3, t25 + 0.9, 0, 1, EIO);
  const swap = tw(t, W(25, "never") - 0.2, W(25, "outrank") + 0.5, 0, 1, EIO);

  const gaugeShift = lerp(0, -120, ladder);
  const gaugeScale = lerp(1, 0.78, ladder);

  return (
    <AbsoluteFill style={{ opacity: tw(t, a, a + 0.7) * (1 - tw(t, end - 0.6, end)) }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 700px at 33% 52%, ${hexA("#24140F", 0.9)}, ${C.ink} 72%)` }} />
      <AbsoluteFill style={{ opacity: 0.35, backgroundImage: `radial-gradient(${hexA(C.paper, 0.14)} 1px, transparent 1px)`, backgroundSize: "28px 28px", maskImage: "radial-gradient(ellipse 50% 60% at 33% 52%, black, transparent)", WebkitMaskImage: "radial-gradient(ellipse 50% 60% at 33% 52%, black, transparent)" }} />

      <div style={{ position: "absolute", inset: 0, translate: `${gaugeShift}px 0`, scale: `${gaugeScale}`, transformOrigin: `${CX}px ${CY}px` }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="10" height="10" fill={hexA(C.blocked, 0.5)} />
              <line x1="0" y1="0" x2="0" y2="10" stroke={hexA(C.ember, 0.55)} strokeWidth="3" />
            </pattern>
            <radialGradient id="segfill" cx={CX} cy={CY} r={R1} gradientUnits="userSpaceOnUse">
              <stop offset={R0 / R1} stopColor={C.emberDeep} />
              <stop offset="1" stopColor={C.emberHi} />
            </radialGradient>
          </defs>
          {/* fine orbit rings */}
          {[R0 - 30, R1 + 26, R1 + 120].map((r, i) => (
            <circle key={i} cx={CX} cy={CY} r={r} fill="none" stroke={hexA(C.paper, 0.08)} strokeDasharray={i === 2 ? "2 10" : undefined} opacity={tw(t, a + i * 0.2, a + 1 + i * 0.2)} />
          ))}
          {segs.map((g) => {
            const appear = tw(t, g.at - 0.25, g.at + 0.55, 0, 1, EIO);
            if (appear <= 0) return null;
            const a1 = lerp(g.a0, g.a1, appear);
            const blocked = g.s2 !== undefined ? blockP : 0;
            const sc = lerp(g.s, g.s2 ?? g.s, blocked) / 100;
            const rFill = R0 + (R1 - R0) * sc * fillP;
            return (
              <g key={g.key}>
                <path d={arcPath(g.a0, a1, R0, R1)} fill={hexA(C.paper, 0.05)} stroke={hexA(C.paper, 0.16)} strokeWidth={1} />
                {blocked > 0.05 && <path d={arcPath(g.a0, a1, R0, R1)} fill="url(#hatch)" opacity={blocked} />}
                {fillP > 0 && rFill > R0 + 1 && <path d={arcPath(g.a0, a1, R0, rFill)} fill="url(#segfill)" opacity={0.95} />}
              </g>
            );
          })}
        </svg>
        {/* labels around the dial */}
        {segs.map((g) => {
          const appear = tw(t, g.at - 0.1, g.at + 0.5, 0, 1, EIO);
          const mid = (g.a0 + g.a1) / 2;
          const r = R1 + 62;
          const x = CX + Math.sin(mid) * r;
          const y = CY - Math.cos(mid) * r;
          const right = Math.sin(mid) >= 0;
          const blocked = g.s2 !== undefined ? blockP : 0;
          return (
            <div key={g.key} style={{ position: "absolute", left: x, top: y, translate: `${right ? "0" : "-100%"} -50%`, opacity: appear, textAlign: right ? "left" : "right", whiteSpace: "nowrap" }}>
              <div style={{ fontFamily: F.display, fontSize: 30, fontWeight: 500, color: blocked > 0.5 ? C.ember : C.paper }}>{g.n}</div>
              <div style={{ fontFamily: F.mono, fontSize: 18, color: C.mist, marginTop: 4 }}>
                {g.w}% {fillP > 0.6 && <span style={{ color: blocked > 0.5 ? C.ember : C.faint }}>· {blocked > 0.5 ? "blocked" : Math.round(lerp(g.s, g.s2 ?? g.s, blocked))}</span>}
              </div>
            </div>
          );
        })}
        {/* centre score */}
        <div style={{ position: "absolute", left: CX, top: CY, translate: "-50% -50%", textAlign: "center", opacity: tw(t, tSum - 0.5, tSum + 0.2) }}>
          <div style={{ fontFamily: F.serif, fontSize: 150, lineHeight: 0.9, color: t > tCap ? C.paper : C.paper }}>{shown}</div>
          <Eyebrow size={14} color={t > tCap - 0.1 ? C.ember : C.dim} style={{ marginTop: 8 }}>
            {t < tWont - 0.1 ? "Match score" : t < tCap - 0.1 ? "Weighted sum" : "Capped"}
          </Eyebrow>
        </div>
      </div>

      {/* right column */}
      <div style={{ position: "absolute", left: 1170, top: 120, width: 640, opacity: 1 - ladder }}>
        <Eyebrow size={15} color={C.ember} style={{ opacity: tw(t, a, a + 0.6) }}>
          Match engine · match-v2.0
        </Eyebrow>
        <Rise p={tw(t, L0(21) - 0.2, L0(21) + 0.7)} style={{ fontFamily: F.display, fontSize: 50, fontWeight: 500, color: C.paper, marginTop: 14, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          Seven published weights
        </Rise>
        <div style={{ fontFamily: F.mono, fontSize: 19, color: C.faint, marginTop: 14, opacity: tw(t, L0(21) + 0.4, L0(21) + 1.2) }}>scoreMatch(profile, job, company)</div>
        <div
          style={{
            marginTop: 40,
            background: "rgba(16,16,18,0.9)",
            border: `1px solid ${C.line}`,
            borderRadius: 14,
            padding: "24px 28px",
            fontFamily: F.mono,
            fontSize: 22,
            lineHeight: 1.75,
            opacity: tw(t, L0(22) - 0.6, L0(22) + 0.2),
          }}
        >
          {CODE.map((ln, i) => {
            const f = segs.find((s) => CODE_LINE[s.key] === i);
            const lit = f ? tw(t, f.at - 0.2, f.at + 0.2) : 0;
            return (
              <div key={i} style={{ color: lit > 0 ? (t < f!.at + 1.2 ? C.emberHi : C.paper) : C.faint, whiteSpace: "pre" }}>
                {ln}
              </div>
            );
          })}
          <div style={{ marginTop: 14, whiteSpace: "pre", color: t > tCap - 0.2 ? C.emberHi : C.faint, opacity: tw(t, tWont, tWont + 0.6) }}>
            {"if (ineligible) score = Math.min(score, 35);"}
          </div>
        </div>
        <div style={{ marginTop: 26, fontFamily: F.display, fontSize: 22, color: C.mist, opacity: tw(t, tSum - 0.2, tSum + 0.6) }}>
          {t < tWont - 0.2 ? "Example: candidate in India, Berlin listing that offers sponsorship." : "Same role. The listing says it will not sponsor."}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 14, color: C.faint, marginTop: 8, letterSpacing: "0.1em", opacity: tw(t, tSum - 0.2, tSum + 0.6) }}>
          WORKED EXAMPLE FROM THE PROJECT README
        </div>
      </div>

      {/* ranking ladder */}
      <div style={{ position: "absolute", left: 1080, top: 300, width: 720, opacity: ladder }}>
        <Eyebrow size={15} color={C.mist}>
          Ranked for this candidate · illustrative
        </Eyebrow>
        {[
          { name: "Role you can't legally take", tag: "capped", score: 35, from: 0, to: 1, c: C.mist },
          { name: "Role you can take", tag: "eligible", score: 58, from: 1, to: 0, c: C.paper },
        ].map((r, i) => {
          const pos = lerp(r.from, r.to, swap);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                top: 60 + pos * 150,
                width: 720,
                height: 124,
                borderRadius: 16,
                background: i === 1 ? "rgba(26,26,28,0.95)" : "rgba(18,18,20,0.9)",
                border: `1px solid ${i === 1 ? hexA(C.ember, 0.5 * swap + 0.15) : C.line2}`,
                display: "flex",
                alignItems: "center",
                padding: "0 30px",
                gap: 26,
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontFamily: F.serif, fontSize: 64, color: i === 1 ? C.emberHi : C.mist, width: 90 }}>{r.score}</div>
              <div>
                <div style={{ fontFamily: F.display, fontSize: 30, color: r.c, fontWeight: 500 }}>{r.name}</div>
                <Eyebrow size={13} color={i === 1 ? C.mint : C.ember} style={{ marginTop: 8 }}>
                  {r.tag}
                </Eyebrow>
              </div>
              <div style={{ marginLeft: "auto", fontFamily: F.mono, fontSize: 22, color: C.faint }}>#{Math.round(pos) + 1}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
