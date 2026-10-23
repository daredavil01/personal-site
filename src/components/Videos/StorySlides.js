import React, { useCallback, useEffect, useRef, useState } from "react";

// The film's story as six 4:5 slides, for reading without sound. The images
// are public/video/the-videos-story-slides/01–06.webp, written by
// `npm run videos:slides` (scripts/videos-film/slides.mjs) from the film's
// frames and the live videos table, and committed. Their numbers are baked
// in like the film's, so the alt text names what each slide shows rather
// than repeating figures that would go stale.

export const SLIDES_DIR = "/video/the-videos-story-slides";
export const SLIDES = [
  { file: "01.webp", alt: "From orbit to /videos. The channel lived only on YouTube; now every upload has a home on the site, filled by one button. With the counts of videos, Shorts, views and minutes." },
  { file: "02.webp", alt: "Six chapters, ninety seconds: a frame from each chapter of the film, from the zoom down to Pune to the closing address." },
  { file: "03.webp", alt: "Every upload since 2019 as a circle sized by its views, with no uploads in 2022 and 2023, and the share of all views that went to one Short." },
  { file: "04.webp", alt: "Copy-pastes, or one click: the twelve fields each video needed by hand, as an empty grid beside the same grid filled by one press of Sync now." },
  { file: "05.webp", alt: "How one click travels: from the YouTube Data API through a Cloudflare Worker into Supabase Postgres and onto /videos, with the quota used, the Shorts checked and the rows written." },
  { file: "06.webp", alt: "Every upload, one page: sankettambare.in/videos, and the channel @sankettambare7474." },
];

const reduceMotion = () => typeof window !== "undefined"
  && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const navButton = "w-10 h-10 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 flex items-center justify-center transition-colors hover:border-secondary hover:text-secondary disabled:opacity-35 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary";

const StorySlides = () => {
  const track = useRef(null);
  // first: the slide nearest the left edge. Several show at once on a wide
  // screen, so the track can end before the last slide reaches the edge.
  const [first, setFirst] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const index = atEnd ? SLIDES.length - 1 : first;

  const go = useCallback((i) => {
    const el = track.current;
    const slide = el && el.children[Math.max(0, Math.min(SLIDES.length - 1, i))];
    if (slide) el.scrollTo({ left: slide.offsetLeft, behavior: reduceMotion() ? "auto" : "smooth" });
  }, []);

  // The current slide is whichever starts nearest the track's left edge.
  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const starts = [...el.children].map((c) => Math.abs(c.offsetLeft - el.scrollLeft));
        setFirst(starts.indexOf(Math.min(...starts)));
        setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(first + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(first - 1); }
  };

  return (
    <section id="the-story" aria-roledescription="carousel" aria-label="The story of this page, in six slides" className="flex flex-col gap-5 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-label text-xs uppercase tracking-widest text-secondary mb-2 font-bold">The story in slides</p>
          <h2 className="font-headline text-3xl md:text-4xl font-black text-stone-900 dark:text-stone-100 leading-tight mb-1">
            From orbit to /videos
          </h2>
          <p className="text-stone-500 dark:text-stone-400 mb-0">
            The film above, as six slides you can read without sound.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 tabular-nums" aria-live="polite">
            {`${index + 1} / ${SLIDES.length}`}
          </span>
          <button type="button" className={navButton} onClick={() => go(first - 1)} disabled={first === 0} aria-label="Previous slide">
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          <button type="button" className={navButton} onClick={() => go(first + 1)} disabled={atEnd} aria-label="Next slide">
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Its own horizontal scroller, so the page never scrolls sideways. */}
      <div
        ref={track}
        // Focusable so the arrow keys can page the slides.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      >
        {SLIDES.map((s, i) => (
          <figure
            key={s.file}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${SLIDES.length}`}
            className="snap-start shrink-0 w-[82%] sm:w-[46%] lg:w-[31.5%] m-0"
          >
            <img
              src={`${SLIDES_DIR}/${s.file}`}
              alt={s.alt}
              width="1080"
              height="1350"
              loading="lazy"
              decoding="async"
              className="w-full h-auto block rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900"
            />
          </figure>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.file}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
              i === index ? "w-6 bg-secondary" : "w-2 bg-stone-300 dark:bg-stone-700 hover:bg-stone-400"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default StorySlides;
