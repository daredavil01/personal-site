import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import {
  ArenaFonts, Chip, Fig, FilmButton, LensTabs, Plate, Readout, useCount, useSeen,
} from "../components/Arena/Arena";
import { BibCards } from "../components/Sports/BibWall";
import PaceProgression from "../components/Sports/PaceProgression";
import { RaceCalendar, RepeatEvents } from "../components/Sports/RaceFigures";
import { RaceTable } from "../components/Sports/RaceList";
import { RecordCards, Equivalents } from "../components/Sports/RaceRecords";
import StartLine from "../components/Sports/StartLine";
import {
  MonthStrip, NoMatches, RankBars, ResultLine, SearchBox, ShareViewButton, SortControl, ViewToggle, useQueryState,
} from "../components/common/LogKit";
import { useSports } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "../components/common/AsyncStates";
import {
  MONTHS, distanceName, enrichRaces, filterRaces, formatDuration, formatHours, formatPace,
  monthCounts, perYear, personalBests, raceFacets, raceSummary, repeatEvents,
} from "../lib/raceLog";
import PageFilm from "../components/common/PageFilm";

// /sports — the race log (v27), one layout in both shells. A dark stage: the
// headline, how far the most-raced distance has come, and the start line,
// where every finish at one distance is replayed from the same gun. Under it
// three lenses over one filtered set: Overview (the PB trajectory, derived
// facts, the calendar, repeat events), Races (the bib wall, or a sortable
// table) and Records (PBs per distance, Riegel equivalents). Every number
// comes from src/lib/raceLog.js. URL state is merged, so `view`
// (useViewMode) survives; the old `?view=statistics|interactive|default`
// links still land on a lens. A race opens its own page, /sports/:id.

const TABS = [
  { id: "overview", label: "Overview", icon: "insights" },
  { id: "races", label: "Races", icon: "confirmation_number" },
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
const monthYear = (r) => (r?.dateObj ? `${MONTHS[r.month]} ${r.year}` : "");

/** The most-raced distance, from the first finish down to the best: the clock runs backwards once. */
const Descent = ({ best }) => {
  const [ref, seen] = useSeen(0.4);
  const first = best.history[0];
  const gained = best.gainedSecs || 0;
  const fallen = useCount(gained, seen, 2600);
  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      <p className="ar-kicker mb-0 ar-stage-muted" style={{ fontSize: "0.62rem" }}>{`${best.name}, first to best`}</p>
      <p className="ar-num mb-0 ar-stage-gold" style={{ fontSize: "clamp(3.4rem, 10cqw, 6rem)" }} aria-label={`${best.name} personal best ${formatDuration(best.best.secs)}`}>
        <span aria-hidden="true">{formatDuration(first.secs - fallen)}</span>
      </p>
      <p className="mb-0 text-sm leading-relaxed ar-stage-muted">
        {gained > 0
          ? `From ${formatDuration(first.secs)} in ${monthYear(first)} to ${formatDuration(best.best.secs)} in ${monthYear(best.best)} — ${formatDuration(gained)} faster over ${plural(best.count, "race")}.`
          : `${best.best.title}, ${monthYear(best.best)}.`}
      </p>
    </div>
  );
};
Descent.propTypes = { best: PropTypes.shape({}).isRequired };

