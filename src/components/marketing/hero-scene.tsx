"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

/*
 * The hero's sea of clouds: a port of the reference's layered WebGL scene.
 * Three peak planes (back .2, middle .5, front .8) and five cloud planes (.35, .65, .9, 1, 1.2)
 * sit in a 1920×947 reference frame, cover-fitted to the viewport. Every plane drifts with the
 * eased mouse and with scroll in proportion to its depth; clouds sail left to right and part
 * around the cursor; the front peaks shift by a height map ("fake 3D").
 */

const REF = { w: 1920, h: 947 };
const X_PARALLAX_RANGE = 0.01;
const Y_PARALLAX_RANGE = 22;
const MIN_ZOOM = 1.1;
const CLOUD_W = 500;
const CLOUD_H = 200;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Cloud {
  x: number;
  y: number;
  scale: number;
  vx: number;
  color: number;
  flip: boolean;
  depth: number;
  fade: number;
  fading: boolean;
  tween: gsap.core.Tween | null;
}
interface CloudPlane {
  depth: number;
  items: Cloud[];
}

function makeClouds(depth: number, count: number, randomness: number): CloudPlane {
  const items: Cloud[] = [];
  for (let i = 0; i < count; i++) {
    const d = depth + (Math.random() - 0.5) * 0.1;
    const front = depth > 1;
    const x = front ? lerp(-0.6 * REF.w, 0.6 * REF.w, i / (count - 1)) : (Math.random() - 0.5) * REF.w * 1.2;
    let y = lerp(200, -300, d) + (Math.random() - 0.5) * 50;
    if (front) y -= 50;
    const scale = lerp(0.2, 2, d) + (Math.random() - 0.5) * 0.3;
    const vx = lerp(0.1, 0.5, d) + (Math.random() - 0.5) * 0.1;
    const color = front ? 1 : Math.min(1, Math.max(0, lerp(1, 0.9, d))) + (Math.random() - 0.5) * 0.15 * randomness;
    items.push({ x, y, scale, vx, color, flip: Math.random() < 0.5, depth, fade: 0, fading: false, tween: null });
  }
  return { depth, items };
}

const VS = `
attribute vec2 aPos;
uniform vec4 uRect;      // x, y (centre, px, y down), w, h (px)
uniform vec2 uView;      // viewport px
uniform float uFlip;
varying vec2 vUv;
void main() {
  vUv = vec2(uFlip > 0.5 ? 1.0 - aPos.x : aPos.x, aPos.y);
  vec2 p = uRect.xy + (aPos - 0.5) * uRect.zw;
  vec2 clip = vec2(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
}`;

