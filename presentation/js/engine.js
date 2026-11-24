/* Skylark presentation engine.
 *
 * - A fixed 1920 × 1080 stage, scaled to fit any screen (no clipping, no scrollbars).
 * - Slides are <section class="slide" data-steps="N">; each may register a controller with Deck.define(id, {...}).
 *     enter(el, ctx)      → build and play the slide's entrance (return a gsap timeline, optional)
 *     state(n, ctx)       → put the slide into step n (0 … steps). Called with ctx.instant when jumping.
 *     leave(el, ctx)      → stop loops and timers
 * - Elements with data-step="k" are revealed automatically once the slide reaches step k.
 * - The 3D world (world.js) is told about every slide change, so scenes carry across slides.
 * - Presenter view (presenter.html) mirrors and drives the deck through a BroadcastChannel.
 */
(function () {
  const W = 1920, H = 1080;
  const qs = new URLSearchParams(location.search);
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches || qs.has("reduced");
  const EXPORT = qs.has("export"); // used by the export tool: no gate, no intro, instant states
  const stage = document.getElementById("stage");
  const slides = Array.from(stage.querySelectorAll(".slide"));
  const controllers = {};
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("skylark-deck") : null;

  let idx = -1, step = 0, started = false, busy = null, autoplay = 0, autoTimer = null, gotoBuf = "";
  let scale = 1;

  const ctx = {
    W, H, REDUCED, EXPORT, instant: false,
    get world() { return window.World; },
    dur: (d) => (REDUCED ? Math.min(d, 0.25) : d),
  };

  /* ------------------------------------------------------------------ helpers */
  function splitWords(el) {
    if (el.dataset.split === "done") return el.querySelectorAll(".wi");
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "w";
            const wi = document.createElement("span"); wi.className = "wi"; wi.textContent = part;
            w.appendChild(wi); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains("w") && n.tagName !== "BR") {
          if (n.classList.contains("nosplit")) { const w = document.createElement("span"); w.className = "w"; const wi = document.createElement("span"); wi.className = "wi"; n.replaceWith(w); w.appendChild(wi); wi.appendChild(n); return; }
          walk(n);
        }
      });
    };
    walk(el);
    el.dataset.split = "done";
    return el.querySelectorAll(".wi");
  }
  /** Masked word reveal used across slides. */
  function revealWords(el, { delay = 0, stagger = 0.045, dur = 1.1, y = 110 } = {}) {
    const words = splitWords(el);
    if (ctx.instant || REDUCED) { gsap.set(words, { yPercent: 0, opacity: 1 }); return gsap.timeline(); }
    return gsap.timeline({ delay }).fromTo(words, { yPercent: y, opacity: 1 }, { yPercent: 0, duration: dur, stagger, ease: "expo.out" });
  }
  ctx.splitWords = splitWords;
  ctx.revealWords = revealWords;

  /** Animated number counter (only ever used for real, sourced numbers). */
  ctx.count = (el, to, { dur = 1.6, from = 0, fmt = (v) => Math.round(v).toLocaleString("en-IN") } = {}) => {
    const o = { v: from };
    if (ctx.instant || REDUCED) { el.textContent = fmt(to); return gsap.timeline(); }
    return gsap.to(o, { v: to, duration: dur, ease: "power3.out", onUpdate: () => (el.textContent = fmt(o.v)) });
  };

  /* ------------------------------------------------------------------ layout */
  function fit() {
    const vw = innerWidth, vh = innerHeight;
    scale = Math.min(vw / W, vh / H);
    stage.style.transform = `translate(${-W * scale / 2}px, ${-H * scale / 2}px) scale(${scale})`;
    if (window.World) World.resize(scale);
  }
  addEventListener("resize", fit);

  /* ------------------------------------------------------------------ steps */
  const stepsOf = (i) => parseInt(slides[i].dataset.steps || "0", 10);
  function applyStepClasses(el, n) {
    el.querySelectorAll("[data-step]").forEach((s) => s.classList.toggle("is-on", n >= parseInt(s.dataset.step, 10)));
  }
  function setState(n, instant) {
    const el = slides[idx];
    const c = controllers[el.dataset.id];
    step = n;
    ctx.instant = !!instant;
    applyStepClasses(el, n);
    if (c && c.state) c.state(n, ctx, el);
    if (window.World) World.step(el.dataset.id, n, !!instant);
    ctx.instant = false;
    hud();
  }

  /* ------------------------------------------------------------------ navigation */
  function go(i, { atStep = 0, dir = 1, instant = false } = {}) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    const prev = idx >= 0 ? slides[idx] : null;
    const next = slides[i];
    if (prev && i === idx) { replay(); return; }
    if (busy) { busy.progress(1); busy = null; }

    if (prev) {
      const pc = controllers[prev.dataset.id];
      if (pc && pc.leave) pc.leave(prev, ctx);
      prev.classList.remove("is-active");
      if (!instant && !REDUCED) {
        prev.classList.add("is-leaving");
        const out = pc && pc.exit ? pc.exit(prev, ctx, dir) : null;
        const tl = out || gsap.to(prev, { opacity: 0, duration: 0.55, ease: "power2.in" });
        tl.eventCallback("onComplete", () => { prev.classList.remove("is-leaving"); gsap.set(prev, { clearProps: "opacity" }); });
      } else {
        gsap.set(prev, { clearProps: "opacity" });
      }
    }
    const from = idx;
    idx = i;
    next.classList.add("is-active");
    gsap.set(next, { opacity: 1 });
    applyStepClasses(next, -1);
    const c = controllers[next.dataset.id];
    ctx.instant = instant || REDUCED;
    if (window.World) World.goto(next.dataset.id, { from: from >= 0 ? slides[from].dataset.id : null, instant: instant || REDUCED, dir });
    let tl = null;
    if (c && c.enter) tl = c.enter(next, ctx, { dir, from });
    ctx.instant = false;
    busy = tl || null;
    // A slide entered backwards lands on its final step, fast-forwarded.
    if (atStep > 0) { if (tl) tl.progress(1); setState(atStep, true); } else setState(0, instant);
    if (location.hash !== `#${i + 1}`) history.replaceState(null, "", `#${i + 1}`);
    broadcast();
  }
  function next() {
    if (!started) return;
    if (busy && busy.isActive() && busy.duration() > 2.5 && busy.progress() < 0.9 && slides[idx].dataset.skip !== "no") { busy.progress(1); busy = null; return; }
    if (step < stepsOf(idx)) setState(step + 1, false);
    else if (idx < slides.length - 1) go(idx + 1, { dir: 1 });
    broadcast();
  }
  function prev() {
    if (!started) return;
    if (step > 0) setState(step - 1, true);
    else if (idx > 0) go(idx - 1, { dir: -1, atStep: stepsOf(idx - 1), instant: false });
    broadcast();
  }
  function replay() {
    const el = slides[idx];
    const cur = idx; idx = -1;
    el.classList.remove("is-active");
    go(cur, { dir: 1 });
  }

  /* ------------------------------------------------------------------ HUD */
  const $progress = document.getElementById("progress");
  const $counter = document.getElementById("counter");
  function hud() {
    if (idx < 0) return;
    const total = slides.length;
    $progress.style.width = `${((idx + (stepsOf(idx) ? step / (stepsOf(idx) + 1) : 0)) / (total - 1)) * 100}%`;
    const st = stepsOf(idx) ? `<span class="steps">${"●".repeat(step)}${"○".repeat(stepsOf(idx) - step)}</span>` : "";
    $counter.innerHTML = `${String(idx + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}${st}`;
  }

  // notes
  const $notes = document.getElementById("notes-panel");
  function notesHTML(i) {
    const n = slides[i].querySelector(".notes");
    return n ? n.innerHTML : "<p>No notes.</p>";
  }
  function renderNotes() {
    if (!$notes.classList.contains("open")) return;
    const s = slides[idx];
    const n = s.querySelector(".notes");
    $notes.innerHTML = `<div class="nhead"><span>${String(idx + 1).padStart(2, "0")} · ${s.dataset.title || ""}</span><span>${n && n.dataset.duration ? "≈ " + n.dataset.duration : ""}</span></div>` + notesHTML(idx);
  }

  // overview
  const $ov = document.getElementById("overview");
  function buildOverview() {
    const grid = $ov.querySelector(".grid");
    grid.innerHTML = "";
    slides.forEach((s, i) => {
      const card = document.createElement("div");
      card.className = "card" + (i === idx ? " sel" : "");
      const th = document.createElement("div");
      th.className = "th";
      const rel = `assets/thumbs/${String(i + 1).padStart(2, "0")}.webp`;
      const src = (window.__ASSETS && window.__ASSETS[rel]) || rel; // single-file build inlines thumbnails
      const im = new Image();
      im.onload = () => { th.style.backgroundImage = `url(${src})`; th.textContent = ""; };
      im.src = src;
      th.textContent = s.dataset.title || `Slide ${i + 1}`;
      card.appendChild(th);
      const cap = document.createElement("div");
      cap.className = "cap";
      cap.innerHTML = `<b>${String(i + 1).padStart(2, "0")}</b><span>${s.dataset.title || ""}</span>`;
      card.appendChild(cap);
      card.onclick = () => { toggleOverview(false); go(i); };
      grid.appendChild(card);
    });
  }
  function toggleOverview(force) {
    const open = force ?? !$ov.classList.contains("open");
    if (open) buildOverview();
    $ov.classList.toggle("open", open);
  }

  // fullscreen
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }

  // presenter sync
  function broadcast() {
    if (!channel || idx < 0) return;
    channel.postMessage({
      type: "state", idx, step, steps: stepsOf(idx), total: slides.length,
      title: slides[idx].dataset.title || "", nextTitle: slides[idx + 1]?.dataset.title || "",
      notes: notesHTML(idx), duration: slides[idx].querySelector(".notes")?.dataset.duration || "",
      titles: slides.map((s) => s.dataset.title || ""),
    });
  }
  if (channel) channel.onmessage = (e) => {
    const m = e.data || {};
    if (m.type === "cmd") {
      if (m.cmd === "next") next();
      else if (m.cmd === "prev") prev();
      else if (m.cmd === "goto") go(m.idx);
      else if (m.cmd === "replay") replay();
      else if (m.cmd === "hello") broadcast();
    }
  };

  // autoplay (only when explicitly enabled: ?autoplay=8 or the A key)
  function setAutoplay(sec) {
    autoplay = sec; clearInterval(autoTimer);
    if (sec > 0) autoTimer = setInterval(() => { if (idx < slides.length - 1 || step < stepsOf(idx)) next(); else setAutoplay(0); }, sec * 1000);
  }

  /* ------------------------------------------------------------------ input */
  addEventListener("keydown", (e) => {
    if (!started) { if (["Space", "Enter", "ArrowRight", "KeyF"].includes(e.code)) { e.preventDefault(); begin(e.code === "KeyF"); } return; }
    if (window.Intro && Intro.running) { e.preventDefault(); if (e.code === "KeyF") toggleFullscreen(); else Intro.skip(); return; }
    if ($ov.classList.contains("open") && e.code === "Escape") { toggleOverview(false); return; }
    const k = e.key;
    if (/^[0-9]$/.test(k)) { gotoBuf += k; showGoto(); return; }
    if (k === "Enter" && gotoBuf) { const n = parseInt(gotoBuf, 10); gotoBuf = ""; showGoto(); if (n >= 1) go(n - 1); return; }
    if (k === "Backspace" && gotoBuf) { gotoBuf = gotoBuf.slice(0, -1); showGoto(); return; }
    switch (e.code) {
      case "ArrowRight": case "Space": case "PageDown": case "ArrowDown": e.preventDefault(); next(); break;
      case "ArrowLeft": case "PageUp": case "ArrowUp": e.preventDefault(); prev(); break;
      case "Home": go(0); break;
      case "End": go(slides.length - 1); break;
      case "KeyF": toggleFullscreen(); break;
      case "KeyR": replay(); break;
      case "KeyM": case "KeyO": toggleOverview(); break;
      case "KeyN": $notes.classList.toggle("open"); renderNotes(); break;
      case "KeyP": window.open("presenter.html", "skylark-presenter", "width=1400,height=860"); break;
      case "KeyA": setAutoplay(autoplay ? 0 : parseFloat(qs.get("autoplay")) || 8); break;
      case "KeyH": document.body.classList.toggle("chrome-off"); break;
      case "KeyB": case "Period": document.getElementById("blackout").classList.toggle("on"); break;
      case "Escape": gotoBuf = ""; showGoto(); break;
    }
    renderNotes();
  });
  const $goto = document.getElementById("goto");
  function showGoto() { $goto.textContent = `Go to ${gotoBuf}_`; $goto.classList.toggle("open", !!gotoBuf); }

  // touch + click
  let tx = 0, ty = 0, tt = 0;
  addEventListener("touchstart", (e) => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; tt = Date.now(); }, { passive: true });
  addEventListener("touchend", (e) => {
    if (!started) { begin(false); return; }
    const t = e.changedTouches[0]; const dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); return; }
    if (Date.now() - tt < 300 && Math.abs(dx) < 10) { t.clientX > innerWidth * 0.33 ? next() : prev(); }
  });
  document.getElementById("viewport").addEventListener("click", (e) => {
    if (!started || "ontouchstart" in window) return;
    if (window.Intro && Intro.running) { Intro.skip(); return; }
    if (e.target.closest("a,button,video,.interactive")) return;
    e.clientX > innerWidth * 0.2 ? next() : prev();
  });
  addEventListener("wheel", (() => { let last = 0; return (e) => { if (!started || Date.now() - last < 700 || Math.abs(e.deltaY) < 30) return; last = Date.now(); e.deltaY > 0 ? next() : prev(); }; })(), { passive: true });

  // idle cursor + chrome
  let idleT;
  addEventListener("mousemove", () => { document.body.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add("idle"), 2200); });

  /* ------------------------------------------------------------------ boot */
  function preload(onProgress) {
    const urls = new Set();
    stage.querySelectorAll("img[src]").forEach((i) => urls.add(i.getAttribute("src")));
    (window.PRELOAD || []).forEach((u) => urls.add(u));
    const list = Array.from(urls);
    let done = 0;
    const one = (u) => new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => { done++; onProgress(done / (list.length + 1)); res(); }; im.decoding = "async"; im.src = u; });
    const fonts = Promise.all([
      document.fonts.load('500 40px "Inter Tight"'), document.fonts.load('400 40px "Inter Tight"'), document.fonts.load('300 40px "Inter Tight"'),
      document.fonts.load('600 40px "Inter Tight"'), document.fonts.load('italic 40px "Instrument Serif"'),
      document.fonts.load('40px "Instrument Serif"'), document.fonts.load('400 14px "JetBrains Mono"'), document.fonts.load('500 14px "JetBrains Mono"'),
    ]).catch(() => {});
    return Promise.all([fonts, ...list.map(one)]).then(() => onProgress(1));
  }

  const $gate = document.getElementById("gate");
  let ready = false;
  function begin(fullscreen) {
    if (!ready || started) return;
    started = true;
    document.body.classList.add("started", "idle");
    if (fullscreen) toggleFullscreen();
    $gate.classList.add("gone");
    const fromHash = parseInt(location.hash.slice(1), 10);
    const startAt = !isNaN(fromHash) && fromHash > 1 ? fromHash - 1 : 0;
    if (qs.has("nointro") && startAt === 0) { go(0, { instant: true }); return; }
    go(startAt, { instant: false });
  }

  window.Deck = {
    define(id, c) { controllers[id] = c; },
    go, next, prev, replay, ctx, slides,
    get index() { return idx; }, get step() { return step; },
    setState: (n) => setState(n, true),
    /** used by the export tool: jump to slide i in its final state */
    exportTo(i, n) { started = true; go(i, { instant: true, atStep: n ?? stepsOf(i) }); if (busy) busy.progress(1); },
    stepsOf,
  };

  document.addEventListener("DOMContentLoaded", () => {
    fit();
    if (window.World) World.init(stage, scale);
    if (!window.World || !World.ok) document.body.classList.add("no-webgl");
    fit();
    const bar = $gate.querySelector(".bar i");
    preload((p) => (bar.style.width = `${Math.round(p * 100)}%`)).then(() => {
      ready = true;
      $gate.querySelector(".msg").innerHTML = "<b>Press Space</b> to begin &nbsp;·&nbsp; <b>F</b> for fullscreen";
      if (EXPORT) { started = true; $gate.remove(); document.body.classList.add("started", "chrome-off"); window.__deckReady = true; }
      else if (qs.has("autostart")) begin(false);
    });
    $gate.addEventListener("click", () => begin(false));
    hud();
    if (qs.get("autoplay")) setAutoplay(parseFloat(qs.get("autoplay")) || 8);
  });
})();
