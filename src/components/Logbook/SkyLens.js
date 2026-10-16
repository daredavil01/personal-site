import React, { useEffect, useMemo, useRef, useState } from "react";
import { constellationOf } from "../../lib/logbook";
import { hashString, seededRandom } from "../../lib/generativeArt";
import { phyllotaxis } from "./model";
import {
  langProps, shortDate, textLang, useReducedMotion, useRoving, useWidth, yearOf,
} from "./shared";

// II · Sky. Every essay's opening sentence drawn as a constellation
// (constellationOf, the geometry the share card uses too): a star for every
// word, bigger for longer words, turning hardest at the words that carry
// meaning. They spiral out from the oldest at the centre to the newest at the
// rim. The observatory beside it draws the one in focus large, each star
// named by its word. "Watch the sky fill" lights them in writing order.

const tint = (lang) => (lang === "mr" ? "var(--lb-mr-night)" : "var(--lb-en-night)");
const pathOf = (pts) => pts.map((s, i) => `${i ? "L" : "M"}${s.x.toFixed(1)},${s.y.toFixed(1)}`).join("");

// Three layers of field stars, each twinkling on its own beat: three
// animations instead of two hundred.
const Field = ({ size }) => {
  const layers = useMemo(() => {
    const rand = seededRandom(hashString("logbook-sky"));
    return [0, 1, 2].map(() => Array.from({ length: 70 }, () => ({ x: rand(), y: rand(), r: 0.35 + rand() * 1.1 })));
  }, []);
  return (
    <g aria-hidden="true">
      {layers.map((stars, li) => (
        <g key={li} className="lb-twinkle" style={{ animationDelay: `${li * 1.6}s`, animationDuration: `${4 + li * 1.3}s` }}>
          {stars.map((f, i) => <circle key={i} cx={f.x * size} cy={f.y * size} r={f.r} fill="var(--lb-star)" />)}
        </g>
      ))}
    </g>
  );
};

