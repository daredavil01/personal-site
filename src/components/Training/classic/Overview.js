import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import YearRace from "./YearRace";
import MonthlyBars from "./MonthlyBars";
import RecordMedals from "../RecordMedals";
import Milestones from "../Milestones";
import RouteShape from "../RouteShape";
import { FAMILY_ICONS, famColor } from "../shared";
import {
  FAMILY_LABELS, cumulativeYear, sportFamily, totalsByFamily, yearsOf,
} from "../../../lib/training";
import {
  formatDistance, formatDuration, formatEffortSpeed,
} from "../../../lib/strava";

// The classic layout's first tab: the year against past years, months by
// sport, the sport mix, the medal case, the road so far and the latest four.

const Card = ({
  title, kicker, children, action,
}) => (
  <section className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-5 md:p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        {kicker && <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">{kicker}</p>}
        <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </section>
);
Card.propTypes = {
  title: PropTypes.string.isRequired, kicker: PropTypes.string, children: PropTypes.node.isRequired, action: PropTypes.node,
};
Card.defaultProps = { kicker: null, action: null };

const Sparkbars = ({ splits }) => {
  if (!splits || splits.length < 2) return null;
  const speeds = splits.map((s) => s.average_speed || 0);
  const lo = Math.min(...speeds);
  const hi = Math.max(...speeds);
  return (
    <span className="flex items-end gap-[2px] h-8" aria-hidden="true">
      {speeds.slice(0, 32).map((v, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <span key={i} className="flex-1 rounded-sm bg-secondary/70" style={{ height: `${25 + ((v - lo) / (hi - lo || 1)) * 75}%` }} />
      ))}
    </span>
  );
};
Sparkbars.propTypes = { splits: PropTypes.arrayOf(PropTypes.shape({})) };
Sparkbars.defaultProps = { splits: [] };

const Overview = ({ rows, today }) => {
  const years = useMemo(() => yearsOf(rows), [rows]);
  const [year, setYear] = useState(years[0]);
  const fams = useMemo(() => totalsByFamily(rows), [rows]);
  const totalDist = fams.reduce((s, f) => s + f.distance, 0) || 1;

  const pace = useMemo(() => {
    if (years.length < 2) return null;
    const now = cumulativeYear(rows, years[0], today);
    const before = cumulativeYear(rows, years[1], today);
    const d = now.length - 1;
    if (d < 0) return null;
    return { now: now[d], before: before[Math.min(d, before.length - 1)], y: years[0], prev: years[1] };
  }, [rows, years, today]);

  const recent = rows.slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <Card
        kicker="Year against year"
        title={pace ? `${Math.round(pace.now / 1000).toLocaleString()} km so far in ${pace.y}` : "The years, day by day"}
        action={pace && pace.before > 0 && (
          <span className={`px-3 py-1 rounded-full font-label text-xs uppercase tracking-wider font-bold ${pace.now >= pace.before ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" : "bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"}`}>
            <span className="material-symbols-outlined text-sm align-middle mr-1" aria-hidden="true">{pace.now >= pace.before ? "trending_up" : "trending_down"}</span>
            {`${Math.abs(Math.round((pace.now - pace.before) / 1000)).toLocaleString()} km ${pace.now >= pace.before ? "ahead of" : "behind"} ${pace.prev}`}
          </span>
        )}
      >
        <YearRace rows={rows} today={today} />
      </Card>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
        <Card
          kicker="Month by month"
          title={`${year}, by sport`}
          action={(
            <div className="flex flex-wrap gap-1" role="group" aria-label="Year">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  aria-pressed={y === year}
                  onClick={() => setYear(y)}
                  className={`px-2.5 py-1 rounded-md text-xs border ${y === year ? "bg-secondary text-white border-secondary" : "border-stone-200 dark:border-stone-700 text-stone-500 hover:text-secondary"}`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        >
          <MonthlyBars rows={rows} year={year} />
        </Card>

        <Card kicker="The mix" title="Where the kilometres went">
          <div className="flex h-4 rounded-full overflow-hidden gap-[2px] mb-5" role="img" aria-label={fams.map((f) => `${FAMILY_LABELS[f.family]} ${Math.round((f.distance / totalDist) * 100)}%`).join(", ")}>
            {fams.filter((f) => f.distance > 0).map((f) => (
              <span key={f.family} style={{ width: `${(f.distance / totalDist) * 100}%`, background: famColor(f.family) }} />
            ))}
          </div>
          <ul className="flex flex-col gap-3 pl-0 mb-0 list-none">
            {fams.map((f) => (
              <li key={f.family} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: famColor(f.family) }} aria-hidden="true">
                  <span className="material-symbols-outlined text-lg">{FAMILY_ICONS[f.family]}</span>
                </span>
                <span className="flex-1">
                  <span className="block font-body text-sm text-stone-900 dark:text-stone-100">{FAMILY_LABELS[f.family]}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-400">
                    {[`${f.count} activities`, f.movingTime ? `${Math.round(f.movingTime / 3600)} h` : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-headline text-lg tabular-nums text-stone-900 dark:text-stone-100">{formatDistance(f.distance) || "—"}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-400 tabular-nums">{`${Math.round((f.distance / totalDist) * 100)}%`}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card kicker="The medal case" title="Personal records" action={<span className="font-label text-[10px] uppercase tracking-widest text-stone-400">Hover or tap a medal</span>}>
        <RecordMedals rows={rows} />
      </Card>

      <Card kicker="The road so far" title="Milestones">
        <Milestones rows={rows} />
      </Card>

      <Card kicker="Latest" title="Fresh off the watch">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pl-0 mb-0 list-none">
          {recent.map((r) => {
            const f = sportFamily(r.sport);
            return (
              <li key={r.id}>
                <Link to={`/training/${r.id}`} className="group flex flex-col h-full rounded-xl border border-stone-200 dark:border-stone-800 p-4 no-underline hover:-translate-y-0.5 hover:shadow-lg transition-all bg-gradient-to-b from-white to-stone-50 dark:from-stone-900 dark:to-stone-950">
                  <span className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 font-label text-[10px] uppercase tracking-widest text-stone-500">
                      <span className="w-2 h-2 rounded-full" style={{ background: famColor(f) }} aria-hidden="true" />
                      {r.date}
                    </span>
                    <span className="material-symbols-outlined text-base text-stone-300 group-hover:text-secondary transition-colors" aria-hidden="true">arrow_outward</span>
                  </span>
                  <span className="h-24 mb-2 text-stone-700 dark:text-stone-300 group-hover:text-secondary transition-colors" aria-hidden="true">
                    {r.route
                      ? <RouteShape polyline={r.route} className="w-full h-full" strokeWidth={2} />
                      : <span className="material-symbols-outlined text-6xl text-stone-200 dark:text-stone-700 w-full h-full flex items-center justify-center">{FAMILY_ICONS[f]}</span>}
                  </span>
                  <span className="font-body font-medium text-stone-900 dark:text-stone-100 truncate mb-1">{r.name}</span>
                  <span className="font-label text-[11px] uppercase tracking-wider text-stone-500 tabular-nums mb-3">
                    {[formatDistance(r.distance), formatDuration(r.movingTime), formatEffortSpeed(r.sport, r.averageSpeed)].filter(Boolean).join(" · ")}
                  </span>
                  <span className="mt-auto"><Sparkbars splits={r.splits} /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
};

Overview.propTypes = { rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired, today: PropTypes.string };
Overview.defaultProps = { today: undefined };

export default Overview;
