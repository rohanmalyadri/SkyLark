import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { C, F } from "../lib/theme";
import { CameraRig, Cam, Glow, makeProjector } from "../lib/three";
import { EIO, L0, L1, lerp, rng, tw, useT, W } from "../lib/time";
import { Eyebrow, hexA, Rise } from "../lib/ui";

// Sequence E (part 1): one JobSource interface → normalise → fingerprint → store. Geometry is
// conceptual; every label names a real stage of src/lib/pipeline.
const M = new THREE.Vector3(-5.6, 0, 0);
const GATE_X = -2.2;
const HASH_X = 3.2;
const STORE = new THREE.Vector3(7.2, 0, 0);
const SOURCES = {
  arbeitnow: new THREE.Vector3(-9.6, 1.7, 0),
  greenhouse: new THREE.Vector3(-9.6, -0.2, 0),
  optional: new THREE.Vector3(-9.6, -2.0, 0),
};
const GH = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return new THREE.Vector3(SOURCES.greenhouse.x, SOURCES.greenhouse.y + Math.sin(a) * 0.62, Math.cos(a) * 0.62);
});
const FIELDS = ["title", "seniority", "location", "salary", "sponsorship", "skills"];
const FIELD_COL = ["#F4F1EC", "#E8D9CF", "#F3B9A2", "#FF8A63", "#F95135", "#C8402A"];
const N = 64;

type P = { phase: number; src: number; dup: boolean; y: number; z: number };

// Position along the whole path for u in [0,1]
function pathPos(p: P, u: number, out: THREE.Vector3) {
  const start = p.src < 0 ? SOURCES.arbeitnow : GH[p.src];
  if (u < 0.22) {
    const k = u / 0.22;
    const e = k * k * (3 - 2 * k);
    out.set(lerp(start.x, M.x, k), lerp(start.y, M.y + p.y * 0.25, e), lerp(start.z, M.z + p.z * 0.2, e));
  } else if (u < 0.4) {
    const k = (u - 0.22) / 0.18;
    out.set(lerp(M.x, GATE_X, k), p.y * 0.25 * (1 - k) + p.y * 0.12 * k, p.z * 0.2);
  } else if (u < 0.68) {
    const k = (u - 0.4) / 0.28;
    out.set(lerp(GATE_X, HASH_X, k), p.y * 0.12 + (p.dup ? Math.sin(Math.PI * k) * 0.0 + 0.5 * (1 - k) * k * 4 * 0.25 : 0), p.z * 0.2);
  } else {
    const k = (u - 0.68) / 0.32;
    out.set(lerp(HASH_X, STORE.x, k), lerp(p.y * 0.12, (p.y - 0.5) * 0.9, k * k), lerp(p.z * 0.2, p.z * 0.6, k * k));
  }
  return out;
}

