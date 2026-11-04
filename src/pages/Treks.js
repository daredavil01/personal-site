import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import TrekDetailsModal from "../components/Treks/TrekDetailsModal";
import {
  LevelLegend, ReturnVisits, Ridgeline, YearLevels,
} from "../components/Treks/TrekFigures";
import { TrekCards, TrekTable } from "../components/Treks/TrekList";
import {
  ChipRow, Insight, KpiStrip, MonthStrip, NoMatches, Panel, ResultLine,
  SearchBox, ShareViewButton, SortControl, TabBar, TabPanel, ViewToggle, useQueryState,
} from "../components/common/LogKit";
import { useTreks } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "../components/common/AsyncStates";
import {
  SEASONS, enrichTreks, filterTreks, formatTrekHours, monthCounts, perYear,
  returnVisits, trekFacets, trekSummary,
} from "../lib/trekLog";
import PageFilm from "../components/common/PageFilm";

// /treks — the summit register. Overview (the ridgeline, the trekking year,
// difficulty by year, return visits, derived facts) and Log (cards or a
// sortable table) over one filtered set. Every number comes from
// src/lib/trekLog.js. URL state is merged so `view` (useViewMode) survives;
// the old `?view=statistics|default` links land on a tab.

const TABS = [
  { id: "overview", label: "Overview", icon: "insights" },
  { id: "log", label: "Log", icon: "hiking" },
];
const LEGACY_TAB = { statistics: "overview", default: "log" };
const DEFAULTS = {
  tab: "", year: "", level: "", season: "", q: "", sort: "date", dir: "desc", layout: "cards",
};
const SORTS = [
  { value: "date", label: "Date" },
  { value: "hours", label: "Duration" },
  { value: "level", label: "Difficulty" },
  { value: "title", label: "Name" },
];
const MONSOON = SEASONS[0];
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const TreksPage = () => {
  const { data, loading, error } = useTreks();
  const [params] = useSearchParams();
  const [state, set] = useQueryState(DEFAULTS);
  const [open, setOpen] = useState(null);
  const tab = TABS.some((t) => t.id === state.tab) ? state.tab : LEGACY_TAB[params.get("view")] ?? "overview";

  const all = useMemo(() => enrichTreks(data), [data]);
  const facets = useMemo(() => trekFacets(all), [all]);
  const scoped = useMemo(() => filterTreks(all, {
    year: state.year, level: state.level, season: state.season, sort: "date", dir: "asc",
  }), [all, state.year, state.level, state.season]);
  const listed = useMemo(() => filterTreks(scoped, state), [scoped, state]);
  const summary = useMemo(() => trekSummary(scoped), [scoped]);
  const months = useMemo(() => monthCounts(scoped), [scoped]);
  const years = useMemo(() => perYear(scoped), [scoped]);
  const returns = useMemo(() => returnVisits(scoped), [scoped]);
  const hasFilters = !!(state.year || state.level || state.season || state.q);
  const clear = () => set({
    year: "", level: "", season: "", q: "",
  });
  const allSummary = useMemo(() => trekSummary(all), [all]);

  return (
    <PageShell region="treks">
      <div className="flex flex-col gap-8 w-full">
        <header className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12 items-end">
          <div className="lg:col-span-3">
            <span className="font-label text-secondary uppercase tracking-[0.3em] font-bold text-xs mb-4 block">Forts & mountains</span>
            <h1 className="font-headline text-5xl lg:text-7xl text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-0">
              The summit register.
            </h1>
          </div>
          <p className="lg:col-span-2 font-body text-stone-500 dark:text-stone-400 text-lg leading-relaxed mb-0">
            {allSummary
              ? `${plural(allSummary.count, "trek")} across the Sahyadri's forts, ghats and waterfalls since ${allSummary.first?.year ?? ""} — most of them in the rain. Tap a peak or a card to open it.`
              : "Treks across the Sahyadri's forts, ghats and waterfalls."}
          </p>
        </header>

        <PageFilm film="treks" />

        {loading && <LoadingBlock label="Loading treks…" />}
        {error && <ErrorBlock />}
        {!loading && !error && !all.length && <EmptyBlock label="No treks yet." />}

        {!loading && !error && all.length > 0 && (
          <>
            <KpiStrip
              items={[
                { label: "Treks", icon: "hiking", value: summary?.count, sub: summary ? `${summary.hard} hard` : null },
                { label: "On the trail", icon: "schedule", value: summary?.hours ? Math.round(summary.hours) : null, unit: "h", sub: summary?.medianHours ? `A typical trek: ${formatTrekHours(summary.medianHours)}` : null },
                { label: "Places", icon: "flag", value: summary?.places, sub: "Forts, peaks and trailheads reached" },
                { label: "Write-ups", icon: "article", value: summary ? summary.withStory : null, sub: summary ? `${Math.round((summary.withStory / summary.count) * 100)}% of treks · ${summary.photos} photos` : null },
              ]}
            />

            <div className="md:sticky md:top-16 z-20 -mx-4 px-4 py-3 bg-white/90 dark:bg-stone-950/90 backdrop-blur border-b border-stone-200 dark:border-stone-800 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabBar label="Trek register sections" tabs={TABS} active={tab} onChange={(id) => set({ tab: id === "overview" ? "" : id })} />
                <ShareViewButton />
              </div>
              <ChipRow label="Year" options={facets.years.map((y) => ({ value: y.name, label: y.name, count: y.count }))} value={state.year} onChange={(v) => set({ year: v })} />
              <ChipRow label="Season" options={facets.seasons.map((s) => ({ value: s.id, label: s.name, count: s.count, title: s.blurb }))} value={state.season} onChange={(v) => set({ season: v })} />
              <ChipRow label="Level" options={facets.levels.map((l) => ({ value: l.name, label: l.name, count: l.count }))} value={state.level} onChange={(v) => set({ level: v })} />
            </div>

            {tab === "overview" && (
              <TabPanel id="overview">
                {!scoped.length ? <NoMatches noun="trek" onClear={clear} /> : (
                  <div className="flex flex-col gap-6">
                    <Panel title="The range" subtitle="Every trek as a peak, oldest on the left. Taller means longer on the trail; colour is difficulty.">
                      <Ridgeline treks={scoped} onOpen={setOpen} />
                    </Panel>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <Insight icon="rainy" label="Favourite season" value={summary.topSeason?.name}>
                        {summary.topSeason && `${summary.topSeason.count} of ${summary.count} treks, ${summary.topSeason.blurb}.`}
                      </Insight>
                      <Insight icon="trending_up" label="Longest on the trail" value={summary.longest ? formatTrekHours(summary.longest.hours) : null} onClick={summary.longest ? () => setOpen(summary.longest) : undefined}>
                        {summary.longest?.title}
                      </Insight>
                      <Insight icon="update" label="Since the last trek" value={summary.daysSinceLast != null ? plural(summary.daysSinceLast, "day") : null} onClick={summary.last ? () => setOpen(summary.last) : undefined}>
                        {summary.last?.title}
                      </Insight>
                      <Insight icon="hourglass_empty" label="Longest time away" value={summary.longestGap ? plural(summary.longestGap.days, "day") : null}>
                        {summary.longestGap && `Between ${summary.longestGap.from.title} and ${summary.longestGap.to.title}.`}
                      </Insight>
                      <Insight icon="star" label="Busiest year" value={summary.busiestYear && years.length > 1 ? String(summary.busiestYear.year) : null}>
                        {summary.busiestYear && `${plural(summary.busiestYear.count, "trek")}, ${Math.round(summary.busiestYear.hours)} hours`}
                      </Insight>
                      <Insight icon="replay" label="Return visits" value={returns.length ? plural(returns.length, "place") : null}>
                        {returns.length > 0 && `Went back to ${returns.map((g) => g.label).join(", ")}.`}
                      </Insight>
                      <Insight icon="calendar_month" label="Years on the trail" value={summary.years > 1 ? String(summary.years) : null}>
                        {summary.first && summary.last && `${summary.first.title} (${summary.first.year}) to ${summary.last.title} (${summary.last.year}).`}
                      </Insight>
                      <Insight icon="photo_camera" label="Photos" value={summary.photos || null}>
                        {`About ${Math.round(summary.photos / summary.count)} a trek.`}
                      </Insight>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <Panel title="The trekking year" subtitle="Treks per month, all years together. Tap a month to list its season's treks.">
                          <MonthStrip
                            counts={months}
                            noun="trek"
                            band={MONSOON.months}
                            bandLabel={`Monsoon (${MONSOON.blurb})`}
                            onPick={(m) => set({ tab: "log", q: "", season: SEASONS.find((s) => s.months.includes(m))?.id ?? "" })}
                          />
                        </Panel>
                      </div>
                      <Panel title="Difficulty by year" subtitle={<LevelLegend />}>
                        <YearLevels years={years} onPick={(y) => set({ year: state.year === y ? "" : y })} />
                      </Panel>
                    </div>

                    <Panel title="Going back" subtitle="Places reached on more than one trek.">
                      <ReturnVisits groups={returns} onOpen={setOpen} />
                    </Panel>
                  </div>
                )}
              </TabPanel>
            )}

            {tab === "log" && (
              <TabPanel id="log">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <SearchBox id="trek-search" value={state.q} onChange={(v) => set({ q: v })} placeholder="Search forts and trails…" />
                    <SortControl options={SORTS} sort={state.sort} dir={state.dir} onChange={set} />
                    <ViewToggle
                      value={state.layout}
                      onChange={(v) => set({ layout: v })}
                      options={[{ value: "cards", label: "Cards", icon: "grid_view" }, { value: "table", label: "Table", icon: "table_rows" }]}
                    />
                  </div>
                  <ResultLine shown={listed.length} total={all.length} noun="trek" onClear={hasFilters ? clear : undefined} />
                  {!listed.length && <NoMatches noun="trek" onClear={clear} />}
                  {listed.length > 0 && (state.layout === "table"
                    ? <TrekTable treks={listed} onOpen={setOpen} sort={state.sort} dir={state.dir} onSort={set} />
                    : <TrekCards treks={listed} onOpen={setOpen} />)}
                </div>
              </TabPanel>
            )}
          </>
        )}
      </div>

      <TrekDetailsModal isOpen={!!open} onClose={() => setOpen(null)} trek={open} />
    </PageShell>
  );
};

export default TreksPage;
