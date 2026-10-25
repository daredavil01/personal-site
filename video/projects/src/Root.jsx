import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { f, FPS, T } from "./timeline";

export const Root = () => (
  <Composition id="Projects" component={Film} durationInFrames={f(T.end)} fps={FPS} width={1080} height={1920} />
);