const Particles: React.FC<{ t: number; flow: number }> = ({ t, flow }) => {
  const ps = useMemo<P[]>(() => {
    const r = rng(23);
    return Array.from({ length: N }, (_, i) => ({ phase: r(), src: r() < 0.35 ? -1 : Math.floor(r() * 16), dup: i % 6 === 0, y: r() - 0.5, z: r() - 0.5 }));
  }, []);
  const { raw, slats } = useMemo(() => {
    const raw = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.075, 0), new THREE.MeshStandardMaterial({ color: "#9C968E", roughness: 0.5, metalness: 0.2, flatShading: true }), N);
    const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.022, 0.15), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1, emissive: new THREE.Color(C.ember), emissiveIntensity: 0.12 }), N * 6);
    for (let i = 0; i < N * 6; i++) slats.setColorAt(i, new THREE.Color(FIELD_COL[i % 6]));
    raw.frustumCulled = false;
    slats.frustumCulled = false;
    return { raw, slats };
  }, []);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  ps.forEach((p, i) => {
    const u = (p.phase + t * 0.04) % 1;
    pathPos(p, u, v);
    const vis = flow * Math.min(1, u * 30) * (u > 0.97 ? (1 - u) / 0.03 : 1);
    const dupGone = p.dup && u > 0.66 ? 0 : 1;
    if (u < 0.4) {
      q.setFromEuler(new THREE.Euler(t * 2 + i, t * 1.3 + i * 2, 0));
      const s = vis * (u > 0.37 ? 1 - (u - 0.37) / 0.03 : 1);
      m.compose(v, q, sc.set(s, s, s));
      raw.setMatrixAt(i, m);
      for (let k = 0; k < 6; k++) slats.setMatrixAt(i * 6 + k, m.clone().makeScale(0, 0, 0));
    } else {
      raw.setMatrixAt(i, m.clone().makeScale(0, 0, 0));
      const lc = Math.min(1, (u - 0.4) / 0.28);
      const expand = Math.sin(Math.PI * Math.min(1, lc * 1.15)) * (u < 0.68 ? 1 : 0);
      const s = vis * dupGone * Math.min(1, (u - 0.4) / 0.02);
      for (let k = 0; k < 6; k++) {
        const y = v.y + (k - 2.5) * lerp(0.03, 0.15, expand);
        q.identity();
        m.compose(new THREE.Vector3(v.x, y, v.z), q, sc.set(s, s, s));
        slats.setMatrixAt(i * 6 + k, m.clone());
      }
    }
  });
  raw.instanceMatrix.needsUpdate = true;
  slats.instanceMatrix.needsUpdate = true;
  return (
    <>
      <primitive object={raw} />
      <primitive object={slats} />
    </>
  );
};

const KEYS: { at: () => number; cam: Cam }[] = [
  { at: () => L0(17) - 0.7, cam: { pos: [0, 3.2, 17], target: [0, 0, 0], fov: 34 } },
  { at: () => L0(17) + 2.0, cam: { pos: [-1, 2.4, 15], target: [-0.5, 0, 0], fov: 34 } },
  { at: () => L0(18) + 0.4, cam: { pos: [-5.4, 0.6, 9.2], target: [-8.4, -0.1, 0], fov: 34 } },
  { at: () => L1(18) - 0.6, cam: { pos: [-6.0, 0.3, 8.4], target: [-8.0, -0.2, 0], fov: 34 } },
  { at: () => L0(19) + 0.6, cam: { pos: [-0.6, 0.9, 5.6], target: [-0.4, 0, 0], fov: 34 } },
  { at: () => L1(19) - 0.4, cam: { pos: [0.2, 0.5, 5.2], target: [0.2, 0, 0], fov: 34 } },
  { at: () => L0(20) + 0.5, cam: { pos: [3.2, 1.1, 4.8], target: [3.4, 0, 0], fov: 34 } },
  { at: () => W(20, "Stale") - 0.2, cam: { pos: [3.8, 0.9, 4.6], target: [4.0, 0, 0], fov: 34 } },
  { at: () => W(20, "Stale") + 0.9, cam: { pos: [6.4, 1.6, 6.4], target: [7.2, -0.2, 0], fov: 34 } },
  { at: () => L1(20) + 1.0, cam: { pos: [6.0, 2.0, 7.4], target: [7.0, -0.2, 0], fov: 34 } },
];

function camAt(t: number): Cam {
  const ks = KEYS.map((k) => ({ t: k.at(), c: k.cam }));
  if (t <= ks[0].t) return ks[0].c;
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1];
    if (t <= b.t) {
      const k = tw(t, a.t, b.t, 0, 1, EIO);
      const l3 = (x: number[], y: number[]) => x.map((xx, j) => lerp(xx, y[j], k)) as [number, number, number];
      return { pos: l3(a.c.pos, b.c.pos), target: l3(a.c.target, b.c.target), fov: lerp(a.c.fov, b.c.fov, k) };
    }
  }
  return ks[ks.length - 1].c;
}

