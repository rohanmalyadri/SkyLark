// Brand files, the closing banner and the section divider.

import { C, EASE, LOCKUP_BOX, MARK_BOX, MARK_SHARDS, backdrop, corners, lockup, mark, outline, r2, rng, shardPoints, svgDoc, write } from "../lib/core.mjs";

export function buildBrand() {
  const pad = 24;
  const box = `${LOCKUP_BOX.x - pad} ${LOCKUP_BOX.y - pad} ${LOCKUP_BOX.w + pad * 2} ${LOCKUP_BOX.h + pad * 2}`;
  const wrap = (vb, inner, title) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${title}"><title>${title}</title>${inner}</svg>\n`;
  write("brand/skylark-logo.svg", wrap(box, lockup({ wordFill: C.ink }), "Skylark"));
  write("brand/skylark-logo-on-dark.svg", wrap(box, lockup({ wordFill: C.paper }), "Skylark"));
  const mb = `${MARK_BOX.x - pad} ${MARK_BOX.y - pad} ${MARK_BOX.w + pad * 2} ${MARK_BOX.h + pad * 2}`;
  write("brand/skylark-mark.svg", wrap(mb, mark(), "Skylark mark"));
}

/** Closing banner: the mark takes flight along a contour, with the credits. 10 s loop. */
export function buildFooter() {
  const W = 1600;
  const H = 420;
  const T = 10;
  const bd = backdrop({ w: W, h: H, id: "f", grid: 40, glow: [0.5, 0.2], glowOpacity: 0.13, radius: 28 });
  const rand = rng(5);

  // Flight trail: a long, lazy S that ends at the mark.
  const trail = "M -40 330 C 260 330, 380 220, 620 232 S 900 250, 760 168";
  const markS = 0.5;
  const mx = 800 - (MARK_BOX.x + MARK_BOX.w / 2) * markS;
  const my = 150 - (MARK_BOX.y + MARK_BOX.h / 2) * markS;

  let particles = "";
  for (let i = 0; i < 36; i++) {
    const x = r2(rand() * W), y = r2(40 + rand() * 340), r = r2(0.6 + rand() * 1.2), tw = r2(2 + rand() * 5);
    particles += `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.paper}" style="animation: tw ${tw}s ${EASE.inOut} ${-r2(rand() * tw)}s infinite"/>`;
  }

  // contour lines (like the site's procedural contour art)
  let contours = "";
  for (let i = 0; i < 9; i++) {
    const y = 300 + i * 16;
    const amp = 18 + i * 4;
    contours += `<path d="M -20 ${y} C 300 ${y - amp}, 520 ${y + amp}, 800 ${y - amp * 0.4} S 1300 ${y + amp}, 1620 ${y - amp * 0.6}" fill="none" stroke="#FFFFFF" stroke-opacity="${r2(0.035 + i * 0.006)}"/>`;
  }

  const l1 = outline("Built by Team Synapse X", { family: "display", weight: 500, size: 30, x: 800, y: 286, anchor: "middle", tracking: -0.01 });
  const l2 = outline("An Obscuron X Labs product", { family: "serifItalic", size: 28, x: 800, y: 324, anchor: "middle" });
  const l3 = outline("WWW.SKYLARKGO.IN   ·   MIT LICENSE   ·   2026", { family: "mono", weight: 500, size: 12.5, x: 800, y: 372, anchor: "middle", tracking: 0.26 });

  const css = `
@keyframes tw { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.8; } }
@keyframes trail { 0% { stroke-dashoffset: 1300; opacity: 0; } 8% { opacity: 1; } 45% { stroke-dashoffset: 0; opacity: 1; } 80% { stroke-dashoffset: 0; opacity: 0.35; } 100% { stroke-dashoffset: 0; opacity: 0; } }
.trail { stroke-dasharray: 1300; animation: trail ${T}s ${EASE.inOut} infinite both; }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.bob { animation: bob 5s ${EASE.inOut} infinite; }
${MARK_SHARDS.map((_, i) => `@keyframes fs${i} { 0%, ${30 + i * 3}% { transform: translate(${[-14, -8, 12][i]}px, ${[-8, 10, -10][i]}px); opacity: 0.0; } ${44 + i * 3}% { transform: none; opacity: 1; } 92% { transform: none; opacity: 1; } 100% { transform: translate(${[-14, -8, 12][i]}px, ${[-8, 10, -10][i]}px); opacity: 0; } }
.fs${i} { transform-box: fill-box; transform-origin: center; animation: fs${i} ${T}s ${EASE.back} infinite both; }`).join("\n")}
@keyframes spark { 0%, 40% { opacity: 0; } 46% { opacity: 1; } 100% { opacity: 0; } }
`;

  const body = `<g clip-path="${bd.clip}">
${bd.body}
${contours}
${particles}
<path class="trail" d="${trail}" fill="none" stroke="url(#trailGrad)" stroke-width="1.4" stroke-linecap="round"/>
<g class="bob"><g transform="translate(${r2(mx)} ${r2(my)}) scale(${markS})">${MARK_SHARDS.map((p, i) => `<polygon class="fs${i}" points="${shardPoints(p)}" fill="${C.ember}"/>`).join("")}</g></g>
<path d="${l1.d}" fill="${C.paper}"/>
<path d="${l2.d}" fill="${C.amber}"/>
<rect x="760" y="346" width="80" height="1" fill="url(#ruleG)"/>
<path d="${l3.d}" fill="${C.dim}"/>
${corners(W, H, 30, 12)}
${bd.frame}
</g>`;
  const defs = `${bd.defs}
<linearGradient id="trailGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.ember}" stop-opacity="0"/><stop offset="0.7" stop-color="${C.ember}" stop-opacity="0.6"/><stop offset="1" stop-color="${C.amber}"/></linearGradient>
<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.ember}" stop-opacity="0"/><stop offset="0.5" stop-color="${C.ember}"/><stop offset="1" stop-color="${C.ember}" stop-opacity="0"/></linearGradient>`;
  write("banners/footer.svg", svgDoc({ w: W, h: H, title: "Skylark", desc: "Closing banner: the Skylark mark assembles at the end of a flight trail. Built by Team Synapse X, an Obscuron X Labs product.", defs, style: css, body }));
}

