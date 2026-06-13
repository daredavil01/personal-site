import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSports, useTreks } from "../../context/ContentContext";
import { normalizeEntry } from "./utils";
import TimelineCard from "./TimelineCard";
import ImageModal from "./ImageModal";

const DURATION = { slow: 20, fast: 5 }; // seconds to scroll full page

const InteractiveMeTimeline = ({ dataType, scrollEnabled, scrollSpeed }) => {
  const { data: sportsData } = useSports();
  const { data: treksData } = useTreks();

  const entries = useMemo(() => {
    const source = dataType === 'sports' ? sportsData : treksData;
    const type = dataType === 'sports' ? 'sport' : 'trek';
    return source
      .map((e) => normalizeEntry(e, type))
      .filter(Boolean)
      .sort((a, b) => b.dateMs - a.dateMs);
  }, [dataType, sportsData, treksData]);

  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const [paths, setPaths] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const recalculate = useCallback(() => {
    if (!containerRef.current) return;
    const newPaths = [];
    for (let i = 0; i < entries.length - 1; i += 1) {
      const a = cardRefs.current[i];
      const b = cardRefs.current[i + 1];
      if (a && b) {
        const x1 = a.offsetLeft + a.offsetWidth;
        const y1 = a.offsetTop + a.offsetHeight / 2;
        const x2 = b.offsetLeft;
        const y2 = b.offsetTop + b.offsetHeight / 2;
        const cpOffset = (x2 - x1) * 0.45;
        newPaths.push(
          `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`
        );
      }
    }
    setPaths(newPaths);
  }, [entries]);

  useLayoutEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, entries.length);
    recalculate();
  }, [entries, recalculate]);

  // Auto-scroll RAF loop
  const isPausedRef = useRef(false);
  const scrollEnabledRef = useRef(scrollEnabled);
  const scrollSpeedRef = useRef(scrollSpeed);
  const rafRef = useRef(null);

  useEffect(() => { scrollEnabledRef.current = scrollEnabled; }, [scrollEnabled]);
  useEffect(() => { scrollSpeedRef.current = scrollSpeed; }, [scrollSpeed]);

  useEffect(() => {
    const tick = () => {
      if (!isPausedRef.current && scrollEnabledRef.current) {
        const scrollable = document.body.offsetHeight - window.innerHeight;
        const duration = DURATION[scrollSpeedRef.current] || DURATION.slow;
        const pxPerFrame = scrollable / (duration * 60);
        window.scrollBy(0, pxPerFrame);
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 2) return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex flex-col gap-16 py-8"
      onMouseEnter={() => { isPausedRef.current = true; }}
      onMouseLeave={() => { isPausedRef.current = false; }}
    >
      {entries.map((entry, i) => (
        <TimelineCard
          key={entry.id}
          ref={(el) => { cardRefs.current[i] = el; }}
          entry={entry}
          side={i % 2 === 0 ? 'left' : 'right'}
          onImageLoad={recalculate}
          onClick={() => setSelectedEntry(entry)}
        />
      ))}

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            className="text-stone-300 dark:text-stone-700"
          />
        ))}
      </svg>

      {selectedEntry && (
        <ImageModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
};

export default InteractiveMeTimeline;
