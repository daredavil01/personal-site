import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { f, FPS, T } from "./timeline";
import { SPOTS } from "./data";
import { Intro } from "./scenes/Intro";
import { Numbers } from "./scenes/Numbers";
import { Spotlight } from "./scenes/Spotlight";
import { Ask } from "./scenes/Ask";
import { Outro } from "./scenes/Outro";

// [component, from, until, props] in seconds. Each scene glitches itself in,
// so neighbours only need to touch.
const SCENES = [
  [Intro, 0, T.stats],
  [Numbers, T.stats, T.vtbm],
  ...SPOTS.map((s, index) => [Spotlight, s.at, s.until, { index }]),
  [Ask, T.ask, T.outro],
  [Outro, T.outro, T.end],
];

export const Film = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SCENES.map(([Scene, from, until, props]) => (
      <Sequence key={from} from={f(from)} durationInFrames={f(until) - f(from)}>
        <Scene start={f(from) / FPS} {...props} />
      </Sequence>
    ))}
    <Audio src={staticFile("score.wav")} />
  </AbsoluteFill>
);
