import React from "react";

// The 90-second vertical film about this page: from orbit down to Pune, the
// channel's back-story, the page itself and the sync that fills it. The files
// are public/video/the-videos-story.{mp4,jpg,vtt}, written by
// `npm run videos:film -- --publish` (scripts/videos-film/render.mjs) and
// committed. preload="none": the page costs a poster until someone presses play.

export const STORY = "/video/the-videos-story";

const Story = () => (
  <figure className="shrink-0 w-full max-w-[220px] md:max-w-[240px] m-0">
    <video
      controls
      preload="none"
      playsInline
      poster={`${STORY}.jpg`}
      width="720"
      height="1280"
      className="w-full h-auto block rounded-2xl shadow-xl bg-stone-900"
      aria-label="How this page came to be: a 90-second narrated film"
    >
      <source src={`${STORY}.mp4`} type="video/mp4" />
      <track kind="captions" src={`${STORY}.vtt`} srcLang="en" label="English (narration)" />
    </video>
    <figcaption className="mt-3 font-label text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 dark:text-stone-500">
      The story · 90 s · sound on
    </figcaption>
  </figure>
);

export default Story;
