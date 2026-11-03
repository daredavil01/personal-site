import React from "react";
import { Composition, registerRoot } from "remotion";
import Film from "./Film";
import { loadFonts } from "./theme";

// The /training film: 1080×1920 at 30 fps. Every number and every timing
// arrives as inputProps from ../render.mjs (props.json), so the composition
// is pure presentation.

loadFonts();

const Root = () => (
  <Composition
    id="TrainingFilm"
    component={Film}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={1800}
    defaultProps={{ data: null, tl: null }}
    calculateMetadata={({ props }) => ({ durationInFrames: props.tl?.frames || 1800 })}
  />
);

registerRoot(Root);
