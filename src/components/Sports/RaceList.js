import React from "react";
import PropTypes from "prop-types";
import {
  distanceName, formatDelta, formatDuration, formatPace, formatRaceDay,
} from "../../lib/raceLog";

// The Races tab: the same filtered, sorted list as photo cards or a dense,
// sortable table. Both open the quick-look sheet; the table header sorts.

const PbBadge = ({ race }) => {
  if (race.isBest) return <span className="px-2 py-0.5 rounded-full bg-secondary text-white font-label text-[10px] font-black uppercase tracking-wider">PB</span>;
  if (race.wasPB && !race.firstAtDistance) return <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-label text-[10px] font-black uppercase tracking-wider" title="A personal best when it was run">Was PB</span>;
  return null;
};

PbBadge.propTypes = { race: PropTypes.shape({}).isRequired };

const gapText = (r) => (r.isBest || r.gapToBest == null ? "" : `${formatDelta(r.gapToBest)} off PB`);

export const RaceCards = ({ races, onOpen }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
    {races.map((r) => {
      const photo = r.slideImages?.[0]?.url;
      return (
        <button
          key={r.id}
          type="button"
          onClick={() => onOpen(r)}
          className="group text-left flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 hover:border-secondary hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <div className="relative aspect-[16/9] bg-stone-100 dark:bg-stone-800 overflow-hidden">
            {photo ? (
              <img src={photo} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-stone-300 dark:text-stone-600" aria-hidden="true">directions_run</span>
              </div>
            )}
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 dark:bg-stone-900/90 font-label text-[10px] font-black uppercase tracking-wider text-stone-800 dark:text-stone-100">
              {distanceName(r.distKey)}
            </span>
            <span className="absolute top-3 right-3"><PbBadge race={r} /></span>
          </div>
          <div className="p-5 flex flex-col gap-3 flex-1">
            <div>
              <h3 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-100 group-hover:text-secondary transition-colors mb-1 leading-snug">{r.title}</h3>
              <p className="mb-0 font-body text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">location_on</span>
                {`${r.place} · ${formatRaceDay(r.dateObj)}`}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 mt-auto pt-3 border-t border-stone-100 dark:border-stone-800">
              <div>
                <dt className="font-label text-[9px] uppercase tracking-widest text-stone-400">Time</dt>
                <dd className="m-0 font-headline text-base font-black tabular-nums text-stone-900 dark:text-stone-100">{formatDuration(r.secs) || r.time}</dd>
              </div>
              <div>
                <dt className="font-label text-[9px] uppercase tracking-widest text-stone-400">Pace</dt>
                <dd className="m-0 font-headline text-base font-black tabular-nums text-stone-900 dark:text-stone-100">{r.pace ? `${formatPace(r.pace)}` : "—"}</dd>
              </div>
              <div>
                <dt className="font-label text-[9px] uppercase tracking-widest text-stone-400">vs PB</dt>
                <dd className={`m-0 font-headline text-base font-black tabular-nums ${r.isBest ? "text-secondary" : "text-stone-500 dark:text-stone-400"}`}>{r.isBest ? "Best" : formatDelta(r.gapToBest) || "—"}</dd>
              </div>
            </dl>
          </div>
        </button>
      );
    })}
  </div>
);

RaceCards.propTypes = {
  races: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onOpen: PropTypes.func.isRequired,
};

const sortIcon = (on, dir) => {
  if (!on) return "unfold_more";
  return dir === "asc" ? "arrow_upward" : "arrow_downward";
};
const ariaSort = (on, dir) => {
  if (!on) return "none";
  return dir === "asc" ? "ascending" : "descending";
};

const COLUMNS = [
  { id: "date", label: "Date" },
  { id: "title", label: "Race" },
  { id: "distance", label: "Distance" },
  { id: "time", label: "Time" },
  { id: "pace", label: "Pace /km" },
];

export const RaceTable = ({
  races, onOpen, sort, dir, onSort,
}) => (
  <div className="overflow-x-auto rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
    <table className="w-full min-w-[640px] text-sm">
      <thead className="bg-stone-50 dark:bg-stone-800/50">
        <tr>
          {COLUMNS.map((c) => {
            const on = sort === c.id;
            return (
              <th key={c.id} scope="col" aria-sort={ariaSort(on, dir)} className="text-left px-4 py-3">
                <button
                  type="button"
                  onClick={() => onSort({ sort: c.id, dir: on && dir === "desc" ? "asc" : "desc" })}
                  className={`flex items-center gap-1 font-label text-[10px] uppercase tracking-widest font-bold ${on ? "text-secondary" : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"}`}
                >
                  {c.label}
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{sortIcon(on, dir)}</span>
                </button>
              </th>
            );
          })}
          <th scope="col" className="text-left px-4 py-3 font-label text-[10px] uppercase tracking-widest font-bold text-stone-500 dark:text-stone-400">vs PB</th>
        </tr>
      </thead>
      <tbody>
        {races.map((r) => (
          <tr key={r.id} onClick={() => onOpen(r)} className="border-t border-stone-100 dark:border-stone-800 hover:bg-secondary/5 cursor-pointer">
            <td className="px-4 py-3 whitespace-nowrap text-stone-500 dark:text-stone-400 tabular-nums">{formatRaceDay(r.dateObj)}</td>
            <td className="px-4 py-3">
              <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(r); }} className="text-left font-bold text-stone-900 dark:text-stone-100 hover:text-secondary">
                {r.title}
              </button>
              <span className="block text-xs text-stone-400">{r.place}</span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-stone-600 dark:text-stone-300">{distanceName(r.distKey)}</td>
            <td className="px-4 py-3 whitespace-nowrap font-bold tabular-nums text-stone-900 dark:text-stone-100">{formatDuration(r.secs) || r.time}</td>
            <td className="px-4 py-3 whitespace-nowrap tabular-nums text-stone-600 dark:text-stone-300">{formatPace(r.pace)}</td>
            <td className="px-4 py-3 whitespace-nowrap"><span className="flex items-center gap-2"><PbBadge race={r} /><span className="text-xs text-stone-400 tabular-nums">{gapText(r)}</span></span></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

RaceTable.propTypes = {
  races: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onOpen: PropTypes.func.isRequired,
  sort: PropTypes.string.isRequired,
  dir: PropTypes.string.isRequired,
  onSort: PropTypes.func.isRequired,
};
