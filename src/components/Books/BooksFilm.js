import React, { useEffect, useRef, useState } from "react";

// The Reading Room's launch film: 60 seconds, vertical, narrated in an Indian
// English voice over a lo-fi beat, rendered with Remotion from the live table
// and screen recordings of this page (scripts/books-film/,
// `npm run books:film -- --publish`), committed as
// public/video/the-books-story.{mp4,jpg,vtt,json}. preload="none": the page
// costs a poster until someone presses play. The chapter chips jump the film
// to a scene (and start it).

export const FILM = "/video/the-books-story";

const BooksFilm = () => {
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

  return (
    <section className="bk-film" aria-labelledby="bk-film-title">
      <video
        ref={ref}
        controls
        preload="none"
        playsInline
        poster={`${FILM}.jpg`}
        width="720"
        height="1280"
        onTimeUpdate={onTime}
        className="bk-film__video"
        aria-label="The Reading Room in 60 seconds: a narrated film of this page"
      >
        <source src={`${FILM}.mp4`} type="video/mp4" />
        <track kind="captions" src={`${FILM}.vtt`} srcLang="en" label="English (narration)" />
      </video>
      <div className="bk-film__text">
        <p className="bk-eyebrow">The film · 60 s · sound on</p>
        <h2 id="bk-film-title" className="bk-film__title">
          A modern,
          {" "}
          <em>digital bookshelf.</em>
        </h2>
        <p className="bk-lead">
          Every book drops onto the shelf, the library is weighed and measured, one spine is held
          up to the lamp, and then the page itself, recorded on a phone: spines tipping out, the
          shelf re-arranging six ways, filters dimming, a wall of covers, a book pulled at random,
          the five lenses, by day and after dark.
        </p>
        {chapters.length > 0 && (
          <div className="bk-film__chapters" role="group" aria-label="Film chapters">
            {chapters.map((c, k) => (
              <button
                key={c.t}
                type="button"
                onClick={() => jump(c.t)}
                aria-pressed={k === now}
                className="bk-chip"
              >
                {c.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BooksFilm;
