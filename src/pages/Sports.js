import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import MarathonDetailsModal from "../components/Sports/MarathonDetailsModal";
import PaceProgression from "../components/Sports/PaceProgression";
import { RaceCalendar, RepeatEvents } from "../components/Sports/RaceFigures";
import { RaceCards, RaceTable } from "../components/Sports/RaceList";
import { RecordCards, Equivalents } from "../components/Sports/RaceRecords";
import {
  ChipRow, Insight, KpiStrip, MonthStrip, NoMatches, Panel, RankBars, ResultLine,
  SearchBox, ShareViewButton, SortControl, TabBar, TabPanel, ViewToggle, useQueryState,
} from "../components/common/LogKit";
import { useSports } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "../components/common/AsyncStates";
import {
  MONTHS, distanceName, enrichRaces, filterRaces, formatDuration, formatHours, formatPace,
  monthCounts, perYear, personalBests, raceFacets, raceSummary, repeatEvents,
} from "../lib/raceLog";
import PageFilm from "../components/common/PageFilm";

// /sports — the race log. Three tabs over one filtered set: Overview (the
// PB trajectory, the calendar, repeat events and derived facts), Races (cards
// or a sortable table) and Records (PBs per distance). Every number comes from
// src/lib/raceLog.js. URL state is merged, so `view` (useViewMode) survives;
// the old `?view=statistics|interactive|default` tab links land on a tab.

