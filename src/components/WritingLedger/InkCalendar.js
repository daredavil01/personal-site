import React, { useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { prettyDate, recentGrid, yearGrid } from "../../lib/writingLedger";
import {
  Tip, fmt, openPost, platformColor, useTip, useWidth,
} from "./shared";

// Every day since the first post, one row per year, Monday at the top — the
// contribution-graph shape (after Simon Willison's and Jim Nielsen's blog
// calendars). A day with a post is an ink blot sized by its words; a blank
// year is left blank, because the silences are part of the record.
//
// On a phone, seven full years shrink to 6-pixel dots, so a narrow figure opens
// on the last three months at a readable size, with every year one tap away.
const LABEL_W = 92;

const InkCalendar = ({ posts, years }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 900);
  const { tip, show, hide } = useTip();
  const [allYears, setAllYears] = useState(false);
  const narrow = width < 560;
  const recent = narrow && !allYears;
  const grids = useMemo(
    () => (recent ? [recentGrid(posts, new Date(), 3)] : years.map((y) => yearGrid(y, posts))),
    [recent, years, posts],
  );
  const maxWords = useMemo(() => Math.max(...posts.map((p) => p.words), 1), [posts]);

  const labelW = narrow ? 0 : LABEL_W;
  const columns = recent ? grids[0].weeks : 54;
  const cell = recent
    ? Math.max(12, Math.min(26, Math.floor(width / columns)))
    : Math.max(narrow ? 6 : 8, Math.min(15, Math.floor((width - labelW) / 54)));
  const gridW = cell * columns;
  const rowH = cell * 7 + (narrow ? 34 : 22) + (recent ? 16 : 0);
  const svgW = Math.max(width, labelW + gridW);
  const H = grids.length * rowH + 16;

  return (
    <div className="wl-card">
      <ul className="wl-legend">
        <li><span className="wl-sw round" style={{ background: "var(--wl-s1)" }} />Substack post</li>
        <li><span className="wl-sw round" style={{ background: "var(--wl-s2)" }} />WordPress post</li>
        <li>Blot size = words that day · Mon at top</li>
      </ul>
      <div ref={ref} className="wl-fig">
        <div className="wl-scroll">
          <svg width={svgW} height={H} role="img" aria-label="A calendar of every day since the first post, marking the days a post was published">
            {grids.map((g, gi) => {
              const top = gi * rowH + (narrow ? 22 : 14);
              return (
                <g key={g.year} transform={`translate(${labelW},${top})`}>
                  {narrow ? (
                    <text x={0} y={-8} className="wl-dlabel">{g.year}<tspan className="wl-tick" dx={8}>{g.posts ? `${g.posts} posts · ${fmt(g.words)} words` : "no posts"}</tspan></text>
                  ) : (
                    <>
                      <text x={-labelW} y={cell * 2.6} className="wl-dlabel" style={{ fontSize: 15 }}>{g.year}</text>
                      <text x={-labelW} y={cell * 2.6 + 16} className="wl-tick">{g.posts ? `${g.posts} posts` : "silent"}</text>
                      <text x={-labelW} y={cell * 2.6 + 30} className="wl-tick">{g.posts ? `${fmt(g.words)} w` : ""}</text>
                    </>
                  )}
                  {gi === 0 && (!narrow || recent) ? g.months.map((mo) => (
                    <text key={mo.label} x={mo.col * cell} y={recent ? cell * 7 + 14 : -4} className="wl-tick">{mo.label}</text>
                  )) : null}
                  {g.cells.map((c) => {
                    const cx = c.col * cell + cell / 2;
                    const cy = c.row * cell + cell / 2;
                    if (!c.posts.length) {
                      return <rect key={c.date} x={c.col * cell + 1} y={c.row * cell + 1} width={cell - 2} height={cell - 2} rx={1.5} fill="var(--wl-empty)" />;
                    }
                    const r = Math.max(cell * 0.32, Math.min(cell * (recent ? 0.6 : 0.95), (cell / 2) * Math.sqrt(c.words / maxWords) * 1.9));
                    const body = (
                      <>
                        <b>{prettyDate(c.date)}</b>
                        {c.posts.slice(0, 4).map((p) => <span key={p.url || p.title} style={{ display: "block" }}>{p.title} · {fmt(p.words)}</span>)}
                        {c.posts.length > 4 ? <span>+{c.posts.length - 4} more</span> : null}
                      </>
                    );
                    return (
                      <circle
                        key={c.date}
                        className="wl-mark"
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={platformColor(c.posts[0].platform)}
                        fillOpacity={0.9}
                        stroke="var(--wl-card)"
                        strokeWidth={1}
                        onMouseMove={(e) => show(e, body)}
                        onMouseLeave={hide}
                        onClick={() => openPost(c.posts[0].url)}
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
        <Tip tip={tip} />
      </div>
      {narrow && (
        <button type="button" className="wl-cal-more" aria-pressed={allYears} onClick={() => setAllYears((v) => !v)}>
          {allYears ? "Just the last three months" : `Show every year (${years.length})`}
        </button>
      )}
    </div>
  );
};

InkCalendar.propTypes = {
  posts: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  years: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default InkCalendar;
