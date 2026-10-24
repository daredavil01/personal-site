import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { f, FPS, T } from "./timeline";
import { Globe } from "./scenes/Globe";
import { PhotoWall } from "./scenes/PhotoWall";
import { Paper } from "./scenes/Paper";
import { Stats } from "./scenes/Stats";
import { Interactive } from "./scenes/Interactive";
import { Default } from "./scenes/Default";
import { Outro } from "./scenes/Outro";

// [component, mounted from, until] in seconds. Each scene brings its own
// entrance (a wipe or a slide), so they overlap by a few hundred ms.
const SCENES = [
  [Globe, 0, T.drop + 0.05],
  [PhotoWall, T.drop - 0.05, T.paper + 0.4],
  [Paper, T.paper - 0.4, T.stats + 0.3],
  [Stats, T.stats - 0.4, T.interactive + 0.3],
  [Interactive, T.interactive - 0.4, T.default + 0.3],
  [Default, T.default - 0.4, T.outro + 0.1],
  [Outro, T.outro - 0.4, T.end],
];

export const Film = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SCENES.map(([Scene, from, until]) => (
      <Sequence key={from} from={f(from)} durationInFrames={f(until) - f(from)}>
        <Scene start={f(from) / FPS} />
      </Sequence>
    ))}
    <Audio src={staticFile("score.wav")} />
  </AbsoluteFill>
);
