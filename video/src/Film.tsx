import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "./lib/theme";
import { FilmFinish } from "./lib/ui";
import { sceneWin, useT, SceneName, SCENE_ORDER, tw, EO } from "./lib/time";
import captions from "./data/captions.json";
import { Cold } from "./scenes/Cold";
import { Hook } from "./scenes/Hook";
import { Interrupts, INTERRUPTS } from "./scenes/Interrupts";
import { Problem } from "./scenes/Problem";
import { Reveal } from "./scenes/Reveal";
import { Product } from "./scenes/Product";
import { Pipeline } from "./scenes/Pipeline";
import { Engine } from "./scenes/Engine";
import { Arch } from "./scenes/Arch";
import { Results } from "./scenes/Results";
import { Close } from "./scenes/Close";

const SCENES: [SceneName, React.FC][] = [
  ["cold", Cold],
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
  // Punch-in on every cut: scene starts and the moment each interrupt card lets go.
  const cuts = [...SCENE_ORDER.slice(1).map((n) => sceneWin(n)[0] + 0.05), ...INTERRUPTS.map((x) => x.b)];
  const since = Math.min(...cuts.map((c) => (t >= c ? t - c : 99)));
  const punch = since < 0.45 ? 1 - tw(since, 0, 0.45, 0, 1, EO) : 0;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill style={{ scale: `${1 + 0.05 * punch}` }}>
        {SCENES.map(([name, Comp]) => {
          const [a, b] = sceneWin(name);
          if (t < a || t > b) return null;
          return <Comp key={name} />;
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: since < 0.1 ? 0.22 * (1 - since / 0.1) : 0, pointerEvents: "none" }} />
      <Interrupts t={t} />
      <FilmFinish />
      {subtitles && <Subtitles t={t} />}
    </AbsoluteFill>
  );
};
