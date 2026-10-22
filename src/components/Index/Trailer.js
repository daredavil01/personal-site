import React from "react";
import SectionHeader from "../common/SectionHeader";

// The 90-second vertical trailer, between the globe and the stats. The files
// are public/video/the-trailer.{mp4,jpg,vtt}, written by
// `npm run trailer -- --publish` (scripts/trailer/render.mjs) and committed.
// preload="none": the homepage costs a poster until someone presses play.

export const TRAILER = "/video/the-trailer";

const Trailer = () => (
  <section>
    <SectionHeader label="The Trailer" />
    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
      <video
        controls
        preload="none"
        playsInline
        poster={`${TRAILER}.jpg`}
        width="720"
        height="1280"
        className="w-full max-w-[300px] h-auto block rounded-3xl shadow-xl bg-stone-900 shrink-0"
        aria-label="The site in 90 seconds: a vertical trailer with music and on-screen titles"
      >
        <source src={`${TRAILER}.mp4`} type="video/mp4" />
        <track kind="captions" src={`${TRAILER}.vtt`} srcLang="en" label="English (on-screen text)" />
      </video>
      <div className="max-w-md">
        <p className="font-headline text-3xl md:text-4xl font-black text-stone-900 dark:text-stone-100 leading-tight tracking-tight mb-4">
          The whole site in 90 seconds.
        </p>
        <p className="font-body text-lg text-stone-600 dark:text-stone-300 leading-relaxed mb-4">
          The Atlas, the numbers, the races and forts, the books and the
          Logbook, the archive you can ask, the workshop and the web of tags —
          cut to its own beat, from the pages as they are today.
        </p>
        <p className="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 dark:text-stone-500">
          Vertical · sound on · made for sharing
        </p>
      </div>
    </div>
  </section>
);

export default Trailer;
