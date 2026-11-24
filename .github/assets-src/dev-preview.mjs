// node dev-preview.mjs <svg> <w> <h> <out-prefix> t1 t2 ...   (development aid: contact sheet of moments)
import { launch, openSvg, seek } from "./lib/browser.mjs";
const [, , file, w, h, prefix, ...times] = process.argv;
const b = await launch();
const page = await openSvg(b, file, { width: +w, height: +h });
for (const t of times) { await seek(page, +t); await page.screenshot({ path: `${prefix}-${t}.png` }); }
await b.close();