const TABS = [
  { id: "overview", label: "Overview", icon: "insights" },
  { id: "races", label: "Races", icon: "format_list_bulleted" },
  { id: "records", label: "Records", icon: "emoji_events" },
];
const LEGACY_TAB = { statistics: "overview", interactive: "races", default: "races" };
const DEFAULTS = {
  tab: "", year: "", dist: "", q: "", sort: "date", dir: "desc", layout: "cards",
};
const SORTS = [
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "pace", label: "Pace" },
  { value: "distance", label: "Distance" },
  { value: "title", label: "Name" },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const SportsPage = () => {
  const { data, loading, error } = useSports();
  const [params] = useSearchParams();
  const [state, set] = useQueryState(DEFAULTS);
  const [open, setOpen] = useState(null);
  const tab = TABS.some((t) => t.id === state.tab) ? state.tab : LEGACY_TAB[params.get("view")] ?? "overview";

  const all = useMemo(() => enrichRaces(data), [data]);
  const facets = useMemo(() => raceFacets(all), [all]);
  const scoped = useMemo(() => filterRaces(all, { year: state.year, dist: state.dist, sort: "date", dir: "asc" }), [all, state.year, state.dist]);
  const listed = useMemo(() => filterRaces(scoped, state), [scoped, state]);
  const summary = useMemo(() => raceSummary(scoped), [scoped]);
  const bests = useMemo(() => personalBests(all), [all]);
  const repeats = useMemo(() => repeatEvents(scoped), [scoped]);
  const months = useMemo(() => monthCounts(scoped), [scoped]);
  const years = useMemo(() => perYear(scoped), [scoped]);
  const hasFilters = !!(state.year || state.dist || state.q);
  const clear = () => set({ year: "", dist: "", q: "" });
  const half = bests.find((b) => b.key === 21);
  const full = bests.find((b) => b.key === 42);

  return (
    <PageShell region="marathons">
      <div className="flex flex-col gap-8 w-full">
        <header className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12 items-end">
          <div className="lg:col-span-3">
            <span className="font-label text-secondary uppercase tracking-[0.3em] font-bold text-xs mb-4 block">Race log</span>
            <h1 className="font-headline text-5xl lg:text-7xl text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-0">
              Every finish line.
            </h1>
          </div>
          <p className="lg:col-span-2 font-body text-stone-500 dark:text-stone-400 text-lg leading-relaxed mb-0">
            {summary && !hasFilters
              ? `${plural(summary.count, "race")} and ${Math.round(summary.km)} km on race day since ${MONTHS[summary.first.month]} ${summary.first.year}, from 10K to a 50K ultra. Tap any race, dot or record to open it.`
              : "Road races, hill halves and ultras — timed, compared and ranked. Tap any race, dot or record to open it."}
          </p>
        </header>

        <PageFilm film="sports" />

        {loading && <LoadingBlock label="Loading races…" />}
        {error && <ErrorBlock />}
        {!loading && !error && !all.length && <EmptyBlock label="No races yet." />}

        {!loading && !error && all.length > 0 && (
          <>
            <KpiStrip
              items={[
                { label: "Races", icon: "flag", value: summary?.count, sub: summary ? `${summary.cities.length} cities` : null },
                { label: "Raced", icon: "route", value: summary ? Math.round(summary.km) : null, unit: "km", sub: summary?.secs ? `${formatHours(summary.secs)} hours on course` : null },
                { label: "Half PB", icon: "timer", value: half ? formatDuration(half.best.secs) : null, sub: half ? `${formatPace(half.best.pace)}/km · ${half.best.title}` : null },
                { label: "Marathon PB", icon: "military_tech", value: full ? formatDuration(full.best.secs) : null, sub: full ? full.best.title : null },
              ]}
            />

            <div className="md:sticky md:top-16 z-20 -mx-4 px-4 py-3 bg-white/90 dark:bg-stone-950/90 backdrop-blur border-b border-stone-200 dark:border-stone-800 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabBar label="Race log sections" tabs={TABS} active={tab} onChange={(id) => set({ tab: id === "overview" ? "" : id })} />
                <ShareViewButton />
              </div>
              {tab !== "records" && (
                <>
                  <ChipRow label="Year" options={facets.years.map((y) => ({ value: y.name, label: y.name, count: y.count }))} value={state.year} onChange={(v) => set({ year: v })} />
                  <ChipRow label="Distance" options={facets.distances.map((d) => ({ value: String(d.key), label: d.name, count: d.count }))} value={state.dist} onChange={(v) => set({ dist: v })} />
                </>
              )}
            </div>

            {tab === "overview" && (
              <TabPanel id="overview">
                {!scoped.length ? <NoMatches noun="race" onClear={clear} /> : (
                  <div className="flex flex-col gap-6">
                    <Panel title="Personal-best progression" subtitle="Each finish at one distance over time. The red line is the best so far — every step down is a new PB.">
                      <PaceProgression races={scoped} onOpen={setOpen} />
                    </Panel>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <Insight icon="update" label="Since the last race" value={summary.daysSinceLast != null ? plural(summary.daysSinceLast, "day") : null} onClick={() => setOpen(summary.last)}>
                        {summary.last?.title}
                      </Insight>
                      <Insight icon="bolt" label="Fastest pace" value={summary.fastest ? `${formatPace(summary.fastest.pace)}/km` : null} onClick={summary.fastest ? () => setOpen(summary.fastest) : undefined}>
                        {summary.fastest && `${summary.fastest.title}, ${distanceName(summary.fastest.distKey)}`}
                      </Insight>
                      <Insight icon="trending_down" label="PBs broken" value={summary.pbCount || null}>
                        Times a race beat every earlier one at its distance.
                      </Insight>
                      <Insight icon="event_repeat" label="Typical gap" value={summary.medianGap != null ? plural(summary.medianGap, "day") : null}>
                        {summary.longestGap && `Median between races. Longest break: ${summary.longestGap.days} days, before ${summary.longestGap.to.title}.`}
                      </Insight>
                      <Insight icon="calendar_month" label="Racing season" value={summary.busiestMonths.length ? summary.busiestMonths.map((m) => MONTHS[m].slice(0, 3)).join(", ") : null}>
                        The busiest months on the calendar.
                      </Insight>
                      <Insight icon="landscape" label="Longest race" value={summary.longest?.km ? `${Math.round(summary.longest.km)} km` : null} onClick={() => setOpen(summary.longest)}>
                        {summary.longest?.title}
                      </Insight>
                      <Insight icon="star" label="Busiest year" value={summary.busiestYear && years.length > 1 ? String(summary.busiestYear.year) : null}>
                        {summary.busiestYear && `${plural(summary.busiestYear.count, "race")}, ${Math.round(summary.busiestYear.km)} km`}
                      </Insight>
                      <Insight icon="location_city" label="Home course" value={summary.cities[0]?.[0]}>
                        {summary.cities[0] && `${plural(summary.cities[0][1], "race")} of ${summary.count}`}
                      </Insight>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <Panel title="Race calendar" subtitle="Every race in its month.">
                        <RaceCalendar races={scoped} onOpen={setOpen} />
                      </Panel>
                      <Panel title="Same race, different year" subtitle="Events run more than once, each attempt on that event's own time scale.">
                        {repeats.length ? <RepeatEvents events={repeats} onOpen={setOpen} /> : <p className="mb-0 text-sm text-stone-500">No event run twice in this selection.</p>}
                      </Panel>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Panel title="By month" subtitle="All years together.">
                        <MonthStrip counts={months} noun="race" />
                      </Panel>
                      <Panel title="Distance mix">
                        <RankBars
                          rows={facets.distances.filter((d) => !state.dist || String(d.key) === state.dist).map((d) => ({ key: d.key, label: d.name, value: scoped.filter((r) => r.distKey === d.key).length })).filter((r) => r.value)}
                          onPick={(r) => set({ dist: String(r.key) })}
                        />
                      </Panel>
                      <Panel title="Kilometres per year">
                        <RankBars rows={years.map((y) => ({ key: y.year, label: `${y.year} · ${plural(y.count, "race")}`, value: Math.round(y.km) }))} format={(v) => `${v} km`} onPick={(r) => set({ year: String(r.key) })} />
                      </Panel>
                    </div>
                  </div>
                )}
              </TabPanel>
            )}

            {tab === "races" && (
              <TabPanel id="races">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <SearchBox id="race-search" value={state.q} onChange={(v) => set({ q: v })} placeholder="Search races or places…" />
                    <SortControl options={SORTS} sort={state.sort} dir={state.dir} onChange={set} />
                    <ViewToggle
                      value={state.layout}
                      onChange={(v) => set({ layout: v })}
                      options={[{ value: "cards", label: "Cards", icon: "grid_view" }, { value: "table", label: "Table", icon: "table_rows" }]}
                    />
                  </div>
                  <ResultLine shown={listed.length} total={all.length} noun="race" onClear={hasFilters ? clear : undefined} />
                  {!listed.length && <NoMatches noun="race" onClear={clear} />}
                  {listed.length > 0 && (state.layout === "table"
                    ? <RaceTable races={listed} onOpen={setOpen} sort={state.sort} dir={state.dir} onSort={set} />
                    : <RaceCards races={listed} onOpen={setOpen} />)}
                </div>
              </TabPanel>
            )}

            {tab === "records" && (
              <TabPanel id="records">
                <div className="flex flex-col gap-6">
                  <p className="mb-0 font-body text-sm text-stone-500 dark:text-stone-400">
                    All-time bests across every race. Each card climbs its own ladder of PBs.
                  </p>
                  <RecordCards bests={bests} onOpen={setOpen} />
                  <Equivalents bests={bests} />
                </div>
              </TabPanel>
            )}

          </>
        )}
      </div>

      <MarathonDetailsModal isOpen={!!open} onClose={() => setOpen(null)} raceDetails={open} />
    </PageShell>
  );
};

export default SportsPage;
