import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
  heatmap, intensity, streaks, totals,
} from "../../lib/training";
import { formatDistance, formatDuration } from "../../lib/strava";

// One year as a grid of days, Monday-first weeks, shaded by distance relative
// to the year's biggest day. Scrolls sideways inside its own box on a phone.

const SHADES = [
  "bg-stone-100 dark:bg-stone-800",
  "bg-secondary/25",
  "bg-secondary/50",
  "bg-secondary/75",
  "bg-secondary",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const YearHeatmap = ({ rows, year, years, onYear }) => {
  const grid = useMemo(() => heatmap(rows, year), [rows, year]);
  const yearRows = useMemo(() => rows.filter((r) => r.date && r.date.startsWith(String(year))), [rows, year]);
  const sum = totals(yearRows);
  const streak = streaks(yearRows);

  // Label a week column with the month its first day falls in, once per month.
  const monthLabels = grid.weeks.map((w, i) => {
    const first = w.find(Boolean);
    const m = first ? Number(first.date.slice(5, 7)) - 1 : null;
    const prev = i ? grid.weeks[i - 1].find(Boolean) : null;
    const prevM = prev ? Number(prev.date.slice(5, 7)) - 1 : null;
    return m != null && m !== prevM ? MONTHS[m] : "";
  });

  const facts = [
    sum.count ? `${sum.count} activities` : null,
    sum.distance ? formatDistance(sum.distance) : null,
    sum.movingTime ? `${Math.round(sum.movingTime / 3600)} h` : null,
    grid.activeDays ? `${grid.activeDays} active days` : null,
    streak.longest > 1 ? `longest streak ${streak.longest} days` : null,
  ].filter(Boolean);

  return (
    <section className="flex flex-col gap-4" aria-label={`${year} calendar`}>
      <div className="flex flex-wrap items-center gap-2">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            aria-pressed={y === year}
            onClick={() => onYear(y)}
            className={`px-3 py-1 rounded-md text-xs border ${y === year
              ? "bg-secondary text-white border-secondary"
              : "bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:text-secondary"}`}
          >
            {y}
          </button>
        ))}
      </div>
      <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mb-0">{facts.join(" · ") || "Nothing logged this year."}</p>
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-[3px] pl-0 font-label text-[9px] text-stone-400 h-3">
            {monthLabels.map((m, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={i} className="w-3 overflow-visible whitespace-nowrap">{m}</span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {grid.weeks.map((week) => (
              <div key={week.find(Boolean)?.date} className="flex flex-col gap-[3px]">
                {week.map((d, i) => (d ? (
                  <span
                    key={d.date}
                    title={d.count ? `${d.date}: ${d.count} · ${formatDistance(d.distance)} · ${formatDuration(d.movingTime)}` : d.date}
                    className={`block w-3 h-3 rounded-sm ${SHADES[intensity(d.distance, grid.max) || (d.count ? 1 : 0)]}`}
                  />
                // eslint-disable-next-line react/no-array-index-key
                ) : <span key={`x${i}`} className="block w-3 h-3" />))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 font-label text-[9px] uppercase tracking-widest text-stone-400">
        Less
        {SHADES.map((s) => <span key={s} className={`inline-block w-3 h-3 rounded-sm ${s}`} />)}
        More
      </div>
    </section>
  );
};

YearHeatmap.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number })).isRequired,
  year: PropTypes.number.isRequired,
  years: PropTypes.arrayOf(PropTypes.number).isRequired,
  onYear: PropTypes.func.isRequired,
};

export default YearHeatmap;
