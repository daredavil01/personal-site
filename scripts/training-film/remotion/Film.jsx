import React from "react";
import {
  AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame,
} from "remotion";
import { Caption, Grain, Sky } from "./parts";
import { C } from "./theme";
import Pulse from "./scenes/Pulse";
import Pile from "./scenes/Pile";
import Light from "./scenes/Light";
import Calendar from "./scenes/Calendar";
import Day from "./scenes/Day";
import Numbers from "./scenes/Numbers";
import Modes from "./scenes/Modes";
import Finale from "./scenes/Finale";

// The film: eight scenes laid end to end on the timeline render.mjs measured
// around the narration. Each scene runs a few frames past its cut so the next
// one can enter over its exit; the music ducks under every spoken line.

const SCENES = {
  pulse: Pulse, pile: Pile, light: Light, calendar: Calendar, day: Day, numbers: Numbers, modes: Modes, finale: Finale,
};
const TINT = {
  pulse: "#1a1030", pile: "#10203a", light: "#0d1a2e", calendar: "#1a1424", day: "#14213a", numbers: "#201a10", modes: "#101c30", finale: "#1a1030",
};
const OVERLAP = 8;

// Each scene's own light behind it, faded in and out with the scene.
const Glow = ({ tint, dur }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 12, dur - 10, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o, background: `radial-gradient(110% 70% at 50% 15%, ${tint} 0%, transparent 70%)` }} />;
};

const Film = ({ data, tl }) => {
  if (!data || !tl) return <AbsoluteFill style={{ background: C.bg }} />;
  const duck = (f) => {
    const speaking = tl.scenes.some(({ line }) => f >= line.from - 4 && f <= line.from + line.dur + 4);
    return speaking ? 0.42 : 0.85;
  };
  // Smooth the duck over a few frames so it breathes instead of clicking.
  const volume = (f) => {
    let v = 0;
    for (let k = -4; k <= 4; k += 1) v += duck(f + k);
    const fadeIn = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" });
    return (v / 9) * fadeIn;
  };
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sky />
      {tl.scenes.map((s) => {
        const Scene = SCENES[s.id];
        const last = s === tl.scenes[tl.scenes.length - 1];
        const dur = s.dur + (last ? 0 : OVERLAP);
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={dur} name={s.id}>
            <Glow tint={TINT[s.id]} dur={dur} />
            <Scene data={data} dur={dur} last={last} scene={s} />
          </Sequence>
        );
      })}
      {tl.scenes.map(({ id, line }) => (
        <Sequence key={`v-${id}`} from={line.from} durationInFrames={line.dur + 12} name={`voice ${id}`}>
          <Audio src={staticFile(line.src)} volume={1} />
          <Caption text={line.text} dur={line.dur} />
        </Sequence>
      ))}
      <Audio src={staticFile("score.wav")} volume={volume} />
      <Grain />
    </AbsoluteFill>
  );
};

export default Film;
