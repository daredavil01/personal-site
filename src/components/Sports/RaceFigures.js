import React from "react";
import PropTypes from "prop-types";
import {
  MONTHS, distanceName, formatDelta, formatDuration, formatRaceDay,
} from "../../lib/raceLog";

// Two small figures for the Overview: the racing calendar (every race as a dot
// in its year and month) and the events run more than once.

const dotSize = (km) => {
  if (km >= 40) return 22;
  if (km >= 30) return 18;
  if (km >= 20) return 14;
  return 10;
};

export const RaceCalendar = ({ races, onOpen }) => {
  const years = [...new Set(races.map((r) => r.year).filter(Boolean))].sort((a, b) => b - a);
  if (!years.length) return null;
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[480px] border-separate border-spacing-1">
        <caption className="sr-only">Races by year and month</caption>
        <thead>
          <tr>
            <th scope="col" className="w-12"><span className="sr-only">Year</span></th>
            {MONTHS.map((m) => (
              <th key={m} scope="col" className="font-label text-[10px] uppercase tracking-wider text-stone-400 font-bold">{m.slice(0, 3)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((yr) => (
            <tr key={yr}>
              <th scope="row" className="font-label text-xs font-bold text-stone-500 dark:text-stone-400 text-left">{yr}</th>
              {MONTHS.map((m, mi) => {
                const at = races.filter((r) => r.year === yr && r.month === mi);
                return (
                  <td key={m} className={`h-11 rounded-md text-center align-middle ${at.length ? "bg-secondary/5 dark:bg-secondary/10" : "bg-stone-50 dark:bg-stone-800/40"}`}>
                    <div className="flex items-center justify-center gap-0.5 flex-wrap">
                      {at.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => onOpen(r)}
                          title={`${r.title} · ${r.distance} · ${r.time}`}
                          aria-label={`${r.title}, ${formatRaceDay(r.dateObj)}, ${r.distance}`}
                          className={`rounded-full transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-secondary ${r.isBest ? "bg-secondary" : "bg-secondary/60"}`}
                          style={{ width: dotSize(r.km), height: dotSize(r.km) }}
                        />
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 mb-0 font-body text-xs text-stone-500 dark:text-stone-400">Bigger dots are longer races; the darkest are standing personal bests. Tap one to open it.</p>
    </div>
  );
};

RaceCalendar.propTypes = {
  races: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onOpen: PropTypes.func.isRequired,
};

/** Each repeated event as a row: its attempts placed on a shared time scale. */
export const RepeatEvents = ({ events, onOpen }) => {
  if (!events.length) return null;
  return (
    <>
      <p className="mb-3 flex justify-between font-label text-[10px] uppercase tracking-widest text-stone-400" aria-hidden="true">
        <span>← Faster</span>
        <span>Slower →</span>
      </p>
      <ul className="flex flex-col gap-5 m-0 p-0 list-none">
      {events.map((e) => {
        const secs = e.runs.map((r) => r.secs);
        const lo = Math.min(...secs);
        const hi = Math.max(...secs);
        const pos = (s) => (hi === lo ? 50 : 6 + ((s - lo) / (hi - lo)) * 88);
        const faster = e.change < 0;
        return (
          <li key={e.name}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <span className="font-body font-bold text-stone-800 dark:text-stone-200">
                {e.name}
                <span className="ml-2 font-label text-[10px] uppercase tracking-widest text-stone-400">{`${distanceName(e.distKey)} · ${e.runs.length} times`}</span>
              </span>
              <span className={`font-label text-xs font-bold tabular-nums ${faster ? "text-emerald-700 dark:text-emerald-400" : "text-stone-500"}`}>
                {`${e.runs.map((r) => r.year).join(" → ")}: ${formatDelta(e.change)}`}
              </span>
            </div>
            <div className="relative h-8 rounded-full bg-stone-100 dark:bg-stone-800">
              {e.runs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onOpen(r)}
                  aria-label={`${r.title}: ${formatDuration(r.secs)}`}
                  title={`${r.year}: ${formatDuration(r.secs)}`}
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full font-label text-[10px] font-black tabular-nums shadow-sm transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                    r.id === e.best.id ? "bg-secondary text-white" : "bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600"
                  }`}
                  style={{ left: `${pos(r.secs)}%` }}
                >
                  {`’${String(r.year).slice(2)}`}
                </button>
              ))}
            </div>
          </li>
        );
      })}
      </ul>
    </>
  );
};

RepeatEvents.propTypes = {
  events: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onOpen: PropTypes.func.isRequired,
};
