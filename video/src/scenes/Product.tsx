import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, F } from "../lib/theme";
import { EI, EIO, EO, L0, L1, lerp, tw, useT, W, win } from "../lib/time";
import { Callout, Caption, Cursor, Eyebrow, hexA, Rise, Screen, Spot } from "../lib/ui";
import boxes from "../../public/shots/boxes.json";

// Sequence D: the real product, captured from the running app (demo mode, fictional sample data).
const Stage: React.FC<{ children: React.ReactNode; opacity: number; persp?: number }> = ({ children, opacity, persp = 2200 }) => (
  <AbsoluteFill style={{ opacity, perspective: persp, perspectiveOrigin: "50% 45%" }}>{children}</AbsoluteFill>
);

const Title: React.FC<{ t: number; t0: number; t1: number; kicker: string; title: string; x?: number; y?: number }> = ({ t, t0, t1, kicker, title, x = 120, y = 92 }) => {
  const p = tw(t, t0, t0 + 0.8, 0, 1, EIO);
  const o = 1 - tw(t, t1 - 0.5, t1, 0, 1, EIO);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o }}>
      <Eyebrow size={15} color={C.ember} style={{ opacity: p }}>
        {kicker}
      </Eyebrow>
      <Rise p={p} style={{ fontFamily: F.display, fontWeight: 500, fontSize: 50, color: C.paper, letterSpacing: "-0.02em", marginTop: 12 }}>
        {title}
      </Rise>
    </div>
  );
};

