import React from "react";
import PropTypes from "prop-types";
import { PAGE_FILM_DIR, pageFilm } from "../../data/pageFilms";

// The 30-second vertical film about a page, with its storyline beside it.
// One row in src/data/pageFilms.js per film; the files are
// public/video/page-films/<slug>.{mp4,jpg,vtt}, rendered by
// `npm run page:films` and committed. preload="none": the page costs a poster
// until someone presses play. The captions are the words each scene puts on
// screen (the films have music, no narration).

const PageFilm = ({ film, className }) => {
  const f = pageFilm(film);
  if (!f) return null;
  const src = `${PAGE_FILM_DIR}/${f.slug}`;
  return (
    <figure className={`page-film flex flex-row items-center gap-5 sm:gap-7 m-0 ${className}`}>
      <video
        controls
        preload="none"
        playsInline
        poster={`${src}.jpg`}
        width="720"
        height="1280"
        className="shrink-0 w-32 sm:w-40 md:w-44 h-auto block rounded-2xl shadow-xl bg-stone-900"
        aria-label={f.alt}
      >
        <source src={`${src}.mp4`} type="video/mp4" />
        <track kind="captions" src={`${src}.vtt`} srcLang="en" label="English" default />
      </video>
      <figcaption className="min-w-0 max-w-md">
        <span className="block font-label text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 dark:text-stone-500 mb-2">
          The film · 30 s · sound on
        </span>
        <span className="block font-headline text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 leading-tight mb-2">
          {f.title}
        </span>
        <span className="block font-body text-sm sm:text-base text-stone-500 dark:text-stone-400 leading-relaxed">
          {f.story}
        </span>
      </figcaption>
    </figure>
  );
};

PageFilm.propTypes = {
  film: PropTypes.string.isRequired,
  className: PropTypes.string,
};

PageFilm.defaultProps = { className: "" };

export default PageFilm;
