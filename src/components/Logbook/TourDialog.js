import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useModal } from "./shared";

// The tour: a narrated, vertical film of the page in use at phone size — each
// chapter in turn — with its chapters beside it. The video and its sidecars
// are committed in public/video/: the MP4, a JPEG poster, the narration as
// WebVTT, and a JSON list of where each chapter starts (plus the credits).
// The chapter buttons come from that JSON; if it cannot be read the player
// simply has no chapter list.
//
// preload="none": opening /logbook costs nothing; the poster loads only when
// the dialog opens, and the film only when it plays. A click opens it, so the
// browser lets it start with sound; a shared ?tour link waits on its poster.

export const TOUR = "/video/the-logbook";

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const TourDialog = ({ onClose }) => {
  const ref = useRef(null);
  const video = useRef(null);
  const closeRef = useRef(null);
  const [meta, setMeta] = useState(null);
  const [current, setCurrent] = useState(null);
  const onKeyDown = useModal(ref, onClose);

  useEffect(() => {
    let alive = true;
    fetch(`${TOUR}.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (alive) setMeta(json); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (closeRef.current) closeRef.current.focus({ preventScroll: true });
    const v = video.current;
    const playing = v && v.play ? v.play() : null;
    if (playing && playing.catch) playing.catch(() => {});
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
    setCurrent(now ? now.id : null);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="lb-root lb-tour-layer" onKeyDown={onKeyDown}>
      <div className="lb-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="lb-tour-title" className="lb-tour">
        <button ref={closeRef} type="button" className="lb-btn lb-btn--sm lb-btn--icon lb-tour-close" onClick={onClose} aria-label="Close the tour">✕</button>
        <video
          ref={video}
          controls
          preload="none"
          playsInline
          poster={`${TOUR}.jpg`}
          width="720"
          height="1280"
          onTimeUpdate={onTime}
          aria-label="A narrated tour of the Wanderer's Logbook, recorded on the page at phone size"
        >
          <source src={`${TOUR}.mp4`} type="video/mp4" />
          <track kind="captions" src={`${TOUR}.vtt`} srcLang="en" label="English (narration)" />
        </video>

        <div className="flex flex-col gap-4 min-w-0">
          <div className="flex flex-col gap-1.5 pr-10">
            <p className="lb-kicker lb-accent m-0">{meta && meta.duration ? `The tour · ${clock(meta.duration)}` : "The tour"}</p>
            <h2 id="lb-tour-title" className="lb-display text-[36px] leading-none m-0">
              The Logbook, <span className="lb-italic lb-accent">in motion</span>
            </h2>
          </div>
          {chapters.length > 0 && (
            <ol className="list-none p-0 m-0 flex flex-col gap-1">
              {chapters.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={current === c.id}
                    onClick={() => seek(c.start)}
                    className="lb-tour-chapter"
                  >
                    <span className="lb-italic lb-accent w-7 text-[18px] leading-none">{c.numeral}</span>
                    <span className="lb-display text-[19px] leading-tight flex-1">{c.title}</span>
                    <span className="lb-meta lb-soft lb-num">{clock(c.start)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <p className="font-body text-[13px] leading-relaxed lb-soft m-0">
            Recorded on this page at phone size, one chapter after another, over the Scriptorium&apos;s own
            music. The captions are burned in, so it plays with the sound off.
            {meta && meta.narration ? ` Narration: ${meta.narration}.` : ""}
            {meta && meta.rendered ? ` Recorded ${meta.rendered}.` : ""}
          </p>
          <a href={`${TOUR}.mp4`} download className="lb-btn lb-btn--sm self-start no-underline">
            Download the video
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default TourDialog;
