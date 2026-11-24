/* Skylark presentation: the 3D world.
 *
 * One persistent Three.js scene sits behind every slide. Its particle field morphs between
 * meaningful formations (the logo mark, a wall of listings, the globe, a data stream, protection
 * rings…), so the story moves continuously instead of cutting between slides. The world also owns
 * the extruded logo mark, the globe's routes and the exploded architecture stack.
 *
 * Post-processing is hand-written: a bright-pass bloom at half and quarter resolution, composited
 * with an atmospheric gradient, vignette and a whisper of chromatic aberration.
 */
(function () {
  const W = 1920, H = 1080;
  const N = 9000;
  const C = {
    night: new THREE.Color("#07080B"), ember: new THREE.Color("#F95135"), ember2: new THREE.Color("#FF7A52"),
    amber: new THREE.Color("#FFB98A"), paper: new THREE.Color("#F4F1EC"), sky: new THREE.Color("#7CC6EE"),
    mint: new THREE.Color("#6FD6A8"), mist: new THREE.Color("#A7ADB7"),
  };
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches || new URLSearchParams(location.search).has("reduced");
  const rand = mulberry(7);
  function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const gauss = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  let renderer, scene, camera, clock, stageEl, ok = false;
  let rtScene, rtA, rtB, rtC, rtD, quad, postScene, postCam, matBright, matBlur, matComposite;
  let points, pGeo, pMat;
  let markGroup, globeGroup, archGroup, archLabels = [], packets = null;
  let scale = 1;
  const cam = { pos: new THREE.Vector3(0, 0, 60), target: new THREE.Vector3(), roll: 0, drift: 1 };
  const look = new THREE.Vector3();
  const tick = []; // per-frame callbacks
  let current = null;

  /* ================================================================ formations */
  const MARK = [
    [[44.67, 306.5], [210.83, 400.33], [98.33, 411]],
    [[233.5, 408.17], [108.67, 500], [151.83, 416]],
    [[291.33, 315.33], [219.33, 392.5], [187.33, 374.67], [215.83, 338.17]],
  ];
  const MARK_CX = (44.67 + 291.33) / 2, MARK_CY = (306.5 + 500) / 2, MARK_W = 291.33 - 44.67;
  const markXY = (x, y, size) => [((x - MARK_CX) / MARK_W) * size, (-(y - MARK_CY) / MARK_W) * size];

  function triArea(a, b, c) { return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2; }
  function markTriangles() {
    const tris = [];
    MARK.forEach((poly) => { for (let i = 1; i < poly.length - 1; i++) tris.push([poly[0], poly[i], poly[i + 1]]); });
    return tris;
  }
  function F_mark(size = 18, cx = 0, cy = 0, frac = 1) {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const tris = markTriangles();
    const areas = tris.map((t) => triArea(...t)); const total = areas.reduce((a, b) => a + b, 0);
    const count = Math.floor(N * frac);
    for (let i = 0; i < N; i++) {
      if (i < count) {
        let r = rand() * total, k = 0; while (r > areas[k]) { r -= areas[k]; k++; }
        let u = rand(), v = rand(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
        const [a, b, c] = tris[k];
        const x = a[0] + u * (b[0] - a[0]) + v * (c[0] - a[0]);
        const y = a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]);
        const [X, Y] = markXY(x, y, size);
        pos.set([X + cx, Y + cy, gauss() * 0.18], i * 3);
        const t = 0.55 + rand() * 0.45;
        col.set([C.ember.r * t, C.ember.g * t, C.ember.b * t], i * 3);
      } else dustAt(pos, col, i, 0.6);
    }
    return { pos, col };
  }
  function dustAt(pos, col, i, b = 1) {
    pos.set([(rand() - 0.5) * 150, (rand() - 0.5) * 90, -60 + rand() * 95], i * 3);
    const e = rand() < 0.12; const t = (0.05 + rand() * 0.16) * b;
    const c = e ? C.ember : C.paper;
    col.set([c.r * t, c.g * t, c.b * t], i * 3);
  }
  function F_dust(b = 1) {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) dustAt(pos, col, i, b);
    return { pos, col };
  }
  function F_void() {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 40 + rand() * 80, th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.6, r * Math.cos(ph) - 20], i * 3);
      const t = 0.02 + rand() * 0.1; col.set([C.paper.r * t, C.paper.g * t, C.paper.b * t], i * 3);
    }
    return { pos, col };
  }
  // Wall of listings: a field of job cards, each drawn as an outline and two text lines.
  const WALL = { cols: 18, rows: 10, w: 3.3, h: 2.0, gx: 0.55, gy: 0.6 };
  const wallGood = new Set();
  (function () { const r = mulberry(11); while (wallGood.size < 13) wallGood.add(Math.floor(r() * WALL.cols * WALL.rows)); })();
  function F_wall(mode = 0) {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const cards = WALL.cols * WALL.rows, per = Math.floor(N / cards);
    const totalW = WALL.cols * (WALL.w + WALL.gx), totalH = WALL.rows * (WALL.h + WALL.gy);
    const r2 = mulberry(5);
    for (let c = 0; c < cards; c++) {
      const cx = (c % WALL.cols) * (WALL.w + WALL.gx) - totalW / 2 + WALL.w / 2;
      const cy = Math.floor(c / WALL.cols) * (WALL.h + WALL.gy) - totalH / 2 + WALL.h / 2;
      const good = wallGood.has(c);
      for (let k = 0; k < per; k++) {
        const i = c * per + k;
        let x, y;
        if (k < per * 0.62) { // outline
          const t = (k / (per * 0.62)) * 2 * (WALL.w + WALL.h);
          if (t < WALL.w) { x = t - WALL.w / 2; y = WALL.h / 2; }
          else if (t < WALL.w + WALL.h) { x = WALL.w / 2; y = WALL.h / 2 - (t - WALL.w); }
          else if (t < 2 * WALL.w + WALL.h) { x = WALL.w / 2 - (t - WALL.w - WALL.h); y = -WALL.h / 2; }
          else { x = -WALL.w / 2; y = -WALL.h / 2 + (t - 2 * WALL.w - WALL.h); }
        } else { // two lines of "text"
          const line = k % 2; const len = line ? 0.55 : 0.8;
          x = -WALL.w / 2 + 0.3 + r2() * (WALL.w - 0.6) * len; y = line ? -0.05 : 0.45;
        }
        // gentle curvature so the wall reads as a space you stand in front of
        const X = cx + x, Y = cy + y;
        const Z = -Math.pow(X / totalW, 2) * 26;
        pos.set([X, Y, Z], i * 3);
        let cc = C.paper, t = 0.32;
        if (mode === 1) { if (good) { cc = C.ember; t = 1.0; } else { cc = C.ember; t = 0.07; } }
        if (mode === 2) { if (good) { cc = C.ember; t = 1.0; } else { cc = C.mist; t = 0.035; } }
        col.set([cc.r * t, cc.g * t, cc.b * t], i * 3);
      }
    }
    for (let i = cards * per; i < N; i++) dustAt(pos, col, i, 0.4);
    return { pos, col };
  }
  // Globe from the site's own stippled world map (js/data/land.js).
  const GLOBE_R = 11;
  function ll(lat, lon, r = GLOBE_R) {
    const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
    return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
  }
  function F_globe() {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const land = window.LAND || [];
    const nl = Math.min(land.length / 2, N - 1800);
    for (let i = 0; i < nl; i++) {
      const v = ll(land[i * 2], land[i * 2 + 1]);
      pos.set([v.x, v.y, v.z], i * 3);
      const t = 0.38 + rand() * 0.25; col.set([C.paper.r * t, C.paper.g * t, C.paper.b * t], i * 3);
    }
    const golden = Math.PI * (3 - Math.sqrt(5));
    const rest = N - nl;
    for (let j = 0; j < rest; j++) {
      const i = nl + j;
      if (j < rest * 0.75) {
        const y = 1 - (2 * (j + 0.5)) / (rest * 0.75), r = Math.sqrt(1 - y * y), th = j * golden;
        pos.set([Math.cos(th) * r * GLOBE_R * 0.998, y * GLOBE_R * 0.998, Math.sin(th) * r * GLOBE_R * 0.998], i * 3);
        const t = 0.06; col.set([C.mist.r * t, C.mist.g * t, C.mist.b * t], i * 3);
      } else dustAt(pos, col, i, 0.5);
    }
    return { pos, col };
  }
  function F_floor() {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const nx = 110, nz = 46; let i = 0;
    for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
      if (i >= N) break;
      const X = (x - nx / 2) * 1.4, Z = -z * 1.6 + 18;
      pos.set([X, -11, Z], i * 3);
      const fade = Math.max(0, 1 - z / nz) * Math.max(0, 1 - Math.abs(X) / 80);
      const t = 0.05 + 0.22 * fade; col.set([C.paper.r * t, C.paper.g * t, C.paper.b * t], i * 3); i++;
    }
    for (; i < N; i++) dustAt(pos, col, i, 0.5);
    return { pos, col };
  }
  function F_stream() {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const x = (rand() - 0.5) * 140;
      const lane = Math.floor(rand() * 5) - 2;
      pos.set([x, -9.5 + lane * 0.5 + gauss() * 0.22, -6 + gauss() * 3.2], i * 3);
      const hot = rand() < 0.16; const t = hot ? 0.7 : 0.12 + rand() * 0.18; const c = hot ? C.ember : C.paper;
      col.set([c.r * t, c.g * t, c.b * t], i * 3);
    }
    return { pos, col };
  }
  function F_rings() {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const radii = [3.6, 5.4, 7.2, 9, 10.8, 12.6]; const per = Math.floor((N * 0.8) / radii.length);
    let i = 0;
    radii.forEach((r, k) => {
      for (let j = 0; j < per; j++, i++) {
        const a = (j / per) * Math.PI * 2;
        pos.set([Math.cos(a) * (r + gauss() * 0.05) + 9.5, Math.sin(a) * (r + gauss() * 0.05), -2 + gauss() * 0.1], i * 3);
        const c = k === 0 ? C.ember : C.paper; const t = k === 0 ? 0.5 : 0.045 + 0.018 * (radii.length - k);
        col.set([c.r * t, c.g * t, c.b * t], i * 3);
      }
    });
    for (; i < N; i++) dustAt(pos, col, i, 0.4);
    return { pos, col };
  }
  function F_halo() {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      if (i < N * 0.7) {
        const a = rand() * Math.PI * 2, r = 19 + gauss() * 1.4;
        pos.set([Math.cos(a) * r, Math.sin(a) * r * 0.56, -16 + gauss() * 1.2], i * 3);
        const top = (Math.sin(a) + 1) / 2; const t = 0.15 + 0.55 * Math.pow(1 - top, 2);
        const c = top < 0.5 ? C.ember : C.amber; col.set([c.r * t, c.g * t, c.b * t], i * 3);
      } else dustAt(pos, col, i, 0.5);
    }
    return { pos, col };
  }
  function F_line() {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      if (i < N * 0.45) {
        const x = (rand() - 0.5) * 120; pos.set([x, -9.3 + gauss() * 0.06, gauss() * 0.4], i * 3);
        const right = x > 2; const t = right ? 0.1 : 0.5; const c = right ? C.paper : C.ember;
        col.set([c.r * t, c.g * t, c.b * t], i * 3);
      } else dustAt(pos, col, i, 0.6);
    }
    return { pos, col };
  }

  /* ================================================================ slide configs */
  // camera: position + target; form: particle formation; plus scene objects to show.
  const SCENES = {
    intro: { cam: [0, 0, 46], tgt: [0, 0, 0], form: () => F_dust(0.6), glow: [0.5, 0.55, 0.0] },
    problem: { cam: [0, -2, 52], tgt: [0, 0, -4], form: () => F_wall(0), glow: [0.5, 1.1, 0.25], turb: 0.12 },
    shortfall: { cam: [0, 0, 60], tgt: [0, 0, 0], form: () => F_dust(0.7), glow: [0.78, 1.0, 0.3] },
    reveal: { cam: [0, 0, 44], tgt: [0, 0, 0], form: F_halo, glow: [0.5, 0.92, 0.55] },
    vision: { cam: [0, 1, 46], tgt: [-10.5, 0.4, 0], form: F_globe, globe: true, glow: [0.7, 0.5, 0.35] },
    overview: { cam: [0, 2, 46], tgt: [0, 0, 0], form: F_floor, glow: [0.5, 1.15, 0.3] },
    capabilities: { cam: [0, 0, 50], tgt: [0, 0, 0], form: () => F_dust(0.8), glow: [0.15, 0.5, 0.25] },
    how: { cam: [0, 0, 50], tgt: [0, 0, 0], form: () => F_dust(0.6), glow: [0.5, -0.2, 0.25] },
    architecture: { cam: [27, 18, 36], tgt: [-8.5, -1.2, 0], form: () => F_dust(0.6), arch: true, glow: [0.62, 0.5, 0.35] },
    pipeline: { cam: [0, -1, 40], tgt: [0, -2, 0], form: F_stream, flow: 1, glow: [0.5, 1.2, 0.3] },
    engine: { cam: [0, 0, 50], tgt: [0, 0, 0], form: () => F_dust(0.5), glow: [0.72, 0.6, 0.35] },
    tailoring: { cam: [0, 0, 50], tgt: [0, 0, 0], form: () => F_dust(0.5), glow: [0.25, 0.55, 0.3] },
    journey: { cam: [0, 2, 46], tgt: [0, 0, 0], form: F_floor, glow: [0.5, 1.15, 0.3] },
    engineering: { cam: [0, 0, 50], tgt: [0, 0, 0], form: () => F_dust(0.6), glow: [0.85, 0.3, 0.3] },
    stack: { cam: [0, 0, 50], tgt: [0, 0, 0], form: () => F_dust(0.5), glow: [0.5, 0.5, 0.25] },
    security: { cam: [0, 0, 44], tgt: [0, 0, 0], form: F_rings, glow: [0.7, 0.5, 0.35] },
    demo: { cam: [0, 2, 46], tgt: [0, 0, 0], form: F_floor, glow: [0.5, 1.1, 0.3] },
    results: { cam: [0, 0, 50], tgt: [0, 0, 0], form: () => F_dust(0.6), glow: [0.2, 0.9, 0.3] },
    roadmap: { cam: [0, 0, 40], tgt: [0, 0, 0], form: F_line, glow: [0.35, 0.6, 0.3] },
    statement: { cam: [0, 0, 46], tgt: [0, 0, 0], form: () => F_mark(11.7, -15.14, 0, 0.6), glow: [0.2, 0.5, 0.35], dimPoints: 0.6 },
    closing: { cam: [0, 0, 46], tgt: [0, 0, 0], form: F_halo, glow: [0.5, 0.6, 0.4] },
  };

  /* ================================================================ particles */
  function makePoints() {
    pGeo = new THREE.BufferGeometry();
    const f = F_void();
    const rnd = new Float32Array(N), size = new Float32Array(N);
    for (let i = 0; i < N; i++) { rnd[i] = rand(); size[i] = 0.55 + Math.pow(rand(), 3) * 1.6; }
    pGeo.setAttribute("position", new THREE.BufferAttribute(f.pos.slice(), 3));
    pGeo.setAttribute("aFrom", new THREE.BufferAttribute(f.pos.slice(), 3));
    pGeo.setAttribute("aTo", new THREE.BufferAttribute(f.pos.slice(), 3));
    pGeo.setAttribute("cFrom", new THREE.BufferAttribute(f.col.slice(), 3));
    pGeo.setAttribute("cTo", new THREE.BufferAttribute(f.col.slice(), 3));
    pGeo.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1));
    pGeo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    pMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uMix: { value: 1 }, uTime: { value: 0 }, uTurb: { value: 0.15 }, uPx: { value: 300 }, uAlpha: { value: 1 }, uFlow: { value: 0 }, uLift: { value: 1 }, uGlobe: { value: 0 } },
      vertexShader: `
        attribute vec3 aFrom; attribute vec3 aTo; attribute vec3 cFrom; attribute vec3 cTo; attribute float aRnd; attribute float aSize;
        uniform float uMix, uTime, uTurb, uPx, uFlow, uLift, uGlobe;
        varying vec3 vCol; varying float vFade;
        float ease(float t){ return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) / 2.; }
        void main(){
          float d = aRnd * .45;
          float t = ease(clamp((uMix - d) / .55, 0., 1.));
          vec3 p = mix(aFrom, aTo, t);
          float arc = sin(t * 3.14159);
          p += uLift * arc * vec3((aRnd - .5) * 4., (fract(aRnd * 7.3) - .5) * 5., (fract(aRnd * 3.7) - .5) * 9.);
          p.x = p.x + uFlow * uTime * (2. + aRnd * 5.);
          p.x = uFlow > 0. ? mod(p.x + 70., 140.) - 70. : p.x;
          p += uTurb * vec3(sin(uTime * .31 + aRnd * 40.), cos(uTime * .27 + aRnd * 31.), sin(uTime * .23 + aRnd * 17.));
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPx / -mv.z;
          vCol = mix(cFrom, cTo, t);
          vec3 wp = (modelMatrix * vec4(p, 1.)).xyz; vec3 wc = (modelMatrix * vec4(0., 0., 0., 1.)).xyz;
          float facing = dot(normalize(wp - wc), normalize(cameraPosition - wp));
          vFade = mix(1., .12 + .88 * smoothstep(-.3, .35, facing), uGlobe);
        }`,
      fragmentShader: `
        uniform float uAlpha; varying vec3 vCol; varying float vFade;
        void main(){
          vec2 q = gl_PointCoord - .5; float r = length(q);
          float a = smoothstep(.5, .05, r);
          gl_FragColor = vec4(vCol * a * uAlpha * vFade, 1.);
        }`,
    });
    points = new THREE.Points(pGeo, pMat);
    points.frustumCulled = false;
    scene.add(points);
  }
  // CPU mirror of the vertex shader (without turbulence) so a new morph starts exactly where the old one is.
  function snapshot() {
    const from = pGeo.attributes.aFrom.array, to = pGeo.attributes.aTo.array;
    const cf = pGeo.attributes.cFrom.array, ct = pGeo.attributes.cTo.array, rnd = pGeo.attributes.aRnd.array;
    const m = pMat.uniforms.uMix.value, flow = pMat.uniforms.uFlow.value, time = pMat.uniforms.uTime.value, lift = pMat.uniforms.uLift.value;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    for (let i = 0; i < N; i++) {
      const a = rnd[i]; const t = ease(Math.min(1, Math.max(0, (m - a * 0.45) / 0.55)));
      const arc = Math.sin(t * Math.PI);
      for (let k = 0; k < 3; k++) { pos[i * 3 + k] = from[i * 3 + k] + (to[i * 3 + k] - from[i * 3 + k]) * t; col[i * 3 + k] = cf[i * 3 + k] + (ct[i * 3 + k] - cf[i * 3 + k]) * t; }
      pos[i * 3] += lift * arc * (a - 0.5) * 4; pos[i * 3 + 1] += lift * arc * ((a * 7.3) % 1 - 0.5) * 5; pos[i * 3 + 2] += lift * arc * ((a * 3.7) % 1 - 0.5) * 9;
      if (flow > 0) { let x = pos[i * 3] + flow * time * (2 + a * 5); x = ((((x + 70) % 140) + 140) % 140) - 70; pos[i * 3] = x; }
    }
    return { pos, col };
  }
  let morphTween = null;
  function morph(f, { dur = 2.4, instant = false, lift = 1, keepFlow = false } = {}) {
    const snap = snapshot();
    pGeo.attributes.aFrom.array.set(snap.pos); pGeo.attributes.cFrom.array.set(snap.col);
    pGeo.attributes.aTo.array.set(f.pos); pGeo.attributes.cTo.array.set(f.col);
    ["aFrom", "cFrom", "aTo", "cTo"].forEach((k) => (pGeo.attributes[k].needsUpdate = true));
    if (!keepFlow) pMat.uniforms.uFlow.value = 0;
    if (morphTween) morphTween.kill();
    pMat.uniforms.uLift.value = lift;
    if (instant || REDUCED) { pMat.uniforms.uMix.value = 1; return null; }
    pMat.uniforms.uMix.value = 0;
    morphTween = gsap.to(pMat.uniforms.uMix, { value: 1, duration: dur, ease: "none" });
    return morphTween;
  }

  /* ================================================================ logo mark (exact geometry, extruded) */
  function makeMark() {
    markGroup = new THREE.Group();
    const size = 16;
    MARK.forEach((poly, k) => {
      const shape = new THREE.Shape();
      poly.forEach(([x, y], i) => { const [X, Y] = markXY(x, y, size); i ? shape.lineTo(X, Y) : shape.moveTo(X, Y); });
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2 });
      geo.translate(0, 0, -0.25);
      // pivot each shard around its own centroid so it can tumble into place
      geo.computeBoundingBox(); const c = new THREE.Vector3(); geo.boundingBox.getCenter(c); geo.translate(-c.x, -c.y, -c.z);
      const mat = new THREE.MeshStandardMaterial({ color: C.ember, emissive: C.ember, emissiveIntensity: 0.32, metalness: 0.35, roughness: 0.36, transparent: true, opacity: 1 });
      const m = new THREE.Mesh(geo, mat);
      m.userData.home = c.clone();
      m.position.copy(c);
      markGroup.add(m);
    });
    markGroup.visible = false;
    scene.add(markGroup);
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-6, 8, 14); scene.add(key);
    const rim = new THREE.PointLight(0xffb98a, 2.2, 80); rim.position.set(14, -6, 10); scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    markGroup.userData.rim = rim;
  }
  /** Shards fly in from scattered, tumbling positions and lock into the exact mark. */
  function assembleMark({ dur = 3.2, delay = 0, scaleTo = 1 } = {}) {
    const tl = gsap.timeline({ delay });
    markGroup.visible = true;
    markGroup.scale.setScalar(scaleTo);
    markGroup.position.set(0, 0, 0);
    const scatter = [[-26, 14, -30], [10, -20, -26], [30, 16, -40]];
    markGroup.children.forEach((m, k) => {
      const h = m.userData.home;
      m.material.opacity = 1;
      m.position.set(scatter[k][0], scatter[k][1], scatter[k][2]);
      m.rotation.set(rand() * 4 - 2, rand() * 4 - 2, rand() * 4 - 2);
      tl.to(m.position, { x: h.x, y: h.y, z: h.z, duration: dur, ease: "expo.inOut" }, k * 0.18);
      tl.to(m.rotation, { x: 0, y: 0, z: 0, duration: dur, ease: "expo.inOut" }, k * 0.18);
    });
    return tl;
  }
  function hideMark(dur = 0.6) {
    if (!markGroup.visible) return gsap.timeline();
    return gsap.timeline().to(markGroup.children.map((m) => m.material), { opacity: 0, duration: dur, ease: "power2.out" }).add(() => (markGroup.visible = false));
  }
  /** Pixel width of the 3D mark on stage at the camera's current distance (used to hand off to the SVG logo). */
  function markPixelWidth(dist) {
    const vh = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
    return (16 / vh) * H;
  }

  /* ================================================================ globe routes */
  const CITIES = {
    Bengaluru: [12.97, 77.59], Berlin: [52.52, 13.4], London: [51.51, -0.13], "New York": [40.71, -74.0],
    Toronto: [43.65, -79.38], Sydney: [-33.87, 151.21], Dubai: [25.2, 55.27], Singapore: [1.35, 103.82],
  };
  function makeGlobe() {
    globeGroup = new THREE.Group();
    const routes = ["Berlin", "London", "Dubai", "Singapore", "Sydney", "Toronto", "New York"];
    const from = ll(...CITIES.Bengaluru, GLOBE_R * 1.004);
    globeGroup.userData.arcs = [];
    routes.forEach((name, k) => {
      const to = ll(...CITIES[name], GLOBE_R * 1.004);
      const pts = [];
      const steps = 90;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const v = new THREE.Vector3().copy(from).normalize().lerp(to.clone().normalize(), t).normalize();
        // slerp approximation, then lift
        const a = from.clone().normalize(), b = to.clone().normalize();
        const ang = a.angleTo(b);
        const s = Math.sin(ang);
        const p = a.multiplyScalar(Math.sin((1 - t) * ang) / s).add(b.multiplyScalar(Math.sin(t * ang) / s));
        const lift = 1 + Math.sin(t * Math.PI) * (0.12 + ang * 0.1);
        pts.push(p.multiplyScalar(GLOBE_R * lift));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const u = new Float32Array(pts.length); for (let i = 0; i < pts.length; i++) u[i] = i / (pts.length - 1);
      geo.setAttribute("aU", new THREE.BufferAttribute(u, 1));
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uDraw: { value: 0 }, uTime: { value: 0 }, uPhase: { value: k * 0.37 }, uColor: { value: C.ember.clone() }, uAlpha: { value: 1 } },
        vertexShader: `attribute float aU; varying float vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: `uniform float uDraw, uTime, uPhase, uAlpha; uniform vec3 uColor; varying float vU;
          void main(){ if (vU > uDraw) discard; float head = fract(uTime * .22 + uPhase); float pulse = smoothstep(.16, 0., abs(vU - head)) ;
          float base = .35 + .65 * smoothstep(uDraw - .2, uDraw, vU) * step(uDraw, .999);
          gl_FragColor = vec4(uColor * (base * .55 + pulse * 1.6) * uAlpha, 1.); }`,
      });
      const line = new THREE.Line(geo, mat);
      globeGroup.add(line);
      globeGroup.userData.arcs.push(mat);
      // destination beacon
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: 0 }));
      dot.position.copy(to); globeGroup.add(dot); mat.userData = { dot };
    });
    const origin = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), new THREE.MeshBasicMaterial({ color: C.ember, transparent: true, opacity: 0 }));
    origin.position.copy(from); globeGroup.add(origin); globeGroup.userData.origin = origin;
    globeGroup.visible = false;
    scene.add(globeGroup);
  }
  const GLOBE_ROT = { x: 0.3, y: -1.22 };

  /* ================================================================ architecture stack */
  const ARCH = [
    { name: "Experience", sub: "Next.js App Router", y: 7.2, nodes: ["Marketing site", "Candidate app", "Operations console", "Messages"] },
    { name: "Server", sub: "proxy.ts → Server Components · Actions · REST", y: 2.4, nodes: ["proxy.ts", "Server Components", "Server Actions", "REST API v1"] },
    { name: "Domain services", sub: "pure TypeScript, store-agnostic", y: -2.4, nodes: ["Matching", "Tailoring", "Reviews", "Pipeline"] },
    { name: "Data", sub: "one Repository interface", y: -7.2, nodes: ["Repository", "Postgres + RLS", "Auth", "Storage"] },
  ];
  const EXT = ["Vercel Cron", "Job boards", "Claude", "Gemini", "Razorpay", "Google sign-in", "SMTP"];
  function makeArch() {
    archGroup = new THREE.Group();
    archGroup.userData.layers = [];
    const edgeMat = (c, o) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
    ARCH.forEach((L, li) => {
      const g = new THREE.Group(); g.position.y = L.y;
      const slabGeo = new THREE.BoxGeometry(27, 0.16, 12.5);
      const slab = new THREE.Mesh(slabGeo, new THREE.MeshStandardMaterial({ color: 0x0e1117, emissive: C.ember, emissiveIntensity: 0.0, metalness: 0.2, roughness: 0.6, transparent: true, opacity: 0.82 }));
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slabGeo), edgeMat(C.paper, 0.22));
      g.add(slab, edges);
      // fine grid on the slab
      const grid = new THREE.GridHelper(27, 27, 0x2a2f38, 0x1a1e25); grid.scale.z = 12.5 / 27; grid.position.y = 0.09; grid.material.transparent = true; grid.material.opacity = 0.5; g.add(grid);
      const nodes = [];
      L.nodes.forEach((n, ni) => {
        const nb = new THREE.BoxGeometry(4.9, 0.9, 3.4);
        const m = new THREE.Mesh(nb, new THREE.MeshStandardMaterial({ color: 0x151922, emissive: C.ember, emissiveIntensity: 0.0, metalness: 0.3, roughness: 0.45, transparent: true, opacity: 0.95 }));
        m.position.set(-9.6 + ni * 6.4, 0.55, 0.8);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(nb), edgeMat(C.ember, 0.55)); e.position.copy(m.position);
        g.add(m, e);
        nodes.push({ mesh: m, edge: e, label: n });
      });
      g.userData = { slab, edges, nodes, home: L.y };
      archGroup.add(g);
      archGroup.userData.layers.push(g);
    });
    // conduits between stacked nodes
    const cond = [];
    for (let li = 0; li < ARCH.length - 1; li++) for (let ni = 0; ni < 4; ni++) {
      const a = new THREE.Vector3(-9.6 + ni * 6.4, ARCH[li].y + 0.1, 0.8), b = new THREE.Vector3(-9.6 + ni * 6.4, ARCH[li + 1].y + 1.0, 0.8);
      cond.push(a, b);
    }
    const conduits = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cond), edgeMat(C.paper, 0.12));
    archGroup.add(conduits);
    // external services on an orbit
    const ext = new THREE.Group(); ext.userData.nodes = [];
    EXT.forEach((n, k) => {
      const a = -0.9 + (k / (EXT.length - 1)) * 1.8 * Math.PI * 0.62;
      const p = new THREE.Vector3(Math.cos(a + 0.4) * 22, -1 + (k % 2 ? 2.6 : -1.8), Math.sin(a + 0.4) * 14 - 5);
      const geo = new THREE.OctahedronGeometry(0.5);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x151922, emissive: C.sky, emissiveIntensity: 0.32, transparent: true, opacity: 0 }));
      m.position.copy(p);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat(C.sky, 0)); e.position.copy(p);
      ext.add(m, e); ext.userData.nodes.push({ mesh: m, edge: e, label: n, p });
    });
    archGroup.add(ext); archGroup.userData.ext = ext;
    // data packets
    const PN = 160;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PN * 3), 3));
    pg.setAttribute("color", new THREE.BufferAttribute(new Float32Array(PN * 3), 3));
    const pm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uPx: { value: 300 }, uAlpha: { value: 0 } },
      vertexShader: `uniform float uPx; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv; gl_PointSize = 2.4 * uPx / -mv.z; }`,
      fragmentShader: `uniform float uAlpha; varying vec3 vC; void main(){ float r = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., r); gl_FragColor = vec4(vC * a * a * 1.6 * uAlpha, 1.); }`,
    });
    const pts = new THREE.Points(pg, pm); pts.frustumCulled = false;
    archGroup.add(pts);
    packets = { geo: pg, mat: pm, n: PN, items: [] };
    for (let i = 0; i < PN; i++) packets.items.push(newPacket(true));
    archGroup.visible = false;
    scene.add(archGroup);
  }
  function newPacket(randomT) {
    const ext = Math.random() < 0.3;
    if (ext) {
      const k = Math.floor(Math.random() * EXT.length);
      const L = archGroup ? archGroup.userData.ext.userData.nodes[k] : null;
      const layer = [1, 2, 2, 2, 2, 0, 1][k];
      const ni = [3, 3, 1, 0, 2, 1, 2][k];
      const a = L ? L.p.clone() : new THREE.Vector3();
      const b = new THREE.Vector3(-9.6 + ni * 6.4, ARCH[layer].y + 0.6, 0.8);
      return { a, b, t: randomT ? Math.random() : 0, v: 0.12 + Math.random() * 0.12, ext: true, dir: Math.random() < 0.5 };
    }
    const ni = Math.floor(Math.random() * 4), li = Math.floor(Math.random() * 3);
    const a = new THREE.Vector3(-9.6 + ni * 6.4, ARCH[li].y + 0.1, 0.8), b = new THREE.Vector3(-9.6 + ni * 6.4, ARCH[li + 1].y + 1.0, 0.8);
    return { a, b, t: randomT ? Math.random() : 0, v: 0.25 + Math.random() * 0.3, ext: false, dir: Math.random() < 0.35 };
  }
  function updatePackets(dt) {
    if (!archGroup.visible) return;
    const p = packets.geo.attributes.position.array, c = packets.geo.attributes.color.array;
    const showExt = archGroup.userData.extOn;
    packets.items.forEach((it, i) => {
      it.t += it.v * dt;
      if (it.t >= 1) { packets.items[i] = newPacket(false); return; }
      const t = it.dir ? 1 - it.t : it.t;
      const v = it.a.clone().lerp(it.b, t);
      p[i * 3] = v.x; p[i * 3 + 1] = v.y; p[i * 3 + 2] = v.z;
      const col = it.ext ? C.sky : C.ember; const k = it.ext && !showExt ? 0 : Math.sin(it.t * Math.PI);
      c[i * 3] = col.r * k; c[i * 3 + 1] = col.g * k; c[i * 3 + 2] = col.b * k;
    });
    packets.geo.attributes.position.needsUpdate = true; packets.geo.attributes.color.needsUpdate = true;
  }
  function archLabelsInit() {
    const host = document.querySelector('.slide[data-id="architecture"] .arch-labels');
    if (!host) return;
    archLabels = [];
    archGroup.userData.layers.forEach((g, li) => {
      g.userData.nodes.forEach((n) => {
        const el = document.createElement("div"); el.className = "al node"; el.dataset.layer = li; el.textContent = n.label; host.appendChild(el);
        archLabels.push({ el, obj: n.mesh, off: new THREE.Vector3(0, 0.7, 1.7) });
      });
    });
    archGroup.userData.ext.userData.nodes.forEach((n) => {
      const el = document.createElement("div"); el.className = "al ext"; el.textContent = n.label; host.appendChild(el);
      archLabels.push({ el, obj: n.mesh, off: new THREE.Vector3(0, 1.3, 0) });
    });
  }
  const _v = new THREE.Vector3();
  function project(obj, off) {
    obj.getWorldPosition(_v); if (off) _v.add(off);
    _v.project(camera);
    return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, z: _v.z };
  }
  function updateArchLabels() {
    if (!archGroup.visible || !archLabels.length) return;
    archLabels.forEach((l) => { const p = project(l.obj, l.off); l.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`; });
  }
  function archFocus(step, instant) {
    const d = instant ? 0 : 0.9;
    const layers = archGroup.userData.layers;
    layers.forEach((g, li) => {
      const on = step === 0 || step === 5 || step === li + 1;
      const focus = step === li + 1;
      gsap.to(g.userData.slab.material, { emissiveIntensity: focus ? 0.16 : 0, opacity: on ? 0.85 : 0.35, duration: d });
      gsap.to(g.userData.edges.material, { opacity: on ? (focus ? 0.7 : 0.28) : 0.08, duration: d });
      g.userData.nodes.forEach((n) => {
        gsap.to(n.mesh.material, { emissiveIntensity: focus ? 0.55 : on ? 0.12 : 0, opacity: on ? 0.95 : 0.3, duration: d });
        gsap.to(n.edge.material, { opacity: on ? (focus ? 1 : 0.5) : 0.1, duration: d });
      });
      // exploded view: the focused layer lifts toward the camera
      gsap.to(g.position, { y: g.userData.home + (focus ? 0.9 : 0), duration: instant ? 0 : 1.2, ease: "power3.inOut" });
    });
    const extOn = step >= 5;
    archGroup.userData.extOn = extOn;
    archGroup.userData.ext.userData.nodes.forEach((n) => {
      gsap.to(n.mesh.material, { opacity: extOn ? 0.9 : 0, duration: d });
      gsap.to(n.edge.material, { opacity: extOn ? 0.9 : 0, duration: d });
    });
    gsap.to(packets.mat.uniforms.uAlpha, { value: step === 0 ? 0.5 : 1, duration: d });
    document.querySelectorAll('.slide[data-id="architecture"] .al.node').forEach((el) => {
      const li = +el.dataset.layer; el.classList.toggle("on", step === 0 || step === 5 || step === li + 1); el.classList.toggle("focus", step === li + 1);
    });
    document.querySelectorAll('.slide[data-id="architecture"] .al.ext').forEach((el) => el.classList.toggle("on", extOn));
  }
  function archAssemble(instant) {
    const layers = archGroup.userData.layers;
    if (instant || REDUCED) { layers.forEach((g) => g.position.set(0, g.userData.home, 0)); return null; }
    const tl = gsap.timeline();
    layers.forEach((g, li) => {
      g.position.set(0, g.userData.home + 14 + li * 5, 0);
      g.rotation.y = 0.6;
      tl.to(g.position, { y: g.userData.home, duration: 1.8, ease: "expo.out" }, 0.15 + li * 0.16);
      tl.to(g.rotation, { y: 0, duration: 2.0, ease: "expo.out" }, 0.15 + li * 0.16);
    });
    return tl;
  }

  /* ================================================================ post-processing */
  function makePost() {
    const opts = { type: renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType };
    rtScene = new THREE.WebGLRenderTarget(4, 4, { ...opts, samples: renderer.capabilities.isWebGL2 ? 4 : 0 });
    rtA = new THREE.WebGLRenderTarget(4, 4, opts); rtB = new THREE.WebGLRenderTarget(4, 4, opts);
    rtC = new THREE.WebGLRenderTarget(4, 4, opts); rtD = new THREE.WebGLRenderTarget(4, 4, opts);
    postScene = new THREE.Scene(); postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); postScene.add(quad);
    const vs = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
    matBright = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, uTh: { value: 0.32 } }, vertexShader: vs,
      fragmentShader: `uniform sampler2D t; uniform float uTh; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uTh, uTh + .35, l), 1.); }` });
    matBlur = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: vs,
      fragmentShader: `uniform sampler2D t; uniform vec2 uDir; varying vec2 vUv;
        void main(){ vec3 s = texture2D(t, vUv).rgb * .2270270270;
          s += texture2D(t, vUv + uDir * 1.3846153846).rgb * .3162162162; s += texture2D(t, vUv - uDir * 1.3846153846).rgb * .3162162162;
          s += texture2D(t, vUv + uDir * 3.2307692308).rgb * .0702702703; s += texture2D(t, vUv - uDir * 3.2307692308).rgb * .0702702703;
          gl_FragColor = vec4(s, 1.); }` });
    matComposite = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: null }, tB1: { value: null }, tB2: { value: null }, uBloom: { value: 1.25 }, uGlow: { value: new THREE.Vector3(0.5, 0.6, 0.3) },
        uBg: { value: C.night.clone() }, uEmber: { value: C.ember.clone() }, uFlash: { value: 0 }, uAspect: { value: 16 / 9 }, uExposure: { value: 1 } },
      vertexShader: vs,
      fragmentShader: `uniform sampler2D tScene, tB1, tB2; uniform float uBloom, uFlash, uAspect, uExposure; uniform vec3 uGlow, uBg, uEmber; varying vec2 vUv;
        void main(){
          vec2 q = vUv - .5;
          float ca = .0016 * dot(q, q) * 4.;
          vec3 sc = vec3(texture2D(tScene, vUv + q * ca).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - q * ca).b);
          vec3 bl = texture2D(tB1, vUv).rgb * .8 + texture2D(tB2, vUv).rgb * 1.1;
          // atmosphere: a low ember light source and a cold top fill
          vec2 gp = vec2(uGlow.x, 1. - uGlow.y);
          vec2 d = (vUv - gp) * vec2(uAspect, 1.);
          float g = exp(-dot(d, d) * 2.2) * uGlow.z;
          vec3 bg = uBg + uEmber * g * .22 + vec3(.02, .025, .035) * smoothstep(.2, 1., vUv.y) * .6;
          vec3 col = bg + sc * uExposure + bl * uBloom + uFlash * vec3(1., .86, .78);
          float vig = smoothstep(1.05, .35, length(q * vec2(1., .9)));
          col *= mix(.55, 1., vig);
          col = col / (1. + col * .18);
          gl_FragColor = vec4(pow(col, vec3(.98)), 1.);
        }` });
  }
  function setSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(W * scale * dpr)), h = Math.max(2, Math.round(H * scale * dpr));
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = W + "px"; renderer.domElement.style.height = H + "px";
    rtScene.setSize(w, h);
    rtA.setSize(w >> 1, h >> 1); rtB.setSize(w >> 1, h >> 1); rtC.setSize(w >> 2, h >> 2); rtD.setSize(w >> 2, h >> 2);
    const px = (h / 1080) * 215;
    pMat.uniforms.uPx.value = px;
    if (packets) packets.mat.uniforms.uPx.value = px;
  }
  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(postScene, postCam); }
  function render() {
    renderer.setRenderTarget(rtScene); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
    matBright.uniforms.t.value = rtScene.texture; pass(matBright, rtA);
    const blur = (src, dst, w, h, x, y) => { matBlur.uniforms.t.value = src.texture; matBlur.uniforms.uDir.value.set(x / w, y / h); pass(matBlur, dst); };
    blur(rtA, rtB, rtA.width, rtA.height, 1, 0); blur(rtB, rtA, rtA.width, rtA.height, 0, 1);
    matBlur.uniforms.t.value = rtA.texture; matBlur.uniforms.uDir.value.set(0, 0); pass(matBlur, rtC);
    blur(rtC, rtD, rtC.width, rtC.height, 1.5, 0); blur(rtD, rtC, rtC.width, rtC.height, 0, 1.5);
    blur(rtC, rtD, rtC.width, rtC.height, 2.5, 0); blur(rtD, rtC, rtC.width, rtC.height, 0, 2.5);
    matComposite.uniforms.tScene.value = rtScene.texture; matComposite.uniforms.tB1.value = rtA.texture; matComposite.uniforms.tB2.value = rtC.texture;
    pass(matComposite, null);
  }

  /* ================================================================ loop */
  let raf = 0, last = 0, fpsAcc = 0, fpsN = 0, lowPower = false;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    const time = clock.getElapsedTime();
    pMat.uniforms.uTime.value = time;
    if (globeGroup.visible) globeGroup.userData.arcs.forEach((m) => (m.uniforms.uTime.value = time));
    // slow breathing drift on the camera, tracked toward the slide's target
    const br = REDUCED ? 0 : (cam.drift ?? 1);
    camera.position.set(cam.pos.x + Math.sin(time * 0.13) * 0.6 * br, cam.pos.y + Math.cos(time * 0.11) * 0.35 * br, cam.pos.z);
    look.copy(cam.target);
    camera.lookAt(look);
    camera.rotation.z += cam.roll;
    if (markGroup.visible && markGroup.userData.spin) markGroup.rotation.y = Math.sin(time * 0.6) * 0.12;
    if (globeGroup.visible && !REDUCED) { points.rotation.y += dt * 0.025; globeGroup.rotation.y = points.rotation.y; }
    if (archGroup.visible && !REDUCED && archGroup.userData.orbit) { archGroup.rotation.y = Math.sin(time * 0.12) * 0.16; }
    updatePackets(dt);
    updateArchLabels();
    tick.forEach((f) => f(time, dt));
    render();
    // adaptive quality: drop to 1x pixel ratio if we can't hold ~50 fps
    fpsAcc += dt; fpsN++;
    if (fpsN === 120) { const fps = fpsN / fpsAcc; if (fps < 45 && !lowPower) { lowPower = true; renderer.setPixelRatio && 0; window.devicePixelRatio > 1 && (scaleDpr = 1); setSizeLow(); } fpsAcc = 0; fpsN = 0; }
  }
  let scaleDpr = null;
  function setSizeLow() {
    const w = Math.round(W * scale), h = Math.round(H * scale);
    renderer.setSize(w, h, false); renderer.domElement.style.width = W + "px"; renderer.domElement.style.height = H + "px";
    rtScene.setSize(w, h); rtA.setSize(w >> 1, h >> 1); rtB.setSize(w >> 1, h >> 1); rtC.setSize(w >> 2, h >> 2); rtD.setSize(w >> 2, h >> 2);
    pMat.uniforms.uPx.value = (h / 1080) * 215; packets.mat.uniforms.uPx.value = (h / 1080) * 260;
  }

  /* ================================================================ public API */
  function moveCamera(c, instant, dur = 2.4) {
    const p = c.cam, t = c.tgt;
    if (instant || REDUCED) { cam.pos.set(...p); cam.target.set(...t); return; }
    gsap.to(cam.pos, { x: p[0], y: p[1], z: p[2], duration: dur, ease: "power3.inOut", overwrite: true });
    gsap.to(cam.target, { x: t[0], y: t[1], z: t[2], duration: dur, ease: "power3.inOut", overwrite: true });
  }
  function setGlow(g, instant) {
    const u = matComposite.uniforms.uGlow.value;
    if (instant || REDUCED) u.set(...g); else gsap.to(u, { x: g[0], y: g[1], z: g[2], duration: 2.2, ease: "power2.inOut" });
  }

  const World = {
    ok: false,
    init(stage, s) {
      stageEl = stage; scale = s;
      const canvas = document.getElementById("gl");
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
      } catch (e) { console.warn("WebGL unavailable", e); return; }
      if (!renderer.getContext()) return;
      renderer.outputEncoding = THREE.LinearEncoding;
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x07080b, 0.006);
      camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 400);
      clock = new THREE.Clock();
      makePoints(); makeMark(); makeGlobe(); makeArch(); makePost();
      archLabelsInit();
      setSize();
      cam.pos.set(0, 0, 60); cam.target.set(0, 0, 0);
      this.ok = ok = true;
      requestAnimationFrame(loop);
    },
    resize(s) { scale = s; if (ok) (lowPower ? setSizeLow() : setSize()); },
    goto(id, { from, instant, dir }) {
      if (!ok) return;
      const c = SCENES[id]; if (!c) return;
      current = id;
      moveCamera(c, instant, id === "architecture" || from === "architecture" ? 2.8 : 2.4);
      setGlow(c.glow || [0.5, 0.6, 0.3], instant);
      if (!(id === "intro" && !instant)) morph(c.form(), { instant, dur: id === "vision" || from === "vision" ? 3.0 : 2.4 });
      pMat.uniforms.uFlow.value = c.flow || 0;
      gsap.to(pMat.uniforms.uTurb, { value: c.turb ?? 0.15, duration: 1.5 });
      gsap.to(pMat.uniforms.uAlpha, { value: c.dimPoints ?? 1, duration: instant ? 0 : 1.5 });
      // globe
      gsap.to(pMat.uniforms.uGlobe, { value: c.globe ? 1 : 0, duration: instant ? 0 : 1.5 });
      if (c.globe) {
        globeGroup.visible = true;
        const rot = { x: GLOBE_ROT.x, y: GLOBE_ROT.y };
        if (instant || REDUCED) { points.rotation.set(rot.x, rot.y, 0); globeGroup.rotation.set(rot.x, rot.y, 0); }
        else { gsap.to(points.rotation, { x: rot.x, y: rot.y, duration: 3, ease: "power3.inOut" }); gsap.to(globeGroup.rotation, { x: rot.x, y: rot.y, duration: 3, ease: "power3.inOut" }); }
        globeGroup.userData.arcs.forEach((m) => { m.uniforms.uDraw.value = 0; m.userData.dot.material.opacity = 0; });
        globeGroup.userData.origin.material.opacity = 0;
      } else {
        if (globeGroup.visible) { globeGroup.visible = false; }
        if (points.rotation.x || points.rotation.y) gsap.to(points.rotation, { x: 0, y: 0, duration: instant ? 0 : 2.4, ease: "power3.inOut" });
      }
      // architecture
      if (c.arch) {
        archGroup.visible = true; archGroup.userData.orbit = true;
        archAssemble(instant);
        archFocus(0, true);
      } else archGroup.visible = false;
      // mark
      if (id !== "intro" && id !== "closing" && id !== "statement") { if (markGroup.visible) hideMark(instant ? 0 : 0.6); }
    },
    step(id, n, instant) {
      if (!ok) return;
      if (id === "problem") morph(F_wall(n >= 1 ? (n >= 2 ? 2 : 1) : 0), { dur: 1.6, instant, lift: 0 });
      if (id === "architecture") archFocus(n, instant);
      if (id === "vision") {
        const arcs = globeGroup.userData.arcs; const d = instant || REDUCED ? 0 : 1;
        gsap.to(globeGroup.userData.origin.material, { opacity: n >= 1 ? 1 : 0, duration: 0.6 * d });
        arcs.forEach((m, k) => {
          const on = n >= 1;
          gsap.to(m.uniforms.uDraw, { value: on ? 1 : 0, duration: 1.8 * d, delay: on ? k * 0.14 * d : 0, ease: "power2.inOut" });
          gsap.to(m.userData.dot.material, { opacity: on ? 1 : 0, duration: 0.5 * d, delay: on ? (1.4 + k * 0.14) * d : 0 });
        });
      }
    },
    // exposed for slide controllers
    morph, F: { mark: F_mark, dust: F_dust, void: F_void, wall: F_wall, globe: F_globe, rings: F_rings, halo: F_halo, line: F_line, stream: F_stream, floor: F_floor },
    assembleMark, hideMark, markPixelWidth,
    get mark() { return markGroup; }, get camera() { return camera; }, get points() { return points; }, get uniforms() { return pMat.uniforms; },
    get composite() { return matComposite.uniforms; },
    cam, moveCamera, setGlow, project, onTick: (f) => tick.push(f),
    flash(amount = 0.5, dur = 1.2) { if (!ok || REDUCED) return; matComposite.uniforms.uFlash.value = amount; gsap.to(matComposite.uniforms.uFlash, { value: 0, duration: dur, ease: "power3.out" }); },
  };
  window.World = World;
})();
