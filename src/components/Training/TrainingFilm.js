import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

// The 60-second vertical film about this page, rendered with Remotion from
// the live log (scripts/training-film/, `npm run training:film -- --publish`)
// and committed as public/video/the-training-story.{mp4,jpg,vtt,json}.
// preload="none": the page costs a poster until someone presses play. The
// chapter chips jump the film to a scene (and start it).

export const FILM = "/video/the-training-story";

const TrainingFilm = ({ dark }) => {
  const ref = useRef(null);
  const [chapters, setChapters] = useState([]);
  const [now, setNow] = useState(-1);

  useEffect(() => {
    let live = true;
    fetch(`${FILM}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j?.chapters) setChapters(j.chapters); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const jump = (t) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = t;
    v.play().catch(() => {});
  };
  const onTime = () => {
    const t = ref.current?.currentTime ?? 0;
    setNow(chapters.reduce((acc, c, k) => (t >= c.t ? k : acc), -1));
  };

  const muted = dark ? "var(--tr-muted)" : undefined;
  const idle = dark
    ? "border-white/15 text-slate-300 hover:border-white/40 bg-transparent"
    : "border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-secondary bg-transparent";
  return (
    <figure className="m-0 w-full max-w-[240px] mx-auto md:mx-0 shrink-0">
      <video
        ref={ref}
        controls
        preload="none"
        playsInline
        poster={`${FILM}.jpg`}
        width="720"
        height="1280"
        onTimeUpdate={onTime}
        className="w-full h-auto block rounded-2xl shadow-2xl bg-[#0b1220] ring-1 ring-white/10"
        aria-label="This page in 60 seconds: a narrated film"
      >
        <source src={`${FILM}.mp4`} type="video/mp4" />
        <track kind="captions" src={`${FILM}.vtt`} srcLang="en" label="English (narration)" />
      </video>
      <figcaption className="mt-3">
        <span className={`block font-label text-[10px] uppercase tracking-[0.2em] font-bold ${dark ? "" : "text-stone-400 dark:text-stone-500"}`} style={{ color: muted }}>
          The page in 60 s · sound on
        </span>
        {chapters.length > 0 && (
          <span className="flex flex-wrap gap-1 mt-2" role="group" aria-label="Film chapters">
            {chapters.map((c, k) => (
              <button
                key={c.t}
                type="button"
                onClick={() => jump(c.t)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-label border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${k === now ? "bg-secondary text-white border-secondary" : idle}`}
              >
                {c.title}
              </button>
            ))}
          </span>
        )}
      </figcaption>
    </figure>
  );
};

TrainingFilm.propTypes = { dark: PropTypes.bool };
TrainingFilm.defaultProps = { dark: false };

export default TrainingFilm;