/** Section divider: a hairline that reads on GitHub's light and dark themes, with a travelling light. */
export function buildDivider() {
  const W = 1600;
  const H = 36;
  const markS = 0.085;
  const mx = 800 - (MARK_BOX.x + MARK_BOX.w / 2) * markS;
  const my = 18 - (MARK_BOX.y + MARK_BOX.h / 2) * markS;
  const css = `
@keyframes pulseL { 0% { transform: translateX(760px); opacity: 0; } 10% { opacity: 1; } 70% { opacity: 0.9; } 100% { transform: translateX(0); opacity: 0; } }
@keyframes pulseR { 0% { transform: translateX(-760px); opacity: 0; } 10% { opacity: 1; } 70% { opacity: 0.9; } 100% { transform: translateX(0); opacity: 0; } }
.pl { animation: pulseL 6s ${EASE.inOut} infinite; }
.pr { animation: pulseR 6s ${EASE.inOut} infinite; }`;
  const defs = `
<linearGradient id="lineL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A919C" stop-opacity="0"/><stop offset="1" stop-color="#8A919C" stop-opacity="0.55"/></linearGradient>
<linearGradient id="lineR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A919C" stop-opacity="0.55"/><stop offset="1" stop-color="#8A919C" stop-opacity="0"/></linearGradient>
<linearGradient id="pulse" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.ember}" stop-opacity="0"/><stop offset="0.5" stop-color="${C.ember}"/><stop offset="1" stop-color="${C.ember}" stop-opacity="0"/></linearGradient>`;
  const body = `
<rect x="40" y="17.5" width="720" height="1" fill="url(#lineL)"/>
<rect x="840" y="17.5" width="720" height="1" fill="url(#lineR)"/>
<rect class="pl" x="0" y="17" width="120" height="2" fill="url(#pulse)"/>
<rect class="pr" x="1480" y="17" width="120" height="2" fill="url(#pulse)"/>
<g transform="translate(${r2(mx)} ${r2(my)}) scale(${markS})">${mark()}</g>`;
  write("diagrams/divider.svg", svgDoc({ w: W, h: H, title: "Section divider", desc: "A thin rule with the Skylark mark at its centre.", defs, style: css, body }));
}
