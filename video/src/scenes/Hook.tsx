import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import land from "../data/land.json";
import { C, F } from "../lib/theme";
import { CameraRig, Cam, Glow, latLon, makeProjector } from "../lib/three";
import { EIO, EO, L0, L1, lerp, rng, tw, useT, W, WE } from "../lib/time";
import { Eyebrow, hexA } from "../lib/ui";

// Sequence A: a single application leaves Bengaluru for Berlin at night, and meets a closed door.
const R = 2;
const BLR = { lat: 12.97, lon: 77.59 };
const BER = { lat: 52.52, lon: 13.4 };

const atmosphere = new THREE.ShaderMaterial({
  uniforms: { c: { value: new THREE.Color(C.ember) }, k: { value: 1 } },
  vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
  fragmentShader: `uniform vec3 c; uniform float k; varying vec3 vN; void main(){ float i = pow(max(0.0, 0.62 - dot(vN, vec3(0.0,0.0,1.0))), 3.0) * k; gl_FragColor = vec4(c * i * 0.55, i * 0.5); }`,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
});

// Land dots: back-facing points are discarded and the limb fades, like a lit night-side globe.
const landMat = new THREE.ShaderMaterial({
  uniforms: { col: { value: new THREE.Color(C.paper) }, op: { value: 0.5 }, px: { value: 2.0 } },
  vertexShader: `uniform float px; varying float vF; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vec3 n = normalize(normalMatrix * position); vF = smoothstep(0.02, 0.35, dot(n, normalize(-mv.xyz))); gl_PointSize = px * 3.4 / -mv.z * 2.0; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 col; uniform float op; varying float vF; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5 || vF <= 0.0) discard; gl_FragColor = vec4(col, op * vF * smoothstep(0.5, 0.25, r)); }`,
  transparent: true,
  depthWrite: false,
});

const arcPoints = (() => {
  const a = latLon(BLR.lat, BLR.lon, 1).normalize();
  const b = latLon(BER.lat, BER.lon, 1).normalize();
  const ang = a.angleTo(b);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 160; i++) {
    const u = i / 160;
    const v = a.clone().multiplyScalar(Math.sin((1 - u) * ang) / Math.sin(ang)).add(b.clone().multiplyScalar(Math.sin(u * ang) / Math.sin(ang)));
    pts.push(v.normalize().multiplyScalar(R * (1.004 + 0.2 * Math.sin(Math.PI * u))));
  }
  return pts;
})();

const Arc: React.FC<{ p: number; color: string; opacity: number }> = ({ p, color, opacity }) => {
  const n = Math.max(2, Math.round(p * 160));
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(arcPoints.slice(0, n + 1));
    return new THREE.TubeGeometry(curve, Math.max(4, n), 0.0075, 6, false);
  }, [n]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
};

