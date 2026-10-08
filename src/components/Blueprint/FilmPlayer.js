import React, { useEffect, useRef, useState } from "react";

// Sheet A-07: the same six sheets, animated, as one film. The video and its
// sidecars live in public/video/, written by
// `npm run blueprint:film -- --publish`: the MP4, a JPEG poster, WebVTT
// captions, and a JSON list of where each sheet's chapter starts. The chapter
// buttons come from that JSON, so a re-render that moves them needs no code
// change; if it cannot be read the player simply has no chapter list.
//
// preload="none": a phone opening /blueprint downloads the poster, not the film.

export const FILM = "/video/the-blueprint";

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const FilmPlayer = () => {
  const video = useRef(null);
  const [meta, setMeta] = useState(null);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(`${FILM}.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (alive) setMeta(json); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const chapters = (meta && meta.chapters) || [];

  const seek = (start) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = start;
    const playing = v.play();
    if (playing && playing.catch) playing.catch(() => {});
  };

  const onTime = () => {
    const t = video.current ? video.current.currentTime : 0;
    const now = chapters.filter((c) => c.start <= t + 0.05).pop();
    setCurrent(now ? now.sheet : null);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start">
      <video
        ref={video}
        controls
        preload="none"
        playsInline
        poster={`${FILM}.jpg`}
        width="1080"
        height="1080"
        onTimeUpdate={onTime}
        className="w-full h-auto block border bp-rule"
        aria-label="The Blueprint, the film: all six sheets animated"
      >
        <source src={`${FILM}.mp4`} type="video/mp4" />
        <track kind="captions" src={`${FILM}.vtt`} srcLang="en" label="English" />
      </video>

      <div className="flex flex-col gap-4 min-w-0">
        {chapters.length > 0 && (
          <div>
            <p className="bp-mono text-[10px] uppercase tracking-[0.2em] bp-ink mb-1.5">Chapters</p>
            <ol className="list-none p-0 m-0 flex flex-col gap-1.5">
              {chapters.map((c) => (
                <li key={c.sheet}>
                  <button
                    type="button"
                    aria-pressed={current === c.sheet}
                    onClick={() => seek(c.start)}
                    className="bp-chip bp-chip-red w-full flex items-baseline gap-3 px-3 py-2 text-left"
                  >
                    <span className="bp-mono text-[10px] uppercase tracking-wider shrink-0">{c.sheet}</span>
                    <span className="font-body text-sm flex-1">{c.title}</span>
                    <span className="bp-mono text-[11px] shrink-0">{clock(c.start)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
        <p className="font-body text-sm bp-soft m-0">
          Each sheet is drawn and animated frame by frame from the same code and the same live
          numbers as the page above, with the site&apos;s own Workshop soundtrack. Captions are
          burned in, so it reads with the sound off.
          {meta && meta.rendered ? ` Rendered ${meta.rendered}${meta.rev ? ` at ${meta.rev}` : ""}.` : ""}
        </p>
        <a
          href={`${FILM}.mp4`}
          download
          className="bp-chip bp-mono text-[11px] uppercase tracking-wider px-3 py-1.5 self-start no-underline"
        >
          Download the film ↓
        </a>
      </div>
    </div>
  );
};

export default FilmPlayer;
