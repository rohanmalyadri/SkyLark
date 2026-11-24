import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "./lib/theme";
import { FilmFinish } from "./lib/ui";
import { sceneWin, useT, SceneName } from "./lib/time";
import captions from "./data/captions.json";
import { Hook } from "./scenes/Hook";
import { Problem } from "./scenes/Problem";
import { Reveal } from "./scenes/Reveal";
import { Product } from "./scenes/Product";
import { Pipeline } from "./scenes/Pipeline";
import { Engine } from "./scenes/Engine";
import { Arch } from "./scenes/Arch";
import { Results } from "./scenes/Results";
import { Close } from "./scenes/Close";

const SCENES: [SceneName, React.FC][] = [
  ["hook", Hook],
  ["problem", Problem],
  ["reveal", Reveal],
  ["product", Product],
  ["pipeline", Pipeline],
  ["engine", Engine],
  ["arch", Arch],
  ["results", Results],
  ["close", Close],
];

const Subtitles: React.FC<{ t: number }> = ({ t }) => {
  const c = (captions as { start: number; end: number; text: string }[]).find((x) => t >= x.start && t <= x.end + 0.05);
  if (!c) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: F.display, fontSize: 40, fontWeight: 500, color: "#fff", background: "rgba(0,0,0,0.62)", padding: "8px 22px", borderRadius: 10, maxWidth: 1500, textAlign: "center", lineHeight: 1.25 }}>{c.text}</div>
    </div>
  );
};

export const Film: React.FC<{ subtitles: boolean }> = ({ subtitles }) => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {SCENES.map(([name, Comp]) => {
        const [a, b] = sceneWin(name);
        if (t < a || t > b) return null;
        return <Comp key={name} />;
      })}
      <FilmFinish />
      {subtitles && <Subtitles t={t} />}
    </AbsoluteFill>
  );
};