export const Hook: React.FC = () => {
  const t = useT();
  const { width, height } = useVideoConfig();
  landMat.uniforms.px.value = 2.0 * (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
  const landGeo = useMemo(() => {
    const arr = new Float32Array((land as number[][]).length * 3);
    (land as number[][]).forEach(([la, lo], i) => {
      const v = latLon(la, lo, R * 1.001);
      arr.set([v.x, v.y, v.z], i * 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  const tSend = W(1, "sending");
  const tBerlin = WE(1, "Berlin");
  const tNever = W(2, "never");
  const end = L1(2) + 1.2;
  const h0 = L0(1) - 0.35; // smash cut in from the cold open

  // Camera: from low over the Indian Ocean toward the full Bengaluru → Berlin corridor.
  const k = tw(t, h0, end, 0, 1, EIO);
  const latC = lerp(14, 30, k);
  const lonC = lerp(80, 48, k);
  // crash zoom out of the city, then a slow drift
  const dist = lerp(2.6, 4.9, tw(t, h0, h0 + 1.6, 0, 1, EO)) + lerp(0, 1.7, tw(t, h0 + 1.6, end, 0, 1, EIO));
  const cam: Cam = { pos: [lerp(-0.25, 0.2, k), lerp(-0.35, 0.05, k), dist], target: [0, lerp(-0.25, 0, k), 0], fov: 32 };
  const rot = new THREE.Euler((latC * Math.PI) / 180, (-lonC * Math.PI) / 180, 0, "XYZ");
  const world = (v: THREE.Vector3) => v.clone().applyEuler(rot);
  const proj = makeProjector(cam, width, height);

  const arcP = tw(t, tSend - 0.2, tBerlin + 0.3, 0, 0.94, EIO);
  const blocked = tw(t, tNever, tNever + 0.9, 0, 1, EIO);
  const headIdx = Math.min(160, Math.round(arcP * 160));
  const head = arcPoints[headIdx];
  const arcColor = new THREE.Color(C.ember).lerp(new THREE.Color("#55504A"), blocked).getStyle();

  const blrW = proj(world(latLon(BLR.lat, BLR.lon, R)));
  const berW = proj(world(latLon(BER.lat, BER.lon, R)));
  const headW = proj(world(head));

  // Burst: the application dissolves at the door.
  const burst = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 46 }, () => ({ vx: (r() - 0.5) * 240, vy: -r() * 160 - 20, s: 1 + r() * 3, d: 0.6 + r() * 0.9 }));
  }, []);
  const bt = t - (tNever + 0.15);

  const fadeIn = tw(t, h0, h0 + 0.12, 0, 1);
  const stamp = tw(t, h0 + 0.15, h0 + 0.7);
  const cardP = tw(t, W(2, "dead") - 0.1, W(2, "dead") + 0.6);

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <AbsoluteFill style={{ background: `radial-gradient(1200px 800px at 60% 40%, ${hexA("#2A1A14", 0.55)}, transparent 70%), ${C.ink}` }} />
      <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <CameraRig {...cam} />
        <group rotation={rot}>
          <mesh renderOrder={-1}>
            <sphereGeometry args={[R * 0.995, 96, 96]} />
            <meshBasicMaterial color="#0C0C0E" depthWrite depthTest />
          </mesh>
          <points geometry={landGeo} material={landMat} />
          <mesh scale={1.08}>
            <sphereGeometry args={[R, 64, 64]} />
            <primitive object={atmosphere} attach="material" />
          </mesh>
          {arcP > 0.01 && <Arc p={arcP} color={arcColor} opacity={0.95} />}
          {arcP > 0.01 && blocked < 1 && <Glow position={head} size={0.32} color={C.emberHi} opacity={1 - blocked} />}
          <Glow position={latLon(BLR.lat, BLR.lon, R * 1.01)} size={0.3 + 0.06 * Math.sin(t * 3)} color={C.ember} opacity={tw(t, h0 + 0.1, h0 + 0.6)} />
          <Glow
            position={latLon(BER.lat, BER.lon, R * 1.01)}
            size={0.26}
            color={blocked > 0.5 ? "#8A8078" : C.paper}
            opacity={tw(t, tBerlin - 1.2, tBerlin) * (1 - blocked * 0.4)}
          />
        </group>
      </ThreeCanvas>

      {/* burst particles at the door */}
      {bt > 0 &&
        burst.map((b, i) => {
          const o = Math.max(0, 1 - bt / b.d);
          if (o <= 0) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: headW.x + b.vx * bt,
                top: headW.y + b.vy * bt + 140 * bt * bt,
                width: b.s,
                height: b.s,
                borderRadius: 9,
                background: C.emberHi,
                opacity: o,
                boxShadow: `0 0 8px ${C.ember}`,
              }}
            />
          );
        })}

      {/* closed-door ring */}
      {blocked > 0 && (
        <div
          style={{
            position: "absolute",
            left: headW.x - 34,
            top: headW.y - 34,
            width: 68,
            height: 68,
            borderRadius: 99,
            border: `2px solid ${hexA(C.paper, 0.7 * (1 - tw(t, tNever + 1.0, tNever + 2.4)))}`,
            scale: `${lerp(1.8, 1, blocked)}`,
          }}
        >
          <div style={{ position: "absolute", left: 14, top: 32, width: 40, height: 2, background: hexA(C.paper, 0.8 * (1 - tw(t, tNever + 1.0, tNever + 2.4))) }} />
        </div>
      )}

      {/* city labels */}
      <div style={{ position: "absolute", left: blrW.x + 22, top: blrW.y - 10, opacity: tw(t, h0 + 0.3, h0 + 0.9) }}>
        <Eyebrow color={C.paper} size={16}>Bengaluru</Eyebrow>
        <Eyebrow color={C.faint} size={13} style={{ marginTop: 6 }}>12.97° N · 77.59° E</Eyebrow>
      </div>
      <div style={{ position: "absolute", left: berW.x + 22, top: berW.y - 34, opacity: tw(t, tBerlin - 0.8, tBerlin + 0.2) }}>
        <Eyebrow color={blocked > 0.5 ? C.mist : C.paper} size={16}>Berlin</Eyebrow>
        <Eyebrow color={C.faint} size={13} style={{ marginTop: 6 }}>52.52° N · 13.40° E</Eyebrow>
      </div>

      {/* the listing, and why it was never open */}
      <div
        style={{
          position: "absolute",
          left: berW.x - 560,
          top: berW.y + 34,
          width: 470,
          opacity: cardP,
          translate: `${(1 - cardP) * -24}px 0`,
          background: "rgba(16,16,18,0.88)",
          border: `1px solid ${C.line2}`,
          borderRadius: 14,
          padding: "22px 26px",
          fontFamily: F.display,
          color: C.paper,
          boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        }}
      >
        <Eyebrow size={12} color={C.faint}>Listing · illustrative</Eyebrow>
        <div style={{ fontSize: 30, fontWeight: 500, marginTop: 10, letterSpacing: "-0.01em" }}>Backend Engineer</div>
        <div style={{ fontSize: 20, color: C.mist, marginTop: 4 }}>Berlin, Germany</div>
        <div style={{ height: 1, background: C.line, margin: "18px 0" }} />
        {[
          ["Work authorization", "Required in Germany", W(2, "never")],
          ["Visa sponsorship", "Not offered", W(2, "open")],
        ].map(([k, v, at], i) => {
          const p = tw(t, (at as number) - 0.1, (at as number) + 0.6);
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 21, marginTop: i ? 12 : 0, opacity: 0.25 + 0.75 * p }}>
              <span style={{ color: C.mist }}>{k}</span>
              <span style={{ color: p > 0.5 ? C.ember : C.mist, fontWeight: 500 }}>{v}</span>
            </div>
          );
        })}
      </div>

      {/* time stamp */}
      <div style={{ position: "absolute", left: 80, top: 72, opacity: stamp * (1 - tw(t, L0(2) + 1.5, end)) }}>
        <Eyebrow size={15} color={C.mist}>Bengaluru · 23:47 IST</Eyebrow>
        <div style={{ width: 160 * stamp, height: 1, background: hexA(C.ember, 0.7), marginTop: 12 }} />
      </div>
      <div style={{ position: "absolute", right: 80, bottom: 64, opacity: tw(t, h0 + 0.5, h0 + 1.2) * 0.8 }}>
        <Eyebrow size={12} color={C.faint}>Illustrative scene</Eyebrow>
      </div>
    </AbsoluteFill>
  );
};

export const HOOK_EASE = EO;
