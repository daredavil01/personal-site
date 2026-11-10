import React, { useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { cumulativeYear, yearsOf } from "../../../lib/training";
import { Tip, useInView } from "../shared";

// This year against every other: kilometres so far, day by day. The running
// year is the accent and stops at today; past years are greys, darker for
// the more recent. Each line is labelled at its end; the crosshair reads
// every year on the same day.

const W = 900;
const H = 320;
const P = {
  l: 44, r: 64, t: 16, b: 28,
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GREYS = ["#57534e", "#8a8580", "#b5b0aa", "#d4d0cb"];

const YearRace = ({ rows, today }) => {
  const [ref, seen] = useInView(0.3);
  const box = useRef(null);
  const [hover, setHover] = useState(null);
  const years = useMemo(() => yearsOf(rows).slice(0, 5), [rows]);
  const lines = useMemo(() => years.map((y) => ({ y, data: cumulativeYear(rows, y, today) })), [rows, years, today]);
  const max = Math.max(1, ...lines.map((l) => l.data[l.data.length - 1] || 0));
  const nice = Math.ceil(max / 1000 / 500) * 500 * 1000 || max;
  const x = (d) => P.l + (d / 365) * (W - P.l - P.r);
  const y = (v) => H - P.b - (v / nice) * (H - P.t - P.b);
  const path = (data) => data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const colorOf = (i) => (i === 0 ? "var(--tr-accent)" : GREYS[Math.min(i - 1, GREYS.length - 1)]);

  // End labels, nudged apart so they never overlap.
  const labels = useMemo(() => {
    const ls = lines.map((l, i) => ({ y: l.y, i, at: y(l.data[l.data.length - 1] || 0), x: x(l.data.length - 1) }));
    const sorted = [...ls].sort((a, b) => a.at - b.at);
    for (let k = 1; k < sorted.length; k += 1) if (sorted[k].at - sorted[k - 1].at < 14) sorted[k].at = sorted[k - 1].at + 14;
    return ls;
  }, [lines]);

  const onMove = (e) => {
    const r = box.current.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const d = Math.max(0, Math.min(364, Math.round(((sx - P.l) / (W - P.l - P.r)) * 365)));
    const px = e.clientX - r.left;
    setHover({ d, at: { x: px, y: e.clientY - r.top, flip: px > r.width * 0.6 } });
  };

  if (!years.length) return null;
  const date = (d) => new Date(Date.UTC(2001, 0, 1 + d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <figure ref={ref} className="m-0">
      <div ref={box} className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label={`Cumulative distance by day of year for ${years.join(", ")}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={P.l} x2={W - P.r} y1={y(nice * f)} y2={y(nice * f)} stroke="var(--tr-grid)" />
              <text x={P.l - 8} y={y(nice * f) + 4} textAnchor="end" fontSize="11" fill="var(--tr-muted)">{Math.round((nice * f) / 1000).toLocaleString()}</text>
            </g>
          ))}
          {MONTHS.map((m, i) => (
            <text key={m} x={x(i * 30.4)} y={H - 8} fontSize="11" fill="var(--tr-muted)">{m}</text>
          ))}
          {[...lines].reverse().map((l) => {
            const i = lines.indexOf(l);
            return (
              <path
                key={l.y}
                d={path(l.data)}
                fill="none"
                stroke={colorOf(i)}
                strokeWidth={i === 0 ? 2.5 : 1.75}
                strokeLinejoin="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={seen ? 0 : 1}
                style={{ transition: `stroke-dashoffset 1.8s cubic-bezier(0.16,1,0.3,1) ${i * 150}ms` }}
              />
            );
          })}
          {labels.map((l) => (
            <text key={l.y} x={l.x + 6} y={l.at + 4} fontSize="12" fontWeight={l.i === 0 ? 700 : 500} fill="var(--tr-ink)" style={{ opacity: seen ? 1 : 0, transition: "opacity .6s 1.4s" }}>{l.y}</text>
          ))}
          {hover && (
            <g pointerEvents="none">
              <line x1={x(hover.d)} x2={x(hover.d)} y1={P.t} y2={H - P.b} stroke="var(--tr-muted)" strokeDasharray="3 4" />
              {lines.map((l, i) => (l.data[hover.d] != null ? (
                <circle key={l.y} cx={x(hover.d)} cy={y(l.data[hover.d])} r="4.5" fill={colorOf(i)} stroke="var(--tr-surface)" strokeWidth="2" />
              ) : null))}
            </g>
          )}
        </svg>
        <Tip at={hover?.at}>
          {hover && (
            <>
              <strong className="block mb-1">{`By ${date(hover.d)}`}</strong>
              {lines.map((l, i) => (
                <span key={l.y} className="flex items-center justify-between gap-4 tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-0.5" style={{ background: colorOf(i) }} />
                    {l.y}
                  </span>
                  <span>{l.data[hover.d] != null ? `${Math.round(l.data[hover.d] / 1000).toLocaleString()} km` : "—"}</span>
                </span>
              ))}
            </>
          )}
        </Tip>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 mt-2 font-label text-[11px] uppercase tracking-wider" style={{ color: "var(--tr-muted)" }}>
        {lines.map((l, i) => (
          <span key={l.y} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-[3px] rounded" style={{ background: colorOf(i) }} />
            {`${l.y} · ${Math.round((l.data[l.data.length - 1] || 0) / 1000).toLocaleString()} km`}
          </span>
        ))}
      </figcaption>
    </figure>
  );
};

YearRace.propTypes = { rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired, today: PropTypes.string };
YearRace.defaultProps = { today: undefined };

export default YearRace;