const FS = `
precision mediump float;
uniform sampler2D uTex;
uniform sampler2D uBump;
uniform sampler2D uAlphaMap;
uniform float uUseAlphaMap;
uniform float uStereo;
uniform vec2 uMouse;
uniform float uAlpha;
uniform vec3 uTint;
varying vec2 vUv;
vec2 mirrored(vec2 v) { vec2 m = mod(v, 2.0); return mix(m, 2.0 - m, step(1.0, m)); }
// three.js treats untagged textures as linear and sRGB-encodes the output of its built-in
// materials; the reference's custom stereo shader skips that step. Reproduce both paths.
vec3 srgbEncode(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
void main() {
  vec2 uv = vUv; // images upload top row first, and aPos.y = 0 is the top edge
  vec4 c;
  if (uStereo > 0.5) {
    float h = texture2D(uBump, mirrored(uv)).r;
    vec2 f = vec2(uv.x + (h - 0.5) * uMouse.x / 20.0, uv.y - (h - 0.5) * uMouse.y / 20.0);
    c = texture2D(uTex, mirrored(f));
    // As the reference: the alpha comes from a separate map, displaced by the same fake-3D offset.
    if (uUseAlphaMap > 0.5) c.a = texture2D(uAlphaMap, mirrored(f)).r;
    c.rgb += 0.05;
  } else {
    c = texture2D(uTex, uv);
  }
  vec3 rgb = c.rgb * uTint;
  if (uStereo < 0.5) rgb = srgbEncode(rgb);
  gl_FragColor = vec4(rgb, c.a * uAlpha);
}`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function HeroScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    // WebGL2 lets non-power-of-two textures carry mipmaps, as three.js does by default.
    const gl2 = canvas.getContext("webgl2", { alpha: false, antialias: true });
    const gl = (gl2 ?? canvas.getContext("webgl", { alpha: false, antialias: true })) as WebGLRenderingContext | null;
    if (!gl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = () => window.innerWidth <= 1100;

    // ---------- GL setup ----------
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = { rect: u("uRect"), view: u("uView"), flip: u("uFlip"), tex: u("uTex"), bump: u("uBump"), alphaMap: u("uAlphaMap"), useAlphaMap: u("uUseAlphaMap"), stereo: u("uStereo"), mouse: u("uMouse"), alpha: u("uAlpha"), tint: u("uTint") };
    gl.uniform1i(U.tex, 0);
    gl.uniform1i(U.bump, 1);
    gl.uniform1i(U.alphaMap, 2);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    // Textures clamp (the stereo shader mirrors UVs itself) and, on WebGL2, carry mipmaps.
    const texture = (img: HTMLImageElement) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      if (gl2) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl2 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };

    // ---------- Scene state (reference constants) ----------
    const peaks = [
      { id: "background", depth: 0.2 },
      { id: "middle", depth: 0.5 },
      { id: "front", depth: 0.8, stereo: true },
    ];
    const cloudPlanes = [makeClouds(0.35, 25, 1), makeClouds(0.65, 20, 1), makeClouds(0.9, 7, 1), makeClouds(1, 7, 1), makeClouds(1.2, 15, 0)];
    const mouse = { x: 0, y: 0, ex: 0, ey: 0, active: false };
    const scroll = { zoom: 0, main: 0, mainEased: 0 };
    const intro = { white: 1 };
    let size = { w: 0, h: 0, dpr: 1, scale: 1 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1); // the reference renders at 1×
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // Cover-fit the 1920×947 reference frame.
      const scale = w / h > REF.w / REF.h ? w / REF.w : h / REF.h;
      size = { w, h, dpr, scale };
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    // world (y up, origin at centre) → screen px
    const camX = () => (mobile() ? 200 : 0);
    const toScreen = (x: number, y: number, zoom: number) => {
      const s = size.scale;
      const sy = scroll.mainEased * REF.h * 0.9; // cont3D.position.y
      // The camera's mobile offset is in screen pixels (it sits outside the scaled container).
      return { x: size.w / 2 + x * zoom * s - camX(), y: size.h / 2 - (sy + y * zoom) * s };
    };
    const parallaxY = () => (-mouse.ey + 15 * scroll.main) * 2.5;

    const blow = (px: number, py: number) => {
      for (const plane of cloudPlanes) {
        if (plane.depth > 1) continue;
        const ox = -mouse.ex * X_PARALLAX_RANGE * REF.w * plane.depth;
        const oy = parallaxY() * Y_PARALLAX_RANGE * plane.depth + scroll.mainEased * REF.h * 0.9;
        for (const c of plane.items) {
          if (c.fading) continue;
          if (Math.hypot(px - (c.x + ox), py - (c.y + oy)) < 200) {
            c.fading = true;
            c.tween = gsap.to(c, {
              fade: 1,
              duration: 1,
              ease: "none",
              onComplete: () => {
                gsap.delayedCall(1, () => {
                  c.tween = gsap.to(c, { fade: 0, duration: 1, ease: "none", onComplete: () => (c.fading = false) });
                });
              },
            });
          }
        }
      }
    };

    let tex: Record<string, WebGLTexture | undefined> = {};
    let ready = false;
    let visible = true;
    let raf = 0;
    let last = performance.now();

    const drawQuad = (t: WebGLTexture, cx: number, cy: number, w: number, h: number, opts: { alpha?: number; tint?: number; flip?: boolean; stereo?: boolean } = {}) => {
      const d = size.dpr;
      gl.uniform4f(U.rect, cx * d, cy * d, w * d, h * d);
      gl.uniform2f(U.view, canvas.width, canvas.height);
      gl.uniform1f(U.flip, opts.flip ? 1 : 0);
      gl.uniform1f(U.alpha, opts.alpha ?? 1);
      const k = opts.tint ?? 1;
      gl.uniform3f(U.tint, k, k, k);
      gl.uniform1f(U.stereo, opts.stereo ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!ready || !visible) return;
      const dt = Math.min(3, (now - last) / (1000 / 60));
      last = now;

      // Eased inputs (the reference eases the mouse at 0.01 per frame).
      mouse.ex += (mouse.x - mouse.ex) * 0.01 * dt;
      mouse.ey += (mouse.y - mouse.ey) * 0.01 * dt;
      scroll.mainEased += (scroll.main - scroll.mainEased) * 0.1 * dt;
      const zoom = MIN_ZOOM + 0.3 * scroll.zoom;

      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.mouse, mouse.ex, mouse.ey);

      // Painter's order by depth: back .2, clouds .35, middle .5, clouds .65, front .8, clouds .9, 1, 1.2.
      const layers: { depth: number; draw: () => void }[] = [];
      for (const p of peaks) {
        layers.push({
          depth: p.depth,
          draw: () => {
            const ox = -mouse.ex * X_PARALLAX_RANGE * REF.w * p.depth;
            const oy = parallaxY() * Y_PARALLAX_RANGE * p.depth;
            const c = toScreen(ox, oy, zoom);
            const w = 1.23 * REF.w * size.scale * zoom;
            const h = REF.h * size.scale * zoom;
            if (p.stereo) {
              gl.activeTexture(gl.TEXTURE1);
              gl.bindTexture(gl.TEXTURE_2D, tex.front_bump!);
              gl.activeTexture(gl.TEXTURE2);
              gl.bindTexture(gl.TEXTURE_2D, tex.front_alpha ?? tex.front_bump!);
            }
            gl.uniform1f(U.useAlphaMap, p.stereo && tex.front_alpha ? 1 : 0);
            drawQuad(tex[p.id]!, c.x, c.y, w, h, { stereo: p.stereo });
          },
        });
      }
      for (const plane of cloudPlanes) {
        layers.push({
          depth: plane.depth,
          draw: () => {
            const ox = -mouse.ex * X_PARALLAX_RANGE * REF.w * plane.depth;
            const oy = parallaxY() * Y_PARALLAX_RANGE * plane.depth;
            for (const c of plane.items) {
              if (!reduced) {
                c.x += c.vx * dt;
                const edge = 0.5 * REF.w + CLOUD_W * c.scale * 0.5;
                if (c.x > edge) c.x = -edge;
              }
              const s = c.scale * (1 + 0.3 * c.fade);
              const p = toScreen(ox + c.x, oy + c.y, zoom);
              drawQuad(tex.cloud!, p.x, p.y, CLOUD_W * s * size.scale * zoom, CLOUD_H * s * size.scale * zoom, { alpha: 1 - c.fade, tint: c.color, flip: c.flip });
            }
            // A white ground plane sits beneath the frontmost bank so the fog never shows a floor.
            if (plane.depth > 1) {
              const g = toScreen(ox, oy - REF.h, zoom);
              drawQuad(tex.white!, g.x, g.y, 1.23 * REF.w * size.scale * zoom, REF.h * size.scale * zoom);
            }
          },
        });
      }
      layers.sort((a, b) => a.depth - b.depth).forEach((l) => l.draw());

      // Entrance: a white veil lifts over three seconds.
      if (intro.white > 0.001) drawQuad(tex.white!, size.w / 2, size.h / 2, size.w, size.h, { alpha: intro.white });

      // Clouds part around the cursor.
      if (mouse.active && !reduced) blow(mouse.x * REF.w * 0.5, mouse.y * REF.h * 0.5);
    };

    // ---------- Inputs ----------
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
      mouse.active = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);

    const hero = document.querySelector(".component--hero");
    const numbers = document.querySelector(".component--gridnumbers");
    const triggers: ScrollTrigger[] = [];
    if (hero && numbers) {
      triggers.push(
        ScrollTrigger.create({
          trigger: hero,
          start: "top top",
          endTrigger: numbers,
          end: "top top",
          scrub: true,
          onUpdate: (st) => {
            const p = st.progress;
            scroll.zoom = p;
            scroll.main = 0.5 * (p < 0.4 ? 0 : (p - 0.4) / 0.6);
          },
          // Off-screen, the scene stops rendering (as the reference deactivates its app).
          onLeave: () => {
            visible = false;
            canvas.style.visibility = "hidden";
          },
          onEnterBack: () => {
            visible = true;
            canvas.style.visibility = "visible";
          },
        }),
      );
    }

    // ---------- Load ----------
    let cancelled = false;
    const white = document.createElement("canvas");
    white.width = white.height = 2;
    const wctx = white.getContext("2d")!;
    wctx.fillStyle = "#fff";
    wctx.fillRect(0, 0, 2, 2);
    // The scene's photographic set (local only, see public/art/hero/source/README) is preferred;
    // without it, the rendered set that ships with the repository is used.
    const SOURCE_SET: Record<string, string> = {
      background: "/art/hero/source/background.jpg",
      middle: "/art/hero/source/peaks_MIDDLE.png",
      front: "/art/hero/source/peaks_FRONT.jpg",
      front_bump: "/art/hero/source/peaks_FRONT_bump.jpg",
      front_alpha: "/art/hero/source/peaks_FRONT_alpha.jpg",
      cloud: "/art/hero/source/cloud.png",
    };
    const RENDERED_SET: Record<string, string> = {
      background: "/art/hero/background.jpg",
      middle: "/art/hero/middle.webp",
      front: "/art/hero/front.webp",
      front_bump: "/art/hero/front_bump.jpg",
      cloud: "/art/hero/cloud.webp",
    };
    const loadSet = (set: Record<string, string>) => Promise.all(Object.entries(set).map(([n, src]) => loadImage(src).then((img) => [n, img] as const)));
    loadSet(SOURCE_SET)
      .catch(() => loadSet(RENDERED_SET))
      .then((imgs) => {
        if (cancelled) return;
        tex = Object.fromEntries(imgs.map(([n, img]) => [n, texture(img)]));
        const wt = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, wt);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, white);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        tex.white = wt;
        ready = true;
        canvas.dataset.ready = "";
        if (reduced) {
          intro.white = 0;
        } else {
          gsap.to(intro, { white: 0, duration: 3, ease: "none" });
          // The opening "blow": clouds along the lower left part to reveal the ridge.
          gsap.delayedCall(1, () => [-0.53, -0.43, -0.33, -0.23, -0.13, -0.03].forEach((k) => blow(k * REF.w * 0.5, -0.751 * REF.h * 0.5)));
        }
      })
      .catch(() => {});
    raf = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      triggers.forEach((t) => t.kill());
      cloudPlanes.forEach((p) => p.items.forEach((c) => c.tween?.kill()));
      // Release GPU resources but keep the context alive: React may mount this effect again
      // on the same canvas (Strict Mode in development), and a lost context never comes back.
      Object.values(tex).forEach((t) => t && gl.deleteTexture(t));
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return <canvas ref={ref} className="scene" aria-hidden />;
}
