import React, { useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { prettyDate, readingTime } from "../../lib/writingLedger";
import {
  Tip, fmt, useScrollEnd, langColor, openPost, platformColor, useTip, useWidth,
} from "./shared";

// Every post as a book spine on one long shelf, oldest on the left. Height is
// the post's word count, colour its platform, and a Marathi post wears a
// saffron band at the top. A year is a bookend. The shelf never shrinks a
// spine below 5 px — on a phone it scrolls sideways instead.
const MIN_SPINE = 5;
const GAP = 2;
const BOOKEND = 14;
const H = 260;
const TOP = 34;
const BASE = H - 30;

const Shelf = ({ posts }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 900);
  const { tip, show, hide } = useTip();

  const layout = useMemo(() => {
    const years = [...new Set(posts.map((p) => p.year))];
    const ends = (years.length - 1) * BOOKEND;
    const spine = Math.max(MIN_SPINE, Math.min(18, (width - ends) / posts.length - GAP));
    const max = Math.max(...posts.map((p) => p.words), 1);
    const y = (w) => Math.max(14, Math.sqrt(w / max) * (BASE - TOP));
    let x = 0;
    let prevYear = null;
    const books = [];
    const marks = [];
    posts.forEach((p) => {
      if (prevYear && p.year !== prevYear) {
        marks.push({ year: p.year, x: x + BOOKEND / 2 - GAP / 2 });
        x += BOOKEND;
      } else if (!prevYear) marks.push({ year: p.year, x: 0, first: true });
      prevYear = p.year;
      const h = y(p.words);
      books.push({ p, x, w: spine, h });
      x += spine + GAP;
    });
    const longest = books.reduce((a, b) => (b.p.words > a.p.words ? b : a));
    return { books, marks, total: x, longest, spine };
  }, [posts, width]);

  const svgW = Math.max(width, layout.total);
  const scroller = useRef(null);
  useScrollEnd(scroller, svgW);

  return (
    <div className="wl-card">
      <ul className="wl-legend">
        <li><span className="wl-sw" style={{ background: "var(--wl-s1)" }} />Substack</li>
        <li><span className="wl-sw" style={{ background: "var(--wl-s2)" }} />WordPress</li>
        <li><span className="wl-sw" style={{ background: "var(--wl-mr)" }} />Marathi band</li>
        <li>Height = words (√ scale) · click a spine to read it</li>
      </ul>
      <div ref={ref} className="wl-fig">
        <div className="wl-scroll" ref={scroller}>
          <svg width={svgW} height={H} role="img" aria-label={`A shelf of ${posts.length} posts, each a spine as tall as its word count`}>
            <line x1={0} x2={svgW} y1={BASE + 0.5} y2={BASE + 0.5} stroke="var(--wl-ink)" strokeWidth={2} />
            <line x1={0} x2={svgW} y1={BASE + 5} y2={BASE + 5} className="wl-base" />
            {layout.marks.map((mk) => (
              <g key={mk.year}>
                {!mk.first ? <line x1={mk.x} x2={mk.x} y1={TOP + 40} y2={BASE} stroke="var(--wl-rule)" strokeDasharray="2 3" /> : null}
                <text x={mk.first ? 0 : mk.x + 4} y={BASE + 20} className="wl-tick">{mk.year}</text>
              </g>
            ))}
            {layout.books.map(({ p, x, w, h }) => {
              const label = `${p.title} — ${fmt(p.words)} words, ${prettyDate(p.date)}`;
              const tipBody = (
                <>
                  <b>{p.title}</b>
                  <span>{prettyDate(p.date)} · {p.platform} · {p.lang}</span>
                  <br />
                  {fmt(p.words)} words · {readingTime(p.words).text} read
                </>
              );
              return (
                <g
                  key={p.url || p.title + p.date}
                  className="wl-spine wl-mark"
                  role="link"
                  tabIndex={-1}
                  aria-label={label}
                  onMouseMove={(e) => show(e, tipBody)}
                  onMouseLeave={hide}
                  onClick={() => openPost(p.url)}
                >
                  <rect x={x} y={BASE - h} width={w} height={h} rx={Math.min(2, w / 3)} fill={platformColor(p.platform)} />
                  {p.lang === "Marathi" ? <rect x={x} y={BASE - h} width={w} height={Math.min(10, h / 3)} rx={Math.min(2, w / 3)} fill={langColor("Marathi")} /> : null}
                  {w >= 7 ? <line x1={x + 1.5} x2={x + w - 1.5} y1={BASE - h + 14} y2={BASE - h + 14} stroke="rgba(255,255,255,.35)" /> : null}
                </g>
              );
            })}
            {(() => {
              const b = layout.longest;
              const cx = b.x + b.w / 2;
              const anchor = cx > svgW - 160 ? "end" : "start";
              return (
                <g pointerEvents="none">
                  <path d={`M${cx},${BASE - b.h - 4} L${cx},${TOP - 8}`} stroke="var(--wl-hi)" strokeWidth={1} />
                  <text x={anchor === "end" ? cx - 6 : cx + 6} y={TOP - 10} textAnchor={anchor} className="wl-anno">
                    the longest: {fmt(b.p.words)} words
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
        <Tip tip={tip} />
      </div>
    </div>
  );
};

Shelf.propTypes = { posts: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

export default Shelf;
