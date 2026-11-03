import React, { useMemo } from "react";
import PropTypes from "prop-types";
import CountUp from "../../Stats/CountUp";
import { SampleRibbon } from "../shared";
import {
  streaks, totals, totalsByMonth, yearsOf,
} from "../../../lib/training";

// The classic header: the title, six counters that count up once, and the
// last two years of monthly distance as a sparkline under them.

const Spark = ({ months }) => {
  if (months.length < 3) return null;
  const W = 600;
  const H = 70;
  const max = Math.max(1, ...months.map((m) => m.distance));
  const x = (i) => (i / (months.length - 1)) * W;
  const y = (v) => H - 6 - (v / max) * (H - 14);
  const line = months.map((m, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(m.distance).toFixed(1)}`).join("");
  const last = months[months.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-16" role="img" aria-label={`Monthly distance, last ${months.length} months`}>
      <defs>
        <linearGradient id="tr-spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#b22200" stopOpacity="0.25" />
          <stop offset="1" stopColor="#b22200" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${W} ${H}L0 ${H}Z`} fill="url(#tr-spark)" />
      <path d={line} fill="none" stroke="#b22200" strokeWidth="2" vectorEffect="non-scaling-stroke" pathLength="1" className="tr-trace" />
      <circle cx={x(months.length - 1)} cy={y(last.distance)} r="4" fill="#b22200" />
    </svg>
  );
};
Spark.propTypes = { months: PropTypes.arrayOf(PropTypes.shape({ distance: PropTypes.number })).isRequired };

const ClassicHeader = ({ rows, demo }) => {
  const t = useMemo(() => totals(rows), [rows]);
  const years = yearsOf(rows);
  const days = useMemo(() => new Set(rows.map((r) => r.date)).size, [rows]);
  const streak = useMemo(() => streaks(rows).longest, [rows]);
  const months = useMemo(() => totalsByMonth(rows).slice(0, 24).reverse(), [rows]);
  const tiles = [
    { k: "Activities", v: t.count, icon: "bolt" },
    { k: "Kilometres", v: Math.round(t.distance / 1000), icon: "straighten" },
    { k: "Hours moving", v: Math.round(t.movingTime / 3600), icon: "timer" },
    { k: "Metres climbed", v: Math.round(t.elevationGain), icon: "landscape" },
    { k: "Active days", v: days, icon: "event_available" },
    { k: "Longest streak", v: streak > 1 ? streak : 0, icon: "local_fire_department", unit: "days" },
  ].filter((x) => x.v > 0);

  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-label text-xs uppercase tracking-widest text-secondary mb-0 font-bold">
          {`Strava${years.length ? ` · ${years[years.length - 1]}–${years[0]}` : ""}`}
        </p>
        {demo && <SampleRibbon />}
      </div>
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-end">
        <div>
          <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-5">
            Training.
          </h1>
          <p className="max-w-xl text-xl text-stone-500 dark:text-stone-400 font-light leading-relaxed mb-0">
            Every run, ride, hike and swim, straight from Strava — the years against each other, the records, the routes and every single splits table.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 px-4 pt-3">
          <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mb-0">Kilometres a month, last two years</p>
          <Spark months={months} />
        </div>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-0">
        {tiles.map((x) => (
          <div key={x.k} className="group rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4 hover:border-secondary/40 hover:-translate-y-0.5 transition-all">
            <dt className="flex items-center gap-1.5 font-label text-[10px] uppercase tracking-widest text-stone-400 mb-1">
              <span className="material-symbols-outlined text-sm text-secondary" aria-hidden="true">{x.icon}</span>
              {x.k}
            </dt>
            <dd className="font-headline text-3xl text-stone-900 dark:text-stone-100 mb-0 tabular-nums">
              <CountUp value={x.v} />
              {x.unit && <span className="text-sm text-stone-400 ml-1">{x.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
};

ClassicHeader.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  demo: PropTypes.bool.isRequired,
};

export default ClassicHeader;