export const Pipeline: React.FC = () => {
  const t = useT();
  const { width, height } = useVideoConfig();
  const cam = camAt(t);
  const proj = makeProjector(cam, width, height);
  const a = L0(17) - 0.7;
  const flow = tw(t, a, a + 1.4);
  const ghP = tw(t, W(18, "Greenhouse") - 0.3, W(18, "Greenhouse") + 0.8, 0, 1, EIO);
  const optP = tw(t, W(18, "others") - 0.3, W(18, "others") + 0.6);
  const arbP = tw(t, W(18, "Arbeitnow") - 0.3, W(18, "Arbeitnow") + 0.6);
  const hashFlash = (Math.sin(t * 9) * 0.5 + 0.5) * tw(t, W(20, "fingerprint") - 0.3, W(20, "fingerprint") + 0.4);
  const staleP = tw(t, W(20, "Stale"), W(20, "closed") + 0.8, 0, 1, EIO);
  const clock = tw(t, W(20, "nothing") - 0.2, W(20, "hours") + 0.6, 0, 1, EIO);
  const told = tw(t, W(20, "told") - 0.5, W(20, "told") + 0.3);
  const end = L1(20) + 1.0;

  const lbl = (p: THREE.Vector3 | [number, number, number], dx = 0, dy = 0) => {
    const s = proj(p);
    return { left: s.x + dx, top: s.y + dy };
  };

  const torusArc = useMemo(() => new THREE.TorusGeometry(1.55, 0.012, 8, 160), []);
  const clockGeo = useMemo(() => new THREE.TorusGeometry(1.55, 0.03, 8, 160, Math.max(0.001, clock * Math.PI * 2)), [Math.round(clock * 200)]);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(1500px 800px at 50% 55%, ${hexA("#1B1A1F", 1)}, ${C.ink} 75%)` }} />
      <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <CameraRig {...cam} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 8]} intensity={1.4} />
        <pointLight position={[GATE_X, 1.5, 2]} intensity={6} distance={6} color={C.ember} />
        <pointLight position={[STORE.x, 2, 2.5]} intensity={5} distance={7} color={C.paper} />

        {/* floor grid */}
        <gridHelper args={[40, 80, "#2A2A2E", "#18181B"]} position={[0, -2.6, 0]} />

        {/* sources */}
        <mesh position={SOURCES.arbeitnow} rotation={[0, Math.PI / 2, 0]} scale={0.6 + 0.4 * arbP}>
          <cylinderGeometry args={[0.42, 0.42, 0.08, 48]} />
          <meshStandardMaterial color={C.ember} emissive={C.ember} emissiveIntensity={0.25 + 0.4 * arbP} roughness={0.4} />
        </mesh>
        {GH.map((g, i) => (
          <mesh key={i} position={g} rotation={[0, 0, Math.PI / 2]} scale={lerp(0.4, 1, tw(ghP, i / 24, i / 24 + 0.35))}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 24]} />
            <meshStandardMaterial color={C.paper} roughness={0.5} emissive={C.paper} emissiveIntensity={0.08} />
          </mesh>
        ))}
        {[-0.6, 0, 0.6].map((dz, i) => (
          <mesh key={i} position={[SOURCES.optional.x, SOURCES.optional.y, dz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 24]} />
            <meshBasicMaterial color={C.steel} wireframe transparent opacity={0.2 + 0.35 * optP} />
          </mesh>
        ))}

        {/* normalise gate */}
        <mesh position={[GATE_X, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.05, 0.035, 16, 96]} />
          <meshStandardMaterial color={C.ember} emissive={C.ember} emissiveIntensity={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[GATE_X, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[1.02, 64]} />
          <meshBasicMaterial color={C.ember} transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>

        {/* fingerprint ring */}
        <mesh position={[HASH_X, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.8, 0.02, 12, 96]} />
          <meshStandardMaterial color={C.paper} emissive={C.paper} emissiveIntensity={0.2 + hashFlash * 0.8} />
        </mesh>
        <Glow position={[HASH_X, 0, 0]} size={1.2} color={C.paper} opacity={0.2 * hashFlash} />

        {/* store */}
        <group position={STORE}>
          <mesh>
            <cylinderGeometry args={[1.15, 1.15, 2.2, 64, 1, true]} />
            <meshStandardMaterial color="#2B2B30" transparent opacity={0.35} side={THREE.DoubleSide} roughness={0.2} metalness={0.4} depthWrite={false} />
          </mesh>
          {[-1.1, -0.37, 0.37, 1.1].map((y, i) => (
            <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.15, 0.012, 8, 96]} />
              <meshStandardMaterial color={C.paper} emissive={C.paper} emissiveIntensity={0.25} />
            </mesh>
          ))}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.2, 0]} geometry={torusArc}>
            <meshBasicMaterial color="#3A3A40" />
          </mesh>
          {clock > 0.002 && (
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.2, 0]} geometry={clockGeo}>
              <meshBasicMaterial color={C.ember} />
            </mesh>
          )}
          {/* stale listings drop out of the store */}
          {[0, 1, 2, 3].map((i) => {
            const k = tw(staleP, i * 0.12, 0.5 + i * 0.12, 0, 1, EIO);
            return (
              <mesh key={i} position={[-0.5 + i * 0.35, -1.0 - k * 1.4, 0.4 - i * 0.2]} rotation={[k * 1.2, k * 0.8, 0]} scale={k > 0 ? 1 : 0}>
                <boxGeometry args={[0.34, 0.034, 0.2]} />
                <meshStandardMaterial color="#5A5650" transparent opacity={1 - k * 0.8} />
              </mesh>
            );
          })}
        </group>

        <Particles t={t} flow={flow} />
      </ThreeCanvas>

      {/* labels */}
      <div style={{ position: "absolute", ...lbl(SOURCES.arbeitnow, -40, -86), translate: "-100% 0", opacity: arbP, textAlign: "right" }}>
        <Eyebrow size={15} color={C.paper}>Arbeitnow</Eyebrow>
        <Eyebrow size={12} color={C.faint} style={{ marginTop: 6 }}>keyless · on by default</Eyebrow>
      </div>
      <div style={{ position: "absolute", ...lbl(SOURCES.greenhouse, -70, -20), translate: "-100% 0", opacity: ghP, textAlign: "right" }}>
        <Eyebrow size={15} color={C.paper}>Greenhouse</Eyebrow>
        <Eyebrow size={12} color={C.faint} style={{ marginTop: 6 }}>16 public company boards</Eyebrow>
      </div>
      <div style={{ position: "absolute", ...lbl(SOURCES.optional, -60, -20), translate: "-100% 0", opacity: optP * 0.9, textAlign: "right" }}>
        <Eyebrow size={15} color={C.steel}>Adzuna · The Muse · Lever</Eyebrow>
        <Eyebrow size={12} color={C.faint} style={{ marginTop: 6 }}>when configured</Eyebrow>
      </div>
      <div style={{ position: "absolute", ...lbl([M.x, 1.0, 0], 0, -40), translate: "-50% 0", opacity: tw(t, W(18, "Listings") - 0.2, W(18, "Listings") + 0.5) * (1 - tw(t, L0(19), L0(19) + 0.6)) }}>
        <Eyebrow size={14} color={C.mist}>One JobSource interface</Eyebrow>
      </div>

      <div style={{ position: "absolute", ...lbl([GATE_X, 1.25, 0], 0, -30), translate: "-50% -100%", opacity: tw(t, L0(19) - 0.3, L0(19) + 0.4) * (1 - tw(t, L0(20) + 1, L0(20) + 1.6)), textAlign: "center" }}>
        <Eyebrow size={15} color={C.ember}>Normalise</Eyebrow>
        <Eyebrow size={12} color={C.faint} style={{ marginTop: 6 }}>raw HTML in · fields out</Eyebrow>
      </div>
      {FIELDS.map((f, k) => {
        const at = W(19, f);
        const p = tw(t, at - 0.25, at + 0.35);
        const pos = lbl([0.4, (k - 2.5) * 0.15, 0], 0, 0);
        return (
          <div key={f} style={{ position: "absolute", left: 1500, top: pos.top - 12, opacity: p * (1 - tw(t, L0(20) - 0.2, L0(20) + 0.4)), display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 60 * p, height: 1, background: FIELD_COL[k] }} />
            <span style={{ fontFamily: F.mono, fontSize: 19, color: FIELD_COL[k], letterSpacing: "0.04em" }}>{f}</span>
          </div>
        );
      })}

      <div style={{ position: "absolute", ...lbl([HASH_X, 0.95, 0], 0, -24), translate: "-50% -100%", opacity: tw(t, W(20, "fingerprint") - 0.4, W(20, "fingerprint") + 0.3) * (1 - tw(t, W(20, "Stale") + 0.6, W(20, "Stale") + 1.2)), textAlign: "center" }}>
        <Eyebrow size={15} color={C.paper}>Deduplicate</Eyebrow>
        <div style={{ fontFamily: F.mono, fontSize: 17, color: C.mist, marginTop: 10 }}>sha256(company · title · country)</div>
        <div style={{ fontFamily: F.mono, fontSize: 15, color: C.faint, marginTop: 6 }}>+ (source, external_id)</div>
      </div>

      <div style={{ position: "absolute", ...lbl([STORE.x, 1.75, 0], 0, -20), translate: "-50% -100%", opacity: tw(t, W(20, "Stale") - 0.2, W(20, "Stale") + 0.5), textAlign: "center" }}>
        <Eyebrow size={15} color={C.paper}>Jobs table</Eyebrow>
        <Eyebrow size={12} color={C.faint} style={{ marginTop: 6 }}>listings older than 45 days close</Eyebrow>
      </div>
      <div style={{ position: "absolute", ...lbl([STORE.x + 1.7, 1.2, 0], 0, -10), opacity: clock > 0 ? tw(t, W(20, "nothing") - 0.2, W(20, "nothing") + 0.3) : 0 }}>
        <span style={{ fontFamily: F.serif, fontSize: 54, color: C.ember }}>24 h</span>
      </div>
      <div
        style={{
          position: "absolute",
          right: 120,
          bottom: 130,
          width: 520,
          opacity: told * (1 - tw(t, end - 0.6, end)),
          translate: `0 ${(1 - told) * 20}px`,
          background: "rgba(18,18,20,0.92)",
          border: `1px solid ${hexA(C.ember, 0.5)}`,
          borderRadius: 14,
          padding: "20px 24px",
          fontFamily: F.display,
          color: C.paper,
        }}
      >
        <Eyebrow size={12} color={C.ember}>Shown to candidates</Eyebrow>
        <div style={{ fontSize: 27, marginTop: 8 }}>Live job data is unavailable</div>
        <div style={{ fontSize: 18, color: C.mist, marginTop: 6 }}>No source has refreshed in 24 hours.</div>
      </div>

      <div style={{ position: "absolute", left: 120, top: 92, opacity: 1 - tw(t, L0(18) + 0.4, L0(18) + 1.2) }}>
        <Eyebrow size={15} color={C.ember} style={{ opacity: tw(t, a, a + 0.6) }}>
          Behind the scenes
        </Eyebrow>
        <Rise p={tw(t, L0(17) - 0.2, L0(17) + 0.7)} style={{ fontFamily: F.display, fontSize: 58, fontWeight: 500, color: C.paper, marginTop: 12, letterSpacing: "-0.02em" }}>
          The job pipeline
        </Rise>
      </div>
      <div style={{ position: "absolute", left: 120, bottom: 64, opacity: tw(t, a, a + 1) * 0.9 }}>
        <Eyebrow size={12} color={C.faint}>src/lib/pipeline · conceptual view</Eyebrow>
      </div>
    </AbsoluteFill>
  );
};
