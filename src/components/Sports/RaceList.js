import React from "react";
import PropTypes from "prop-types";
import {
  distanceName, formatDelta, formatDuration, formatPace, formatRaceDay,
} from "../../lib/raceLog";

// The Races lens as a dense, sortable table (the bib wall is BibWall.js).
// A row opens the race; the table header sorts.

const PbBadge = ({ race }) => {
  if (race.isBest) return <span className="px-2 py-0.5 rounded-full bg-secondary text-white font-label text-[10px] font-black uppercase tracking-wider">PB</span>;
  if (race.wasPB && !race.firstAtDistance) return <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-label text-[10px] font-black uppercase tracking-wider" title="A personal best when it was run">Was PB</span>;
  return null;
};

PbBadge.propTypes = { race: PropTypes.shape({}).isRequired };

const gapText = (r) => (r.isBest || r.gapToBest == null ? "" : `${formatDelta(r.gapToBest)} off PB`);

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

// eslint-disable-next-line import/prefer-default-export -- named, like the other log tables
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
