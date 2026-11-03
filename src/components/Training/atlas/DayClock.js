import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { startHours } from "../../../lib/training";
import { useInView } from "../shared";

// The clock: when the day's activity starts, as a 24-hour dial. Bars grow
// from the centre, night hours on the dark half. Hover an hour to count it.

const S = 420;
const C = S / 2;
const R0 = 62;
const R1 = 190;

const label = (h) => (h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h} am` : `${h - 12} pm`); // eslint-disable-line no-nested-ternary

const DayClock = ({ rows }) => {
  const [ref, seen] = useInView(0.3);
  const [hover, setHover] = useState(null);
  const bins = useMemo(() => startHours(rows), [rows]);
  const total = bins.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...bins);
  const early = bins.slice(4, 8).reduce((a, b) => a + b, 0);
  const share = total ? Math.round((early / total) * 100) : 0;
  const peakHour = bins.indexOf(max);
  if (!total) return null;

  const arc = (h, len) => {
    const a0 = ((h - 6) / 24) * 2 * Math.PI + 0.02;
    const a1 = ((h - 5) / 24) * 2 * Math.PI - 0.02;
    const r = R0 + len;
    const p = (rad, a) => `${(C + rad * Math.cos(a)).toFixed(1)} ${(C + rad * Math.sin(a)).toFixed(1)}`;
    return `M${p(R0, a0)}L${p(r, a0)}A${r} ${r} 0 0 1 ${p(r, a1)}L${p(R0, a1)}A${R0} ${R0} 0 0 0 ${p(R0, a0)}Z`;
  };

  const h = hover ?? peakHour;

  return (
    <section ref={ref} className="tr-night tr-stars px-4 py-8 md:px-10 md:py-10 grid md:grid-cols-[1fr_1.1fr] gap-6 items-center" aria-labelledby="tr-clock-title">
      <div>
        <p className="tr-kicker mb-2" style={{ color: "var(--tr-accent)" }}>Chapter five</p>
        <h2 id="tr-clock-title" className="font-headline text-3xl md:text-5xl mb-3" style={{ color: "var(--tr-ink)" }}>
          {share >= 50 ? "Before the city wakes" : "Whenever the day allows"}
        </h2>
        <p className="text-base mb-4 max-w-md" style={{ color: "var(--tr-muted)" }}>
          {`${share}% of everything starts between 4 and 8 in the morning. The busiest hour is ${label(peakHour)}.`}
        </p>
        <p className="mb-0 font-headline text-5xl tabular-nums" style={{ color: "var(--tr-ink)" }} aria-live="polite">
          {bins[h].toLocaleString()}
          <span className="tr-kicker ml-3 align-middle" style={{ color: "var(--tr-muted)" }}>{`starts at ${label(h)}`}</span>
        </p>
      </div>
      <svg viewBox={`-24 -24 ${S + 48} ${S + 48}`} className="block w-full max-w-[460px] mx-auto h-auto" role="img" aria-label={`Activity starts by hour; most at ${label(peakHour)}`} onMouseLeave={() => setHover(null)}>
        {/* Night, 18:00 to 06:00: the upper half of the dial. */}
        <path d={`M${C - R1 - 8} ${C}A${R1 + 8} ${R1 + 8} 0 0 1 ${C + R1 + 8} ${C}Z`} fill="#000000" fillOpacity="0.25" />
        <circle cx={C} cy={C} r={R1} fill="none" stroke="var(--tr-grid)" />
        <circle cx={C} cy={C} r={(R0 + R1) / 2} fill="none" stroke="var(--tr-grid)" strokeDasharray="2 5" />
        {bins.map((n, i) => (
          <path
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            d={arc(i, seen ? Math.max(3, (n / max) * (R1 - R0)) : 0)}
            fill={i >= 4 && i < 8 ? "#ff7a59" : "#3987e5"}
            fillOpacity={hover == null || hover === i ? 0.95 : 0.35}
            style={{ transition: `d 1s cubic-bezier(0.16,1,0.3,1) ${i * 40}ms, fill-opacity .2s`, cursor: "pointer" }}
            onMouseEnter={() => setHover(i)}
          />
        ))}
        {[0, 6, 12, 18].map((hh) => {
          const a = ((hh - 6) / 24) * 2 * Math.PI;
          return (
            <text key={hh} x={C + (R1 + 18) * Math.cos(a)} y={C + (R1 + 18) * Math.sin(a)} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="var(--tr-muted)" fontFamily="Plus Jakarta Sans, sans-serif">
              {["00", "06", "12", "18"][hh / 6]}
            </text>
          );
        })}
        <text x={C} y={C - 8} textAnchor="middle" fontSize="28" fill="var(--tr-ink)" className="material-symbols-outlined" style={{ fontFamily: "Material Symbols Outlined" }}>
          {h >= 6 && h < 18 ? "light_mode" : "dark_mode"}
        </text>
        <text x={C} y={C + 22} textAnchor="middle" fontSize="12" fill="var(--tr-muted)" fontFamily="Plus Jakarta Sans, sans-serif">{label(h)}</text>
      </svg>
    </section>
  );
};

DayClock.propTypes = { rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

export default DayClock;
