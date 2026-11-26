import React from "react";
import { Composition, Still } from "remotion";
import { Film } from "./Film";
import { Thumbnail } from "./Thumbnail";
import { TL } from "./lib/time";
import { loadFonts } from "./lib/fonts";

loadFonts();

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SkylarkFilm" component={Film} durationInFrames={Math.ceil(TL.total * 30)} fps={30} width={1920} height={1080} defaultProps={{ subtitles: false }} />
    <Composition id="SkylarkFilmSubtitled" component={Film} durationInFrames={Math.ceil(TL.total * 30)} fps={30} width={1920} height={1080} defaultProps={{ subtitles: true }} />
    <Still id="Thumbnail" component={Thumbnail} width={1920} height={1080} />
  </>
);