const SportsPage = () => {
  const { data, loading, error } = useSports();
  const [params] = useSearchParams();
  const [state, set] = useQueryState(DEFAULTS);
  const navigate = useNavigate();
  const open = (r) => r && navigate(`/sports/${r.id}`);
  const tab = TABS.some((t) => t.id === state.tab) ? state.tab : LEGACY_TAB[params.get("view")] ?? "overview";

  const all = useMemo(() => enrichRaces(data), [data]);
  const ordinals = useMemo(() => new Map(all.map((r, i) => [r.id, i + 1])), [all]);
  const facets = useMemo(() => raceFacets(all), [all]);
  const scoped = useMemo(() => filterRaces(all, { year: state.year, dist: state.dist, sort: "date", dir: "asc" }), [all, state.year, state.dist]);
  const listed = useMemo(() => filterRaces(scoped, state), [scoped, state]);
  const total = useMemo(() => raceSummary(all), [all]);
  const summary = useMemo(() => raceSummary(scoped), [scoped]);
  const bests = useMemo(() => personalBests(all), [all]);
  const repeats = useMemo(() => repeatEvents(scoped), [scoped]);
  const months = useMemo(() => monthCounts(scoped), [scoped]);
  const years = useMemo(() => perYear(scoped), [scoped]);
  const hasFilters = !!(state.year || state.dist || state.q);
  const clear = () => set({ year: "", dist: "", q: "" });
  const headline = useMemo(() => bests.filter((b) => b.count > 1).sort((a, b) => b.count - a.count)[0] ?? bests[0], [bests]);
  const longest = total?.longest;

  return (
    <PageShell region="marathons">
      <ArenaFonts />
      <div className="ar-root flex flex-col gap-6 w-full">
        {loading && <LoadingBlock label="Loading races…" />}
        {error && <ErrorBlock />}
        {!loading && !error && !all.length && <EmptyBlock label="No races yet." />}

        {!loading && !error && all.length > 0 && (
          <>
            <section className="ar-stage" aria-labelledby="sp-title">
              <div className="px-5 pt-6 pb-8 md:px-10 md:pt-8 md:pb-10 flex flex-col gap-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="ar-kicker mb-0 ar-stage-ember">{`Race log${total?.first ? ` · since ${monthYear(total.first)}` : ""}`}</p>
                  <FilmButton label="The film · 30 s"><PageFilm film="sports" /></FilmButton>
                </div>

                <div className="grid gap-x-10 gap-y-6 items-end lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                  <div className="flex flex-col gap-5">
                    <h1 id="sp-title" className="ar-title">Every <em>finish line.</em></h1>
                    <p className="mb-0 text-base md:text-lg leading-relaxed ar-stage-muted max-w-xl">
                      {`${plural(total.count, "race")} and ${Math.round(total.km)} km on race day`}
                      {longest?.km ? `, from ${distanceName(facets.distances[0].key)} to a ${Math.round(longest.km)} km ultra` : ""}
                      . Each one timed, photographed and set against the others.
                    </p>
                  </div>
                  {headline && <Descent best={headline} />}
                </div>

                <StartLine races={all} />
              </div>

              <Readout
                items={[
                  { label: "Races", value: total.count, note: `${total.cities.length} cities` },
                  { label: "Raced", value: Math.round(total.km), unit: "km" },
                  { label: "On course", value: total.secs ? Number(formatHours(total.secs)) : null, unit: "h", format: (v) => String(Math.round(v)) },
                  ...[21, 42, 10].map((k) => bests.find((b) => b.key === k)).filter(Boolean).map((b) => ({
                    label: { 21: "Half PB", 42: "Marathon PB" }[b.key] || `${b.name} PB`, value: formatDuration(b.best.secs), note: `${formatPace(b.best.pace)}/km · ${b.best.title}`,
                  })),
                ].slice(0, 6)}
              />
            </section>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="ar-tabs-paper"><LensTabs tabs={TABS} active={tab} onChange={(id) => set({ tab: id === "overview" ? "" : id })} label="Race log lenses" /></div>
                <ShareViewButton />
              </div>
              {tab !== "records" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Year">
                    <Chip paper active={!state.year} onClick={() => set({ year: "" })}>All years</Chip>
                    {facets.years.map((y) => <Chip key={y.name} paper active={state.year === y.name} onClick={() => set({ year: state.year === y.name ? "" : y.name })}>{`${y.name} · ${y.count}`}</Chip>)}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Distance">
                    <Chip paper active={!state.dist} onClick={() => set({ dist: "" })}>All distances</Chip>
                    {facets.distances.map((d) => <Chip key={d.key} paper active={state.dist === String(d.key)} onClick={() => set({ dist: state.dist === String(d.key) ? "" : String(d.key) })}>{`${d.name} · ${d.count}`}</Chip>)}
                  </div>
                </div>
              )}
            </div>

            <div id="ar-lens-panel" role="tabpanel" aria-labelledby={`ar-tab-${tab}`} key={tab} className="ar-swap">
              {tab === "overview" && (!scoped.length ? <NoMatches noun="race" onClear={clear} /> : (
                <div className="ar-grid">
                  <Plate kicker="The trajectory" title="Personal-best progression" sub="Each finish at one distance over time. The red line is the best so far — every step down is a new personal best.">
                    <PaceProgression races={scoped} onOpen={open} />
                  </Plate>

                  <Plate kicker="Read off the log" title="What the finishes say">
                    <div className="ar-figs ar-figs-4">
                      <Fig label="Since the last race" value={summary.daysSinceLast != null ? plural(summary.daysSinceLast, "day") : null} note={summary.last?.title} />
                      <Fig label="Fastest pace" value={summary.fastest ? `${formatPace(summary.fastest.pace)} /km` : null} note={summary.fastest && `${summary.fastest.title}, ${distanceName(summary.fastest.distKey)}`} />
                      <Fig label="PBs broken" value={summary.pbCount ? String(summary.pbCount) : null} note="Times a race beat every earlier one at its distance." />
                      <Fig label="Typical gap" value={summary.medianGap != null ? plural(summary.medianGap, "day") : null} note={summary.longestGap && `Median between races. Longest break: ${summary.longestGap.days} days, before ${summary.longestGap.to.title}.`} />
                      <Fig label="Racing season" value={summary.busiestMonths.length ? summary.busiestMonths.map((m) => MONTHS[m].slice(0, 3)).join(", ") : null} note="The busiest months on the calendar." />
                      <Fig label="Longest race" value={summary.longest?.km ? `${Math.round(summary.longest.km)} km` : null} note={summary.longest?.title} />
                      <Fig label="Busiest year" value={summary.busiestYear && years.length > 1 ? String(summary.busiestYear.year) : null} note={summary.busiestYear && `${plural(summary.busiestYear.count, "race")}, ${Math.round(summary.busiestYear.km)} km`} />
                      <Fig label="Home course" value={summary.cities[0]?.[0]} note={summary.cities[0] && `${plural(summary.cities[0][1], "race")} of ${summary.count}`} />
                    </div>
                  </Plate>

                  <Plate kicker="The calendar" title="Every race in its month" sub="Bigger dots are longer races; the darkest are standing personal bests.">
                    <RaceCalendar races={scoped} onOpen={open} />
                  </Plate>

                  <Plate kicker="Same race, different year" title="Events run more than once" sub="Each attempt on that event's own time scale.">
                    {repeats.length ? <RepeatEvents events={repeats} onOpen={open} /> : <p className="mb-0 text-sm" style={{ color: "var(--ar-muted)" }}>No event run twice in this selection.</p>}
                  </Plate>

                  <div className="ar-grid ar-grid-3">
                    <Plate kicker="By month" title="The season">
                      <MonthStrip counts={months} noun="race" />
                    </Plate>
                    <Plate kicker="Distance mix" title="How far">
                      <RankBars
                        rows={facets.distances.filter((d) => !state.dist || String(d.key) === state.dist).map((d) => ({ key: d.key, label: d.name, value: scoped.filter((r) => r.distKey === d.key).length })).filter((r) => r.value)}
                        onPick={(r) => set({ dist: String(r.key) })}
                      />
                    </Plate>
                    <Plate kicker="Per year" title="Kilometres raced">
                      <RankBars rows={years.map((y) => ({ key: y.year, label: `${y.year} · ${plural(y.count, "race")}`, value: Math.round(y.km) }))} format={(v) => `${v} km`} onPick={(r) => set({ year: String(r.key) })} />
                    </Plate>
                  </div>
                </div>
              ))}

              {tab === "races" && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <SearchBox id="race-search" value={state.q} onChange={(v) => set({ q: v })} placeholder="Search races or places…" />
                    <SortControl options={SORTS} sort={state.sort} dir={state.dir} onChange={set} />
                    <ViewToggle
                      value={state.layout}
                      onChange={(v) => set({ layout: v })}
                      options={[{ value: "cards", label: "Bibs", icon: "confirmation_number" }, { value: "table", label: "Table", icon: "table_rows" }]}
                    />
                  </div>
                  <ResultLine shown={listed.length} total={all.length} noun="race" onClear={hasFilters ? clear : undefined} />
                  {!listed.length && <NoMatches noun="race" onClear={clear} />}
                  {listed.length > 0 && (state.layout === "table"
                    ? <RaceTable races={listed} onOpen={open} sort={state.sort} dir={state.dir} onSort={set} />
                    : <BibCards races={listed} ordinals={ordinals} />)}
                </div>
              )}

              {tab === "records" && (
                <div className="ar-grid">
                  <Plate kicker="All-time bests" title="One ladder per distance" sub="Each card climbs its own ladder of personal bests, newest at the top.">
                    <RecordCards bests={bests} onOpen={open} />
                  </Plate>
                  <Equivalents bests={bests} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
};

export default SportsPage;
