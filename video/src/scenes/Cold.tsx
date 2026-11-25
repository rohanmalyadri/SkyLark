import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "../lib/theme";
import { EO, L0, L1, line, rng, tw, useT, W } from "../lib/time";
import { hexA } from "../lib/ui";

// Cold open: three lines slammed onto black, word by word, ending on a visa stamp and a white-flash cut.

/** Decaying camera shake after each hit (deterministic per hit). */
const shakeAt = (t: number, hits: number[], amp = 14) => {
  let x = 0, y = 0, r = 0;
  hits.forEach((h, i) => {
    const d = t - h;
    if (d < 0 || d > 0.35) return;
    const k = Math.pow(1 - d / 0.35, 2);
    const g = rng(i * 13 + 5);
    x += (g() - 0.5) * 2 * amp * k * Math.cos(d * 70);
    y += (g() - 0.5) * 2 * amp * k * Math.sin(d * 63);
    r += (g() - 0.5) * 0.6 * k;
  });
  return { x, y, r };
};

/** A word that slams in: scale down from big, motion blur, RGB split while moving. */
const Slam: React.FC<{ t: number; at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ t, at, children, style }) => {
  const p = tw(t, at - 0.02, at + 0.14, 0, 1, EO);
  if (t < at - 0.02) return <span style={{ ...style, opacity: 0 }}>{children}</span>;
  const split = (1 - p) * 18;
  return (
    <span
      style={{
        display: "inline-block",
        ...style,
        scale: `${1 + (1 - p) * 1.3}`,
        filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined,
        textShadow: split > 0.5 ? `${split}px 0 ${hexA("#FF2A2A", 0.8)}, ${-split}px 0 ${hexA("#2AE6FF", 0.6)}` : undefined,
        opacity: Math.min(1, p * 3),
      }}
    >
      {children}
    </span>
  );
};

/** Horizontal slice glitch used when one line knocks the previous one out. */
const Glitch: React.FC<{ t: number; at: number; children: React.ReactNode }> = ({ t, at, children }) => {
  const d = t - at;
  if (d > 0.16) return null;
  if (d < 0) return <>{children}</>;
  const g = rng(Math.floor(d * 60) + 3);
  return (
    <div style={{ position: "relative" }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ position: "absolute", inset: 0, clipPath: `inset(${i * 20}% 0 ${80 - i * 20}% 0)`, translate: `${(g() - 0.5) * 160}px 0`, opacity: 1 - d / 0.16 }}>
          {children}
        </div>
      ))}
      <div style={{ visibility: "hidden" }}>{children}</div>
    </div>
  );
};

const words = (id: number) => line(id).text.split(/\s+/);

export const Cold: React.FC = () => {
  const t = useT();
  const l1 = 101, l2 = 102, l3 = 103;
  const visa = W(l3, "visa");
  const cut = L0(1) - 0.45; // white-out, then the hook smashes in over it
  const hits = [...line(l1).words.map((w) => w.t), ...line(l2).words.map((w) => w.t), visa, visa + 0.02];
  const sh = shakeAt(t, hits, 10);
  const big = shakeAt(t, [visa], 34);

  const big1 = t < L0(l2) + 0.16;
  const big2 = t >= L0(l2) && t < L0(l3) + 0.16;
  const strike = tw(t, L1(l2) - 0.05, L1(l2) + 0.22, 0, 1, EO);
  const stampP = tw(t, visa - 0.03, visa + 0.12, 0, 1, EO);
  const flash = Math.max(t >= visa ? tw(t, visa, visa + 0.25, 0.55, 0) : 0, tw(t, cut - 0.05, cut, 0, 1) * (1 - tw(t, cut, cut + 0.2)));
  const redWash = tw(t, visa, visa + 0.5, 0.35, 0.12) * (t >= visa ? 1 : 0);

  const textStyle: React.CSSProperties = { fontFamily: F.display, fontWeight: 600, fontSize: 176, letterSpacing: "-0.045em", color: C.paper, lineHeight: 1 };
  const wordRow = (id: number, accentLast: boolean) => {
    const ws = words(id);
    const ts = line(id).words.map((w) => w.t);
    return ws.map((w, i) => {
      const last = i === ws.length - 1 && accentLast;
      return (
        <React.Fragment key={i}>
          <Slam t={t} at={ts[i] ?? L0(id)} style={last ? { ...textStyle, fontFamily: F.serif, fontStyle: "italic", fontWeight: 400, fontSize: 200, color: C.ember } : textStyle}>
            {w}
          </Slam>
          {i < ws.length - 1 && <span style={{ display: "inline-block", width: 34 }} />}
        </React.Fragment>
      );
    });
  };

  return (
    <AbsoluteFill style={{ background: C.ink, opacity: 1 - tw(t, cut + 0.1, cut + 0.12) }}>
      <AbsoluteFill style={{ background: `radial-gradient(1000px 700px at 50% 50%, ${hexA(C.ember, redWash)}, transparent 70%)` }} />
      <AbsoluteFill
        style={{
          translate: `${sh.x + big.x}px ${sh.y + big.y}px`,
          rotate: `${sh.r + big.r}deg`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {big1 && (
          <Glitch t={t} at={L0(l2)}>
            <div style={{ maxWidth: 1700 }}>{wordRow(l1, true)}</div>
          </Glitch>
        )}
        {big2 && (
          <Glitch t={t} at={L0(l3)}>
            <div style={{ position: "relative", maxWidth: 1700 }}>
              {wordRow(l2, false)}
              {/* strike through "skills." */}
              <div style={{ position: "absolute", right: 0, top: "54%", width: 540 * strike, height: 12, background: C.ember, boxShadow: `0 0 24px ${C.ember}` }} />
            </div>
          </Glitch>
        )}
        {t >= L0(l3) && (
          <div style={{ maxWidth: 1500, lineHeight: 1.1 }}>
            {words(l3).map((w, i) => {
              const at = line(l3).words[i]?.t ?? L0(l3);
              const isVisa = w.toLowerCase().startsWith("visa");
              return (
                <React.Fragment key={i}>
                  <Slam t={t} at={at} style={{ ...textStyle, fontSize: 112, color: isVisa ? C.ember : C.paper }}>
                    {w}
                  </Slam>
                  {i === 3 ? <br /> : <span style={{ display: "inline-block", width: 26 }} />}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </AbsoluteFill>

      {/* the stamp */}
      {t >= visa - 0.03 && (
        <div
          style={{
            position: "absolute",
            left: 960 - 330,
            top: 790,
            width: 660,
            padding: "22px 0",
            border: `8px solid ${C.ember}`,
            borderRadius: 14,
            color: C.ember,
            fontFamily: F.mono,
            fontWeight: 500,
            fontSize: 64,
            letterSpacing: "0.16em",
            textAlign: "center",
            rotate: "-7deg",
            scale: `${1 + (1 - stampP) * 1.6}`,
            opacity: Math.min(1, stampP * 2) * 0.92,
            mixBlendMode: "screen",
            translate: `${big.x * 0.5}px ${big.y * 0.5}px`,
          }}
        >
          VISA REQUIRED
          <div style={{ fontSize: 20, letterSpacing: "0.3em", marginTop: 6, opacity: 0.8 }}>sponsorship · not offered</div>
        </div>
      )}

      <AbsoluteFill style={{ background: "#fff", opacity: flash, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
