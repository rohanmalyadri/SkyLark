// Bundles the whole deck into one self-contained HTML file (fonts, scripts, images, video inlined).
//   node presentation/tools/build-single.mjs   ->  presentation/dist/skylark-presentation.html
// The presenter view needs its own window, so in the single file use N for the notes panel instead.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".mp4": "video/mp4" };
const read = (p) => fs.readFileSync(path.join(ROOT, p));
const dataUri = (p) => `data:${MIME[path.extname(p)]};base64,${read(p).toString("base64")}`;
const inlineUrls = (text) => text.replace(/(["'(])((?:\.\.\/)?assets\/[^"')\s]+)/g, (m, q, p) => q + dataUri(p.replace(/^\.\.\//, "")));

let html = read("index.html").toString();
html = html.replace(/<link rel="stylesheet" href="([^"]+)"\s*\/?>/g, (m, href) => `<style>\n${inlineUrls(read(href).toString())}\n</style>`);
const thumbs = fs.readdirSync(path.join(ROOT, "assets/thumbs")).filter((f) => f.endsWith(".webp"));
const assets = Object.fromEntries(thumbs.map((f) => [`assets/thumbs/${f}`, dataUri(`assets/thumbs/${f}`)]));
const safe = (js) => js.replace(/<\/script/gi, "<\\/script");
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => `<script>\n${safe(read(src).toString())}\n</script>`);
html = inlineUrls(html);
const left = html.match(/(["'(])assets\/[^"')\s]+/g);
if (left) throw new Error("unresolved asset references: " + left.join(", "));
// Added last so its keys stay as relative paths.
html = html.replace("<script>", `<script>window.__ASSETS = ${JSON.stringify(assets)};</script>\n<script>`);
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
const out = path.join(ROOT, "dist/skylark-presentation.html");
fs.writeFileSync(out, html);
console.log(out, (fs.statSync(out).size / 1e6).toFixed(1) + " MB");
