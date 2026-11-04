import React, { useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { monthLabel } from "../../lib/writingLedger";
import {
  Tip, fmt, kfmt, useScrollEnd, useTip, useWidth,
} from "./shared";

// The running total, month by month, with each 25,000-word milestone pinned
// where it fell and the longest silence shaded — the curve's flat years and
// its late surge are the story, so the annotations say so in words.
export const Cumulative = ({ m }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 900);
  const { tip, show, hide } = useTip();
  const H = width < 560 ? 240 : 300;
  const pad = { t: 24, r: 16, b: 28, l: 44 };
  const s = m.series;
  const iw = width - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i) => pad.l + (i / Math.max(1, s.length - 1)) * iw;
  const top = Math.ceil(m.words / 25000) * 25000;
  const y = (v) => pad.t + ih - (v / top) * ih;
  const line = s.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.cumulative).toFixed(1)}`).join(" ");
  const area = `${line} L${x(s.length - 1)},${pad.t + ih} L${x(0)},${pad.t + ih} Z`;
  const ticks = [];
  for (let v = 0; v <= top; v += 25000) ticks.push(v);
  const idx = (month) => s.findIndex((d) => d.month === month);
  const sil = m.silence;
  const silFrom = sil ? idx(sil.from.month) : -1;
  const silTo = sil ? idx(sil.to.month) : -1;
  const yearStarts = s.map((d, i) => ({ d, i })).filter(({ d }) => d.month.endsWith("-01"));

  return (
    <div className="wl-card">
      <p className="wl-card-title">The running total</p>
      <div ref={ref} className="wl-fig">
        <svg width={width} height={H} role="img" aria-label={`Cumulative words from ${s[0].label} to ${s[s.length - 1].label}`}>
          <defs>
            <linearGradient id="wl-arc-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--wl-hi)" stopOpacity="0.28" />
              <stop offset="1" stopColor="var(--wl-hi)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} className={t ? "wl-grid" : "wl-base"} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="wl-tick">{kfmt(t)}</text>
            </g>
          ))}
          {silFrom >= 0 && silTo > silFrom ? (
            <g>
              <rect x={x(silFrom)} y={pad.t} width={x(silTo) - x(silFrom)} height={ih} fill="var(--wl-empty)" />
              <text x={(x(silFrom) + x(silTo)) / 2} y={pad.t + 14} textAnchor="middle" className="wl-tick">{sil.days} days of silence</text>
            </g>
          ) : null}
          {yearStarts.map(({ d, i }) => (
            <text key={d.month} x={x(i)} y={H - 8} textAnchor="middle" className="wl-tick">{d.month.slice(0, 4)}</text>
          ))}
          <path d={area} fill="url(#wl-arc-fill)" />
          <path d={line} fill="none" stroke="var(--wl-hi)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {m.milestones.map((ms, k) => {
            const i = idx(ms.month);
            const px = x(i);
            const py = y(s[i].cumulative);
            const left = px > width * 0.6;
            return (
              <g key={ms.words}>
                <circle cx={px} cy={py} r={4.5} fill="var(--wl-card)" stroke="var(--wl-hi)" strokeWidth={2} />
                <text
                  x={left ? px - 10 : px + 10}
                  y={py + (k % 2 ? 16 : -8)}
                  textAnchor={left ? "end" : "start"}
                  className="wl-dlabel"
                  style={{ fontSize: 11 }}
                >
                  {kfmt(ms.words)} · {monthLabel(ms.month)}
                </text>
              </g>
            );
          })}
          <circle cx={x(s.length - 1)} cy={y(m.words)} r={6} fill="var(--wl-hi)" stroke="var(--wl-card)" strokeWidth={2} />
          {s.map((d, i) => (
            <rect
              key={d.month}
              x={x(i) - iw / s.length / 2}
              y={pad.t}
              width={iw / s.length}
              height={ih}
              fill="transparent"
              onMouseMove={(e) => show(e, <><b>{d.label}</b>{fmt(d.cumulative)} words so far · {d.posts} posts this month</>)}
              onMouseLeave={hide}
            />
          ))}
        </svg>
        <Tip tip={tip} />
      </div>
    </div>
  );
};

Cumulative.propTypes = { m: PropTypes.shape({}).isRequired };

// One column per calendar month, empty months included (as a dot on the
// baseline), stacked by platform. The peak month is labelled.
export const Months = ({ m }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 900);
  const { tip, show, hide } = useTip();
  const s = m.series;
  const split = useMemo(() => {
    const by = new Map();
    m.posts.forEach((p) => {
      const cur = by.get(p.month) || { sub: 0, wp: 0 };
      if (String(p.platform).toLowerCase().startsWith("word")) cur.wp += p.words; else cur.sub += p.words;
      by.set(p.month, cur);
    });
    return by;
  }, [m.posts]);
  const H = 220;
  const pad = { t: 26, r: 8, b: 26, l: 40 };
  const minBand = 6;
  const iw = Math.max(width - pad.l - pad.r, s.length * minBand);
  const svgW = iw + pad.l + pad.r;
  const ih = H - pad.t - pad.b;
  const band = iw / s.length;
  const bw = Math.max(2, Math.min(16, band - 2));
  const max = Math.max(...s.map((d) => d.words), 1);
  const top = Math.ceil(max / 5000) * 5000;
  const y = (v) => pad.t + ih - (v / top) * ih;
  const ticks = [];
  for (let v = 0; v <= top; v += 5000) ticks.push(v);
  const peak = m.busiestMonth.month;
  const scroller = useRef(null);
  useScrollEnd(scroller, svgW);

  return (
    <div className="wl-card">
      <p className="wl-card-title">Every month on record — {s.length} of them</p>
      <ul className="wl-legend">
        <li><span className="wl-sw" style={{ background: "var(--wl-s1)" }} />Substack</li>
        <li><span className="wl-sw" style={{ background: "var(--wl-s2)" }} />WordPress</li>
        <li><span className="wl-sw round" style={{ background: "var(--wl-rule)" }} />a month with no post</li>
      </ul>
      <div ref={ref} className="wl-fig">
        <div className="wl-scroll" ref={scroller}>
          <svg width={svgW} height={H} role="img" aria-label="Words written each calendar month">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={svgW - pad.r} y1={y(t)} y2={y(t)} className={t ? "wl-grid" : "wl-base"} />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="wl-tick">{kfmt(t)}</text>
              </g>
            ))}
            {s.map((d, i) => {
              const cx = pad.l + i * band + band / 2;
              const sp = split.get(d.month) || { sub: 0, wp: 0 };
              const body = <><b>{d.label}</b>{d.posts ? `${fmt(d.words)} words · ${d.posts} posts` : "no posts"}</>;
              return (
                <g key={d.month} onMouseMove={(e) => show(e, body)} onMouseLeave={hide} className="wl-mark">
                  <rect x={cx - band / 2} y={pad.t} width={band} height={ih} fill="transparent" />
                  {d.posts ? (
                    <>
                      <rect x={cx - bw / 2} y={y(sp.sub)} width={bw} height={pad.t + ih - y(sp.sub)} rx={Math.min(2, bw / 3)} fill={d.month === peak ? "var(--wl-hi)" : "var(--wl-s1)"} />
                      {sp.wp ? <rect x={cx - bw / 2} y={y(sp.sub + sp.wp)} width={bw} height={y(sp.sub) - y(sp.sub + sp.wp) - 1} rx={Math.min(2, bw / 3)} fill="var(--wl-s2)" /> : null}
                    </>
                  ) : <circle cx={cx} cy={pad.t + ih} r={1.6} fill="var(--wl-muted)" opacity={0.6} />}
                  {d.month.endsWith("-01") ? <text x={cx} y={H - 8} textAnchor="middle" className="wl-tick">{d.month.slice(0, 4)}</text> : null}
                  {d.month === peak ? <text x={cx} y={y(d.words) - 8} textAnchor="end" className="wl-anno">peak · {fmt(d.words)}</text> : null}
                </g>
              );
            })}
          </svg>
        </div>
        <Tip tip={tip} />
      </div>
    </div>
  );
};

Months.propTypes = { m: PropTypes.shape({}).isRequired };

// The years as small multiples: one tile each, bar against the biggest year.
export const Years = ({ m }) => (
  <div className="wl-years">
    {m.byYear.map((y) => (
      <div key={y.year} className={`wl-year${y.year === m.busiestYear.year ? " is-peak" : ""}`}>
        <div className="y">{y.year}</div>
        <div className="w wl-num">{y.words ? fmt(y.words) : "—"}</div>
        <div className="p">{y.posts ? `${y.posts} posts · ${Math.round((y.words / m.words) * 100)}%` : "a quiet year"}</div>
        <div className="bar"><i style={{ width: `${(y.words / m.busiestYear.words) * 100}%` }} /></div>
      </div>
    ))}
  </div>
);

Years.propTypes = { m: PropTypes.shape({}).isRequired };
