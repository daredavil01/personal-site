import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { constellationOf } from "../../lib/logbook";
import { hashString, seededRandom } from "../../lib/generativeArt";
import { keyActivate, langProps, yearOf } from "./shared";

// Every essay's opening sentence drawn as a constellation (constellationOf,
// the geometry the share card uses too). They spiral out from the oldest at
// the centre to the newest at the rim — a phyllotaxis, so the sky fills evenly
// however many essays there are. The year chips dim every other year.

const S = 1000;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const SkyLens = ({ data, selected, onSelect }) => {
  const [year, setYear] = useState(null);
  const [hover, setHover] = useState(null);
  const years = useMemo(() => [...new Set(data.posts.map(yearOf))], [data.posts]);

  const skies = useMemo(() => {
    const n = data.posts.length;
    const cell = (S / Math.sqrt(n)) * 0.62;
    return data.posts.map((p, i) => {
      const rad = (S / 2 - cell / 2 - 8) * Math.sqrt((i + 0.5) / n);
      const cx = S / 2 + Math.cos(i * GOLDEN) * rad;
      const cy = S / 2 + Math.sin(i * GOLDEN) * rad;
      const stars = constellationOf(p.opening || p.title).map((s) => ({
        x: cx - cell / 2 + s.x * cell, y: cy - cell / 2 + s.y * cell, r: Math.max(0.9, s.r * cell * 0.3),
      }));
      return { p, cx, cy, cell, stars };
    });
  }, [data.posts]);

  const field = useMemo(() => {
    const rand = seededRandom(hashString("logbook-sky"));
    return Array.from({ length: 220 }, () => ({ x: rand() * S, y: rand() * S, r: 0.4 + rand() * 1.2, d: rand() * 4 }));
  }, []);

  const focus = hover || selected;

  return (
    <div className="lb-sky p-2 md:p-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5 px-1" role="group" aria-label="Filter by year">
        {[null, ...years].map((y) => (
          <button
            key={y || "all"}
            type="button"
            aria-pressed={year === y}
            onClick={() => setYear(y)}
            className="lb-chip font-label text-[10px] uppercase tracking-wider px-2.5 py-1"
          >
            {y || "All years"}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full h-auto" role="group" aria-label="Each essay's opening sentence drawn as a constellation, oldest at the centre">
        <g aria-hidden="true">
          {field.map((f, i) => (
            // eslint-disable-next-line react/no-array-index-key -- a fixed, seeded field
            <circle key={i} className="lb-twinkle" cx={f.x} cy={f.y} r={f.r} fill="var(--lb-sky-ink)" style={{ animationDelay: `${f.d}s` }} />
          ))}
        </g>
        {skies.map(({ p, cx, cy, cell, stars }) => {
          const lit = year == null || yearOf(p) === year;
          const isSel = selected && selected.id === p.id;
          const tint = p.lang === "mr" ? "#5eead4" : "#fdba74";
          const path = stars.map((s, i) => `${i ? "L" : "M"}${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ");
          return (
            <g
              key={p.id}
              className="lb-hit"
              role="button"
              tabIndex={lit ? 0 : -1}
              aria-label={`${p.title}, ${yearOf(p)}`}
              aria-pressed={isSel}
              opacity={lit ? 1 : 0.12}
              onClick={() => onSelect(p.id)}
              onKeyDown={keyActivate(() => onSelect(p.id))}
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p)}
              onBlur={() => setHover(null)}
            >
              <rect className="lb-mark" x={cx - cell / 2} y={cy - cell / 2} width={cell} height={cell} rx="10" fill="transparent" stroke={isSel ? tint : "transparent"} strokeDasharray="4 4" />
              <path d={path} fill="none" stroke={tint} strokeWidth={isSel ? 1.6 : 1} opacity={isSel ? 0.95 : 0.55} strokeLinejoin="round" />
              {stars.map((s, i) => (
                // eslint-disable-next-line react/no-array-index-key -- a star is its word's position
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--lb-sky-ink)" />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="min-h-[4.5rem] px-2 pb-1" aria-live="polite">
        {focus ? (
          <>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] m-0" style={{ color: "var(--lb-sky-soft)" }}>
              {`${focus.date.slice(0, 4)} · ${focus.title}`}
            </p>
            <p className={`font-headline text-lg md:text-xl m-0 mt-1 ${langProps(focus.lang).className || ""}`} lang={langProps(focus.lang).lang}>
              {`“${focus.opening}”`}
            </p>
          </>
        ) : (
          <p className="font-body text-sm m-0" style={{ color: "var(--lb-sky-soft)" }}>
            One constellation per essay, drawn from its first sentence: a star for every word, bigger for longer words, turning
            hardest at the words that carry meaning. Amber is English, teal is Marathi. Hover or pick one to read the line.
          </p>
        )}
      </div>
    </div>
  );
};

SkyLens.propTypes = {
  data: PropTypes.shape({ posts: PropTypes.arrayOf(PropTypes.shape({})).isRequired }).isRequired,
  selected: PropTypes.shape({ id: PropTypes.string }),
  onSelect: PropTypes.func.isRequired,
};

SkyLens.defaultProps = { selected: null };

export default SkyLens;
