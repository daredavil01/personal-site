import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import {
  formatDistance, formatDuration, formatEffortSpeed, sportLabel,
} from "../../lib/strava";

// The log: a table at desktop width, stacked rows on a phone. Paged in the
// browser (the rows are already loaded) so a 2,000-row log does not draw at once.

const PAGE = 50;
const cell = "px-3 py-2 text-sm whitespace-nowrap";

const ActivityTable = ({ rows }) => {
  const [shown, setShown] = useState(PAGE);
  const page = rows.slice(0, shown);

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden md:block overflow-x-auto border border-stone-100 dark:border-stone-800 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-stone-50 dark:bg-stone-900/60 font-label text-[10px] uppercase tracking-widest text-stone-400">
            <tr>
              <th className={cell} scope="col">Date</th>
              <th className={cell} scope="col">Activity</th>
              <th className={cell} scope="col">Sport</th>
              <th className={`${cell} text-right`} scope="col">Distance</th>
              <th className={`${cell} text-right`} scope="col">Time</th>
              <th className={`${cell} text-right`} scope="col">Pace / speed</th>
              <th className={`${cell} text-right`} scope="col">Elev.</th>
              <th className={`${cell} text-right`} scope="col">HR</th>
            </tr>
          </thead>
          <tbody>
            {page.map((r) => (
              <tr key={r.id} className="border-t border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900/40">
                <td className={`${cell} text-stone-500 dark:text-stone-400`}>{r.date}</td>
                <td className={`${cell} max-w-[20rem] truncate`}>
                  <Link to={`/training/${r.id}`} className="text-stone-900 dark:text-stone-100 no-underline hover:text-secondary">
                    {r.name}
                  </Link>
                  {r.sportId && <span className="ml-2 px-1.5 py-0.5 rounded bg-secondary text-white font-label text-[9px] uppercase tracking-widest">Race</span>}
                </td>
                <td className={`${cell} text-stone-500 dark:text-stone-400`}>{sportLabel(r.sport)}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatDistance(r.distance) || "—"}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatDuration(r.movingTime) || "—"}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatEffortSpeed(r.sport, r.averageSpeed) || "—"}</td>
                <td className={`${cell} text-right tabular-nums`}>{r.elevationGain ? `${Math.round(r.elevationGain)} m` : "—"}</td>
                <td className={`${cell} text-right tabular-nums`}>{r.averageHeartrate ? Math.round(r.averageHeartrate) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden flex flex-col gap-2 mb-0 pl-0 list-none">
        {page.map((r) => (
          <li key={r.id}>
            <Link
              to={`/training/${r.id}`}
              className="block p-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 no-underline"
            >
              <span className="block font-body text-sm text-stone-900 dark:text-stone-100 truncate">{r.name}</span>
              <span className="block font-label text-[10px] uppercase tracking-widest text-stone-400 mt-1">
                {[r.date, sportLabel(r.sport), formatDistance(r.distance), formatDuration(r.movingTime),
                  formatEffortSpeed(r.sport, r.averageSpeed)].filter(Boolean).join(" · ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {shown < rows.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="self-center px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 font-label text-xs uppercase tracking-widest text-stone-600 dark:text-stone-300 hover:text-secondary hover:border-secondary/40"
        >
          {`Show ${Math.min(PAGE, rows.length - shown)} more`}
        </button>
      )}
    </div>
  );
};

ActivityTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number })).isRequired,
};

export default ActivityTable;
