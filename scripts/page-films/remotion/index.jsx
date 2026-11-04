import React from "react";
import { Composition, registerRoot } from "remotion";
import PageFilm from "./Film";
import { loadFonts } from "./kit";
import { TOTAL } from "../script";

// The seven page films, one composition reading `film` from inputProps:
// 1080×1920 at 30 fps, 30 seconds. render.mjs passes { film, data, name, route }.

loadFonts();

const Root = () => (
  <Composition
    id="PageFilm"
    component={PageFilm}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={TOTAL}
    defaultProps={{ film: "about", data: null, name: "", route: "" }}
  />
);

registerRoot(Root);
