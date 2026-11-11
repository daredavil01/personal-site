import React from "react";
import {
  AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame,
} from "remotion";
import { Caption, Room } from "./kit";
import { C } from "./theme";
import {
  Anatomy, Arrange, Count, Covers, Filter, Finale, Hook, Lenses, Pull, Reach, Shells,
} from "./scenes";

// "The Reading Room": eleven scenes laid end to end on the timeline render.mjs
// measured around the narration. Each scene runs a few frames past its cut so
// the next can enter over its exit; the music ducks under every spoken line.

const SCENES = {
  hook: Hook, count: Count, anatomy: Anatomy, reach: Reach, arrange: Arrange, filter: Filter, covers: Covers, pull: Pull, lenses: Lenses, shells: Shells, finale: Finale,
};
const OVERLAP = 10;
const BEAT = 60 / 90;

// A scene fades in over the last one, and out as the next arrives.
const Fade = ({ dur, last, children }) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [0, OVERLAP], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const b = last ? 1 : interpolate(frame, [dur - OVERLAP, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lift = interpolate(frame, [dur - OVERLAP, dur], [0, -40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: Math.min(a, b), transform: last ? undefined : `translateY(${lift}px)` }}>{children}</AbsoluteFill>;
};

const Film = ({ data, tl, clips }) => {
  if (!data || !tl) return <AbsoluteFill style={{ background: C.bg }} />;
  const sec = (f) => f / tl.fps;
  const count = tl.scenes.find((s) => s.id === "count");
  const shells = tl.scenes.find((s) => s.id === "shells");
  // The lamp pulses on the beat while the kit plays (score.mjs's drop).
  const beat = count ? {
    from: Math.ceil(sec(count.from) / BEAT) * BEAT - 0.001, to: shells ? sec(shells.from) : sec(tl.frames), period: BEAT,
  } : null;
  const duck = (f) => {
    const speaking = tl.scenes.some(({ line }) => f >= line.from - 4 && f <= line.from + line.dur + 4);
    return speaking ? 0.3 : 0.72;
  };
  const volume = (f) => {
    let v = 0;
    for (let k = -5; k <= 5; k += 1) v += duck(f + k);
    return (v / 11) * interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  };
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Room beat={beat} />
      {tl.scenes.map((s, i) => {
        const Scene = SCENES[s.id];
        const last = i === tl.scenes.length - 1;
        const dur = s.dur + (last ? 0 : OVERLAP);
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={dur} name={s.id}>
            <Fade dur={dur} last={last}>
              <Scene data={data} scene={s} clips={clips} dur={dur} />
            </Fade>
          </Sequence>
        );
      })}
      {tl.scenes.map(({ id, line }) => (
        <Sequence key={`v-${id}`} from={line.from} durationInFrames={line.dur + 14} name={`voice ${id}`}>
          <Audio src={staticFile(line.src)} volume={1} />
          <Caption words={line.words} dur={line.dur} />
        </Sequence>
      ))}
      <Audio src={staticFile("score.wav")} volume={volume} />
    </AbsoluteFill>
  );
};

export default Film;
