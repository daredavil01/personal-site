import React from "react";
import PropTypes from "prop-types";
import CardPhoto from "../common/CardPhoto";
import { LevelBadge, levelStyle } from "./TrekFigures";
import { SEASONS, formatTrekDay, formatTrekHours } from "../../lib/trekLog";

// The Log tab: the filtered treks as photo cards or a sortable table. Both
// open the quick-look sheet.

const seasonName = (id) => SEASONS.find((s) => s.id === id)?.name ?? "";

export const TrekCards = ({ treks, onOpen }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
    {treks.map((t) => {
      const photo = t.slideImages?.[0]?.url;
      return (
        <button
          key={t.id}
          type="button"
          onClick={() => onOpen(t)}
          className="group text-left flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 hover:border-secondary hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-800 overflow-hidden">
            {photo ? (
              <CardPhoto src={photo} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-stone-300 dark:text-stone-600" aria-hidden="true">landscape</span>
              </div>
            )}
            <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />
            <span className="absolute left-4 bottom-3 right-4 flex items-end justify-between gap-2 text-white">
              <span className="font-headline text-xl font-bold leading-tight drop-shadow">{t.title}</span>
              <span className="font-label text-[10px] font-black tabular-nums opacity-80">{`#${t.number}`}</span>
            </span>
            <span className={`absolute top-0 left-0 h-1 w-full ${levelStyle(t.level).bg}`} aria-hidden="true" />
          </div>
          <div className="p-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-stone-500 dark:text-stone-400">
            <LevelBadge level={t.level} />
            <span className="flex items-center gap-1 tabular-nums"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">schedule</span>{formatTrekHours(t.hours) || t.trek_time}</span>
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">calendar_today</span>{formatTrekDay(t.dateObj)}</span>
            {t.season && <span>{seasonName(t.season)}</span>}
            <span className="ml-auto flex items-center gap-2">
              {t.newPlaces === 0 && <span title="A place visited before" className="material-symbols-outlined text-[16px]" aria-label="Return visit">replay</span>}
              {t.blog_link && <span title="Has a write-up" className="material-symbols-outlined text-[16px] text-secondary" aria-label="Has a write-up">article</span>}
              {t.photos > 0 && <span className="flex items-center gap-0.5" title={`${t.photos} photos`}><span className="material-symbols-outlined text-[16px]" aria-hidden="true">photo_library</span>{t.photos}</span>}
            </span>
          </div>
        </button>
      );
    })}
  </div>
);

TrekCards.propTypes = {
  treks: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
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
  { id: "title", label: "Trek" },
  { id: "hours", label: "Duration" },
  { id: "level", label: "Difficulty" },
];

export const TrekTable = ({
  treks, onOpen, sort, dir, onSort,
}) => (
  <div className="overflow-x-auto rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
    <table className="w-full min-w-[600px] text-sm">
      <thead className="bg-stone-50 dark:bg-stone-800/50">
        <tr>
          <th scope="col" className="px-4 py-3 text-left font-label text-[10px] uppercase tracking-widest font-bold text-stone-500">#</th>
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
          <th scope="col" className="px-4 py-3 text-left font-label text-[10px] uppercase tracking-widest font-bold text-stone-500">Season</th>
          <th scope="col" className="px-4 py-3 text-left font-label text-[10px] uppercase tracking-widest font-bold text-stone-500">Story</th>
        </tr>
      </thead>
      <tbody>
        {treks.map((t) => (
          <tr key={t.id} onClick={() => onOpen(t)} className="border-t border-stone-100 dark:border-stone-800 hover:bg-secondary/5 cursor-pointer">
            <td className="px-4 py-3 text-stone-400 tabular-nums">{t.number}</td>
            <td className="px-4 py-3 whitespace-nowrap text-stone-500 dark:text-stone-400 tabular-nums">{formatTrekDay(t.dateObj)}</td>
            <td className="px-4 py-3">
              <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(t); }} className="text-left font-bold text-stone-900 dark:text-stone-100 hover:text-secondary">{t.title}</button>
              {t.newPlaces === 0 && <span className="ml-2 text-xs text-stone-400">return</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap tabular-nums text-stone-700 dark:text-stone-300">{formatTrekHours(t.hours) || t.trek_time}</td>
            <td className="px-4 py-3"><LevelBadge level={t.level} /></td>
            <td className="px-4 py-3 text-stone-500">{seasonName(t.season)}</td>
            <td className="px-4 py-3">
              {t.blog_link && (
                <a href={t.blog_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-secondary font-bold text-xs hover:underline">
                  Read ↗
                </a>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

TrekTable.propTypes = {
  treks: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onOpen: PropTypes.func.isRequired,
  sort: PropTypes.string.isRequired,
  dir: PropTypes.string.isRequired,
  onSort: PropTypes.func.isRequired,
};
