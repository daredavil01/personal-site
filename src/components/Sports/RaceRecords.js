import React from "react";
import PropTypes from "prop-types";
import { Panel } from "../common/LogKit";
import {
  formatDelta, formatDuration, formatPace, formatRaceDay, riegel,
} from "../../lib/raceLog";

// The Records tab: one card per distance (the PB, how long it has stood, how
// far it came from the first attempt, and the ladder of PBs that led to it),
// then what the half-marathon PB predicts elsewhere by Riegel's formula.

const ago = (days) => {
  if (days == null) return null;
  if (days < 45) return `${days} days`;
  const months = Math.round(days / 30.4);
  return months < 18 ? `${months} months` : `${(days / 365).toFixed(1)} years`;
};

export const RecordCards = ({ bests, onOpen }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
    {bests.map((b) => (
      <article key={b.key} className="flex flex-col rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 overflow-hidden">
        <header className="p-5 pb-4 bg-gradient-to-br from-secondary/10 to-transparent">
          <p className="mb-1 font-label text-[10px] uppercase tracking-widest font-bold text-secondary">{b.name}</p>
          <p className="mb-1 font-headline text-4xl font-black tabular-nums text-stone-900 dark:text-stone-100">{formatDuration(b.best.secs)}</p>
          <p className="mb-0 font-body text-sm text-stone-500 dark:text-stone-400">{`${formatPace(b.best.pace)} /km`}</p>
        </header>
        <div className="p-5 pt-3 flex flex-col gap-3 flex-1">
          <button type="button" onClick={() => onOpen(b.best)} className="text-left font-body font-bold text-stone-800 dark:text-stone-200 hover:text-secondary">
            {b.best.title}
            <span className="block font-normal text-xs text-stone-400">{formatRaceDay(b.best.dateObj)}</span>
          </button>
          <ul className="m-0 p-0 list-none flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-stone-500 dark:text-stone-400">
            <li>{`Run ${b.count}×`}</li>
            {b.standingDays != null && <li>{`Standing for ${ago(b.standingDays)}`}</li>}
            {b.gainedSecs != null && <li className="text-emerald-700 dark:text-emerald-400 font-bold">{`${formatDuration(b.gainedSecs)} faster than the first`}</li>}
            {b.count > 1 && <li>{`Average ${formatDuration(b.avgSecs)}`}</li>}
          </ul>
          {b.history.length > 1 && (
            <ol className="mt-auto m-0 p-0 list-none border-t border-stone-100 dark:border-stone-800 pt-3 flex flex-col gap-1.5" aria-label={`${b.name} personal-best ladder`}>
              {b.history.slice().reverse().map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-xs">
                  <button type="button" onClick={() => onOpen(h)} className="text-left text-stone-600 dark:text-stone-300 hover:text-secondary truncate">
                    <span className="inline-block w-10 text-stone-400 tabular-nums">{h.year}</span>
                    {h.title}
                  </button>
                  <span className="shrink-0 font-bold tabular-nums text-stone-800 dark:text-stone-200">
                    {formatDuration(h.secs)}
                    {h.improvedBy != null && <span className="ml-1.5 text-emerald-700 dark:text-emerald-400 font-normal">{formatDelta(-h.improvedBy)}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </article>
    ))}
  </div>
);

RecordCards.propTypes = {
  bests: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onOpen: PropTypes.func.isRequired,
};

/** What one PB predicts at the other distances, against what was run. */
export const Equivalents = ({ bests }) => {
  const base = bests.find((b) => b.key === 21) ?? bests.reduce((a, b) => (!a || b.count > a.count ? b : a), null);
  if (!base || bests.length < 2) return null;
  const rows = bests.filter((b) => b.key !== base.key).map((b) => {
    const predicted = riegel(base.best.secs, base.km, b.km);
    return {
      ...b, predicted, diff: b.best.secs - predicted,
    };
  });
  return (
    <Panel
      title={`What the ${base.name.toLowerCase()} PB predicts`}
      subtitle={`Riegel's formula (T₂ = T₁ × (D₂/D₁)^1.06) turns ${formatDuration(base.best.secs)} into an equivalent at each distance. An estimate, not a promise: it ignores hills, heat and the wall.`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left font-label text-[10px] uppercase tracking-widest text-stone-400">
              <th scope="col" className="py-2 pr-4 font-bold">Distance</th>
              <th scope="col" className="py-2 pr-4 font-bold">Predicted</th>
              <th scope="col" className="py-2 pr-4 font-bold">Actual PB</th>
              <th scope="col" className="py-2 font-bold">Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-stone-100 dark:border-stone-800">
                <th scope="row" className="py-2.5 pr-4 text-left font-bold text-stone-800 dark:text-stone-200">{r.name}</th>
                <td className="py-2.5 pr-4 tabular-nums text-stone-600 dark:text-stone-300">{formatDuration(r.predicted)}</td>
                <td className="py-2.5 pr-4 tabular-nums font-bold text-stone-900 dark:text-stone-100">{formatDuration(r.best.secs)}</td>
                <td className={`py-2.5 tabular-nums font-bold ${r.diff <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-stone-500"}`}>
                  {`${formatDelta(Math.round(r.diff))} ${r.diff <= 0 ? "(beat it)" : "to find"}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

Equivalents.propTypes = { bests: PropTypes.arrayOf(PropTypes.shape({})).isRequired };
