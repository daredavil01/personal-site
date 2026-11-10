import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import RouteShape from "../RouteShape";
import {
  FAMILY_ICONS, famColor,
} from "../shared";
import { isRaceWorkout, sportFamily, totals } from "../../../lib/training";
import {
  formatDistance, formatDuration, formatEffortSpeed, sportLabel,
} from "../../../lib/strava";

// The log, grouped by month. Each month opens with its totals and a strip of
// its sports; each activity is a row with its route (when it has one), the
// numbers that matter for its sport and a thin bar of its distance against
// the longest in view, so a long run stands out while scrolling.

const PAGE = 60;
const monthTitle = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const weekday = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });

const Metric = ({ label, value }) => (value ? (
  <span className="flex flex-col items-end">
    <span className="font-headline text-base md:text-lg leading-none tabular-nums text-stone-900 dark:text-stone-100">{value}</span>
    <span className="font-label text-[9px] uppercase tracking-widest text-stone-400 mt-1">{label}</span>
  </span>
) : null);
Metric.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string };
Metric.defaultProps = { value: "" };

const ActivityLog = ({ rows }) => {
  const [shown, setShown] = useState(PAGE);
  const page = rows.slice(0, shown);
  const longest = useMemo(() => Math.max(1, ...rows.map((r) => Number(r.distance) || 0)), [rows]);
  const months = useMemo(() => {
    const out = [];
    page.forEach((r) => {
      const m = (r.date || "").slice(0, 7);
      if (!out.length || out[out.length - 1].month !== m) out.push({ month: m, rows: [] });
      out[out.length - 1].rows.push(r);
    });
    return out;
  }, [page]);

  return (
    <div className="flex flex-col gap-8">
      {months.map((g) => {
        const all = rows.filter((r) => (r.date || "").startsWith(g.month));
        const t = totals(all);
        const mix = {};
        all.forEach((r) => { const f = sportFamily(r.sport); mix[f] = (mix[f] || 0) + 1; });
        return (
          <section key={g.month} aria-label={monthTitle(g.month)}>
            <header className="sticky top-0 z-10 -mx-2 px-2 py-2 mb-2 bg-white/90 dark:bg-stone-950/90 backdrop-blur flex flex-wrap items-end justify-between gap-2 border-b border-stone-200 dark:border-stone-800">
              <h3 className="font-headline text-2xl mb-0 text-stone-900 dark:text-stone-100">{monthTitle(g.month)}</h3>
              <div className="flex items-center gap-3">
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 tabular-nums">
                  {[`${t.count} activities`, formatDistance(t.distance), t.movingTime ? `${Math.round(t.movingTime / 3600)} h` : null].filter(Boolean).join(" · ")}
                </span>
                <span className="hidden sm:flex h-2 w-24 rounded-full overflow-hidden gap-[2px] bg-stone-100 dark:bg-stone-800" aria-hidden="true">
                  {Object.entries(mix).map(([f, n]) => <span key={f} style={{ width: `${(n / t.count) * 100}%`, background: famColor(f) }} />)}
                </span>
              </div>
            </header>
            <ul className="flex flex-col pl-0 mb-0 list-none divide-y divide-stone-100 dark:divide-stone-800/80">
              {g.rows.map((r) => {
                const f = sportFamily(r.sport);
                const race = r.sportId || isRaceWorkout(r.workoutType);
                return (
                  <li key={r.id}>
                    <Link
                      to={`/training/${r.id}`}
                      className={`group relative grid grid-cols-[2.75rem_1fr_auto] ${r.route ? "md:grid-cols-[2.75rem_3.5rem_1fr_auto]" : ""} items-center gap-3 md:gap-4 py-3 px-2 rounded-xl no-underline hover:bg-stone-50 dark:hover:bg-stone-900/60 transition-colors`}
                    >
                      <span className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-sm" style={{ background: famColor(f) }} aria-hidden="true">
                        <span className="material-symbols-outlined text-xl">{FAMILY_ICONS[f]}</span>
                      </span>
                      {/* The list rows carry no polyline (it is most of a row's weight), so the thumbnail shows only for rows that do: the sample log. */}
                      {r.route && (
                        <span className="hidden md:block w-14 h-14 text-stone-400 group-hover:text-[color:var(--tr-accent)] transition-colors" aria-hidden="true">
                          <RouteShape polyline={r.route} className="w-full h-full" strokeWidth={1.5} />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="font-body font-medium text-stone-900 dark:text-stone-100 truncate group-hover:text-secondary transition-colors">{r.name}</span>
                          {race && <span className="shrink-0 px-1.5 py-0.5 rounded bg-secondary text-white font-label text-[9px] uppercase tracking-widest">Race</span>}
                        </span>
                        <span className="block font-label text-[10px] uppercase tracking-widest text-stone-400 mt-1 truncate">
                          {[weekday(r.date), r.startLocal ? r.startLocal.slice(11, 16) : null, sportLabel(r.sport), r.averageHeartrate ? `♥ ${Math.round(r.averageHeartrate)}` : null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="flex items-center gap-4 md:gap-6">
                        <Metric label="km" value={formatDistance(r.distance).replace(" km", "")} />
                        <span className="hidden sm:block"><Metric label="time" value={formatDuration(r.movingTime)} /></span>
                        <span className="hidden lg:block"><Metric label={sportFamily(r.sport) === "ride" || sportFamily(r.sport) === "swim" ? "speed" : "pace"} value={formatEffortSpeed(r.sport, r.averageSpeed).replace(/ \/km| km\/h/, "")} /></span>
                        <span className="hidden lg:block"><Metric label="climb m" value={r.elevationGain ? String(Math.round(r.elevationGain)) : ""} /></span>
                      </span>
                      <span className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full overflow-hidden" aria-hidden="true">
                        <span className="block h-full opacity-60 group-hover:opacity-100 transition-opacity" style={{ width: `${((Number(r.distance) || 0) / longest) * 100}%`, background: famColor(f) }} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {shown < rows.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="self-center px-5 py-2.5 rounded-full border border-stone-200 dark:border-stone-700 font-label text-xs uppercase tracking-widest text-stone-600 dark:text-stone-300 hover:text-secondary hover:border-secondary/40"
        >
          {`Show ${Math.min(PAGE, rows.length - shown)} more`}
        </button>
      )}
    </div>
  );
};

ActivityLog.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number })).isRequired,
};

export default ActivityLog;
