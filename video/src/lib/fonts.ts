import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const faces: [string, string, string, "normal" | "italic"][] = [
  ["Inter Tight", "inter-tight-latin-300-normal.woff2", "300", "normal"],
  ["Inter Tight", "inter-tight-latin-400-normal.woff2", "400", "normal"],
  ["Inter Tight", "inter-tight-latin-500-normal.woff2", "500", "normal"],
  ["Inter Tight", "inter-tight-latin-600-normal.woff2", "600", "normal"],
  ["Inter Tight", "inter-tight-latin-700-normal.woff2", "700", "normal"],
  ["Instrument Serif", "instrument-serif-latin-400-normal.woff2", "400", "normal"],
  ["Instrument Serif", "instrument-serif-latin-400-italic.woff2", "400", "italic"],
  ["JetBrains Mono", "jetbrains-mono-latin-400-normal.woff2", "400", "normal"],
  ["JetBrains Mono", "jetbrains-mono-latin-500-normal.woff2", "500", "normal"],
];

let loaded = false;
export const loadFonts = () => {
  if (loaded) return;
  loaded = true;
  for (const [family, file, weight, style] of faces) {
    loadFont({ family, url: staticFile(`fonts/${file}`), weight, style });
  }
};
