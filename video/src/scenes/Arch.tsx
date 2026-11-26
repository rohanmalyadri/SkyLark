import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "../lib/theme";
import { EI, EIO, EO, L0, L1, lerp, tw, useT, W, win } from "../lib/time";
import { Eyebrow, hexA, Rise } from "../lib/ui";

// Sequence F: the architecture as an exploded stack, then three close-ups (policy tests, the AI
// provider seam, the background queue). Every labelled part exists in the repository.

const SW = 1040; // slab width
const SD = 560; // slab depth

const Tile: React.FC<{ x: number; y: number; w: number; h: number; label: string; sub?: string; p: number; color?: string; z?: number }> = ({ x, y, w, h, label, sub, p, color = C.paper, z = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 12,
      background: hexA(color, 0.08 + 0.06 * p),
      border: `1.5px solid ${hexA(color, 0.25 + 0.55 * p)}`,
      transform: `translateZ(${z + p * 26}px)`,
      opacity: Math.min(1, p * 1.4),
      boxShadow: p > 0.5 ? `0 0 30px ${hexA(color, 0.18)}` : undefined,
      padding: "16px 20px",
      boxSizing: "border-box",
      fontFamily: F.display,
      color: C.paper,
    }}
  >
    <div style={{ fontSize: 27, fontWeight: 500, letterSpacing: "-0.01em" }}>{label}</div>
    {sub && <div style={{ fontFamily: F.mono, fontSize: 16, color: C.mist, marginTop: 6 }}>{sub}</div>}
  </div>
);

const Slab: React.FC<{ z: number; label: string; p: number; children?: React.ReactNode; tint?: string; x?: number; thin?: boolean; opacity?: number }> = ({ z, label, p, children, tint = C.paper, x = 0, thin, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: -SW / 2 + x,
      top: -SD / 2,
      width: SW,
      height: SD,
      transform: `translateZ(${z}px)`,
      transformStyle: "preserve-3d",
      opacity: p * opacity,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 22,
        background: thin ? `linear-gradient(135deg, ${hexA(C.ember, 0.22)}, ${hexA(C.ember, 0.05)})` : `linear-gradient(135deg, rgba(34,33,36,0.96), rgba(18,18,20,0.96))`,
        border: `1.5px solid ${thin ? hexA(C.ember, 0.8) : hexA(tint, 0.32)}`,
        boxShadow: thin ? `0 0 60px ${hexA(C.ember, 0.35)}` : "0 40px 80px rgba(0,0,0,0.5)",
      }}
    />
    <div style={{ position: "absolute", left: 30, top: 22, fontFamily: F.mono, fontSize: 18, letterSpacing: "0.16em", textTransform: "uppercase", color: thin ? C.emberHi : C.mist }}>{label}</div>
    {children}
  </div>
);

