import React from "react";

// The 60-second vertical film about this page: every project's cover popping
// onto the screen, the numbers, the toolkit, seven spotlights recorded on a
// phone, /ask answering about them, and an open door for collaborators. The
// files are public/video/the-projects-story.{mp4,jpg}, rendered by the
// Remotion project in video/projects (`npm run render`, then `npm run web`)
// and committed. Music and sound only, no narration, so there is no caption
// track. preload="none": the page costs a poster until someone presses play.

export const STORY = "/video/the-projects-story";

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
      aria-label="Sixty-second film of the projects: the numbers, the tools, and seven projects shown on a phone, from a birding marathon and NGO websites to data stories, a game and this site"
    >
      <source src={`${STORY}.mp4`} type="video/mp4" />
    </video>
    <figcaption className="mt-3 font-label text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 dark:text-stone-500">
      The tour · 60 s · sound on
    </figcaption>
  </figure>
);

export default Story;
