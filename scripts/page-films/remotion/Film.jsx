import React from "react";
import {
  AbsoluteFill, Audio, Sequence, staticFile,
} from "remotion";
import { OVERLAP, buildFilm } from "../script";
import {
  Captions, Chrome, Grain, SceneEnter, Vignette,
} from "./kit";
import { SCENES } from "./scenes";

// One page film: the scenes from script.js laid end to end, each sliding in
// over the last by OVERLAP frames, under the burned-in captions, the progress
// rail and the address, over one audio track (music + every sound cue,
// mixed by render.mjs from the same script).

const PageFilm = ({ film, data, name, route }) => {
  if (!data) return <AbsoluteFill style={{ background: "#000" }} />;
  const plan = buildFilm(film, data);
  const th = plan.theme;
  return (
    <AbsoluteFill style={{ background: th.bg }}>
      {plan.scenes.map((s) => {
        const Scene = SCENES[s.type];
        const dur = s.dur + (s.last ? 0 : OVERLAP);
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={dur} name={s.id}>
            <SceneEnter variant={s.enter} dur={dur} last={s.last} bg={th.bg}>
              <Scene s={{ ...s, dur: s.dur }} th={th} />
            </SceneEnter>
          </Sequence>
        );
      })}
      <Vignette dark={th.dark} />
      <Grain amount={th.grain} />
      <Chrome th={th} name={name} route={route} total={plan.frames} />
      <Captions th={th} captions={plan.captions} />
      <Audio src={staticFile(`${film}.wav`)} />
    </AbsoluteFill>
  );
};

export default PageFilm;
