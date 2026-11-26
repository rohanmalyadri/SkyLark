/* Skylark presentation: per-slide motion.
 * Each controller builds its own timeline; state(n) puts the slide in step n and must be safe to
 * call repeatedly and out of order (the presenter can go back, jump, or replay). */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = Deck.ctx;
  const W = () => window.World && World.ok ? World : null;
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const dur = (d, ctx) => (ctx && ctx.instant) || D.REDUCED ? 0 : d;

  /* ---------------------------------------------------------------- the official logo, with hooks */
  let logoN = 0;
  function mountLogo(host) {
    host.innerHTML = window.SKYLARK_LOGO;
    const svg = host.querySelector("svg");
    const id = `wm${logoN++}`;
    const defs = svgEl("defs", {}, svg);
    const clip = svgEl("clipPath", { id, clipPathUnits: "userSpaceOnUse" }, defs);
    const rect = svgEl("rect", { x: 266, y: 270, width: 506, height: 270 }, clip);
    const word = svg.querySelector(".lg-word");
    const g = svgEl("g", { "clip-path": `url(#${id})`, class: "lg-wordwrap" });
    word.parentNode.insertBefore(g, word); g.appendChild(word);
    const edge = svgEl("rect", { x: 266, y: 340, width: 1.6, height: 160, fill: "#FFB98A", opacity: 0, class: "lg-edge" }, svg);
    return { svg, rect, edge, mark: svg.querySelector(".lg-mark"), shards: svg.querySelectorAll(".lg-mark polygon") };
  }
  const LOGO_VB = { x: 20.67, w: 764.33, h: 241.5 };
  const MARK_FRAC_X = (168 - 20.67) / 764.33; // mark centre, as a fraction of the logo's width
  const WORD_X0 = 266, WORD_X1 = 772;
  function wordReveal(L, tl, at, d = 1.5) {
    tl.set(L.rect, { attr: { width: 0 } }, at)
      .set(L.edge, { attr: { x: WORD_X0 }, opacity: 1 }, at)
      .to(L.rect, { attr: { width: WORD_X1 - WORD_X0 }, duration: d, ease: "power3.inOut" }, at)
      .to(L.edge, { attr: { x: WORD_X1 }, duration: d, ease: "power3.inOut" }, at)
      .to(L.edge, { opacity: 0, duration: 0.4 }, at + d - 0.2);
  }

  /* ================================================================ 01 · cold open */
  const intro = { tl: null, running: false, L: null, sub: [] };
  window.Intro = { get running() { return intro.running; }, skip() { finishIntro(); } };
  function introGeometry() {
    const w = W();
    const mw = w ? w.markPixelWidth(46) : 380;
    const LW = (mw * LOGO_VB.w) / 246.66, LH = (LW * LOGO_VB.h) / LOGO_VB.w;
    const mx = MARK_FRAC_X * LW, my = 0.5 * LH;
    const sF = 760 / LW;
    return { mw, LW, LH, mx, my, sF, dx: -(LW / 2 - mx) * sF, dy: 380 - 540 };
  }
  function introFinal(el) {
    const g = introGeometry();
    const box = $(".intro-logo", el);
    gsap.set(box, { opacity: 1, x: g.dx, y: g.dy, scale: g.sF });
    if (intro.L) { gsap.set(intro.L.rect, { attr: { width: WORD_X1 - WORD_X0 } }); gsap.set(intro.L.edge, { opacity: 0 }); }
    gsap.set($$(".intro-guides .g, .intro-guides .g-shards polygon, .intro-guides .g-ticks text", el), { opacity: 0 });
    D.splitWords($(".intro-tag", el)); gsap.set($$(".intro-tag .wi", el), { yPercent: 0 });
    gsap.set([$(".intro-pos", el), $(".intro-meta", el)], { opacity: 1 });
  }
  function finishIntro() {
    if (!intro.running) return;
    intro.running = false;
    $("#skip").classList.remove("on");
    if (intro.tl) intro.tl.kill();
    intro.sub.forEach((t) => t && t.kill && t.kill());
    const w = W();
    if (w) {
      gsap.killTweensOf(w.cam.pos); gsap.killTweensOf(w.uniforms.uAlpha);
      w.cam.pos.set(0, 0, 46); w.cam.drift = 1; w.uniforms.uAlpha.value = 1;
      w.morph(w.F.dust(0.6), { instant: true });
      w.mark.visible = false;
      w.composite.uFlash.value = 0;
    }
    introFinal($('.slide[data-id="intro"]'));
  }
  Deck.define("intro", {
    enter(el, ctx) {
      const host = $(".logo-svg", el);
      if (!intro.L) intro.L = mountLogo(host);
      const g = introGeometry();
      const box = $(".intro-logo", el);
      box.style.width = g.LW + "px";
      gsap.set(box, { left: 960 - g.mx, top: 540 - g.my, transformOrigin: `${g.mx}px ${g.my}px`, x: 0, y: 0, scale: 1, opacity: 0 });
      // construction guides: the mark's exact polygons, at the size the 3D mark will land
      const shardsG = $(".g-shards", el), ticks = $(".g-ticks", el);
      shardsG.innerHTML = ""; ticks.innerHTML = "";
      const P = [["44.67,306.5", "210.83,400.33", "98.33,411"], ["233.5,408.17", "108.67,500", "151.83,416"], ["291.33,315.33", "219.33,392.5", "187.33,374.67", "215.83,338.17"]];
      const map = (x, y) => [960 + ((x - 168) / 246.66) * g.mw, 540 + ((y - 403.25) / 246.66) * g.mw];
      P.forEach((poly) => {
        const pts = poly.map((p) => map(...p.split(",").map(Number)));
        svgEl("polygon", { points: pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ") }, shardsG);
        pts.forEach(([x, y], i) => { if (i === 0) { const t = svgEl("text", { x: x + 10, y: y - 10 }, ticks); t.textContent = poly[0].replace(",", " · "); } });
      });
      if (ctx.instant || D.EXPORT) { introFinal(el); return null; }

      const w = W();
      const tl = gsap.timeline({ onComplete: () => { intro.running = false; $("#skip").classList.remove("on"); if (w) w.cam.drift = 1; } });
      intro.tl = tl; intro.running = true; intro.sub = [];
      $("#skip").classList.add("on");
      const guides = $$(".intro-guides .g", el), shards = $$(".g-shards polygon", el), tickT = $$(".g-ticks text", el);
      gsap.set(guides, { opacity: 1 });
      guides.forEach((p) => { const L = p.getTotalLength ? p.getTotalLength() : 2000; gsap.set(p, { strokeDasharray: p.classList.contains("g-c2") ? "2 7" : L, strokeDashoffset: p.classList.contains("g-c2") ? 0 : L, opacity: p.classList.contains("g-c2") ? 0 : 1 }); });
      shards.forEach((p) => { const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L, opacity: 1 }); });
      gsap.set(tickT, { opacity: 0 });
      D.splitWords($(".intro-tag", el)); gsap.set($$(".intro-tag .wi", el), { yPercent: 110 });
      gsap.set([$(".intro-pos", el), $(".intro-meta", el)], { opacity: 0 });
      gsap.set(intro.L.rect, { attr: { width: 0 } });

      if (w) {
        gsap.killTweensOf(w.cam.pos); gsap.killTweensOf(w.cam.target);
        w.cam.drift = 0; w.cam.pos.set(0, 0, 96); w.cam.target.set(0, 0, 0);
        w.uniforms.uAlpha.value = 0;
        w.morph(w.F.void(), { instant: true });
        w.mark.visible = false;
        tl.to(w.uniforms.uAlpha, { value: 1, duration: 2.6, ease: "power1.inOut" }, 0);
        tl.to(w.cam.pos, { z: 46, duration: 5.6, ease: "power2.inOut" }, 0);
        tl.add(() => intro.sub.push(w.morph(w.F.mark(16), { dur: 3.3, lift: 1.2 })), 0.9);
        tl.add(() => intro.sub.push(w.assembleMark({ dur: 3.0 })), 1.85);
        tl.add(() => { w.flash(0.2, 1.6); intro.sub.push(w.morph(w.F.dust(0.6), { dur: 2.8, lift: 1.6 })); }, 5.25);
        tl.add(() => intro.sub.push(w.hideMark(0.55)), 5.55);
      }
      // drafting lines, then the shards traced at their landing size
      tl.to($(".g-h", el), { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut" }, 0.3)
        .to($(".g-v", el), { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut" }, 0.45)
        .to($(".g-c1", el), { strokeDashoffset: 0, duration: 2.0, ease: "power2.inOut" }, 0.7)
        .to($(".g-c2", el), { opacity: 1, duration: 1.2 }, 1.1)
        .to(shards, { strokeDashoffset: 0, duration: 1.8, stagger: 0.2, ease: "power2.inOut" }, 2.1)
        .to(tickT, { opacity: 1, duration: 0.6, stagger: 0.15 }, 2.6)
        .to([...guides, ...tickT], { opacity: 0, duration: 1.0, ease: "power2.out" }, 5.1)
        .to(shards, { opacity: 0, duration: 0.5 }, 5.35);
      // hand-off: the SVG logo (exact artwork) replaces the 3D mark, then the wordmark is revealed
      tl.to(box, { opacity: 1, duration: 0.45, ease: "power1.out" }, 5.42)
        .to(box, { x: g.dx, y: g.dy, scale: g.sF, duration: 1.7, ease: "expo.inOut" }, 6.0);
      wordReveal(intro.L, tl, 6.35, 1.5);
      tl.add(D.revealWords($(".intro-tag", el), { stagger: 0.06, dur: 1.2 }), 7.25)
        .to($(".intro-pos", el), { opacity: 1, duration: 1.0 }, 8.3)
        .to($(".intro-meta", el), { opacity: 1, duration: 1.0 }, 8.7);
      return tl;
    },
    leave() { finishIntro(); },
  });

  /* ================================================================ 02 · problem */
  Deck.define("problem", {
    enter(el, ctx) {
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".pr-head", el), { delay: 0.5 }));
      tl.from($(".eyebrow", el), { opacity: 0, x: -20, duration: dur(0.8, ctx) }, 0.3);
      return tl;
    },
  });

  /* ================================================================ 03 · shortfall */
  Deck.define("shortfall", {
    enter(el, ctx) {
      const wire = $(".sf-wire", el);
      wire.innerHTML = "";
      const rows = $$(".sf-row", el);
      const table = $(".sf-table", el);
      // a tangled thread through the old column, a straight one through the new
      const tb = table.getBoundingClientRect();
      rows.forEach((r, i) => {
        const y = r.offsetTop - 56 + r.offsetHeight / 2;
        let d = `M 250 ${y}`;
        for (let k = 0; k < 7; k++) d += ` C ${270 + k * 60} ${y - 26 + ((k * 37) % 50)}, ${290 + k * 60} ${y + 22 - ((k * 23) % 44)}, ${310 + k * 60} ${y + ((k % 2) * 2 - 1) * 8}`;
        svgEl("path", { d, stroke: "rgba(244,241,236,.10)", class: "tangle", "data-i": i }, wire);
        svgEl("path", { d: `M 712 ${y} L 760 ${y}`, stroke: "#F95135", class: "straight", "data-i": i, "stroke-dasharray": 60, "stroke-dashoffset": 60 }, wire);
      });
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".sf-title", el), { delay: 0.35 }));
      tl.from($$(".sf-cols, .sf-row", el), { opacity: 0, y: 14, duration: dur(0.7, ctx), stagger: 0.06 }, 0.7);
      return tl;
    },
    state(n, ctx, el) {
      $$(".sf-row", el).forEach((r, i) => r.classList.toggle("on", i < n * 2));
      $$(".sf-wire .straight", el).forEach((p, i) => gsap.to(p, { strokeDashoffset: i < n * 2 ? 0 : 60, duration: dur(0.8, ctx), delay: dur(0.25, ctx) }));
      $$(".sf-wire .tangle", el).forEach((p, i) => gsap.to(p, { opacity: i < n * 2 ? 0.25 : 1, duration: dur(0.6, ctx) }));
    },
  });

  /* ================================================================ 04 · reveal */
  let revealLogo = null;
  Deck.define("reveal", {
    enter(el, ctx) {
      if (!revealLogo) revealLogo = mountLogo($(".logo-svg", el));
      const tilt = $(".rv-tilt", el), sweep = $(".rv-sweep", el);
      const tl = gsap.timeline();
      if (ctx.instant) { gsap.set(tilt, { rotateX: 24, y: 0, opacity: 1, scale: 1 }); gsap.set(revealLogo.rect, { attr: { width: WORD_X1 - WORD_X0 } }); D.revealWords($(".rv-line", el)); return tl; }
      gsap.set(tilt, { rotateX: 70, y: 380, opacity: 0, scale: 0.9 });
      gsap.set(revealLogo.mark, { opacity: 0 });
      tl.from($(".rv-eyebrow", el), { opacity: 0, letterSpacing: "1.2em", duration: 1.6, ease: "expo.out" }, 0.2)
        .fromTo(revealLogo.shards, { opacity: 0, x: (i) => [-60, 30, 60][i], y: (i) => [-40, 60, -60][i], rotate: (i) => [-20, 25, 30][i], transformOrigin: "50% 50%" },
          { opacity: 1, x: 0, y: 0, rotate: 0, duration: 1.4, stagger: 0.12, ease: "expo.out" }, 0.5)
        .set(revealLogo.mark, { opacity: 1 }, 0.5);
      wordReveal(revealLogo, tl, 1.0, 1.2);
      tl.add(D.revealWords($(".rv-line", el), { stagger: 0.03 }), 1.6)
        .to(tilt, { rotateX: 24, y: 0, opacity: 1, scale: 1, duration: 2.6, ease: "expo.out" }, 1.4)
        .fromTo(sweep, { opacity: 1, backgroundPosition: "130% 0" }, { backgroundPosition: "-30% 0", duration: 2.2, ease: "power2.inOut" }, 2.6)
        .to(sweep, { opacity: 0, duration: 0.4 }, 4.6);
      return tl;
    },
    state(n, ctx, el) {
      const tilt = $(".rv-tilt", el);
      gsap.to(tilt, { rotateX: n ? 11 : 24, y: 0, scale: n ? 0.97 : 1, duration: dur(1.8, ctx), ease: "expo.inOut" });
      if (n && !ctx.instant) gsap.fromTo($(".rv-sweep", el), { opacity: 1, backgroundPosition: "130% 0" }, { backgroundPosition: "-30% 0", duration: 2, delay: 0.4, ease: "power2.inOut" });
    },
  });

  /* ================================================================ 05 · vision */
  Deck.define("vision", {
    enter(el, ctx) {
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".vi-head", el), { delay: 0.6 }));
      tl.from($(".vi-lede", el), { opacity: 0, y: 20, duration: dur(1.2, ctx) }, 1.3);
      return tl;
    },
  });

  /* ================================================================ 06 · overview: a curved gallery of real screens */
  const OV = { R: 2200, step: 30, focus: [2, 2, 3, 4, 5], far: -3000, near: 560, cam: { z: -3400, ry: 0, y: 0 }, sway: null };
  function ovApply(el) {
    $(".ov-world", el).style.transform = `translate3d(0, ${OV.cam.y}px, ${OV.cam.z}px) rotateY(${OV.cam.ry}deg)`;
  }
  Deck.define("overview", {
    enter(el, ctx) {
      const screens = $$(".ov-s", el);
      screens.forEach((s, i) => { const a = (i - 2.5) * OV.step; s.style.transform = `rotateY(${a}deg) translateZ(${-OV.R}px)`; s.classList.remove("dim"); });
      const tl = gsap.timeline();
      gsap.set($$(".ov-c", el), { opacity: 0 });
      if (ctx.instant) { Object.assign(OV.cam, { z: OV.far, ry: 0, y: 40 }); ovApply(el); }
      else {
        Object.assign(OV.cam, { z: -9000, ry: 34, y: 260 }); ovApply(el);
        gsap.set(screens, { opacity: 0 });
        tl.to(screens, { opacity: 1, duration: 1.2, stagger: 0.12 }, 0.2)
          .to(OV.cam, { z: OV.far, ry: 0, y: 40, duration: 3.4, ease: "expo.inOut", onUpdate: () => ovApply(el) }, 0);
      }
      tl.add(D.revealWords($(".ov-head", el), { delay: 0.3 }), 0.4);
      if (OV.sway) OV.sway.kill();
      return tl;
    },
    state(n, ctx, el) {
      const screens = $$(".ov-s", el);
      const k = OV.focus[n];
      const a = (k - 2.5) * OV.step;
      const target = n === 0 ? { z: OV.far, ry: 0, y: 40 } : { z: OV.R - OV.near, ry: -a, y: -20 };
      gsap.to(OV.cam, { ...target, duration: dur(1.6, ctx), ease: "expo.inOut", onUpdate: () => ovApply(el) });
      screens.forEach((s, i) => s.classList.toggle("dim", n > 0 && i !== k));
      $$(".ov-c", el).forEach((c, i) => {
        if (i === n) gsap.fromTo(c, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: dur(0.9, ctx), delay: dur(0.5, ctx), ease: "expo.out" });
        else gsap.to(c, { opacity: 0, duration: dur(0.3, ctx) });
      });
    },
  });

  /* ================================================================ 07 · capabilities */
  Deck.define("capabilities", {
    enter(el, ctx) {
      const tl = gsap.timeline();
      tl.from($$(".cp-list li", el), { opacity: 0, x: -30, duration: dur(0.8, ctx), stagger: 0.07, ease: "expo.out" }, 0.3);
      $$(".cp-v", el).forEach((v) => gsap.set(v, { autoAlpha: 0 }));
      el._cpShown = -1;
      return tl;
    },
    state(n, ctx, el) {
      $$(".cp-list li", el).forEach((li, i) => { li.classList.toggle("on", i === n); li.classList.toggle("done", i < n); });
      const vs = $$(".cp-v", el);
      vs.forEach((v, i) => {
        if (i === n) {
          const img = $("img", v); const src = img.getAttribute("src"); img.setAttribute("src", ""); img.setAttribute("src", src); // restart the SVG animation
          gsap.fromTo(v, { autoAlpha: 0, y: 40, clipPath: "inset(0% 0% 100% 0%)" }, { autoAlpha: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)", duration: dur(1.1, ctx), delay: dur(0.15, ctx), ease: "expo.out" });
        } else gsap.to(v, { autoAlpha: 0, y: -20, duration: dur(0.4, ctx) });
      });
    },
  });

  /* ================================================================ 08 · how it works: one application through three lanes */
  const HW = {
    lanes: [{ n: "You", y: 450 }, { n: "Skylark", y: 590 }, { n: "Specialist", y: 730 }],
    st: [
      { t: "Build a profile", x: 520, l: 0, d: "<b>You</b> upload a resume once. Every field is validated on the server: names in any script, skills against a curated taxonomy, Stack Overflow tags and ESCO." },
      { t: "Verification", x: 760, l: 2, d: "<b>A specialist</b> reviews new and edited profiles, with automatic flags such as a GitHub name mismatch. Applications can go to review only once the profile is approved." },
      { t: "Match", x: 1000, l: 1, d: "<b>Skylark</b> scores live listings against the profile on seven factors. A match of 85 or more sends a notification." },
      { t: "Tailor & approve", x: 1240, l: 0, ghost: 1, d: "<b>Skylark</b> drafts a tailored resume and cover letter; <b>you</b> accept or reject each change and approve the version." },
      { t: "Review & submit", x: 1480, l: 2, d: "<b>A specialist</b> claims it, works the five-point checklist, submits it and records the portal and confirmation reference." },
      { t: "Track", x: 1720, l: 0, d: "<b>You</b> follow it from applied to screening, interview and offer, with notes, next steps and a full history." },
    ],
    chips: ["saved", "preparing", "human review", "applied"],
    chipAt: [-1, -1, 0, 1, 3, 3],
  };
  function hwBuild(el) {
    const svg = $(".hw-svg", el);
    if (svg.dataset.built) return;
    svg.dataset.built = "1";
    const defs = svgEl("defs", {}, svg);
    const f = svgEl("filter", { id: "hwglow", x: "-200%", y: "-200%", width: "500%", height: "500%" }, defs);
    svgEl("feGaussianBlur", { stdDeviation: 7 }, f);
    HW.lanes.forEach((L) => {
      svgEl("line", { x1: 380, x2: 1784, y1: L.y, y2: L.y, stroke: "rgba(244,241,236,.10)", "stroke-dasharray": "3 7" }, svg);
      const t = svgEl("text", { x: 136, y: L.y + 5, class: "lane-l" }, svg); t.textContent = L.n;
    });
    // path through the stations
    const pts = [];
    HW.st.forEach((s) => { if (s.ghost !== undefined) pts.push([s.x - 40, HW.lanes[s.ghost].y]); pts.push([s.x, HW.lanes[s.l].y]); });
    let d = `M 420 ${HW.lanes[0].y} L ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const mx = (x0 + x1) / 2; d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`; }
    const base = svgEl("path", { d, fill: "none", stroke: "rgba(244,241,236,.14)", "stroke-width": 1.2 }, svg);
    const trail = svgEl("path", { d, fill: "none", stroke: "#F95135", "stroke-width": 2.2, class: "trail" }, svg);
    const total = trail.getTotalLength();
    gsap.set(trail, { strokeDasharray: total, strokeDashoffset: total });
    // prefix lengths for each station
    const lens = []; let acc = 0;
    { // walk the path to find the length at which each station point is reached
      let k = 0; const step = 2;
      for (let s = 0; s <= total && k < pts.length; s += step) { const p = trail.getPointAtLength(s); if (Math.hypot(p.x - pts[k][0], p.y - pts[k][1]) < 3) { lens.push(s); k++; } }
      while (lens.length < pts.length) lens.push(total);
    }
    // stations
    let pi = 0;
    HW.st.forEach((s, i) => {
      if (s.ghost !== undefined) { const gy = HW.lanes[s.ghost].y; svgEl("circle", { cx: s.x - 40, cy: gy, r: 6, fill: "#07080B", stroke: "rgba(249,81,53,.6)", "stroke-width": 1.5, class: `st st${i}` }, svg); pi++; }
      const y = HW.lanes[s.l].y;
      const g = svgEl("g", { class: `st st${i}` }, svg);
      svgEl("circle", { cx: s.x, cy: y, r: 11, fill: "#07080B", stroke: "rgba(244,241,236,.35)", "stroke-width": 1.5, class: "ring" }, g);
      const ty = s.l === 2 ? y + 52 : y - 34;
      const n = svgEl("text", { x: s.x, y: ty - 26, "text-anchor": "middle", class: "st-n" }, g); n.textContent = String(i + 1).padStart(2, "0");
      const t = svgEl("text", { x: s.x, y: ty, "text-anchor": "middle", class: "st-t" }, g); t.textContent = s.t;
      s.len = lens[pi]; pi++;
    });
    // status chips
    const cy = 860;
    HW.chips.forEach((c, i) => {
      const x = 520 + i * 300;
      const g = svgEl("g", { class: `chip chip${i}` }, svg);
      svgEl("rect", { x: x - 110, y: cy - 22, width: 220, height: 44, rx: 22, fill: "none", stroke: "rgba(244,241,236,.18)" }, g);
      const t = svgEl("text", { x, y: cy + 5, "text-anchor": "middle", class: "chip-t", fill: "#666D78" }, g); t.textContent = c;
      if (i < HW.chips.length - 1) svgEl("path", { d: `M ${x + 122} ${cy} L ${x + 178} ${cy}`, stroke: "rgba(244,241,236,.18)", "marker-end": "" }, svg);
    });
    const lbl = svgEl("text", { x: 136, y: cy + 5, class: "lane-l" }, svg); lbl.textContent = "Status";
    // the application itself
    const pk = svgEl("g", { class: "pk", opacity: 0 }, svg);
    svgEl("circle", { r: 16, fill: "#F95135", filter: "url(#hwglow)", opacity: 0.9 }, pk);
    svgEl("circle", { r: 7, fill: "#FFE3D6" }, pk);
    el._hw = { trail, total, pk, len: 0 };
    // detail text
    const det = $(".hw-detail", el); det.innerHTML = HW.st.map((s, i) => `<div class="hw-d" data-i="${i}">${s.d}</div>`).join("");
  }
  Deck.define("how", {
    enter(el, ctx) {
      hwBuild(el);
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".hw-head .h-m", el), { delay: 0.3 }));
      tl.from($$(".hw-svg line, .hw-svg .lane-l", el), { opacity: 0, duration: dur(1, ctx), stagger: 0.08 }, 0.4)
        .from($$(".hw-svg .st", el), { opacity: 0, y: 10, duration: dur(0.8, ctx), stagger: 0.06 }, 0.8)
        .from($$(".hw-svg .chip", el), { opacity: 0, duration: dur(0.6, ctx), stagger: 0.06 }, 1.2);
      return tl;
    },
    state(n, ctx, el) {
      const H = el._hw; if (!H) return;
      const target = n === 0 ? 0 : HW.st[n - 1].len;
      const o = { l: H.len };
      const place = () => { const p = H.trail.getPointAtLength(o.l); H.pk.setAttribute("transform", `translate(${p.x},${p.y})`); H.trail.style.strokeDashoffset = H.total - o.l; };
      gsap.to(H.pk, { opacity: n ? 1 : 0, duration: dur(0.4, ctx) });
      gsap.to(o, { l: target, duration: dur(1.5, ctx), ease: "power2.inOut", onUpdate: place, onComplete: () => { H.len = target; place(); } });
      if (ctx.instant) { o.l = target; H.len = target; place(); }
      $$(".hw-svg .st", el).forEach((s) => {
        const i = +s.getAttribute("class").match(/st(\d)/)[1];
        const on = i < n; const cur = i === n - 1;
        gsap.to(s, { opacity: n === 0 || on ? 1 : 0.32, duration: dur(0.6, ctx) });
        const ring = $(".ring", s); if (ring) { ring.setAttribute("stroke", cur ? "#F95135" : on ? "rgba(249,81,53,.6)" : "rgba(244,241,236,.35)"); ring.setAttribute("fill", on ? "#2a120c" : "#07080B"); }
      });
      const chip = n ? HW.chipAt[n - 1] : -1;
      $$(".hw-svg .chip", el).forEach((c, i) => {
        const on = i <= chip, cur = i === chip;
        $("rect", c).setAttribute("stroke", cur ? "#F95135" : on ? "rgba(249,81,53,.45)" : "rgba(244,241,236,.18)");
        $("rect", c).setAttribute("fill", cur ? "rgba(249,81,53,.14)" : "none");
        $("text", c).setAttribute("fill", cur ? "#F4F1EC" : on ? "#A7ADB7" : "#666D78");
      });
      if (n === 5 && !ctx.instant) { // human review, then applied
        const cs = $$(".hw-svg .chip", el);
        $("rect", cs[2]).setAttribute("stroke", "#F95135"); $("text", cs[2]).setAttribute("fill", "#F4F1EC");
      }
      $$(".hw-d", el).forEach((d, i) => gsap.to(d, { opacity: i === n - 1 ? 1 : 0, y: i === n - 1 ? 0 : 10, duration: dur(0.6, ctx), delay: i === n - 1 ? dur(0.6, ctx) : 0 }));
    },
  });

  /* ================================================================ 09 · architecture */
  Deck.define("architecture", {
    enter(el, ctx) {
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".ar-head", el), { delay: 0.5 }));
      tl.from($$(".al", el), { opacity: 0, duration: dur(0.8, ctx), stagger: 0.03 }, 1.4);
      return tl;
    },
    state(n, ctx, el) {
      $$(".ar-p", el).forEach((p, i) => {
        if (i === n) gsap.fromTo(p, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: dur(0.8, ctx), delay: dur(0.3, ctx), ease: "expo.out" });
        else gsap.to(p, { opacity: 0, duration: dur(0.25, ctx) });
      });
    },
  });

  /* ================================================================ 10 · pipeline */
  const PL = [
    { t: "Fetch", d: "One <code>JobSource</code> interface. Each fetch retries three times with backoff.", o: `<div class="chips"><span class="chip e">Arbeitnow · keyless</span><span class="chip e">Greenhouse · 16 boards</span><span class="chip">Adzuna</span><span class="chip">The Muse</span><span class="chip">Lever</span></div><div class="raw" style="margin-top:22px">&lt;h1&gt;Senior Full-Stack Engineer, Payouts&lt;/h1&gt;\n&lt;p&gt;Helix Payments · Amsterdam · Hybrid&lt;/p&gt;\n&lt;p&gt;€85K – €110K · Offers visa sponsorship&lt;/p&gt; …</div>` },
    { t: "Normalize", d: "HTML becomes structured fields the engine can score.", o: `<div class="kv"><b>title</b><span>Senior Full-Stack Engineer, Payouts</span><b>seniority</b><span>senior</span><b>location</b><span>Amsterdam, NL · hybrid</span><b>salary</b><span>EUR 85,000 – 110,000</span><b>sponsorship</b><span class="hi">offered</span><b>skills</b><span>normalised to the skill taxonomy</span></div>` },
    { t: "Deduplicate", d: "Cross-posted roles collapse into one listing; a board renaming a role is still caught.", o: `<div class="mono" style="color:#666D78;font-size:13px">jobFingerprint("helix-payments", title, "NL")</div><div class="hash pl-hash" style="margin-top:10px">3f6042d48c5a594e7e939135a8b8848b</div><div class="note">sha256 of company · normalised title · country (first 32 hex)</div><div class="kv" style="margin-top:18px"><b>also unique</b><span>(source, external_id)</span></div>` },
    { t: "Store", d: "Fresh listings are stored; stale ones are closed, and candidates are told when data is stale.", o: `<div class="kv"><b>status</b><span class="hi">active</span><b>closes when</b><span>missing from a complete fetch</span><b>or</b><span>older than JOB_MAX_AGE_DAYS (45)</span><b>stale feed</b><span>no refresh in 24 h → visible notice</span></div>` },
    { t: "Queue", d: "Matching is scheduled as background jobs that can't run twice.", o: `<div class="kv"><b>batches</b><span>100 listings per match job</span><b>idempotency</b><span>key per source, per hour</span><b>claim</b><span class="hi">FOR UPDATE SKIP LOCKED</span><b>failure</b><span>exponential backoff + jitter → dead-letter</span></div>` },
    { t: "Score", d: "Seven published factors against candidate profiles, each with a reason.", o: `<div class="bars">${[["Skills", 30], ["Eligibility", 20], ["Experience", 18], ["Location", 12], ["Sponsorship", 8], ["Preferences", 7], ["Education", 5]].map(([n, w]) => `<div class="bar-r"><span>${n}</span><i style="--w:${w * 3.2}%"></i><span>${w}%</span></div>`).join("")}</div>` },
    { t: "Notify", d: "A match of 85 or more notifies the candidate.", o: `<div class="mono" style="color:#666D78;font-size:13px">score ≥ 85 → notification</div><div class="bell" style="margin-top:18px">New high-fit match <span class="ember">90</span></div><div class="note" style="font-size:15px;color:#A7ADB7">Senior Full-Stack Engineer, Payouts · Helix Payments</div>` },
  ];
  Deck.define("pipeline", {
    enter(el, ctx) {
      const track = $(".pl-track", el);
      if (!track.dataset.built) {
        track.dataset.built = "1";
        track.innerHTML = PL.map((s, i) => `<div class="pl-stage" data-i="${i}"><div class="num">${String(i + 1).padStart(2, "0")} / 07</div><h3>${s.t}</h3><div class="d">${s.d}</div><div class="pl-obj">${s.o}</div></div>`).join("");
      }
      gsap.set(track, { x: 1920 });
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".pl-head .h-m", el), { delay: 0.3 }));
      return tl;
    },
    state(n, ctx, el) {
      const track = $(".pl-track", el);
      gsap.to(track, { x: 560 - n * 760, duration: dur(1.6, ctx), ease: "expo.inOut" });
      $$(".pl-stage", el).forEach((s, i) => s.classList.toggle("on", i === n));
      const st = $$(".pl-stage", el)[n];
      if (!st || ctx.instant) return;
      gsap.fromTo($$(".pl-obj > *", st), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, delay: 0.7, ease: "expo.out" });
      if (n === 2) { // type out the real fingerprint
        const h = $(".pl-hash", st), full = "3f6042d48c5a594e7e939135a8b8848b", o = { k: 0 };
        gsap.to(o, { k: full.length, duration: 1.2, delay: 0.9, ease: "none", onUpdate: () => (h.textContent = full.slice(0, Math.round(o.k)) + "▌".slice(0, Math.round(o.k) < full.length ? 1 : 0)) });
      }
      if (n === 5) gsap.fromTo($$(".bar-r i", st), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.9, stagger: 0.08, delay: 0.9, ease: "power3.out" });
    },
  });

  /* ================================================================ 11 · match engine */
  const EN = {
    factors: [
      { n: "Skills", w: 30, s: 81 }, { n: "Experience", w: 18, s: 100 }, { n: "Education", w: 5, s: 100 },
      { n: "Eligibility", w: 20, s: 75, s2: 0 }, { n: "Location", w: 12, s: 82 }, { n: "Sponsorship", w: 8, s: 90, s2: 0 }, { n: "Preferences", w: 7, s: 100 },
    ],
    ringOrder: ["Skills", "Eligibility", "Experience", "Location", "Sponsorship", "Preferences", "Education"],
  };
  function enBuild(el) {
    const ring = $(".en-ring", el);
    if (ring.dataset.built) return;
    ring.dataset.built = "1";
    const cx = 280, cy = 280, r = 190;
    let a0 = -90;
    EN.ringOrder.forEach((name, i) => {
      const f = EN.factors.find((x) => x.n === name);
      const sweep = (f.w / 100) * 360;
      const a1 = a0 + sweep - 1.6;
      const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      const path = svgEl("path", { d: `M ${x0} ${y0} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1} ${y1}`, fill: "none", stroke: i === 0 ? "#F95135" : `rgba(249,81,53,${0.85 - i * 0.09})`, "stroke-width": 34, class: "seg", "data-n": name }, ring);
      const mid = a0 + sweep / 2; const lr = r + 56;
      const lx = cx + lr * Math.cos((mid * Math.PI) / 180), ly = cy + lr * Math.sin((mid * Math.PI) / 180);
      const anchor = Math.cos((mid * Math.PI) / 180) > 0.2 ? "start" : Math.cos((mid * Math.PI) / 180) < -0.2 ? "end" : "middle";
      const t = svgEl("text", { x: lx, y: ly, "text-anchor": anchor, class: "rl seg-l" }, ring); t.textContent = name;
      const w = svgEl("text", { x: lx, y: ly + 18, "text-anchor": anchor, class: "rw seg-l" }, ring); w.textContent = `${f.w}%`;
      a0 += sweep;
    });
    const c = svgEl("text", { x: cx, y: cy + 22, "text-anchor": "middle", class: "center-n" }, ring); c.textContent = "7";
    const cl = svgEl("text", { x: cx, y: cy + 52, "text-anchor": "middle", class: "center-l" }, ring); cl.textContent = "FACTORS · 100%";
    $(".en-bars", el).innerHTML = EN.factors.map((f) => `<div class="en-b" data-n="${f.n}"><span class="n">${f.n}<small>${f.w}%</small></span><span class="tr"><i class="fl"></i></span><span class="v">–</span></div>`).join("");
  }
  function enSet(el, n, ctx) {
    const inst = ctx.instant || D.REDUCED;
    const rows = $$(".en-b", el);
    const num = $(".en-num", el), fill = $(".en-fill", el), cap = $(".en-capline", el), capTxt = $(".en-cap", el);
    const s1 = $(".en-scn .s1", el), s2 = $(".en-scn .s2", el);
    gsap.to(s1, { opacity: n === 1 ? 1 : n >= 2 ? 0 : 0, duration: dur(0.5, ctx) });
    gsap.to(s2, { opacity: n >= 2 ? 1 : 0, duration: dur(0.5, ctx) });
    const cur = { v: parseFloat(num.dataset.v || 0) };
    const setNum = (v) => { num.textContent = Math.round(v); num.dataset.v = v; };
    rows.forEach((r, i) => {
      const f = EN.factors[i];
      const sc = n === 0 ? 0 : n >= 2 && f.s2 !== undefined ? f.s2 : f.s;
      const blocked = n >= 2 && f.s2 !== undefined;
      r.classList.toggle("blocked", blocked);
      gsap.to($(".fl", r), { width: `${sc}%`, duration: dur(1.0, ctx), delay: inst ? 0 : n === 1 ? i * 0.12 : 0.1, ease: "power3.out" });
      $(".v", r).textContent = n === 0 ? "–" : blocked ? "0" : String(sc);
    });
    gsap.killTweensOf(cur); gsap.killTweensOf(fill); gsap.killTweensOf(cap);
    if (n === 0) { setNum(0); gsap.set(fill, { width: 0 }); gsap.set(cap, { scaleY: 0 }); gsap.set($("span", cap), { opacity: 0 }); capTxt.textContent = ""; num.style.color = ""; return; }
    if (n === 1) {
      gsap.set(cap, { scaleY: 0 }); gsap.set($("span", cap), { opacity: 0 }); capTxt.textContent = ""; num.style.color = "";
      if (inst) { setNum(86); gsap.set(fill, { width: "86%" }); return; }
      gsap.to(cur, { v: 86, duration: 2.0, delay: 0.3, ease: "power2.out", onUpdate: () => setNum(cur.v) });
      gsap.to(fill, { width: "86%", duration: 2.0, delay: 0.3, ease: "power2.out" });
      return;
    }
    // n >= 2: sponsorship disappears; weighted sum 64, then the eligibility cap lands at 35
    if (inst) { setNum(35); gsap.set(fill, { width: "35%" }); gsap.set(cap, { scaleY: 1 }); gsap.set($("span", cap), { opacity: 1 }); capTxt.textContent = "weighted sum 64 · capped at 35"; num.style.color = "#F95135"; return; }
    if (parseFloat(num.dataset.v) === 35) return;
    const tl = gsap.timeline();
    tl.to(cur, { v: 64, duration: 1.2, delay: 0.5, ease: "power2.inOut", onUpdate: () => setNum(cur.v) }, 0)
      .to(fill, { width: "64%", duration: 1.2, delay: 0.5, ease: "power2.inOut" }, 0)
      .add(() => (capTxt.textContent = "weighted sum 64"), 1.7)
      .to(cap, { scaleY: 1, duration: 0.5, ease: "power4.in" }, 2.2)
      .to($("span", cap), { opacity: 1, duration: 0.3 }, 2.6)
      .to(fill, { width: "35%", duration: 0.5, ease: "power4.out" }, 2.7)
      .to(cur, { v: 35, duration: 0.5, ease: "power4.out", onUpdate: () => setNum(cur.v) }, 2.7)
      .add(() => { capTxt.textContent = "weighted sum 64 · capped at 35"; num.style.color = "#F95135"; W() && W().flash(0.08, 0.8); }, 2.75);
  }
  Deck.define("engine", {
    enter(el, ctx) {
      enBuild(el);
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".en-head .h-m", el), { delay: 0.3 }));
      const segs = $$(".en-ring .seg", el);
      segs.forEach((p) => { const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: ctx.instant ? 0 : L }); });
      if (!ctx.instant) {
        tl.to(segs, { strokeDashoffset: 0, duration: 0.9, stagger: 0.14, ease: "power3.inOut" }, 0.6)
          .from($$(".en-ring .seg-l, .en-ring .center-n, .en-ring .center-l", el), { opacity: 0, duration: 0.6, stagger: 0.05 }, 1.0)
          .from($$(".en-b", el), { opacity: 0, x: 20, duration: 0.6, stagger: 0.06 }, 1.2)
          .from($(".en-formula .f1", el), { opacity: 0, y: 20, duration: 0.9 }, 0.8)
          .from($(".en-total", el), { opacity: 0, duration: 0.8 }, 1.4);
      }
      $(".en-num", el).dataset.v = 0;
      return tl;
    },
    state(n, ctx, el) { enSet(el, n, ctx); },
  });

  /* ================================================================ 12 · tailoring deep dive (zooms into the real workspace) */
  const TLZ = [null, { x: 0.18, y: 0.335, w: 0.575, h: 0.16 }, { x: 0.755, y: 0.165, w: 0.215, h: 0.205 }, { x: 0.755, y: 0.37, w: 0.215, h: 0.13 }];
  Deck.define("tailoring", {
    enter(el, ctx) {
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".tl-head", el), { delay: 0.3 }));
      if (!ctx.instant) tl.from($(".tl-win", el), { opacity: 0, rotateY: -24, x: 160, duration: 1.8, ease: "expo.out" }, 0.2);
      gsap.set($(".tl-img", el), { x: 0, y: 0, scale: 1 });
      gsap.set($(".tl-focus", el), { opacity: 0 });
      return tl;
    },
    state(n, ctx, el) {
      const img = $(".tl-img", el), focus = $(".tl-focus", el);
      const vw = 1000, vh = 840, iw = 1000, ih = img.naturalHeight ? (img.naturalHeight / img.naturalWidth) * iw : 834;
      const z = TLZ[n];
      if (!z) { gsap.to(img, { x: 0, y: 0, scale: 1, duration: dur(1.4, ctx), ease: "expo.inOut" }); gsap.to(focus, { opacity: 0, duration: dur(0.3, ctx) }); }
      else {
        const rx = z.x * iw, ry = z.y * ih, rw = z.w * iw, rh = z.h * ih;
        const s = Math.min((vw * 0.86) / rw, (vh * 0.7) / rh, 3.2);
        const tx = vw / 2 - (rx + rw / 2) * s, ty = vh / 2 - (ry + rh / 2) * s;
        gsap.to(img, { x: tx, y: ty, scale: s, duration: dur(1.5, ctx), ease: "expo.inOut" });
        const fl = 1000 * 0 + (vw - rw * s) / 2 - 10, ft = (vh - rh * s) / 2 - 10;
        gsap.set(focus, { left: fl, top: ft, width: rw * s + 20, height: rh * s + 20 });
        gsap.fromTo(focus, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: dur(0.7, ctx), delay: dur(1.2, ctx) });
      }
      $$(".tl-pt", el).forEach((p, i) => {
        if (i === n) gsap.fromTo(p, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: dur(0.9, ctx), delay: dur(0.4, ctx), ease: "expo.out" });
        else gsap.to(p, { opacity: 0, duration: dur(0.25, ctx) });
      });
    },
  });

  /* ================================================================ 13 · journey: real screens, a guided cursor, contextual zoom */
  const JR = [
    { t: [0.8125, 0.038], url: "skylarkgo.in" },
    { t: [0.185, 0.68], url: "skylarkgo.in/login" },
    { t: [0.916, 0.176], url: "skylarkgo.in/dashboard", z: [0.62, 0.32, 1.45] },
    { t: [0.33, 0.494], url: "skylarkgo.in/jobs", z: [0.2, 0.42, 1.5] },
    { t: [0.22, 0.4], url: "skylarkgo.in/jobs/…", z: [0.18, 0.36, 1.7] },
    { t: [0.704, 0.626], url: "skylarkgo.in/jobs/…/tailor", z: [0.55, 0.5, 1.6] },
    { t: [0.6, 0.35], url: "skylarkgo.in/applications", z: [0.45, 0.3, 1.5] },
  ];
  Deck.define("journey", {
    enter(el, ctx) {
      const dev = $(".jr-device", el);
      gsap.set($$(".jr-screens img", el), { opacity: 0, scale: 1, x: 0, y: 0 });
      gsap.set($('.jr-screens img[data-s="0"]', el), { opacity: 1 });
      gsap.set($(".jr-cursor", el), { x: 1000, y: 600, opacity: 0 });
      el._jr = -1;
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".jr-head .h-m", el), { delay: 0.3 }));
      if (!ctx.instant) tl.fromTo(dev, { rotateY: -32, rotateX: 10, z: -600, opacity: 0 }, { rotateY: -9, rotateX: 3, z: 0, opacity: 1, duration: 2.2, ease: "expo.out" }, 0.1);
      else gsap.set(dev, { rotateY: -9, rotateX: 3, z: 0, opacity: 1 });
      tl.from($$(".jr-steps li", el), { opacity: 0, x: -16, duration: dur(0.6, ctx), stagger: 0.05 }, 0.6);
      return tl;
    },
    state(n, ctx, el) {
      const imgs = $$(".jr-screens img", el), cur = $(".jr-cursor", el), rip = $(".jr-ripple", el), dev = $(".jr-device", el);
      const SW = 1120, SH = 700, OY = 34;
      $$(".jr-steps li", el).forEach((li, i) => { li.classList.toggle("on", i === n); li.classList.toggle("done", i < n); });
      $(".jr-url", el).textContent = JR[n].url;
      const prev = el._jr; el._jr = n;
      const inst = ctx.instant || D.REDUCED;
      imgs.forEach((im, i) => {
        if (i === n) {
          gsap.killTweensOf(im);
          if (inst || prev === -1) gsap.set(im, { opacity: 1, scale: 1, x: 0, y: 0, filter: "blur(0px)" });
          else gsap.fromTo(im, { opacity: 0, scale: 1.04, x: 0, y: 0, filter: "blur(6px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, delay: 0.25, ease: "power2.out" });
        } else gsap.to(im, { opacity: 0, duration: inst ? 0 : 0.5, scale: 1, x: 0, y: 0 });
      });
      gsap.to(dev, { rotateY: n % 2 ? -6 : -10, rotateX: 3, duration: dur(1.4, ctx), ease: "power2.inOut" });
      const [fx, fy] = JR[n].t; const tx = fx * SW, ty = OY + fy * SH;
      if (inst) { gsap.set(cur, { x: tx, y: ty, opacity: 1 }); }
      else {
        const tl = gsap.timeline({ delay: 0.9 });
        tl.to(cur, { opacity: 1, duration: 0.2 })
          .to(cur, { x: tx, y: ty, duration: 1.1, ease: "power3.inOut" }, 0)
          .to(cur, { scale: 0.82, duration: 0.09, yoyo: true, repeat: 1, transformOrigin: "0 0" }, 1.15)
          .fromTo(rip, { x: tx, y: ty, scale: 0.2, opacity: 1 }, { scale: 1.3, opacity: 0, duration: 0.7, ease: "power2.out" }, 1.15);
        const z = JR[n].z;
        if (z) {
          const im = imgs[n];
          const [zx, zy, s] = z;
          tl.to(im, { scale: s, x: -zx * SW * (s - 1), y: -zy * SH * (s - 1), duration: 1.4, ease: "expo.inOut" }, 1.6)
            .to(cur, { x: (tx - zx * SW) * s + zx * SW, y: ((ty - OY) - zy * SH) * s + zy * SH + OY, duration: 1.4, ease: "expo.inOut" }, 1.6);
        }
      }
    },
  });

  /* ================================================================ 14 · engineering */
  Deck.define("engineering", {
    enter(el, ctx) {
      const tl = gsap.timeline();
      tl.from($$(".eg-list li", el), { opacity: 0, x: -20, duration: dur(0.7, ctx), stagger: 0.07 }, 0.2)
        .from($(".eg-spine", el), { scaleY: 0, transformOrigin: "top", duration: dur(1.2, ctx), ease: "expo.out" }, 0);
      gsap.set($$(".eg-d", el), { opacity: 0 });
      return tl;
    },
    state(n, ctx, el) {
      $$(".eg-list li", el).forEach((li, i) => { li.classList.toggle("on", i === n); li.classList.toggle("done", i < n); });
      gsap.to($(".eg-dot", el), { y: n * 128 + 58, duration: dur(0.9, ctx), ease: "expo.inOut" });
      $$(".eg-d", el).forEach((d, i) => {
        if (i === n) {
          gsap.fromTo(d, { opacity: 0 }, { opacity: 1, duration: dur(0.5, ctx), delay: dur(0.2, ctx) });
          const h = $("h3", d); if (!ctx.instant) D.revealWords(h, { delay: 0.25, stagger: 0.04 }); else D.splitWords(h);
          gsap.fromTo([$(".lede", d), $(".eg-why", d)], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: dur(0.8, ctx), stagger: 0.15, delay: dur(0.7, ctx), ease: "expo.out" });
        } else gsap.to(d, { opacity: 0, duration: dur(0.3, ctx) });
      });
    },
  });

  /* ================================================================ 15 · technology ecosystem */
  const ST = {
    hub: { x: 1090, y: 610 },
    nodes: [
      // ring 1: interface (ember)
      { g: 1, t: "Tailwind v4 · Radix", s: "accessible app UI", a: 208, r: [330, 190] },
      { g: 1, t: "Zod 4", s: "one schema, server and browser", a: 332, r: [330, 190] },
      { g: 1, t: "Framer Motion", s: "app motion", a: 152, r: [330, 190] },
      { g: 1, t: "GSAP · Lenis · WebGL", s: "marketing site", a: 28, r: [330, 190] },
      // ring 2: data & services (amber)
      { g: 2, t: "Supabase", s: "Postgres + RLS · Auth · Storage", a: 112, r: [560, 320] },
      { g: 2, t: "Claude", s: "tailoring · resume extraction", a: 0, r: [560, 320] },
      { g: 2, t: "Gemini", s: "chat onboarding", a: 285, r: [560, 320] },
      { g: 2, t: "Razorpay", s: "subscriptions in INR", a: 58, r: [560, 320] },
      { g: 2, t: "Nodemailer · SMTP", s: "email verification codes", a: 178, r: [560, 320] },
      // ring 3: delivery & quality (sky)
      { g: 3, t: "Vercel · Sydney", s: "functions next to the database", a: 42, r: [700, 400] },
      { g: 3, t: "Vercel Cron", s: "daily worker run", a: 138, r: [700, 400] },
      { g: 3, t: "Vitest · PGlite", s: "unit + RLS policy tests", a: 222, r: [700, 400] },
      { g: 3, t: "Playwright", s: "end-to-end, phone layouts", a: 318, r: [700, 400] },
    ],
    links: [["Claude", "Zod 4", "schema-validated", -40], ["Supabase", "Vercel · Sydney", "same region", 55], ["Razorpay", "Supabase", "signed webhooks", -110], ["Vitest · PGlite", "Supabase", "policy tests", -40]],
    col: { 1: "#F95135", 2: "#FFB98A", 3: "#7CC6EE" },
  };
  function stBuild(el) {
    const svg = $(".st-svg", el);
    if (svg.dataset.built) return;
    svg.dataset.built = "1";
    const pos = (n) => { const a = (n.a * Math.PI) / 180; return [ST.hub.x + n.r[0] * Math.cos(a), ST.hub.y + n.r[1] * Math.sin(a)]; };
    const byName = {};
    ST.nodes.forEach((n) => (byName[n.t] = pos(n)));
    // orbits
    [[330, 190], [560, 320], [700, 400]].forEach(([rx, ry], i) => svgEl("ellipse", { cx: ST.hub.x, cy: ST.hub.y, rx, ry, fill: "none", stroke: "rgba(244,241,236,.07)", "stroke-dasharray": "2 8", class: `orb orb${i + 1}` }, svg));
    const edges = svgEl("g", {}, svg);
    ST.nodes.forEach((n) => {
      const [x, y] = byName[n.t];
      svgEl("line", { x1: ST.hub.x, y1: ST.hub.y, x2: x, y2: y, stroke: ST.col[n.g], "stroke-opacity": 0.28, "stroke-width": 1, class: `ed g${n.g}` }, edges);
      const flow = svgEl("line", { x1: ST.hub.x, y1: ST.hub.y, x2: x, y2: y, stroke: ST.col[n.g], "stroke-width": 1.6, "stroke-dasharray": "3 22", class: `fl g${n.g}` }, edges);
      flow.style.animation = `stflow ${2 + Math.random() * 1.5}s linear infinite`;
    });
    ST.links.forEach(([a, b, l, off]) => {
      const [x1, y1] = byName[a], [x2, y2] = byName[b];
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + off;
      svgEl("path", { d: `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`, fill: "none", stroke: "#F4F1EC", "stroke-opacity": 0.35, "stroke-dasharray": "4 6", class: "xl" }, edges);
      const t = svgEl("text", { x: mx, y: my + 14, "text-anchor": "middle", class: "nd-s xl", fill: "#FFB98A", style: "fill:#FFB98A" }, edges); t.textContent = l;
    });
    // hub
    const hub = svgEl("g", { class: "hub" }, svg);
    svgEl("circle", { cx: ST.hub.x, cy: ST.hub.y, r: 92, fill: "#0B0D11", stroke: "#F95135", "stroke-width": 1.5 }, hub);
    svgEl("circle", { cx: ST.hub.x, cy: ST.hub.y, r: 110, fill: "none", stroke: "rgba(249,81,53,.25)", "stroke-dasharray": "2 6" }, hub);
    const ht = svgEl("text", { x: ST.hub.x, y: ST.hub.y + 4, "text-anchor": "middle", class: "hub-t" }, hub); ht.textContent = "Next.js 16";
    const hs = svgEl("text", { x: ST.hub.x, y: ST.hub.y + 32, "text-anchor": "middle", class: "hub-s" }, hub); hs.textContent = "REACT 19 · TS";
    ST.nodes.forEach((n) => {
      const [x, y] = byName[n.t];
      const g = svgEl("g", { class: `nd g${n.g}` }, svg);
      svgEl("rect", { x: x - 6, y: y - 6, width: 12, height: 12, fill: ST.col[n.g], transform: `rotate(45 ${x} ${y})` }, g);
      const below = y > ST.hub.y - 20;
      const t = svgEl("text", { x, y: below ? y + 36 : y - 38, "text-anchor": "middle", class: "nd-t" }, g); t.textContent = n.t;
      const s = svgEl("text", { x, y: below ? y + 58 : y - 18, "text-anchor": "middle", class: "nd-s" }, g); s.textContent = n.s;
    });
    if (!document.getElementById("stflow-kf")) { const st = document.createElement("style"); st.id = "stflow-kf"; st.textContent = "@keyframes stflow{to{stroke-dashoffset:-50}}"; document.head.appendChild(st); }
  }
  Deck.define("stack", {
    enter(el, ctx) {
      stBuild(el);
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".st-head .h-m", el), { delay: 0.3 }));
      if (!ctx.instant) tl.from($(".st-svg .hub", el), { opacity: 0, scale: 0.6, transformOrigin: `${ST.hub.x}px ${ST.hub.y}px`, duration: 1.4, ease: "expo.out" }, 0.4);
      return tl;
    },
    state(n, ctx, el) {
      [1, 2, 3].forEach((g) => {
        const on = n >= g;
        const items = $$(`.st-svg .g${g}`, el);
        gsap.to(items, { opacity: on ? 1 : 0, duration: dur(0.8, ctx), stagger: on ? 0.04 : 0 });
        gsap.to($(`.st-svg .orb${g}`, el), { opacity: on ? 1 : 0.15, duration: dur(0.8, ctx) });
      });
      gsap.to($$(".st-svg .xl", el), { opacity: n >= 3 ? 1 : 0, duration: dur(0.8, ctx), delay: n >= 3 ? dur(0.8, ctx) : 0 });
    },
  });

  /* ================================================================ 16 · security rings (aligned with the particle rings behind) */
  const SC = {
    cx: 1330, cy: 540,
    rings: [
      { r: 490, t: "proxy.ts", s: "optimistic gate: refreshes the session, routes early" },
      { r: 420, t: "DATA ACCESS LAYER", s: "authorization re-checked on every page, action and route" },
      { r: 350, t: "ROW LEVEL SECURITY", s: "on every table: candidates see only their own rows" },
      { r: 280, t: "COLUMN PRIVILEGES", s: "nobody can change their own role or email" },
      { r: 210, t: "EEO LOCK", s: "SELECT revoked from every browser role" },
    ],
  };
  function scBuild(el) {
    const svg = $(".sc-svg", el);
    if (svg.dataset.built) return;
    svg.dataset.built = "1";
    const defs = svgEl("defs", {}, svg);
    const f = svgEl("filter", { id: "scglow", x: "-200%", y: "-200%", width: "500%", height: "500%" }, defs); svgEl("feGaussianBlur", { stdDeviation: 8 }, f);
    SC.rings.forEach((R, i) => {
      const g = svgEl("g", { class: `rg rg${i}` }, svg);
      svgEl("circle", { cx: SC.cx, cy: SC.cy, r: R.r, fill: "none", stroke: i === 2 ? "rgba(249,81,53,.55)" : "rgba(244,241,236,.18)", "stroke-width": i === 2 ? 1.6 : 1, class: "rc" }, g);
      const t = svgEl("text", { x: SC.cx, y: SC.cy - R.r + 26, "text-anchor": "middle", class: "rg-t" }, g); t.textContent = R.t;
      const s = svgEl("text", { x: SC.cx, y: SC.cy - R.r + 46, "text-anchor": "middle", class: "rg-s" }, g); s.textContent = R.s;
    });
    const core = svgEl("g", { class: "core" }, svg);
    svgEl("circle", { cx: SC.cx, cy: SC.cy, r: 120, fill: "rgba(249,81,53,.06)", stroke: "#F95135", "stroke-width": 1.4 }, core);
    const ct = svgEl("text", { x: SC.cx, y: SC.cy + 7, "text-anchor": "middle", class: "core-t" }, core); ct.textContent = "Candidate data";
    // two requests
    const mk = (cls, col) => { const g = svgEl("g", { class: cls, opacity: 0 }, svg); svgEl("circle", { r: 14, fill: col, filter: "url(#scglow)" }, g); svgEl("circle", { r: 6, fill: "#fff" }, g); return g; };
    el._sc = { bad: mk("req-bad", "#F95135"), good: mk("req-good", "#6FD6A8") };
    const lb = svgEl("text", { x: SC.cx - 350 - 24, y: SC.cy + 60, "text-anchor": "end", class: "rg-t sc-deny", fill: "#F95135", style: "fill:#F95135", opacity: 0 }, svg); lb.textContent = "another candidate’s rows: denied";
    const lg = svgEl("text", { x: SC.cx, y: SC.cy + 40, "text-anchor": "middle", class: "rg-t sc-allow", style: "fill:#6FD6A8", opacity: 0 }, svg); lg.textContent = "own rows: allowed";
  }
  Deck.define("security", {
    enter(el, ctx) {
      scBuild(el);
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".sc-copy .h-m", el), { delay: 0.3 }));
      const rings = $$(".sc-svg .rg", el);
      rings.forEach((g) => { const c = $(".rc", g); const L = 2 * Math.PI * +c.getAttribute("r"); gsap.set(c, { strokeDasharray: L, strokeDashoffset: ctx.instant ? 0 : L }); });
      if (!ctx.instant) {
        tl.to($$(".sc-svg .rc", el), { strokeDashoffset: 0, duration: 1.6, stagger: 0.18, ease: "power3.inOut" }, 0.4)
          .from($$(".sc-svg .rg-t, .sc-svg .rg-s", el), { opacity: 0, duration: 0.6, stagger: 0.07 }, 1.0)
          .from($(".sc-svg .core", el), { opacity: 0, scale: 0.6, transformOrigin: `${SC.cx}px ${SC.cy}px`, duration: 1.2, ease: "expo.out" }, 1.4);
      }
      gsap.set([el._sc.bad, el._sc.good, $(".sc-deny", el), $(".sc-allow", el)], { opacity: 0 });
      return tl;
    },
    state(n, ctx, el) {
      const S = el._sc; if (!S) return;
      const deny = $(".sc-deny", el), allow = $(".sc-allow", el);
      gsap.killTweensOf([S.bad, S.good]);
      if (n < 2) { gsap.to([S.bad, S.good, deny, allow], { opacity: 0, duration: dur(0.3, ctx) }); return; }
      const rls = SC.cx - 350;
      if (ctx.instant || D.REDUCED) {
        gsap.set(S.bad, { opacity: 1, attr: { transform: `translate(${rls - 14},${SC.cy + 20})` } }); gsap.set(deny, { opacity: 1 });
        gsap.set(S.good, { opacity: 1, attr: { transform: `translate(${SC.cx},${SC.cy - 30})` } }); gsap.set(allow, { opacity: 1 });
        return;
      }
      const o = { x: 640, y: SC.cy + 20 }, g = { x: 640, y: SC.cy - 30 };
      const tl = gsap.timeline();
      tl.set(S.bad, { opacity: 1 }).set(S.good, { opacity: 0 })
        .to(o, { x: rls - 14, duration: 1.6, ease: "power2.in", onUpdate: () => S.bad.setAttribute("transform", `translate(${o.x},${o.y})`) })
        .add(() => { const c = $(".rg2 .rc", el); gsap.fromTo(c, { attr: { "stroke-width": 6 }, stroke: "#FF3B1F" }, { attr: { "stroke-width": 1.6 }, stroke: "rgba(249,81,53,.55)", duration: 1.2 }); W() && W().flash(0.06, 0.6); })
        .to(o, { x: rls - 60, duration: 0.5, ease: "power3.out", onUpdate: () => S.bad.setAttribute("transform", `translate(${o.x},${o.y})`) })
        .to(deny, { opacity: 1, duration: 0.5 }, "<")
        .set(S.good, { opacity: 1 }, "+=0.3")
        .to(g, { x: SC.cx, duration: 2.0, ease: "power2.inOut", onUpdate: () => S.good.setAttribute("transform", `translate(${g.x},${g.y})`) })
        .to(allow, { opacity: 1, duration: 0.5 });
      S.good.setAttribute("transform", `translate(${g.x},${g.y})`);
    },
  });

  /* ================================================================ 17 · demo */
  const LIVE_URL = new URLSearchParams(location.search).get("live") || "https://www.skylarkgo.in";
  function demoKeys(e) {
    if (!document.querySelector('.slide[data-id="demo"].is-active')) return;
    const v = $(".dm-video");
    if (e.code === "KeyL") { window.open(LIVE_URL, "skylark-live"); }
    if (e.code === "KeyV") { v.paused ? v.play() : v.pause(); }
  }
  addEventListener("keydown", demoKeys);
  Deck.define("demo", {
    enter(el, ctx) {
      $(".dm-live-url", el).textContent = LIVE_URL.replace(/^https?:\/\/(www\.)?/, "");
      const win = $(".dm-win", el), v = $(".dm-video", el);
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".dm-head .h-m", el), { delay: 0.3 }));
      if (!ctx.instant) tl.fromTo(win, { rotateY: -28, rotateX: 8, z: -500, opacity: 0 }, { rotateY: -7, rotateX: 2, z: 0, opacity: 1, duration: 2.0, ease: "expo.out" }, 0.2);
      else gsap.set(win, { rotateY: -7, rotateX: 2, z: 0, opacity: 1 });
      if (!D.EXPORT) { try { v.currentTime = 0; v.play().catch(() => {}); } catch (e) {} }
      else { try { v.currentTime = 30; } catch (e) {} }
      tl.from($$(".dm-keys span", el), { opacity: 0, x: -16, duration: dur(0.6, ctx), stagger: 0.08 }, 0.8);
      return tl;
    },
    leave(el) { const v = $(".dm-video", el); v.pause(); },
  });

  /* ================================================================ 18 · results */
  Deck.define("results", {
    enter(el, ctx) {
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".rs-head .h-m", el), { delay: 0.3 }));
      $$(".rs-n .v", el).forEach((v, i) => { tl.add(D.count(v, +v.dataset.to, { dur: 1.8 }), 0.7 + i * 0.15); });
      tl.from($$(".rs-n", el), { opacity: 0, y: 30, duration: dur(1, ctx), stagger: 0.12, ease: "expo.out" }, 0.5);
      return tl;
    },
    state(n, ctx, el) {
      gsap.to($(".rs-line", el), { scaleX: n ? 1 : 0, duration: dur(1.4, ctx), ease: "expo.inOut" });
      gsap.to($$(".rs-m", el), { opacity: n ? 1 : 0, y: n ? 0 : 10, duration: dur(0.6, ctx), stagger: n ? 0.12 : 0, delay: n ? dur(0.4, ctx) : 0 });
    },
  });

  /* ================================================================ 19 · roadmap */
  Deck.define("roadmap", {
    enter(el, ctx) {
      const tl = gsap.timeline();
      tl.add(D.revealWords($(".rm-head .h-m", el), { delay: 0.3 }));
      tl.from($(".rm-axis", el), { scaleY: 0, duration: dur(1.4, ctx), ease: "expo.inOut" }, 0.2)
        .from($$(".rm-now li, .rm-now .k", el), { opacity: 0, x: 30, duration: dur(0.7, ctx), stagger: 0.07, ease: "expo.out" }, 0.8);
      return tl;
    },
    state(n, ctx, el) {
      gsap.fromTo($$(".rm-next li", el), { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: dur(0.7, ctx), stagger: dur(0.08, ctx), delay: dur(0.3, ctx), ease: "expo.out" });
      if (!n) gsap.set($$(".rm-next li", el), { opacity: 0 });
      const w = W();
      if (w) w.morph(w.F.line(), { dur: 1.6, instant: ctx.instant, lift: 0 });
    },
  });

  /* ================================================================ 20 · statement */
  Deck.define("statement", {
    enter(el, ctx) {
      const tl = gsap.timeline();
      gsap.set($$(".sm-l", el), { opacity: 0 });
      if (!ctx.instant) tl.from($$(".sm-mark .sh", el), { opacity: 0, scale: 0.7, transformOrigin: "50% 50%", duration: 1.6, stagger: 0.15, ease: "expo.out" }, 0.2);
      return tl;
    },
    state(n, ctx, el) {
      $$(".sm-mark .sh", el).forEach((s, i) => s.classList.toggle("on", i <= n));
      $$(".sm-l", el).forEach((l, i) => {
        if (i <= n) {
          if (l.dataset.shown !== "1") { const tx = $(".txt", l); gsap.set(l, { opacity: 1 }); D.splitWords(tx); if (!ctx.instant) D.revealWords(tx, { delay: 0.2, stagger: 0.06 }); else gsap.set($$(".wi", tx), { yPercent: 0 }); l.dataset.shown = "1"; }
        } else { gsap.set(l, { opacity: 0 }); l.dataset.shown = "0"; }
      });
    },
  });

  /* ================================================================ 21 · closing: the mark assembles again and hands off to the logo */
  let closeLogo = null;
  Deck.define("closing", {
    enter(el, ctx) {
      if (!closeLogo) closeLogo = mountLogo($(".logo-svg", el));
      const box = $(".cl-logo", el);
      const all = [$(".cl-q", el), $(".cl-links", el), $(".cl-team", el)];
      const w = W();
      if (ctx.instant || !w) {
        gsap.set(box, { opacity: 1 }); gsap.set(closeLogo.rect, { attr: { width: WORD_X1 - WORD_X0 } }); gsap.set(all, { opacity: 1 });
        if (w) { w.mark.visible = false; }
        return null;
      }
      gsap.set(box, { opacity: 0 }); gsap.set(all, { opacity: 0 }); gsap.set(closeLogo.rect, { attr: { width: 0 } });
      // where the SVG mark sits, in world units at the camera distance
      const pxPerUnit = 1080 / (2 * 46 * Math.tan((w.camera.fov * Math.PI) / 360));
      const logoW = 860, markW = (logoW * 246.66) / 764.33;
      const mx = 960 - logoW / 2 + MARK_FRAC_X * logoW, my = 300 + (logoW * 241.5) / 764.33 / 2;
      const target = { x: (mx - 960) / pxPerUnit, y: -(my - 540) / pxPerUnit, s: markW / (16 * pxPerUnit) };
      const tl = gsap.timeline({ onComplete: () => (w.cam.drift = 1) });
      w.cam.drift = 0;
      gsap.killTweensOf(w.cam.pos); gsap.killTweensOf(w.cam.target);
      tl.to(w.cam.pos, { x: 0, y: 0, z: 46, duration: 1.2, ease: "power2.inOut" }, 0).to(w.cam.target, { x: 0, y: 0, z: 0, duration: 1.2 }, 0);
      tl.add(() => w.morph(w.F.mark(16 * target.s, target.x, target.y), { dur: 2.4 }), 0.1);
      tl.add(() => { w.assembleMark({ dur: 2.4 }); w.mark.position.set(target.x, target.y, 0); w.mark.scale.setScalar(target.s); }, 0.5);
      tl.add(() => { w.flash(0.22, 1.4); w.morph(w.F.halo(), { dur: 2.8, lift: 1.4 }); }, 3.2);
      tl.to(box, { opacity: 1, duration: 0.45 }, 3.35).add(() => w.hideMark(0.5), 3.45);
      wordReveal(closeLogo, tl, 3.9, 1.4);
      tl.to(all, { opacity: 1, y: 0, duration: 1.2, stagger: 0.2, ease: "expo.out" }, 4.6);
      return tl;
    },
    leave() { const w = W(); if (w) { w.cam.drift = 1; w.mark.scale.setScalar(1); w.mark.position.set(0, 0, 0); } },
  });
})();
