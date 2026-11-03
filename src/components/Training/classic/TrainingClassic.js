import React, { useMemo } from "react";
import PropTypes from "prop-types";
import ClassicHeader from "./ClassicHeader";
import FilterBar from "./FilterBar";
import Overview from "./Overview";
import ActivityLog from "./ActivityLog";
import YearHeatmap from "../YearHeatmap";
import StatsPRs from "../StatsPRs";
import RouteGrid from "../RouteGrid";
import { yearsOf } from "../../../lib/training";

// The classic /training: a header of counters, then five tabs over one
// filtered list — Overview, Log, Calendar, Stats & PRs, Routes. The tab is
// URL state (`tab`; `view` belongs to useViewMode).

const TABS = [
  { key: "overview", label: "Overview", icon: "dashboard" },
  { key: "log", label: "Log", icon: "list" },
  { key: "calendar", label: "Calendar", icon: "calendar_month" },
  { key: "stats", label: "Stats & PRs", icon: "leaderboard" },
  { key: "routes", label: "Routes", icon: "route" },
];

const TrainingClassic = ({ rows, demo, filterState }) => {
  const {
    filters, setFilter, clearFilters, filtered, hasFilters,
  } = filterState;
  const years = useMemo(() => yearsOf(rows), [rows]);
  const calendarYear = Number(filters.year) || years[0];
  const tab = TABS.some((t) => t.key === filters.tab) ? filters.tab : "overview";

  return (
    <div className="tr-root flex flex-col gap-8 w-full">
      <ClassicHeader rows={rows} demo={demo} />

      <div role="tablist" aria-label="View" className="sticky top-0 z-20 -mx-2 px-2 py-2 bg-white/85 dark:bg-stone-950/85 backdrop-blur flex gap-1 overflow-x-auto tr-scroll-x">
        <div className="inline-flex p-1 rounded-full bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter("tab", t.key)}
                className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full font-label text-xs uppercase tracking-wider whitespace-nowrap transition-all ${active
                  ? "bg-white dark:bg-stone-700 text-secondary dark:text-white shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"}`}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {(tab === "log" || tab === "routes") && (
        <FilterBar
          rows={rows}
          years={years}
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          hasFilters={hasFilters}
          count={filtered.length}
        />
      )}

      <div key={tab} className="tr-rise">
        {tab === "overview" && <Overview rows={rows} />}
        {tab === "log" && (filtered.length
          ? <ActivityLog rows={filtered} />
          : <p className="text-stone-500 dark:text-stone-400 italic text-center py-12 mb-0">No activities match these filters.</p>)}
        {tab === "calendar" && calendarYear && (
          <YearHeatmap rows={rows} year={calendarYear} years={years} onYear={(y) => setFilter("year", String(y))} />
        )}
        {tab === "stats" && <StatsPRs rows={rows} demo={demo} />}
        {tab === "routes" && <RouteGrid filters={filters} demo={demo} />}
      </div>
    </div>
  );
};

TrainingClassic.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  demo: PropTypes.bool.isRequired,
  filterState: PropTypes.shape({
    filters: PropTypes.shape({}), setFilter: PropTypes.func, clearFilters: PropTypes.func, filtered: PropTypes.arrayOf(PropTypes.shape({})), hasFilters: PropTypes.bool,
  }).isRequired,
};

export default TrainingClassic;
