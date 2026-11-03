import React, { useEffect, useMemo, useState } from "react";
import PageShell from "../atlas/PageShell";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import ActivityTable from "../components/Training/ActivityTable";
import YearHeatmap from "../components/Training/YearHeatmap";
import StatsPRs from "../components/Training/StatsPRs";
import RouteGrid from "../components/Training/RouteGrid";
import useTrainingFilters from "../components/Training/useTrainingFilters";
import { listActivities } from "../lib/api/training";
import {
  FAMILY_LABELS, SORTS, sportFamily, totals, yearsOf,
} from "../lib/training";
import { formatDistance } from "../lib/strava";

// /training — every public Strava activity, synced by `npm run strava:import`
// and /admin/training/sync. Four views over one filtered list: the log, a
// year calendar, stats & best efforts, and the routes. Filters and the view
// (`tab`, not `view` — useViewMode owns that) are URL state.

const TABS = [
  { key: "log", label: "Log", icon: "list" },
  { key: "calendar", label: "Calendar", icon: "calendar_month" },
  { key: "stats", label: "Stats & PRs", icon: "leaderboard" },
  { key: "routes", label: "Routes", icon: "route" },
];

const SORT_LABELS = {
  newest: "Newest", oldest: "Oldest", distance: "Longest", time: "Most time", elevation: "Most climb", kudos: "Most kudos",
};

const selectClass = "h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg pl-3 pr-8 font-label text-xs uppercase tracking-wider text-stone-800 dark:text-stone-200 outline-none cursor-pointer hover:border-secondary transition-colors max-w-full";

const Training = () => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const {
    filters, setFilter, clearFilters, filtered, hasFilters,
  } = useTrainingFilters(rows || []);

  useEffect(() => {
    let live = true;
    listActivities().then((d) => live && setRows(d)).catch((e) => live && setError(e));
    return () => { live = false; };
  }, []);

  const years = useMemo(() => yearsOf(rows || []), [rows]);
  const families = useMemo(() => {
    const counts = {};
    (rows || []).forEach((r) => { const f = sportFamily(r.sport); counts[f] = (counts[f] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const tagFacets = useMemo(() => {
    const counts = {};
    (rows || []).forEach((r) => (r.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [rows]);

  const all = totals(rows || []);
  const calendarYear = Number(filters.year) || years[0];
  const headline = [
    all.count ? `${all.count.toLocaleString()} activities` : null,
    all.distance ? formatDistance(all.distance) : null,
    all.movingTime ? `${Math.round(all.movingTime / 3600).toLocaleString()} hours` : null,
  ].filter(Boolean);

  const loading = !rows && !error;

  return (
    <PageShell region="marathons">
      <div className="flex flex-col gap-8 w-full">
        <header>
          <p className="font-label text-xs uppercase tracking-widest text-secondary mb-4 font-bold">Strava</p>
          <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-6">
            Training.
          </h1>
          <p className="max-w-2xl text-xl text-stone-500 dark:text-stone-400 font-light leading-relaxed mb-3">
            Every run, ride, walk and swim I have logged, straight from Strava: splits, laps, best efforts and the routes.
          </p>
          {headline.length > 0 && (
            <p className="font-label text-xs uppercase tracking-widest text-stone-400 mb-0">{headline.join(" · ")}</p>
          )}
        </header>

        {loading && <LoadingBlock label="Loading activities…" />}
        {error && <ErrorBlock />}
        {rows && rows.length === 0 && (
          <p className="text-stone-500 dark:text-stone-400 italic text-center py-12 mb-0">No activities yet.</p>
        )}

        {rows && rows.length > 0 && (
          <>
            <div role="tablist" aria-label="View" className="flex flex-wrap gap-2">
              {TABS.map((t) => {
                const active = filters.tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter("tab", t.key)}
                    className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border font-label text-xs uppercase tracking-wider transition-colors ${active
                      ? "bg-secondary text-white border-secondary"
                      : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:text-secondary"}`}
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">{t.icon}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>

            {filters.tab !== "calendar" && filters.tab !== "stats" && (
              <div className="flex flex-col gap-3 p-4 bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800 rounded-xl">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex-1 min-w-[12rem]" htmlFor="training-search">
                    <span className="sr-only">Search activities</span>
                    <input
                      id="training-search"
                      type="search"
                      value={filters.q}
                      onChange={(e) => setFilter("q", e.target.value)}
                      placeholder="Search activities…"
                      className="w-full h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-body text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-secondary"
                    />
                  </label>
                  <select aria-label="Filter by sport" value={filters.sport} onChange={(e) => setFilter("sport", e.target.value)} className={selectClass}>
                    <option value="">All sports</option>
                    {families.map(([f, n]) => <option key={f} value={f}>{`${FAMILY_LABELS[f]} (${n})`}</option>)}
                  </select>
                  <select aria-label="Filter by year" value={filters.year} onChange={(e) => setFilter("year", e.target.value)} className={selectClass}>
                    <option value="">All years</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select aria-label="Sort by" value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)} className={selectClass}>
                    {Object.keys(SORTS).map((k) => <option key={k} value={k}>{`Sort: ${SORT_LABELS[k]}`}</option>)}
                  </select>
                  <label htmlFor="training-races" className="inline-flex items-center gap-2 font-label text-xs uppercase tracking-wider text-stone-600 dark:text-stone-300">
                    <input id="training-races" type="checkbox" checked={filters.races} onChange={(e) => setFilter("races", e.target.checked)} />
                    Races only
                  </label>
                </div>
                {tagFacets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-label text-[10px] uppercase tracking-widest text-stone-400">Tags:</span>
                    {tagFacets.map(([name, count]) => {
                      const active = filters.tags.some((t) => t.toLowerCase() === name);
                      return (
                        <button
                          key={name}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setFilter("tags", active
                            ? filters.tags.filter((t) => t.toLowerCase() !== name)
                            : [...filters.tags, name])}
                          className={`px-3 py-1 rounded-md text-xs border ${active
                            ? "bg-secondary text-white border-secondary"
                            : "bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:text-secondary"}`}
                        >
                          {`#${name} ${count}`}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="mb-0 font-label text-[10px] uppercase tracking-widest text-stone-400" aria-live="polite">
                    {filtered.length === rows.length ? `${rows.length} activities` : `${filtered.length} of ${rows.length} activities`}
                  </p>
                  {hasFilters && (
                    <button type="button" onClick={clearFilters} className="text-secondary font-label text-[10px] uppercase tracking-widest font-bold">
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {filters.tab === "log" && (filtered.length
              ? <ActivityTable rows={filtered} />
              : <p className="text-stone-500 dark:text-stone-400 italic text-center py-12 mb-0">No activities match these filters.</p>)}
            {filters.tab === "calendar" && calendarYear && (
              <YearHeatmap rows={rows} year={calendarYear} years={years} onYear={(y) => setFilter("year", String(y))} />
            )}
            {filters.tab === "stats" && <StatsPRs rows={rows} />}
            {filters.tab === "routes" && <RouteGrid filters={filters} />}
          </>
        )}

        <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mb-0">
          <a href="https://www.strava.com" target="_blank" rel="noopener noreferrer" className="text-[#FC4C02] no-underline font-bold">
            Powered by Strava
          </a>
          {" · Private and followers-only activities are never shown; route ends are trimmed."}
        </p>
      </div>
    </PageShell>
  );
};

export default Training;
