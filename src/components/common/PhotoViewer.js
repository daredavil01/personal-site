import React, {
  useCallback, useEffect, useRef, useState,
} from "react";
import PropTypes from "prop-types";

// A photo viewer that never crops: once a photo loads, its natural width and
// height set the frame's aspect ratio, so a portrait medal shot and a wide
// summit panorama are each shown whole. The frame is capped at `maxVh` of the
// viewport height and narrows to keep the ratio when a tall photo hits the cap.
// Arrows, swipe, ←/→ keys and a thumbnail strip move between photos.

const DEFAULT_RATIO = 4 / 3;
const SWIPE_PX = 40;

/** Width that keeps `ratio` inside both the container and `maxVh` of height. */
export const frameWidth = (ratio, maxVh) => `min(100%, calc(${maxVh}vh * ${ratio}))`;

// "Slide 3" is the importer's placeholder, not a caption worth showing.
const realCaption = (c) => (c && !/^slide\s*\d+$/i.test(c.trim()) ? c : "");

const PhotoViewer = ({ images, title, maxVh }) => {
  const photos = (images ?? []).filter((i) => i?.url);
  const [index, setIndex] = useState(0);
  const [ratios, setRatios] = useState({});
  const touchX = useRef(null);
  const count = photos.length;

  const go = useCallback((step) => setIndex((i) => (i + step + count) % count), [count]);

  // Warm the neighbours so the frame can resize before they are shown.
  useEffect(() => {
    if (count < 2 || typeof Image === "undefined") return;
    [1, -1].forEach((step) => {
      const p = photos[(index + step + count) % count];
      const img = new Image();
      img.onload = () => setRatios((r) => (r[p.url] ? r : { ...r, [p.url]: img.naturalWidth / img.naturalHeight }));
      img.src = p.url;
    });
  }, [index, count]);

  if (!count) return null;
  const photo = photos[Math.min(index, count - 1)];
  const ratio = ratios[photo.url] || DEFAULT_RATIO;
  const caption = realCaption(photo.caption);
  const onLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (w && h) setRatios((r) => ({ ...r, [photo.url]: w / h }));
  };
  const arrow = "absolute top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-stone-100 shadow-md hover:bg-white dark:hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary";

  return (
    // The carousel is focusable (tabIndex 0) so ←/→ can move it from anywhere inside.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <figure
      className="m-0 flex flex-col gap-3 outline-none"
      tabIndex={count > 1 ? 0 : -1}
      aria-roledescription="carousel"
      aria-label={`${title} photos`}
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      }}
    >
      <div className="relative w-full flex justify-center">
        <div
          className="relative overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800 transition-[width,aspect-ratio] duration-300 ease-out"
          style={{ aspectRatio: String(ratio), width: frameWidth(ratio, maxVh) }}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current == null || count < 2) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
          }}
        >
          <img
            key={photo.url}
            src={photo.url}
            alt={photo.alt || caption || `${title}, photo ${index + 1} of ${count}`}
            onLoad={onLoad}
            decoding="async"
            className="absolute inset-0 w-full h-full object-contain"
          />
          {count > 1 && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-stone-900/75 text-white font-label text-[10px] font-bold tabular-nums" aria-live="polite">
              {`${index + 1} / ${count}`}
            </span>
          )}
        </div>
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={`${arrow} left-2`}>
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className={`${arrow} right-2`}>
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
          </>
        )}
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span>{caption}</span>
        <a href={photo.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-label uppercase tracking-widest text-xs font-bold hover:text-secondary">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">open_in_full</span>
          Full size
        </a>
      </figcaption>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Choose a photo">
          {photos.map((p, i) => (
            <button
              key={p.url}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2 transition-all ${i === index ? "border-secondary" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              <img src={p.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
};

PhotoViewer.propTypes = {
  images: PropTypes.arrayOf(PropTypes.shape({
    url: PropTypes.string, caption: PropTypes.string, alt: PropTypes.string,
  })),
  title: PropTypes.string,
  maxVh: PropTypes.number,
};
PhotoViewer.defaultProps = { images: [], title: "Photo", maxVh: 62 };

export default PhotoViewer;
