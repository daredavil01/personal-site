import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { useQueryState } from "../components/common/LogKit";
import { FEATURE_FILMS, filmLength } from "../data/featureFilms";

// /films — every feature film on the site in one place: the eleven page
// films (30 or 45 seconds) and the seven longer ones. A main player shows the chosen film
// (`?film=`, merged into the URL so it can be shared) with its details — the
// story, the page it belongs to, length, shape, sound, how it was made — and
// its chapters as buttons that jump the film to them. Chapters come from the
// film's committed .json, fetched only when that film is chosen.

const DEFAULTS = { film: "" };
const PAGE_SERIES = FEATURE_FILMS.filter((f) => f.series === "page");
const LONGER = FEATURE_FILMS.filter((f) => f.series !== "page");

function useChapters(film) {
  const [chapters, setChapters] = useState([]);
  useEffect(() => {
    let alive = true;
    setChapters([]);
    if (!film?.chapters) return undefined;
    fetch(`${film.base}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j?.chapters) return;
        setChapters(j.chapters.map((c) => ({ title: c.title, start: Number(c.start ?? c.t ?? 0) })).filter((c) => c.title));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [film]);
  return chapters;
}

const Fact = ({ label, children }) => (
  <div>
    <dt className="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 dark:text-stone-500">{label}</dt>
    <dd className="m-0 mt-1 font-body text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{children}</dd>
  </div>
);
Fact.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node.isRequired };

const Player = ({ film }) => {
  const ref = useRef(null);
  const chapters = useChapters(film);
  const [now, setNow] = useState(0);
  const square = film.shape === "square";
  const jump = (t) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = t;
    v.play().catch(() => {});
  };
  const active = chapters.reduce((a, c, i) => (now >= c.start ? i : a), -1);
  return (
    <section aria-labelledby="film-title" className="grid grid-cols-1 md:grid-cols-[minmax(0,auto)_1fr] gap-8 items-start">
      {/* Captions are a committed .vtt where the film has one (see FEATURE_FILMS). */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        key={film.key}
        ref={ref}
        controls
        preload="metadata"
        playsInline
        poster={`${film.base}.jpg`}
        width={square ? 1080 : 720}
        height={square ? 1080 : 1280}
        onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
        className={`block h-auto rounded-2xl shadow-xl bg-stone-900 mx-auto md:mx-0 ${square ? "w-full max-w-[420px]" : "w-full max-w-[300px]"}`}
        aria-label={film.alt}
      >
        <source src={`${film.base}.mp4`} type="video/mp4" />
        {film.captions && <track kind="captions" src={`${film.base}.vtt`} srcLang="en" label="English" default />}
      </video>
      <div className="min-w-0">
        <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary font-bold mb-3">
          {film.series === "page" ? "Page film" : "Feature film"}
          {" · "}
          {filmLength(film.seconds)}
        </p>
        <h2 id="film-title" className="font-headline text-4xl md:text-5xl font-black text-stone-900 dark:text-stone-100 leading-tight tracking-tight mb-4">{film.title}</h2>
        <p className="font-body text-lg text-stone-600 dark:text-stone-300 leading-relaxed mb-6">{film.story}</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6">
          <Fact label="Lives on"><Link to={film.route} className="text-secondary font-bold hover:underline">{film.page}</Link></Fact>
          <Fact label="Length · shape">{`${filmLength(film.seconds)} · ${square ? "square, 1:1" : "vertical, 9:16"}`}</Fact>
          <Fact label="Sound">{film.sound}</Fact>
          <Fact label="Captions">{film.captions ? "Yes — turn them on in the player" : "None: no speech to caption"}</Fact>
          <div className="sm:col-span-2"><Fact label="How it was made">{film.made}</Fact></div>
        </dl>
        {chapters.length > 0 && (
          <div>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 dark:text-stone-500 mb-2">Chapters</p>
            <ol className="flex flex-wrap gap-2 list-none p-0 m-0">
              {chapters.map((c, i) => (
                <li key={`${c.title}${c.start}`}>
                  <button
                    type="button"
                    onClick={() => jump(c.start)}
                    aria-current={i === active ? "step" : undefined}
                    className={`px-3 py-1.5 rounded-full text-xs font-label font-bold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${i === active
                      ? "bg-secondary text-white border-secondary"
                      : "border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-secondary"}`}
                  >
                    <span className="tabular-nums opacity-70 mr-1.5">{filmLength(c.start)}</span>
                    {c.title}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
};
Player.propTypes = { film: PropTypes.shape({}).isRequired };

const Tile = ({ film, active, onPick }) => (
  <li>
    <button
      type="button"
      onClick={() => onPick(film.key)}
      aria-pressed={active}
      className={`group w-full text-left rounded-2xl p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${active ? "bg-stone-100 dark:bg-stone-800" : "hover:bg-stone-50 dark:hover:bg-stone-900"}`}
    >
      <span className={`relative block overflow-hidden rounded-xl bg-stone-900 ${film.shape === "square" ? "aspect-square" : "aspect-[9/16]"}`}>
        <img src={`${film.base}.jpg`} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <span className="absolute right-2 bottom-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[11px] font-label font-bold tabular-nums">{filmLength(film.seconds)}</span>
        {active && <span className="absolute left-2 top-2 px-2 py-0.5 rounded-md bg-secondary text-white text-[10px] font-label font-bold uppercase tracking-wider">Playing</span>}
      </span>
      <span className="block mt-2 font-headline font-bold text-stone-900 dark:text-stone-100 leading-snug">{film.title}</span>
      <span className="block font-label text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500 mt-0.5">{film.page}</span>
    </button>
  </li>
);
Tile.propTypes = { film: PropTypes.shape({}).isRequired, active: PropTypes.bool.isRequired, onPick: PropTypes.func.isRequired };

const Films = () => {
  const [state, set] = useQueryState(DEFAULTS);
  const top = useRef(null);
  const film = useMemo(() => FEATURE_FILMS.find((f) => f.key === state.film) || PAGE_SERIES[0] || FEATURE_FILMS[0], [state.film]);
  const minutes = Math.round(FEATURE_FILMS.reduce((a, f) => a + f.seconds, 0) / 60);
  const pick = (key) => {
    set({ film: key });
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <PageShell region="creator">
      <div className="flex flex-col gap-10 w-full">
        <header className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12 items-end">
          <div className="lg:col-span-3">
            <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary mb-4 font-bold">Feature films</p>
            <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-0">Films.</h1>
          </div>
          <p className="lg:col-span-2 text-lg text-stone-500 dark:text-stone-400 font-body leading-relaxed mb-0">
            {`Every film about this site, in one place: ${FEATURE_FILMS.length} films, about ${minutes} minutes in all. A short film for each of ${PAGE_SERIES.length} pages, and the longer tours. Pick one to play it and read how it was made.`}
          </p>
        </header>

        <div ref={top} className="scroll-mt-24">
          <Player film={film} />
        </div>

        <section aria-labelledby="films-pages">
          <h2 id="films-pages" className="font-headline text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">Page films · 30 or 45 seconds</h2>
          <p className="font-body text-stone-500 dark:text-stone-400 mb-4">One per page, rendered with Remotion from the live tables, with captions and a sound on every cut. The 45-second ones also show their page in both shells, classic and atlas.</p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 list-none p-0 m-0">
            {PAGE_SERIES.map((f) => <Tile key={f.key} film={f} active={f.key === film.key} onPick={pick} />)}
          </ul>
        </section>

        <section aria-labelledby="films-longer">
          <h2 id="films-longer" className="font-headline text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">The longer films</h2>
          <p className="font-body text-stone-500 dark:text-stone-400 mb-4">The trailer and the tours of the Blueprint, the Logbook, Projects, Training and Videos.</p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 list-none p-0 m-0">
            {LONGER.map((f) => <Tile key={f.key} film={f} active={f.key === film.key} onPick={pick} />)}
          </ul>
        </section>
      </div>
    </PageShell>
  );
};

export default Films;
