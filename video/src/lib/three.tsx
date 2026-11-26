import React, { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export type Cam = { pos: [number, number, number]; target: [number, number, number]; fov: number };

/** Drives the R3F camera from frame-derived values (never from useFrame). */
export const CameraRig: React.FC<Cam> = ({ pos, target, fov }) => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(...pos);
  cam.fov = fov;
  cam.near = 0.05;
  cam.far = 200;
  cam.lookAt(new THREE.Vector3(...target));
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  useEffect(() => undefined, []);
  return null;
};

/** Projects world points to screen pixels for crisp HTML overlays that track 3D objects. */
export const makeProjector = (c: Cam, w: number, h: number) => {
  const cam = new THREE.PerspectiveCamera(c.fov, w / h, 0.05, 200);
  cam.position.set(...c.pos);
  cam.lookAt(new THREE.Vector3(...c.target));
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  return (p: THREE.Vector3 | [number, number, number]) => {
    const v = Array.isArray(p) ? new THREE.Vector3(...p) : p.clone();
    v.project(cam);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, behind: v.z > 1 };
  };
};

let glowTex: THREE.Texture | null = null;
export const glowTexture = () => {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.2, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.5, "rgba(255,255,255,0.12)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
};

export const Glow: React.FC<{ position: [number, number, number] | THREE.Vector3; size: number; color: string; opacity?: number }> = ({
  position,
  size,
  color,
  opacity = 1,
}) => {
  const tex = useMemo(() => glowTexture(), []);
  const p = Array.isArray(position) ? position : ([position.x, position.y, position.z] as [number, number, number]);
  return (
    <sprite position={p} scale={[size, size, size]}>
      <spriteMaterial map={tex} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
};

/** Round point sprites for THREE.Points. */
let dotTex: THREE.Texture | null = null;
export const dotTexture = () => {
  if (dotTex) return dotTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.55, "rgba(255,255,255,0.9)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.beginPath();
  g.arc(32, 32, 32, 0, Math.PI * 2);
  g.fill();
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
};

export const latLon = (lat: number, lon: number, r: number) => {
  const p = (lat * Math.PI) / 180;
  const l = (lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(p) * Math.sin(l), r * Math.sin(p), r * Math.cos(p) * Math.cos(l));
};
