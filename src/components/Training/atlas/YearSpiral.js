import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { dayOfYear, sportFamily, yearsOf } from "../../../lib/training";
import { formatDistance, formatDuration, sportLabel } from "../../../lib/strava";
import { Legend, famColor, useInView } from "../shared";

// The spiral of days: time wound into a coil, one turn per year, January at
// twelve o'clock. Every activity is a bead sized by its distance and coloured
// by its sport, so the seasons line up as spokes: the long Sundays, the
// monsoon gaps, race weeks. The beads arrive in order the first time the
// coil is on screen. Hover one to read it in the middle; pick a year to light
// up just that turn.

const S = 800;
const C = S / 2;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const YearSpiral = ({ rows }) => {
  const navigate = useNavigate();
  const [ref, seen] = useInView(0.25);
  const [hover, setHover] = useState(null);
  const [focusYear, setFocusYear] = useState(null);
  const years = useMemo(() => [...yearsOf(rows)].reverse(), [rows]);
  const r0 = 92;
  const gap = (C - 40 - r0) / Math.max(1, years.length);

  const at = (k, frac) => {
    const th = frac * 2 * Math.PI - Math.PI / 2;
    const r = r0 + (k + frac) * gap;
    return [C + r * Math.cos(th), C + r * Math.sin(th)];
  };

  const beads = useMemo(() => {
    const list = [...rows].filter((r) => r.date).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    return list.map((r) => {
      const k = years.indexOf(Number(r.date.slice(0, 4)));
      const frac = (dayOfYear(r.date) - 0.5) / 366;
      const [x, y] = at(k, frac);
      return {
        r, x, y, year: Number(r.date.slice(0, 4)), size: Math.min(13, 2 + Math.sqrt((Number(r.distance) || 0) / 1000) * 1.5),
      };
    });
  }, [rows, years]);

  const guide = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= years.length * 120; i += 1) {
      const k = Math.floor(i / 120);
      const [x, y] = at(Math.min(k, years.length - 1), k >= years.length ? 1 : (i % 120) / 120);
      pts.push(`${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join("");
  }, [years]);

  const families = useMemo(() => [...new Set(rows.map((r) => sportFamily(r.sport)))], [rows]);
  const activeDays = useMemo(() => new Set(rows.map((r) => r.date)).size, [rows]);
  const h = hover?.r;
  const step = beads.length ? Math.min(8, 5200 / beads.length) : 0;

  return (
    <section ref={ref} className="tr-night tr-stars px-4 py-8 md:px-10 md:py-10" aria-labelledby="tr-spiral-title">
      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-end mb-2">
        <div>
          <p className="tr-kicker mb-2" style={{ color: "var(--tr-accent)" }}>Chapter two</p>
          <h2 id="tr-spiral-title" className="font-headline text-3xl md:text-5xl mb-1" style={{ color: "var(--tr-ink)" }}>The spiral of days</h2>
          <p className="text-sm mb-0 max-w-lg" style={{ color: "var(--tr-muted)" }}>
            One turn per year, January at the top. Bigger beads are longer days out. Spokes are habits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Light up one year">
          {[null, ...years].map((y) => (
            <button
              key={y ?? "all"}
              type="button"
              aria-pressed={focusYear === y}
              onClick={() => setFocusYear(y)}
              onMouseEnter={() => setFocusYear(y)}
              className="px-3 h-8 rounded-full tr-kicker border transition-colors"
              style={{
                borderColor: focusYear === y ? "var(--tr-accent)" : "var(--tr-line)",
                background: focusYear === y ? "var(--tr-accent)" : "transparent",
                color: focusYear === y ? "#fff" : "var(--tr-ink)",
              }}
            >
              {y ?? "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-[760px]">
        <svg viewBox={`0 0 ${S} ${S}`} className="block w-full h-auto" role="img" aria-label={`${beads.length} activities on ${activeDays} days, wound into a spiral by year`} onMouseLeave={() => setHover(null)}>
          <path d={guide} fill="none" stroke="var(--tr-line)" strokeWidth="1" />
          {MONTHS.map((m, i) => {
            const th = (i / 12) * 2 * Math.PI - Math.PI / 2;
            const rr = C - 18;
            return (
              <g key={m}>
                <line x1={C + (r0 - 10) * Math.cos(th)} y1={C + (r0 - 10) * Math.sin(th)} x2={C + (rr - 12) * Math.cos(th)} y2={C + (rr - 12) * Math.sin(th)} stroke="var(--tr-grid)" strokeDasharray="2 6" />
                <text x={C + rr * Math.cos(th)} y={C + rr * Math.sin(th)} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="var(--tr-muted)" fontFamily="Plus Jakarta Sans, sans-serif">{m}</text>
              </g>
            );
          })}
          {seen && beads.map((b, i) => {
            const dim = focusYear && b.year !== focusYear;
            return (
              <circle
                key={b.r.id}
                cx={b.x}
                cy={b.y}
                r={b.size}
                fill={famColor(sportFamily(b.r.sport))}
                fillOpacity={dim ? 0.08 : 0.78}
                stroke={h && h.id === b.r.id ? "#fff" : "#0b1220"}
                strokeWidth={h && h.id === b.r.id ? 2.5 : 1}
                className="tr-pop"
                style={{ animationDelay: `${Math.round(i * step)}ms`, cursor: "pointer", transition: "fill-opacity .3s" }}
                onMouseEnter={() => setHover(b)}
                onClick={() => navigate(`/training/${b.r.id}`)}
              />
            );
          })}
          <circle cx={C} cy={C} r={r0 - 14} fill="#0b1220" stroke="var(--tr-line)" />
          {years.map((y, k) => {
            const [x, y2] = at(k, 0);
            return <text key={y} x={x - 8} y={y2 + 4} textAnchor="end" fontSize="12" fontWeight="700" fill="var(--tr-ink)" stroke="#0b1220" strokeWidth="4" paintOrder="stroke" fontFamily="Plus Jakarta Sans, sans-serif">{y}</text>;
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-live="polite">
          <div className="text-center w-[26%] min-w-[7rem]">
            {h ? (
              <>
                <p className="tr-kicker mb-1 text-[10px]" style={{ color: famColor(sportFamily(h.sport)) }}>{sportLabel(h.sport)}</p>
                <p className="font-headline text-sm md:text-lg leading-tight mb-1 line-clamp-2" style={{ color: "var(--tr-ink)" }}>{h.name}</p>
                <p className="text-[10px] md:text-xs mb-0 tabular-nums" style={{ color: "var(--tr-muted)" }}>
                  {[h.date, formatDistance(h.distance), formatDuration(h.movingTime)].filter(Boolean).join(" · ")}
                </p>
              </>
            ) : (
              <>
                <p className="font-headline text-3xl md:text-5xl leading-none mb-1" style={{ color: "var(--tr-ink)" }}>{activeDays.toLocaleString()}</p>
                <p className="tr-kicker text-[10px] mb-0" style={{ color: "var(--tr-muted)" }}>days on the move</p>
              </>
            )}
          </div>
        </div>
      </div>
      <Legend families={families} className="mt-4 justify-center" />
    </section>
  );
};

YearSpiral.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};

export default YearSpiral;