export const Arch: React.FC = () => {
  const t = useT();
  const a = L0(26) - 0.7;
  const s29 = L0(29), s30 = L0(30), s31 = L0(31), end = L1(31) + 1.0;

  // ---------- stack (26–28) ----------
  const wStack = win(t, a, s29 + 0.4, 0.8, 0.7);
  const explode = tw(t, L0(26) - 0.3, L0(26) + 2.2, 0, 1, EIO);
  const gap = lerp(30, 170, explode);
  const orbit = lerp(-34, -44, tw(t, a, s29, 0, 1, EIO));
  const tilt = lerp(62, 56, tw(t, a, s29, 0, 1, EIO));
  const zoom = lerp(0.98, 1.08, tw(t, a, s29, 0, 1, EIO));
  const pw = (word: string, line = 26, nth = 0) => tw(t, W(line, word, nth) - 0.2, W(line, word, nth) + 0.5, 0, 1, EIO);
  const swapMem = tw(t, W(28, "seeded") - 0.4, W(28, "store") + 0.4, 0, 1, EIO);
  const layerP = (i: number) => tw(t, a + 0.2 + i * 0.18, a + 1.0 + i * 0.18);

  // packets travelling down and up through the stack
  const packets = Array.from({ length: 9 }, (_, i) => {
    const ph = ((t - a) * 0.42 + i / 9) % 1;
    const down = i % 2 === 0;
    const k = down ? ph : 1 - ph;
    return { x: -360 + (i % 5) * 180, y: -140 + ((i * 97) % 260), z: lerp(4 * gap + 40, -1 * gap, k), o: Math.sin(Math.PI * ph) * tw(t, W(27, "talks") - 0.4, W(27, "talks") + 0.4) };
  });

  // ---------- 29 · policy tests ----------
  const w29 = win(t, s29 - 0.4, s30 + 0.05, 0.6, 0.5);
  const probe = tw(t, W(29, "proves") - 0.2, W(29, "read") + 0.2, 0, 1, EIO);
  const hit = probe > 0.62;
  const bounce = hit ? tw(t, W(29, "read"), W(29, "data") + 0.6, 0, 1, EO) : 0;
  const pass = tw(t, W(29, "data") - 0.2, W(29, "data") + 0.5);

  // ---------- 30 · AI provider ----------
  const w30 = win(t, s30 - 0.4, s31 + 0.05, 0.6, 0.5);
  const down = tw(t, W(30, "unavailable") - 0.2, W(30, "unavailable") + 0.4, 0, 1, EIO);
  const rules = tw(t, W(30, "deterministic") - 0.2, W(30, "over") + 0.2, 0, 1, EIO);
  const valid = tw(t, W(30, "validated") - 0.1, W(30, "schema") + 0.3, 0, 1, EIO);
  const flowK = ((t - s30) * 0.55) % 1;

  // ---------- 31 · queue ----------
  const w31 = win(t, s31 - 0.4, end, 0.6, 0.8);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(1300px 900px at 50% 55%, ${hexA("#191920", 1)}, ${C.ink} 75%)` }} />

      {/* exploded stack */}
      {wStack > 0 && (
        <AbsoluteFill style={{ opacity: wStack, perspective: 2600, perspectiveOrigin: "50% 30%" }}>
          <div style={{ position: "absolute", left: 1060, top: 640, transformStyle: "preserve-3d", transform: `scale(${zoom}) rotateX(${tilt}deg) rotateZ(${orbit}deg)` }}>
            {/* data: Supabase / in-memory */}
            <Slab z={-1 * gap} label="Data · Supabase" p={layerP(0) * pw("Supabase", 27)} x={swapMem * 1300} opacity={1 - swapMem * 0.7}>
              {["users", "candidate_profiles", "jobs", "matches", "applications", "audit_logs"].map((n, i) => (
                <Tile key={n} x={30 + (i % 3) * 330} y={80 + Math.floor(i / 3) * 220} w={310} h={190} label={n} sub={tw(t, W(27, "row-level") - 0.2, W(27, "table")) > 0.5 ? "RLS on" : "postgres"} p={tw(t, W(27, "Postgres") - 0.2 + i * 0.08, W(27, "Postgres") + 0.6 + i * 0.08)} color={C.mint} />
              ))}
            </Slab>
            <Slab z={-1 * gap} label="Data · in-memory seeded store" p={swapMem} x={(1 - swapMem) * -1300}>
              <Tile x={30} y={80} w={980} h={190} label="Demo mode" sub="no keys · no database · npm run dev" p={tw(t, W(28, "laptop") - 0.2, W(28, "laptop") + 0.5)} color={C.steel} />
              <Tile x={30} y={300} w={980} h={190} label="Same Repository interface" sub="services never know which store they use" p={tw(t, W(28, "zero") - 0.2, W(28, "zero") + 0.5)} color={C.steel} />
            </Slab>
            <Slab z={0} label="Repository interface · src/lib/data" p={layerP(1) * pw("repository", 27)} thin />
            <Slab z={gap} label="Domain services" p={layerP(2) * Math.max(pw("service", 27), tw(t, a, a + 1) * 0.6)}>
              {["Matching", "Tailoring", "Reviews", "Pipeline"].map((n, i) => (
                <Tile key={n} x={30 + i * 250} y={90} w={230} h={140} label={n} p={tw(t, W(27, "service") - 0.3 + i * 0.1, W(27, "service") + 0.4 + i * 0.1)} />
              ))}
            </Slab>
            <Slab z={2 * gap} label="Server" p={layerP(3)}>
              {[
                ["proxy.ts", "optimistic gate"],
                ["Server Components", ""],
                ["Server Actions", "typed, audited"],
                ["REST API", "/api/v1"],
              ].map(([n, sub], i) => (
                <Tile key={n} x={30 + i * 250} y={90} w={230} h={150} label={n} sub={sub || undefined} p={tw(t, L0(26) + 0.4 + i * 0.15, L0(26) + 1.2 + i * 0.15)} />
              ))}
            </Slab>
            <Slab z={3 * gap} label="Experience · Next.js 16" p={layerP(4)} tint={C.ember}>
              {[
                ["Website", "website"],
                ["Candidate app", "candidate"],
                ["Operations console", "operations"],
                ["Shared inbox", "inbox"],
              ].map(([n, w], i) => (
                <Tile key={n} x={30 + i * 250} y={90} w={230} h={150} label={n} p={pw(w)} color={C.ember} />
              ))}
            </Slab>
            {packets.map((k, i) => (
              <div key={i} style={{ position: "absolute", left: k.x, top: k.y, width: 14, height: 14, borderRadius: 9, background: i % 3 ? C.emberHi : C.paper, boxShadow: `0 0 16px ${C.ember}`, transform: `translateZ(${k.z}px)`, opacity: k.o }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: 120, top: 92, opacity: 1 - tw(t, s29 - 0.4, s29) }}>
            <Eyebrow size={15} color={C.ember} style={{ opacity: tw(t, a, a + 0.6) }}>
              Architecture
            </Eyebrow>
            <Rise p={tw(t, L0(26) - 0.2, L0(26) + 0.7)} style={{ fontFamily: F.display, fontSize: 56, fontWeight: 500, color: C.paper, marginTop: 12, letterSpacing: "-0.02em" }}>
              One app. One data interface.
            </Rise>
            <Rise p={tw(t, W(28, "zero") - 0.3, W(28, "zero") + 0.5)} style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 54, color: C.steel, marginTop: 6 }}>
              Two stores behind it.
            </Rise>
          </div>
        </AbsoluteFill>
      )}

      {/* 29 · policy tests against real Postgres */}
      {w29 > 0 && (
        <AbsoluteFill style={{ opacity: w29, perspective: 2200 }}>
          <div style={{ position: "absolute", left: 960, top: 600, transformStyle: "preserve-3d", transform: `rotateX(58deg) rotateZ(${lerp(-30, -38, tw(t, s29, s30, 0, 1, EIO))}deg) scale(1.3)` }}>
            {[
              { x: -560, label: "Candidate A · rows", c: C.paper },
              { x: 120, label: "Candidate B · rows", c: C.paper },
            ].map((g, gi) => (
              <div key={gi} style={{ position: "absolute", left: g.x, top: -230, width: 440, height: 460, transformStyle: "preserve-3d" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: "rgba(22,22,24,0.9)", border: `1.5px solid ${C.line2}` }} />
                <div style={{ position: "absolute", left: 26, top: 20, fontFamily: F.mono, fontSize: 18, letterSpacing: "0.12em", color: C.mist, textTransform: "uppercase" }}>{g.label}</div>
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} style={{ position: "absolute", left: 26, top: 80 + i * 72, width: 388, height: 52, borderRadius: 10, background: hexA(C.paper, 0.06), border: `1px solid ${hexA(C.paper, 0.14)}`, transform: `translateZ(${10 + tw(t, s29 + 0.2 + i * 0.08 + gi * 0.3, s29 + 0.8 + i * 0.08 + gi * 0.3) * 20}px)` }} />
                ))}
              </div>
            ))}
            {/* the policy wall */}
            <div style={{ position: "absolute", left: -10, top: -260, width: 20, height: 520, transformOrigin: "50% 50%", transform: "rotateY(90deg) translateX(-120px)", background: hexA(C.ember, 0.18 + (hit ? 0.5 * (1 - bounce) : 0)), border: `2px solid ${hexA(C.ember, 0.9)}`, boxShadow: `0 0 ${40 + (hit ? 80 * (1 - bounce) : 0)}px ${hexA(C.ember, 0.6)}` }} />
            {/* probe */}
            <div style={{ position: "absolute", left: lerp(-300, 20, Math.min(probe / 0.62, 1)) - (hit ? bounce * 260 : 0), top: -10, width: 30, height: 30, borderRadius: 99, background: C.steel, boxShadow: `0 0 24px ${C.steel}`, transform: "translateZ(60px)", opacity: probe > 0 ? 1 - bounce * 0.6 : 0 }} />
          </div>
          <div style={{ position: "absolute", left: 120, top: 92 }}>
            <Eyebrow size={15} color={C.ember} style={{ opacity: tw(t, s29 - 0.2, s29 + 0.4) }}>
              Security, tested
            </Eyebrow>
            <Rise p={tw(t, s29 - 0.1, s29 + 0.7)} style={{ fontFamily: F.display, fontSize: 56, fontWeight: 500, color: C.paper, marginTop: 12, letterSpacing: "-0.02em" }}>
              Row level security, proven in tests
            </Rise>
            <div style={{ fontFamily: F.mono, fontSize: 21, color: C.mist, marginTop: 18, opacity: tw(t, W(29, "migration") - 0.3, W(29, "migration") + 0.4) }}>
              PGlite · in-process Postgres · every migration applied
            </div>
          </div>
          <div style={{ position: "absolute", right: 120, bottom: 120, display: "flex", alignItems: "center", gap: 16, opacity: pass, padding: "18px 26px", borderRadius: 14, background: "rgba(18,18,20,0.92)", border: `1px solid ${hexA(C.mint, 0.5)}` }}>
            <span style={{ fontFamily: F.display, fontSize: 32, color: C.mint }}>✓</span>
            <span style={{ fontFamily: F.mono, fontSize: 21, color: C.paper }}>candidates cannot read each other's rows</span>
          </div>
        </AbsoluteFill>
      )}

      {/* 30 · AI behind an interface */}
      {w30 > 0 && (
        <AbsoluteFill style={{ opacity: w30 }}>
          <AbsoluteFill style={{ scale: "1.22", translate: "40px 110px" }}>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            {/* paths */}
            <path d="M 330 560 L 700 560" stroke={hexA(C.paper, 0.25)} strokeWidth={2} fill="none" />
            <path d="M 820 560 C 960 560 960 400 1120 400" stroke={hexA(C.ember, 0.8 * (1 - down))} strokeWidth={3} fill="none" />
            <path d="M 820 560 C 960 560 960 730 1120 730" stroke={hexA(C.steel, 0.15 + 0.75 * rules)} strokeWidth={3} fill="none" strokeDasharray={rules > 0 ? undefined : "6 8"} />
            <path d="M 1340 400 L 1480 400" stroke={hexA(C.ember, 0.8 * (1 - down))} strokeWidth={3} fill="none" />
          </svg>
          {/* moving packet on active path */}
          {(() => {
            const k = flowK;
            const onClaude = down < 0.5;
            const x = k < 0.4 ? lerp(330, 700, k / 0.4) : lerp(820, 1120, (k - 0.4) / 0.6);
            const y = k < 0.4 ? 560 : lerp(560, onClaude ? 400 : 730, EIO((k - 0.4) / 0.6));
            return <div style={{ position: "absolute", left: x - 9, top: y - 9, width: 18, height: 18, borderRadius: 99, background: onClaude ? C.emberHi : C.steel, boxShadow: `0 0 20px ${onClaude ? C.ember : C.steel}`, opacity: tw(t, s30, s30 + 0.6) }} />;
          })()}
          {[
            { x: 130, y: 500, w: 200, label: "Tailoring", sub: "service", c: C.paper, p: tw(t, s30 - 0.2, s30 + 0.5), dim: 0 },
            { x: 700, y: 490, w: 240, label: "AIProvider", sub: "interface", c: C.ember, p: tw(t, W(30, "interface") - 0.3, W(30, "interface") + 0.4), dim: 0 },
            { x: 1120, y: 340, w: 220, label: "Claude", sub: "drafts", c: C.ember, p: tw(t, W(30, "Claude") - 0.2, W(30, "Claude") + 0.4), dim: down },
            { x: 1120, y: 670, w: 300, label: "Rules provider", sub: "deterministic", c: C.steel, p: Math.max(tw(t, W(30, "interface"), W(30, "interface") + 0.6) * 0.45, rules), dim: 0 },
          ].map((n) => (
            <div key={n.label} style={{ position: "absolute", left: n.x, top: n.y, width: n.w, padding: "18px 22px", borderRadius: 14, boxSizing: "border-box", background: "rgba(20,20,22,0.95)", border: `1.5px solid ${hexA(n.c, 0.25 + 0.6 * n.p * (1 - n.dim))}`, opacity: 0.3 + 0.7 * n.p, boxShadow: n.p > 0.6 && n.dim < 0.5 ? `0 0 40px ${hexA(n.c, 0.25)}` : undefined }}>
              <div style={{ fontFamily: F.display, fontSize: 30, fontWeight: 500, color: n.dim > 0.5 ? C.faint : C.paper, textDecoration: n.dim > 0.5 ? "line-through" : undefined }}>{n.label}</div>
              <div style={{ fontFamily: F.mono, fontSize: 16, color: C.mist, marginTop: 6 }}>{n.dim > 0.5 ? "unavailable" : n.sub}</div>
            </div>
          ))}
          {/* schema gate */}
          <div style={{ position: "absolute", left: 1480, top: 330, width: 300, padding: "18px 22px", borderRadius: 14, background: "rgba(20,20,22,0.95)", border: `1.5px solid ${hexA(C.mint, 0.2 + 0.6 * valid * (1 - down))}`, opacity: 0.25 + 0.75 * valid * (1 - down * 0.7) }}>
            <div style={{ fontFamily: F.mono, fontSize: 21, color: C.paper }}>Zod schema</div>
            <div style={{ fontFamily: F.display, fontSize: 22, color: C.mint, marginTop: 8 }}>✓ output validated</div>
          </div>
          </AbsoluteFill>
          <div style={{ position: "absolute", left: 120, top: 92 }}>
            <Eyebrow size={15} color={C.ember} style={{ opacity: tw(t, s30 - 0.2, s30 + 0.4) }}>
              AI behind an interface
            </Eyebrow>
            <Rise p={tw(t, s30 - 0.1, s30 + 0.7)} style={{ fontFamily: F.display, fontSize: 56, fontWeight: 500, color: C.paper, marginTop: 12, letterSpacing: "-0.02em" }}>
              An outage never blocks a candidate
            </Rise>
          </div>
        </AbsoluteFill>
      )}

      {/* 31 · queue */}
      {w31 > 0 && <Queue t={t} s31={s31} opacity={w31} />}
    </AbsoluteFill>
  );
};

const Queue: React.FC<{ t: number; s31: number; opacity: number }> = ({ t, s31, opacity }) => {
  const speed = 150; // px per second
  const keyP = tw(t, W(31, "idempotency") - 0.3, W(31, "key") + 0.3);
  const claimP = tw(t, W(31, "workers") - 0.3, W(31, "same") + 0.3);
  const failT = W(31, "failures") - 0.2;
  const tokens = Array.from({ length: 12 }, (_, i) => i);
  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill style={{ scale: "1.25", translate: "0 60px" }}>
      {/* belt */}
      <div style={{ position: "absolute", left: 120, top: 640, width: 1680, height: 4, background: hexA(C.paper, 0.16) }} />
      {Array.from({ length: 40 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: 120 + ((i * 42 + (t - s31) * speed) % 1680), top: 650, width: 18, height: 2, background: hexA(C.paper, 0.12) }} />
      ))}
      {/* workers */}
      {[0, 1].map((w) => (
        <div key={w} style={{ position: "absolute", left: 980 + w * 300, top: 330, width: 220, padding: "16px 20px", borderRadius: 14, boxSizing: "border-box", background: "rgba(20,20,22,0.95)", border: `1.5px solid ${hexA(C.paper, 0.2 + 0.4 * claimP)}`, opacity: tw(t, s31, s31 + 0.6) }}>
          <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 500, color: C.paper }}>Worker {w + 1}</div>
          <div style={{ fontFamily: F.mono, fontSize: 15, color: C.mist, marginTop: 6 }}>claims one job</div>
        </div>
      ))}
      {tokens.map((i) => {
        const x0 = 120 + i * 150 - 600 + (t - s31) * speed;
        const x = ((x0 % 1800) + 1800) % 1800;
        const worker = i % 2;
        const wx = 980 + worker * 300 + 110;
        const near = Math.max(0, 1 - Math.abs(x - wx) / 90) * claimP;
        const isFail = i === 5;
        const failK = isFail ? tw(t, failT, failT + 0.6, 0, 1, EIO) : 0;
        const dead = isFail ? tw(t, W(31, "set") - 0.3, W(31, "aside") + 0.4, 0, 1, EIO) : 0;
        if (isFail && failK > 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: x + 60, top: 584 - near * 150, width: 96, height: 54, borderRadius: 10, background: "rgba(26,26,28,0.98)", border: `1.5px solid ${hexA(C.ember, 0.3 + near * 0.6)}`, opacity: tw(t, s31 + i * 0.04, s31 + 0.5 + i * 0.04) * (1 - dead), display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <div style={{ fontFamily: F.mono, fontSize: 13, color: C.mist }}>match</div>
            <div style={{ fontFamily: F.mono, fontSize: 11, color: C.emberHi, opacity: keyP }}>key {(i * 2654435761 % 9000) + 1000}</div>
          </div>
        );
      })}
      {/* failing job: backs off, then dead-letter */}
      {(() => {
        const k = tw(t, failT, W(31, "aside") + 0.4, 0, 1, EIO);
        if (k <= 0) return null;
        const hops = [0, 0.28, 0.6, 1];
        const x = lerp(820, 560, k);
        const y = 760 + Math.abs(Math.sin(k * Math.PI * 3)) * -50;
        const dead = tw(t, W(31, "set") - 0.3, W(31, "aside") + 0.4, 0, 1, EIO);
        return (
          <>
            <div style={{ position: "absolute", left: lerp(x, 240, dead), top: lerp(y, 860, dead), width: 96, height: 54, borderRadius: 10, background: "rgba(40,20,18,0.98)", border: `1.5px solid ${C.ember}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: F.mono, fontSize: 13, color: C.ember }}>failed</span>
            </div>
            {(() => {
              // one label riding with the card, counting up the backoff (labels used to overlap)
              const j = Math.max(0, hops.slice(1).filter((h) => k >= h - 0.15).length - 1);
              return (
                <div style={{ position: "absolute", left: x - 40, top: y - 46, width: 176, textAlign: "center", fontFamily: F.mono, fontSize: 16, color: C.mist, opacity: tw(k, 0.13, 0.28) * (1 - dead) }}>
                  retry {j + 1} · wait {[1, 2, 4][j]}×
                </div>
              );
            })()}
            <div style={{ position: "absolute", left: 120, top: 840, width: 360, height: 96, borderRadius: 14, border: `1.5px dashed ${hexA(C.ember, 0.6)}`, opacity: tw(t, W(31, "set") - 0.6, W(31, "set")) }} />
            <div style={{ position: "absolute", left: 120, top: 950, opacity: tw(t, W(31, "set") - 0.6, W(31, "set")) }}>
              <Eyebrow size={14} color={C.ember}>Dead-letter</Eyebrow>
            </div>
          </>
        );
      })()}
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 92 }}>
        <Eyebrow size={15} color={C.ember} style={{ opacity: tw(t, s31 - 0.2, s31 + 0.4) }}>
          Background queue
        </Eyebrow>
        <Rise p={tw(t, s31 - 0.1, s31 + 0.7)} style={{ fontFamily: F.display, fontSize: 56, fontWeight: 500, color: C.paper, marginTop: 12, letterSpacing: "-0.02em" }}>
          Safe to retry, never double-run
        </Rise>
        <div style={{ display: "flex", gap: 30, marginTop: 24, fontFamily: F.mono, fontSize: 19, color: C.mist }}>
          <span style={{ opacity: keyP }}>idempotency keys</span>
          <span style={{ opacity: claimP }}>FOR UPDATE SKIP LOCKED</span>
          <span style={{ opacity: tw(t, W(31, "back") - 0.2, W(31, "back") + 0.4) }}>backoff + jitter</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const _a = [EI];
