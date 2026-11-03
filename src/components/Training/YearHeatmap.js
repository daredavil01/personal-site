import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import {
  heatmap, intensity, sportFamily, streaks, totals,
} from "../../lib/training";
import { formatDistance, formatDuration } from "../../lib/strava";
import { FAMILY_ICONS, famColor } from "./shared";
import { DayLoader } from "./DayPicker";

// One year as a grid of days, Monday-first weeks, shaded by distance relative
// to the year's biggest day (one hue, light to dark). Pick a day to list what
// happened on it. Under the grid: each month's distance and the week's rhythm
// (which weekdays carry the kilometres). Scrolls sideways on a phone.

const SHADES = [
  "bg-stone-100 dark:bg-stone-800",
  "bg-secondary/25",
  "bg-secondary/50",
  "bg-secondary/75",
  "bg-secondary",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const longDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});

const YearHeatmap = ({
  rows, year, years, onYear, demo,
}) => {
  const grid = useMemo(() => heatmap(rows, year), [rows, year]);
  const yearRows = useMemo(() => rows.filter((r) => r.date && r.date.startsWith(String(year))), [rows, year]);
  const [picked, setPicked] = useState(null);
  const sum = totals(yearRows);
  const streak = streaks(yearRows);
  const pickedRows = picked ? yearRows.filter((r) => r.date === picked) : [];

  const byMonth = useMemo(() => {
    const m = new Array(12).fill(0);
    yearRows.forEach((r) => { m[Number(r.date.slice(5, 7)) - 1] += Number(r.distance) || 0; });
    return m;
  }, [yearRows]);
  const byWeekday = useMemo(() => {
    const w = new Array(7).fill(0);
    yearRows.forEach((r) => { w[(new Date(`${r.date}T00:00:00Z`).getUTCDay() + 6) % 7] += Number(r.distance) || 0; });
    return w;
  }, [yearRows]);
  const mMax = Math.max(1, ...byMonth);
  const wMax = Math.max(1, ...byWeekday);
  const wSum = byWeekday.reduce((a, b) => a + b, 0) || 1;

  const monthLabels = grid.weeks.map((w, i) => {
    const first = w.find(Boolean);
    const m = first ? Number(first.date.slice(5, 7)) - 1 : null;
    const prev = i ? grid.weeks[i - 1].find(Boolean) : null;
    const prevM = prev ? Number(prev.date.slice(5, 7)) - 1 : null;
    return m != null && m !== prevM ? MONTHS[m] : "";
  });

  const facts = [
    { k: "Activities", v: sum.count ? sum.count.toLocaleString() : null },
    { k: "Distance", v: sum.distance ? formatDistance(sum.distance) : null },
    { k: "Moving time", v: sum.movingTime ? `${Math.round(sum.movingTime / 3600)} h` : null },
    { k: "Active days", v: grid.activeDays ? `${grid.activeDays}` : null },
    { k: "Longest streak", v: streak.longest > 1 ? `${streak.longest} days` : null },
  ].filter((f) => f.v);

  return (
    <section className="flex flex-col gap-6" aria-label={`${year} calendar`}>
      <div className="flex flex-wrap items-center gap-2">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            aria-pressed={y === year}
            onClick={() => { onYear(y); setPicked(null); }}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${y === year
              ? "bg-secondary text-white border-secondary"
              : "bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:text-secondary"}`}
          >
            {y}
          </button>
        ))}
      </div>

      {facts.length > 0 ? (
        <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-0">
          {facts.map((f) => (
            <div key={f.k} className="rounded-xl border border-stone-200 dark:border-stone-800 p-3 bg-white dark:bg-stone-900/60">
              <dt className="font-label text-[10px] uppercase tracking-widest text-stone-400">{f.k}</dt>
              <dd className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0 tabular-nums">{f.v}</dd>
            </div>
          ))}
        </dl>
      ) : <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mb-0">Nothing logged this year.</p>}

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4 md:p-5">
        <div className="overflow-x-auto pb-2 tr-scroll-x">
          <div className="inline-flex gap-2">
            <div className="flex flex-col gap-[3px] pt-4 font-label text-[9px] text-stone-400" aria-hidden="true">
              {WEEKDAYS.map((d, i) => <span key={d} className="h-[14px] leading-[14px]">{i % 2 === 0 ? d : ""}</span>)}
            </div>
            <div className="inline-flex flex-col gap-1">
              <div className="flex gap-[3px] font-label text-[9px] text-stone-400 h-3" aria-hidden="true">
                {monthLabels.map((m, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <span key={i} className="w-[14px] overflow-visible whitespace-nowrap">{m}</span>
                ))}
              </div>
              <div className="flex gap-[3px]">
                {grid.weeks.map((week) => (
                  <div key={week.find(Boolean)?.date} className="flex flex-col gap-[3px]">
                    {week.map((d, i) => (d ? (
                      <button
                        key={d.date}
                        type="button"
                        disabled={!d.count}
                        onClick={() => setPicked(d.date === picked ? null : d.date)}
                        aria-pressed={picked === d.date}
                        aria-label={d.count ? `${d.date}: ${d.count} activities, ${formatDistance(d.distance)}` : `${d.date}: rest day`}
                        title={d.count ? `${d.date} · ${formatDistance(d.distance)} · ${formatDuration(d.movingTime)}` : d.date}
                        className={`block w-[14px] h-[14px] rounded-[3px] transition-transform ${SHADES[intensity(d.distance, grid.max) || (d.count ? 1 : 0)]} ${d.count ? "hover:scale-150 hover:z-10 cursor-pointer" : "cursor-default"} ${picked === d.date ? "ring-2 ring-offset-1 ring-stone-900 dark:ring-white scale-125" : ""}`}
                      />
                    // eslint-disable-next-line react/no-array-index-key
                    ) : <span key={`x${i}`} className="block w-[14px] h-[14px]" />))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <div className="flex items-center gap-1 font-label text-[9px] uppercase tracking-widest text-stone-400">
            Rest
            {SHADES.map((s) => <span key={s} className={`inline-block w-3 h-3 rounded-sm ${s}`} />)}
            Biggest day
          </div>
          <span className="font-label text-[10px] uppercase tracking-widest text-stone-400">Pick a day to see it</span>
        </div>

        {picked && (
          <div className="mt-4 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 p-4 tr-rise">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="font-headline text-lg text-stone-900 dark:text-stone-100 mb-0">{longDate(picked)}</p>
              <button type="button" onClick={() => setPicked(null)} className="material-symbols-outlined text-stone-400 hover:text-secondary" aria-label="Close the day">close</button>
            </div>
            <ul className="flex flex-col gap-2 pl-0 mb-0 list-none">
              {pickedRows.map((r) => (
                <li key={r.id}>
                  <Link to={`/training/${r.id}`} className="flex items-center gap-3 no-underline group">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: famColor(sportFamily(r.sport)) }} aria-hidden="true">
                      <span className="material-symbols-outlined text-base">{FAMILY_ICONS[sportFamily(r.sport)]}</span>
                    </span>
                    <span className="flex-1 font-body text-sm text-stone-900 dark:text-stone-100 group-hover:text-secondary">{r.name}</span>
                    <span className="font-label text-xs tabular-nums text-stone-500">{[formatDistance(r.distance), formatDuration(r.movingTime)].filter(Boolean).join(" · ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {pickedRows[0] && (
              <div className="mt-4">
                <DayLoader key={pickedRows[0].id} id={pickedRows[0].id} demo={demo} title={pickedRows[0].name} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[2fr_1fr] gap-4">
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4">
          <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mb-3">Kilometres per month</p>
          <div className="flex items-end gap-1.5 h-28">
            {byMonth.map((v, i) => (
              <div key={MONTHS[i]} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group" title={`${MONTHS[i]}: ${Math.round(v / 1000)} km`}>
                <span className="font-label text-[9px] tabular-nums text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity">{Math.round(v / 1000)}</span>
                <span className="w-full rounded-t-md bg-secondary/80 group-hover:bg-secondary tr-grow" style={{ height: `${(v / mMax) * 100}%`, animationDelay: `${i * 40}ms` }} />
                <span className="font-label text-[9px] text-stone-400">{MONTHS[i][0]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4">
          <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mb-3">The week&apos;s rhythm</p>
          <ul className="flex flex-col gap-1.5 pl-0 mb-0 list-none">
            {byWeekday.map((v, i) => (
              <li key={WEEKDAYS[i]} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-stone-500">{WEEKDAYS[i]}</span>
                <span className="flex-1 h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <span className="block h-full rounded-full bg-secondary/80" style={{ width: `${(v / wMax) * 100}%`, transition: "width .8s" }} />
                </span>
                <span className="w-9 text-right tabular-nums text-stone-500">{`${Math.round((v / wSum) * 100)}%`}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

YearHeatmap.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number })).isRequired,
  year: PropTypes.number.isRequired,
  years: PropTypes.arrayOf(PropTypes.number).isRequired,
  onYear: PropTypes.func.isRequired,
  demo: PropTypes.bool,
};

YearHeatmap.defaultProps = { demo: false };

export default YearHeatmap;