const Chip: React.FC<{ label: string; value: string; style?: React.CSSProperties; ok?: number }> = ({ label, value, style, ok = 0 }) => (
  <div
    style={{
      position: "absolute",
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 22px",
      borderRadius: 14,
      background: "rgba(22,22,24,0.94)",
      border: `1px solid ${ok > 0 ? hexA(C.mint, 0.4 + ok * 0.4) : C.line2}`,
      boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    <Eyebrow size={13} color={C.ember}>
      {label}
    </Eyebrow>
    <span style={{ fontFamily: F.display, fontSize: 27, color: C.paper, fontWeight: 500 }}>{value}</span>
  </div>
);

const SKILLS = ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"];

export const Product: React.FC = () => {
  const t = useT();
  const s10 = L0(10), s11 = L0(11), s12 = L0(12), s13 = L0(13), s14 = L0(14), s15 = L0(15), s16 = L0(16), e16 = L1(16) + 1.0;

  // ---------- 10 · one profile ----------
  const w10 = win(t, s10 - 0.6, s11 + 0.5, 0.7, 0.6);
  const prof = tw(t, s10 - 0.4, s10 + 1.6, 0, 1, EO);
  const extract = (word: string) => tw(t, W(10, word) - 0.15, W(10, word) + 0.9, 0, 1, EIO);

  // ---------- 11 · validation ----------
  const w11 = win(t, s11 - 0.3, s12 + 0.3, 0.5, 0.5);
  const gates: [string, number][] = [
    ["Curated taxonomy", W(11, "taxonomy")],
    ["Stack Overflow tags", W(11, "Overflow")],
    ["ESCO", W(11, "Esko")],
  ];
  const dnsP = tw(t, W(11, "email") - 0.2, W(11, "verified") + 0.3, 0, 1, EIO);

  // ---------- 12 · dashboard ----------
  const w12 = win(t, s12 - 0.3, s13 + 0.3, 0.6, 0.5);
  const d12 = tw(t, s12 - 0.3, s13, 0, 1, EIO);
  const spotStats = win(t, W(12, "new") - 0.2, W(12, "today's") - 0.1, 0.4, 0.3);
  const spotToday = win(t, W(12, "today's") - 0.1, s13 + 0.2, 0.4, 0.3);

  // ---------- 13 · why it fits ----------
  const w13 = win(t, s13 - 0.3, s14 + 0.3, 0.6, 0.5);
  const scroll13 = tw(t, W(13, "Seven") - 0.6, W(13, "Seven") + 0.8, 0, 260, EIO);
  const spotScore = win(t, W(13, "why") - 0.2, W(13, "Seven") - 0.1, 0.4, 0.3);
  const rowK = tw(t, W(13, "Seven"), W(13, "read") + 0.2, 0, 6.99, EIO);
  const spotRows = win(t, W(13, "Seven") - 0.1, s14 + 0.2, 0.3, 0.3);

  // ---------- 14 · tailoring ----------
  const w14 = win(t, s14 - 0.3, s15 + 0.3, 0.6, 0.5);
  const acc = (boxes as Record<string, Record<string, { x: number; y: number; width: number; height: number }>>)["tailor-a"].accept;
  const tClickAt = W(14, "accept") - 0.15;
  const curMove = tw(t, W(14, "reason") - 0.2, tClickAt - 0.05, 0, 1, EIO);
  const clicked = t >= tClickAt;
  const cx = lerp(1340, acc.x + acc.width / 2, curMove);
  const cy = lerp(880, acc.y + acc.height / 2 + 4, curMove);
  const spotTabs = win(t, W(14, "drafts") - 0.2, W(14, "Every") - 0.1, 0.4, 0.3);
  const callReason = tw(t, W(14, "reason") - 0.3, W(14, "reason") + 0.6);

  // ---------- 15 · specialist ----------
  const w15 = win(t, s15 - 0.3, s16 + 0.3, 0.6, 0.5);
  const spotCheck = win(t, W(15, "checklist") - 0.5, W(15, "submit") + 0.2, 0.4, 0.4);
  const receipt = tw(t, W(15, "submit") - 0.1, W(15, "reference") + 0.6, 0, 1, EIO);

  // ---------- 16 · tracker ----------
  const w16 = win(t, s16 - 0.3, e16, 0.6, 0.8);
  const pan16 = tw(t, s16, L1(16), 0, 1, EIO);
  const colAt = (w: string) => W(16, w);
  const spotSaved = win(t, colAt("saved") - 0.2, colAt("applied") - 0.1, 0.3, 0.25);
  const spotApplied = win(t, colAt("applied") - 0.1, colAt("interview") - 0.1, 0.3, 0.25);
  const phones = tw(t, colAt("applied") + 0.2, colAt("interview") + 0.6, 0, 1, EO);

  const caption = win(t, s10, e16, 1, 0.8);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1500px 900px at 70% 30%, ${hexA("#2A1710", 0.75)}, transparent 70%), radial-gradient(900px 700px at 10% 90%, ${hexA("#16181F", 0.8)}, transparent 70%), ${C.ink}`,
        }}
      />

      {/* 10 · profile + resume extraction */}
      {w10 > 0 && (
        <Stage opacity={w10}>
          <div
            style={{
              position: "absolute",
              left: 150,
              top: 300,
              width: 380,
              height: 500,
              borderRadius: 10,
              background: "linear-gradient(180deg,#F7F5F1,#E9E5DE)",
              transform: `rotateY(${lerp(38, 24, prof)}deg) rotateZ(-3deg) translateZ(${lerp(-200, 0, prof)}px)`,
              boxShadow: "0 50px 90px rgba(0,0,0,0.6)",
              padding: 34,
              boxSizing: "border-box",
              opacity: tw(t, s10 - 0.5, s10 + 0.3),
            }}
          >
            <div style={{ height: 16, width: "55%", background: "#2B2B2E", borderRadius: 4 }} />
            <div style={{ height: 9, width: "38%", background: "#9A958E", borderRadius: 4, marginTop: 12 }} />
            {Array.from({ length: 14 }, (_, i) => (
              <div key={i} style={{ height: 7, width: `${[92, 85, 70, 0, 88, 80, 74, 90, 0, 86, 60, 82, 76, 66][i]}%`, background: "#BDB7AE", borderRadius: 4, marginTop: i === 3 || i === 8 ? 26 : 12 }} />
            ))}
            <Eyebrow size={12} color="#77726B" style={{ position: "absolute", left: 34, bottom: 24 }}>
              resume.pdf
            </Eyebrow>
            {/* scan beam */}
            <div style={{ position: "absolute", left: 0, right: 0, top: `${tw(t, s10 + 0.4, W(10, "experience") + 0.4, 0, 100, EIO)}%`, height: 3, background: C.ember, boxShadow: `0 0 24px ${C.ember}`, opacity: win(t, s10 + 0.4, W(10, "experience") + 0.6, 0.2, 0.3) }} />
          </div>
          <Screen
            src="profile.png"
            width={1080}
            style={{
              left: 690,
              top: 250,
              transform: `rotateY(${lerp(-26, -13, prof)}deg) translateZ(${lerp(-300, 0, prof)}px)`,
              opacity: prof,
            }}
            sheen={tw(t, s10 + 0.4, s10 + 2.2)}
          />
          {[
            ["Headline", "Senior Full-Stack Engineer", "headline", 380],
            ["Skills", SKILLS.join(" · "), "skills", 470],
            ["Experience", "7 years · Senior", "experience", 560],
          ].map(([k, v, word, y], i) => {
            const p = extract(word as string);
            return (
              <Chip
                key={i}
                label={k as string}
                value={v as string}
                style={{
                  left: lerp(330, 760, p),
                  top: lerp(420 + i * 60, y as number, p) + (1 - tw(t, s11 - 0.2, s11 + 0.4, 0, 1, EIO)) * 0,
                  opacity: Math.min(p * 2, 1) * (1 - tw(t, s11 - 0.1, s11 + 0.3)),
                  scale: `${lerp(0.7, 1, p)}`,
                }}
              />
            );
          })}
          <Title t={t} t0={s10 - 0.3} t1={s11 + 0.4} kicker="01 · Profile" title="One profile, built from your resume" />
        </Stage>
      )}

      {/* 11 · validation gates */}
      {w11 > 0 && (
        <Stage opacity={w11} persp={1600}>
          <AbsoluteFill style={{ opacity: 0.16, filter: "blur(10px) grayscale(1)" }}>
            <Img src={staticFile("shots/profile.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(1100px 600px at 50% 55%, transparent, ${C.ink} 85%)` }} />
          {gates.map(([label, at], gi) => {
            const lit = tw(t, at - 0.1, at + 0.4, 0, 1, EIO);
            const gx = 600 + gi * 360;
            return (
              <div key={gi} style={{ position: "absolute", left: gx - 80, top: 310, width: 160, height: 470 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: `2px solid ${lit > 0 ? hexA(C.mint, 0.35 + 0.55 * lit) : C.line2}`,
                    transform: "rotateY(62deg)",
                    boxShadow: lit > 0 ? `0 0 50px ${hexA(C.mint, 0.25 * lit)}, inset 0 0 40px ${hexA(C.mint, 0.18 * lit)}` : undefined,
                    opacity: tw(t, s11 - 0.2 + gi * 0.15, s11 + 0.5 + gi * 0.15),
                  }}
                />
                <div style={{ position: "absolute", top: 500, left: 80, translate: "-50% 0", textAlign: "center", whiteSpace: "nowrap", opacity: tw(t, s11 + gi * 0.15, s11 + 0.6 + gi * 0.15) }}>
                  <Eyebrow size={15} color={lit > 0.5 ? C.mint : C.mist}>
                    {label}
                  </Eyebrow>
                  <div style={{ fontFamily: F.display, fontSize: 30, color: C.mint, marginTop: 8, opacity: lit }}>✓</div>
                </div>
              </div>
            );
          })}
          {SKILLS.map((s, i) => {
            const prog = tw(t, s11 + 0.2 + i * 0.12, W(11, "Esko") + 0.8 + i * 0.12, 0, 1, EIO);
            const x = lerp(230, 1500, prog);
            const passed = gates.filter(([, at], gi) => x > 600 + gi * 360 && t > at).length;
            return (
              <div
                key={s}
                style={{
                  position: "absolute",
                  left: x,
                  top: 390 + i * 62,
                  translate: "-50% 0",
                  padding: "9px 22px",
                  borderRadius: 99,
                  fontFamily: F.display,
                  fontSize: 26,
                  fontWeight: 500,
                  color: C.paper,
                  background: "rgba(24,24,26,0.95)",
                  border: `1px solid ${passed === 3 ? hexA(C.mint, 0.8) : C.line2}`,
                  opacity: tw(t, s11 - 0.1 + i * 0.1, s11 + 0.4 + i * 0.1),
                  whiteSpace: "nowrap",
                }}
              >
                {s}
                <span style={{ marginLeft: 10, color: C.mint, opacity: passed === 3 ? 1 : 0 }}>✓</span>
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 960, top: 880, translate: "-50% 0", display: "flex", alignItems: "center", gap: 22, opacity: dnsP }}>
            <span style={{ fontFamily: F.mono, fontSize: 24, color: C.paper }}>ananya@</span>
            <span style={{ fontFamily: F.mono, fontSize: 24, color: C.mint }}>example-domain</span>
            <span style={{ width: 120 * dnsP, height: 1, background: C.mist }} />
            <Eyebrow size={15} color={C.mist}>
              MX / DNS lookup
            </Eyebrow>
            <span style={{ fontFamily: F.display, fontSize: 28, color: C.mint, opacity: tw(t, W(11, "verified") - 0.1, W(11, "verified") + 0.3) }}>✓</span>
          </div>
          <Title t={t} t0={s11 - 0.2} t1={s12 + 0.3} kicker="Checked on the server" title="Every field, validated" />
        </Stage>
      )}

      {/* 12 · dashboard */}
      {w12 > 0 && (
        <Stage opacity={w12}>
          <Screen
            src="dashboard.png"
            width={1380}
            style={{ left: 270, top: lerp(240, 196, d12), transform: `rotateX(${lerp(18, 4, d12)}deg) rotateY(${lerp(-6, 2, d12)}deg) translateZ(${lerp(-260, 0, d12)}px)` }}
            sheen={tw(t, s12, s12 + 2)}
          >
            <Spot x={296} y={270} w={1242} h={118} a={spotStats} dim={0.55} />
            <Spot x={296} y={410} w={1242} h={330} a={spotToday} dim={0.55} />
          </Screen>
          <Title t={t} t0={s12 - 0.2} t1={s13 + 0.3} kicker="02 · Dashboard" title="Matches, applications, today's progress" y={70} />
        </Stage>
      )}

      {/* 13 · job detail: seven factors */}
      {w13 > 0 && (
        <Stage opacity={w13}>
          <Screen
            src="job-detail-full.png"
            width={1240}
            aspect={0.66}
            imgH={2226}
            scrollY={scroll13}
            style={{ left: 560, top: 175, transform: `rotateY(${lerp(-10, -4, tw(t, s13, s14, 0, 1, EIO))}deg)` }}
          >
            <Spot x={296} y={355} w={450} h={110} a={spotScore} />
            <Spot x={300} y={474 + Math.floor(rowK) * 92} w={872} h={84} a={spotRows} dim={0.45} />
          </Screen>
          <div style={{ position: "absolute", left: 110, top: 330, width: 400 }}>
            <Eyebrow size={15} color={C.ember} style={{ opacity: tw(t, s13 - 0.2, s13 + 0.4) }}>
              03 · Why it fits
            </Eyebrow>
            <Rise p={tw(t, s13 - 0.1, s13 + 0.7)} style={{ fontFamily: F.display, fontSize: 52, fontWeight: 500, color: C.paper, marginTop: 14, letterSpacing: "-0.02em", lineHeight: 1.08 }}>
              Seven factors.
            </Rise>
            <Rise p={tw(t, W(13, "sentence") - 0.3, W(13, "sentence") + 0.5)} style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 54, color: C.mist, marginTop: 8, lineHeight: 1.05 }}>
              Each with a reason you can read.
            </Rise>
            <div style={{ marginTop: 40, opacity: spotRows }}>
              {["Skills", "Experience", "Education", "Eligibility", "Location", "Sponsorship", "Preferences"].map((n, k) => (
                <div key={n} style={{ fontFamily: F.mono, fontSize: 19, color: Math.floor(rowK) === k ? C.ember : C.faint, marginTop: 8, letterSpacing: "0.06em" }}>
                  {String(k + 1).padStart(2, "0")} {n.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </Stage>
      )}

      {/* 14 · tailoring with accept */}
      {w14 > 0 && (
        <Stage opacity={w14}>
          <Screen
            src={clicked ? "tailor-b.png" : "tailor-a.png"}
            width={1500}
            style={{ left: 210, top: 200, transform: `rotateX(${lerp(10, 2, tw(t, s14 - 0.3, s14 + 1.5, 0, 1, EIO))}deg) scale(${lerp(0.94, 0.99, tw(t, W(14, "reason"), s15, 0, 1, EIO))})`, transformOrigin: "70% 40%" }}
          >
            <Spot x={300} y={236} w={460} h={40} a={spotTabs} dim={0.5} />
            <Cursor x={cx} y={cy} click={clicked ? tw(t, tClickAt, tClickAt + 0.6, 0, 1, EO) : -1} opacity={tw(t, W(14, "reason") - 0.4, W(14, "reason")) * (1 - tw(t, s15 - 0.6, s15))} scale={1.5} />
            {callReason > 0 && <Callout x={330} y={626} dx={-10} dy={150} p={callReason} label="Every change carries its reason" />}
          </Screen>
          <Title t={t} t0={s14 - 0.2} t1={s15 + 0.3} kicker="04 · Tailoring" title="AI drafts. You decide." y={70} />
        </Stage>
      )}

      {/* 15 · specialist review + receipt */}
      {w15 > 0 && (
        <Stage opacity={w15}>
          <Screen
            src="ops-review-detail.png"
            width={1340}
            style={{ left: 120, top: 210, transform: `rotateY(${lerp(12, 6, tw(t, s15, s16, 0, 1, EIO))}deg) translateZ(${lerp(-120, 0, tw(t, s15 - 0.3, s15 + 1.2, 0, 1, EIO))}px)` }}
          >
            <Spot x={1188} y={346} w={340} h={262} a={spotCheck} dim={0.5} />
          </Screen>
          <div
            style={{
              position: "absolute",
              left: 1370,
              top: 300,
              width: 440,
              transform: `translateY(${(1 - receipt) * 60}px) rotateY(-14deg)`,
              opacity: receipt,
              background: "linear-gradient(180deg,#F7F4EE,#ECE7DF)",
              borderRadius: 12,
              padding: "28px 30px",
              boxShadow: "0 50px 100px rgba(0,0,0,0.65)",
              clipPath: `inset(0 0 ${(1 - receipt) * 100}% 0)`,
              color: "#1D1D1F",
              fontFamily: F.display,
            }}
          >
            <Eyebrow size={13} color="#8A847C">
              Submission receipt
            </Eyebrow>
            <div style={{ fontSize: 30, fontWeight: 600, marginTop: 10, letterSpacing: "-0.01em" }}>Applied</div>
            <div style={{ height: 1, background: "#D4CEC4", margin: "18px 0" }} />
            {["Portal", "Confirmation reference", "Recorded by", "Submitted"].map((k, i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: i ? 16 : 0, fontSize: 21 }}>
                <span style={{ color: "#6B665F" }}>{k}</span>
                <span style={{ width: [120, 150, 110, 90][i], height: 12, borderRadius: 6, background: i === 1 ? hexA(C.ember, 0.7) : "#C9C2B7" }} />
              </div>
            ))}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: -10, height: 10, background: "radial-gradient(circle at 10px -2px, transparent 8px, #ECE7DF 9px) 0 0 / 20px 10px repeat-x" }} />
          </div>
          <Title t={t} t0={s15 - 0.2} t1={s16 + 0.3} kicker="05 · Specialist review" title="A person checks before it is sent" y={70} />
        </Stage>
      )}

      {/* 16 · tracker + phones */}
      {w16 > 0 && (
        <Stage opacity={w16}>
          <Screen
            src="tracker.png"
            width={1500}
            style={{
              left: lerp(260, 120, pan16),
              top: 220,
              transform: `rotateY(${lerp(-8, 6, pan16)}deg) translateZ(${lerp(0, -260, phones)}px)`,
              opacity: 1 - phones * 0.55,
            }}
          >
            <Spot x={290} y={276} w={282} h={320} a={spotSaved} dim={0.5} />
            <Spot x={1142} y={276} w={284} h={320} a={spotApplied} dim={0.5} />
          </Screen>
          {["mobile-dashboard.png", "mobile-jobs.png", "mobile-tracker.png"].map((src, i) => {
            const p = tw(t, colAt("applied") + 0.2 + i * 0.12, colAt("interview") + 0.6 + i * 0.12, 0, 1, EO);
            return (
              <div
                key={src}
                style={{
                  position: "absolute",
                  left: 700 + i * 300,
                  top: 260 + (1 - p) * 500 + (i === 1 ? -30 : 0),
                  width: 260,
                  height: 563,
                  borderRadius: 34,
                  overflow: "hidden",
                  border: "6px solid #1C1C1F",
                  boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
                  opacity: p,
                  transform: `rotateY(${-10 + i * 6}deg)`,
                }}
              >
                <Img src={staticFile(`shots/${src}`)} style={{ width: "100%", display: "block" }} />
              </div>
            );
          })}
          <Title t={t} t0={s16 - 0.2} t1={e16} kicker="06 · Tracker" title="Saved, applied, interview" y={70} />
        </Stage>
      )}

      <Caption opacity={caption}>Real interface · demo mode with fictional sample data</Caption>
    </AbsoluteFill>
  );
};

export const _p = [EI];
