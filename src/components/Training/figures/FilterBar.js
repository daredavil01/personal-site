import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { FAMILY_LABELS, SORTS, sportFamily } from "../../../lib/training";
import { FAMILY_ICONS, famColor } from "../shared";

// Search, sport chips, year, sort, races-only and tag chips, all URL state
// (useTrainingFilters). Used by the classic Log and Routes tabs.

const SORT_LABELS = {
  newest: "Newest", oldest: "Oldest", distance: "Longest", time: "Most time", elevation: "Most climb", kudos: "Most kudos",
};
const selectClass = "h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-full pl-4 pr-8 font-label text-xs uppercase tracking-wider text-stone-800 dark:text-stone-200 outline-none cursor-pointer hover:border-secondary transition-colors max-w-full";

const FilterBar = ({
  rows, years, filters, setFilter, clearFilters, hasFilters, count,
}) => {
  const families = useMemo(() => {
    const counts = {};
    rows.forEach((r) => { const f = sportFamily(r.sport); counts[f] = (counts[f] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const tagFacets = useMemo(() => {
    const counts = {};
    rows.forEach((r) => (r.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [rows]);

  return (
    <div className="flex flex-col gap-3 p-4 bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 rounded-2xl">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[12rem]" htmlFor="training-search">
          <span className="sr-only">Search activities</span>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-lg" aria-hidden="true">search</span>
          <input
            id="training-search"
            type="search"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="Search by name, sport or date…"
            className="w-full h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-full pl-10 pr-4 font-body text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-secondary"
          />
        </label>
        <select aria-label="Filter by year" value={filters.year} onChange={(e) => setFilter("year", e.target.value)} className={selectClass}>
          <option value="">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select aria-label="Sort by" value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)} className={selectClass}>
          {Object.keys(SORTS).filter((k) => k !== "kudos").map((k) => <option key={k} value={k}>{`Sort: ${SORT_LABELS[k]}`}</option>)}
        </select>
        <label htmlFor="training-races" className="inline-flex items-center gap-2 font-label text-xs uppercase tracking-wider text-stone-600 dark:text-stone-300 cursor-pointer">
          <input id="training-races" type="checkbox" checked={filters.races} onChange={(e) => setFilter("races", e.target.checked)} className="rounded text-secondary focus:ring-secondary" />
          Races only
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sport">
        {[["", rows.length], ...families].map(([f, n]) => {
          const active = filters.sport === f;
          return (
            <button
              key={f || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter("sport", f)}
              className={`inline-flex items-center gap-1.5 pl-2 pr-3 h-8 rounded-full text-xs border transition-colors ${active
                ? "bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-stone-900 dark:border-white"
                : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-secondary/50"}`}
            >
              {f ? (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: famColor(f) }} aria-hidden="true">
                  <span className="material-symbols-outlined text-[13px]">{FAMILY_ICONS[f]}</span>
                </span>
              ) : <span className="material-symbols-outlined text-base" aria-hidden="true">apps</span>}
              {`${f ? FAMILY_LABELS[f] : "Everything"} ${n}`}
            </button>
          );
        })}
      </div>
      {tagFacets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-label text-[10px] uppercase tracking-widest text-stone-400">Tags:</span>
          {tagFacets.map(([name, n]) => {
            const active = filters.tags.some((t) => t.toLowerCase() === name);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter("tags", active ? filters.tags.filter((t) => t.toLowerCase() !== name) : [...filters.tags, name])}
                className={`px-3 py-1 rounded-full text-xs border ${active
                  ? "bg-secondary text-white border-secondary"
                  : "bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:text-secondary"}`}
              >
                {`#${name} ${n}`}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="mb-0 font-label text-[10px] uppercase tracking-widest text-stone-400" aria-live="polite">
          {count === rows.length ? `${rows.length} activities` : `${count} of ${rows.length} activities`}
        </p>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="text-secondary font-label text-[10px] uppercase tracking-widest font-bold">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};

FilterBar.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  years: PropTypes.arrayOf(PropTypes.number).isRequired,
  filters: PropTypes.shape({
    q: PropTypes.string, sport: PropTypes.string, year: PropTypes.string, sort: PropTypes.string, races: PropTypes.bool, tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  setFilter: PropTypes.func.isRequired,
  clearFilters: PropTypes.func.isRequired,
  hasFilters: PropTypes.bool.isRequired,
  count: PropTypes.number.isRequired,
};

export default FilterBar;