const Observatory = ({ post, index, total, onStep, onOpen, compact }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 360);
  const size = compact ? Math.min(width, 240) : width;
  const m = size * 0.12;
  const stars = useMemo(() => constellationOf(post.opening || post.title).map((s) => ({
    ...s, x: m + s.x * (size - m * 2), y: m + s.y * (size - m * 2),
  })), [post, size, m]);
  const lang = langProps(post.lang);
  const titleLang = langProps(textLang(post.title));

  return (
    <div ref={ref} className="lb-observatory flex flex-col gap-4" aria-live="polite">
      {!compact && (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="block w-full h-auto" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="none" stroke="var(--lb-star-faint)" />
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 10} fill="none" stroke="var(--lb-star-faint)" strokeDasharray="2 6" />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const r1 = size / 2 - 2;
            const r2 = r1 - (i % 6 === 0 ? 10 : 5);
            return <line key={i} x1={size / 2 + Math.cos(a) * r1} y1={size / 2 + Math.sin(a) * r1} x2={size / 2 + Math.cos(a) * r2} y2={size / 2 + Math.sin(a) * r2} stroke="var(--lb-star-soft)" strokeWidth="1" />;
          })}
          <g key={post.id}>
            <path d={pathOf(stars)} pathLength="1" className="lb-draw" fill="none" stroke={tint(post.lang)} strokeWidth="1.3" strokeLinejoin="round" opacity="0.8" />
            {stars.map((s, i) => (
              <g key={i} className="lb-star-in" style={{ animationDelay: `${0.08 * i}s` }}>
                <circle cx={s.x} cy={s.y} r={Math.max(1.6, s.r * size * 0.11)} fill="var(--lb-star)" />
                <circle cx={s.x} cy={s.y} r={Math.max(4, s.r * size * 0.3)} fill={tint(post.lang)} opacity="0.14" />
                <text
                  x={s.x + 7}
                  y={s.y - 6}
                  fontSize={size < 320 ? 10 : 11.5}
                  fill="var(--lb-star-soft)"
                  className={post.lang === "mr" ? "lb-mr-text" : "lb-svg-italic"}
                  {...(post.lang === "mr" ? { lang: "mr" } : {})}
                >
                  {s.w}
                </text>
              </g>
            ))}
          </g>
        </svg>
      )}
      <div className="flex flex-col gap-2">
        <p className="lb-kicker m-0" style={{ color: "var(--lb-star-soft)" }}>
          {`№ ${index + 1} of ${total} · ${shortDate(post.date)}`}
        </p>
        <p className={`lb-quote text-[22px] md:text-[26px] m-0 ${lang.className || ""}`} lang={lang.lang} style={{ color: "var(--lb-star)" }}>
          {`“${post.opening || post.title}”`}
        </p>
        <p className={`font-body text-sm m-0 ${titleLang.className || ""}`} lang={titleLang.lang} style={{ color: "var(--lb-star-soft)" }}>
          {`— ${post.title}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="lb-btn lb-btn--sm lb-btn--icon" onClick={() => onStep(-1)} aria-label="Older essay" disabled={index === 0}>‹</button>
        <button type="button" className="lb-btn lb-btn--sm lb-btn--icon" onClick={() => onStep(1)} aria-label="Newer essay" disabled={index === total - 1}>›</button>
        <button type="button" className="lb-btn lb-btn--sm" onClick={onOpen}>Open this entry</button>
      </div>
    </div>
  );
};

const SkyLens = ({ data, onSelect }) => {
  const { posts } = data;
  const skyRef = useRef(null);
  const rootRef = useRef(null);
  const S = useWidth(skyRef, 600);
  const rootW = useWidth(rootRef, 900);
  const wide = rootW >= 820;
  const reduced = useReducedMotion();
  const years = useMemo(() => [...new Set(posts.map(yearOf))], [posts]);

  const [focus, setFocus] = useState(posts.length - 1);
  const [hover, setHover] = useState(null);
  const [year, setYear] = useState(null);
  const [upTo, setUpTo] = useState(posts.length);
  const [playing, setPlaying] = useState(false);

  const skies = useMemo(() => phyllotaxis(posts.length, S).map((c, i) => {
    const p = posts[i];
    const stars = constellationOf(p.opening || p.title).map((s) => ({
      x: c.cx - c.cell / 2 + s.x * c.cell, y: c.cy - c.cell / 2 + s.y * c.cell, r: Math.max(0.8, s.r * c.cell * 0.28),
    }));
    return { ...c, p, stars, d: pathOf(stars) };
  }), [posts, S]);

  useEffect(() => {
    if (!playing) return undefined;
    if (reduced) {
      setUpTo(posts.length);
      setPlaying(false);
      return undefined;
    }
    const id = setInterval(() => {
      setUpTo((n) => {
        if (n >= posts.length) {
          setPlaying(false);
          return n;
        }
        setFocus(n);
        return n + 1;
      });
    }, 90);
    return () => clearInterval(id);
  }, [playing, posts.length, reduced]);

  const roving = useRoving(posts.length, (i) => setFocus(i), posts.length - 1);
  const shownIndex = hover != null ? hover : focus;
  const shown = posts[shownIndex];
  const step = (d) => setFocus((f) => Math.max(0, Math.min(posts.length - 1, f + d)));
  const fillingYear = upTo < posts.length && upTo > 0 ? yearOf(posts[upTo - 1]) : null;

  return (
    <div ref={rootRef} className="lb-night p-3 sm:p-5 md:p-6">
      <div className="lb-sky-grid">
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Light one year">
              {[null, ...years].map((y) => (
                <button key={y || "all"} type="button" aria-pressed={year === y} onClick={() => setYear(y)} className="lb-btn lb-btn--sm lb-num">
                  {y || "All years"}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="lb-btn lb-btn--sm"
              onClick={() => {
                if (playing) setPlaying(false);
                else {
                  setYear(null);
                  setUpTo(0);
                  setPlaying(true);
                }
              }}
            >
              {playing ? "❚❚ Pause" : "▶ Watch the sky fill"}
            </button>
          </div>
          <div ref={skyRef} className="relative">
            <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="block w-full h-auto" role="group" aria-label="Each essay's opening sentence drawn as a constellation, oldest at the centre. Arrow keys move between essays in writing order.">
              <Field size={S} />
              {skies.map(({ p, cx, cy, cell, stars, d }, i) => {
                const lit = (year == null || yearOf(p) === year) && i < upTo;
                const isFocus = i === shownIndex;
                const { ref, ...rove } = roving.props(i);
                return (
                  <g
                    key={p.id}
                    ref={ref}
                    className="lb-hit lb-constellation"
                    role="button"
                    aria-label={`${p.title}, ${yearOf(p)}`}
                    aria-pressed={i === focus}
                    {...rove}
                    opacity={lit ? 1 : 0.1}
                    onClick={() => setFocus(i)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={(e) => { rove.onFocus(e); setFocus(i); }}
                  >
                    <rect x={cx - cell / 2} y={cy - cell / 2} width={cell} height={cell} rx={cell / 2} fill="transparent" />
                    <circle className="lb-focus-ring" cx={cx} cy={cy} r={cell / 2 + 2} />
                    {isFocus && <circle cx={cx} cy={cy} r={cell / 2 + 2} fill="none" stroke={tint(p.lang)} strokeDasharray="2 4" opacity="0.8" />}
                    <path d={d} fill="none" stroke={tint(p.lang)} strokeWidth={isFocus ? 1.6 : 0.9} opacity={isFocus ? 1 : 0.55} strokeLinejoin="round" />
                    {stars.map((s, si) => <circle key={si} cx={s.x} cy={s.y} r={isFocus ? s.r * 1.25 : s.r} fill="var(--lb-star)" />)}
                  </g>
                );
              })}
            </svg>
            {fillingYear && (
              <p className="lb-display absolute top-2 left-3 m-0 text-[44px] leading-none lb-num" style={{ color: "var(--lb-star-soft)" }} aria-live="polite">
                {fillingYear}
              </p>
            )}
          </div>
          <p className="font-body text-[13px] m-0" style={{ color: "var(--lb-star-soft)" }}>
            <span style={{ color: "var(--lb-en-night)" }}>Periwinkle</span>
            {" is English, "}
            <span style={{ color: "var(--lb-mr-night)" }}>saffron</span>
            {" is Marathi. The oldest essay sits at the centre; each new one lands further out. Hover or tap a constellation to read its line."}
          </p>
        </div>
        <Observatory
          post={shown}
          index={shownIndex}
          total={posts.length}
          compact={!wide}
          onStep={step}
          onOpen={() => onSelect(shown.id)}
        />
      </div>
    </div>
  );
};

export default SkyLens;
