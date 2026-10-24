import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { f, FPS, T } from "./timeline";

// One film, two shapes: scenes read the frame size and lay themselves out.
export const Root = () => (
  <>
    <Composition id="Marathons" component={Film} durationInFrames={f(T.end)} fps={FPS} width={1920} height={1080} />
    <Composition id="MarathonsVertical" component={Film} durationInFrames={f(T.end)} fps={FPS} width={1080} height={1920} />
  </>
);
