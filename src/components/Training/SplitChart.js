import React, { useState } from "react";
import PropTypes from "prop-types";
import { useSeen, useWidth } from "../Arena/Arena";
import { formatEffortSpeed, isPaceSport } from "../../lib/strava";

// One activity's kilometres as bars: taller is quicker. The fastest split is
// the accent, the slowest is named, the dashed line is the average, and the
// heart-rate line rides over the top when the watch recorded one. Drawn at
// its real pixel width; hover or focus a bar to read it. Used by
// /training/:id and by a race page's linked session.

const H = 220;
const PAD = {
  top: 26, right: 40, bottom: 26, left: 8,
};

const SplitChart = ({ splits, sport, night }) => {
  const [wrapRef, width] = useWidth(0);
  const [seenRef, seen] = useSeen(0.25);
  const [hot, setHot] = useState(null);
  const list = (splits || []).filter((s) => Number(s.average_speed) > 0);
  if (list.length < 2) return null;

  const speeds = list.map((s) => Number(s.average_speed));
  const lo = Math.min(...speeds);
  const hi = Math.max(...speeds);
  const base = lo - Math.max(0.08, (hi - lo) * 0.45);
  const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const innerW = Math.max(40, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const bw = innerW / list.length;
  const yOf = (v) => PAD.top + innerH - ((v - base) / (hi - base)) * innerH;
  const fastest = speeds.indexOf(hi);
  const slowest = speeds.indexOf(lo);
  const hrs = list.map((s) => Number(s.average_heartrate) || null);
  const hasHr = hrs.filter(Boolean).length > list.length / 2;
  const hrLo = hasHr ? Math.min(...hrs.filter(Boolean)) : 0;
  const hrHi = hasHr ? Math.max(...hrs.filter(Boolean)) : 1;
  const hrY = (v) => PAD.top + 6 + (1 - (v - hrLo) / Math.max(1, hrHi - hrLo)) * (innerH - 12);
  const hrPath = hasHr ? hrs.map((v, i) => (v ? `${i && hrs[i - 1] ? "L" : "M"}${(PAD.left + (i + 0.5) * bw).toFixed(1)} ${hrY(v).toFixed(1)}` : "")).join("") : "";
  const every = list.length > 30 ? 10 : list.length > 12 ? 5 : 1; // eslint-disable-line no-nested-ternary
  const ink = night ? "#f4f1ea" : "var(--ar-ink)";
  const muted = night ? "#98a2c3" : "var(--ar-muted)";
  const barFill = night ? "rgba(255,255,255,0.22)" : "var(--ar-faint)";
  const accent = night ? "#ff6b3d" : "var(--ar-accent)";
  const fmt = (v) => formatEffortSpeed(sport, v);
  const h = hot != null ? list[hot] : null;

  return (
    <figure ref={seenRef} className="m-0">
      <div ref={wrapRef} className={`relative w-full ${seen ? "is-seen" : ""}`}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`${list.length} splits. Fastest: kilometre ${list[fastest].split}, ${fmt(hi)}. Slowest: kilometre ${list[slowest].split}, ${fmt(lo)}.`}>
            {list.map((s, i) => {
              const v = Number(s.average_speed);
              const y = yOf(v);
              return (
                <rect
                  key={s.split}
                  x={PAD.left + i * bw + Math.min(1.5, bw * 0.12)}
                  y={y}
                  width={Math.max(1, bw - Math.min(3, bw * 0.24))}
                  height={PAD.top + innerH - y}
                  rx={Math.min(3, bw / 4)}
                  fill={i === fastest ? accent : barFill}
                  opacity={hot == null || hot === i ? 1 : 0.45}
                  className="ar-vbar"
                  style={{ "--ar-delay": `${Math.min(900, i * 22)}ms` }}
                  tabIndex={0}
                  aria-label={`Kilometre ${s.split}: ${fmt(v)}${s.average_heartrate ? `, ${Math.round(s.average_heartrate)} bpm` : ""}`}
                  onMouseEnter={() => setHot(i)}
                  onMouseLeave={() => setHot(null)}
                  onFocus={() => setHot(i)}
                  onBlur={() => setHot(null)}
                />
              );
            })}
            <line x1={PAD.left} x2={PAD.left + innerW} y1={yOf(avg)} y2={yOf(avg)} stroke={muted} strokeDasharray="3 4" />
            <text x={PAD.left + innerW + 5} y={yOf(avg) + 3.5} fontSize="10" fill={muted}>avg</text>
            {hasHr && <path d={hrPath} fill="none" stroke={night ? "#ff8fa3" : "#dc2626"} strokeWidth="1.6" strokeLinejoin="round" pathLength="1" className="ar-draw" style={{ "--ar-delay": "500ms" }} />}
            <text x={PAD.left + (fastest + 0.5) * bw} y={yOf(hi) - 7} textAnchor={fastest > list.length - 3 ? "end" : fastest < 2 ? "start" : "middle" /* eslint-disable-line no-nested-ternary */} fontSize="11" fontWeight="700" fill={accent}>
              {`Fastest · ${fmt(hi)}`}
            </text>
            {list.map((s, i) => ((i + 1) % every === 0 || i === 0 ? (
              <text key={s.split} x={PAD.left + (i + 0.5) * bw} y={H - 8} textAnchor="middle" fontSize="10" fill={muted}>{s.split}</text>
            ) : null))}
          </svg>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 mt-2 text-xs" style={{ color: muted }}>
        <span style={{ color: h ? ink : muted }} className="tabular-nums" role="status">
          {h
            ? [`Km ${h.split}`, fmt(Number(h.average_speed)), h.average_heartrate ? `${Math.round(h.average_heartrate)} bpm` : null, h.elevation_difference != null ? `${h.elevation_difference > 0 ? "+" : ""}${Math.round(h.elevation_difference)} m` : null].filter(Boolean).join("  ·  ")
            : `Taller is ${isPaceSport(sport) ? "quicker" : "faster"}. Slowest: km ${list[slowest].split}, ${fmt(lo)}.`}
        </span>
        {hasHr && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded" style={{ background: night ? "#ff8fa3" : "#dc2626" }} aria-hidden="true" />
            {`Heart rate, ${Math.round(hrLo)}–${Math.round(hrHi)} bpm`}
          </span>
        )}
      </figcaption>
    </figure>
  );
};

SplitChart.propTypes = {
  splits: PropTypes.arrayOf(PropTypes.shape({})),
  sport: PropTypes.string,
  night: PropTypes.bool,
};
SplitChart.defaultProps = { splits: [], sport: "Run", night: false };

export default SplitChart;
