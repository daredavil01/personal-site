import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
  Chip, FilmButton, LensTabs, Readout,
} from "../Arena/Arena";
import {
  FAMILY_LABELS, sportFamily, startHours, streaks, totals,
} from "../../lib/training";
import { stepStats } from "../../lib/trainingFacts";
import { matchRace } from "../../lib/strava";
import { useSports } from "../../context/ContentContext";
import { SampleRibbon } from "./shared";
import Swarm, { STAGE_COLORS } from "./Swarm";
import TrainingFilm from "./TrainingFilm";
import {
  CalendarLens, EngineLens, LogLens, OverviewLens, RecordsLens, RhythmLens, RoutesLens,
} from "./TrainingLenses";

// /training (v27). One page for both shells: a dark stage where every
// session is a dot, and seven lenses that re-form the dots and change the
// plates under them. The lens is the `tab` URL param (the ids the old tabs
// used, so earlier links land), the sport chips are `sport`; both merge into
// the query string (useTrainingFilters).

const LENSES = [
  { id: "overview", label: "Overview", icon: "bubble_chart" },
  { id: "calendar", label: "Calendar", icon: "calendar_month" },
  { id: "rhythm", label: "Rhythm", icon: "schedule" },
  { id: "stats", label: "Records", icon: "military_tech" },
  { id: "facts", label: "Engine", icon: "ecg_heart" },
  { id: "routes", label: "Routes", icon: "landscape" },
  { id: "log", label: "Log", icon: "list" },
];

const int = (n) => Math.round(n).toLocaleString("en-GB");
const monthYear = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

const TrainingArena = ({ rows, demo, filterState }) => {
  const {
    filters, setFilter, filtered, hasFilters,
  } = filterState;
  const lens = LENSES.some((l) => l.id === filters.tab) ? filters.tab : "overview";
  const { sport } = filters;
  const { data: sports } = useSports();

  const families = useMemo(() => {
    const counts = {};
    rows.forEach((r) => { const f = sportFamily(r.sport); counts[f] = (counts[f] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const view = useMemo(() => (sport ? rows.filter((r) => sportFamily(r.sport) === sport) : rows), [rows, sport]);

  // Dots outside the current filters dim; they keep their place.
  const activeIds = useMemo(() => (hasFilters ? new Set(filtered.map((r) => r.id)) : null), [filtered, hasFilters]);
  const isActive = useMemo(() => (activeIds ? (r) => activeIds.has(r.id) : null), [activeIds]);

  // Sessions that were a /sports race: linked by hand, or the same day and distance.
  const raceIds = useMemo(() => {
    const ids = new Set();
    rows.forEach((r) => { if (r.sportId || matchRace(r, sports)) ids.add(r.id); });
    return ids;
  }, [rows, sports]);

  const facts = useMemo(() => {
    const t = totals(view);
    const days = [...new Set(view.map((r) => r.date).filter(Boolean))].sort();
    const hours = startHours(view);
    const started = hours.reduce((a, b) => a + b, 0);
    const early = hours.slice(4, 8).reduce((a, b) => a + b, 0);
    const steps = stepStats(view);
    const withHr = view.filter((r) => r.averageHeartrate > 0).length;
    const longest = view.reduce((b, r) => ((r.distance || 0) > (b?.distance || 0) ? r : b), null);
    return {
      t, days, earlyShare: started ? early / started : 0, steps, withHr, longest, streak: streaks(view).longest,
    };
  }, [view]);
  const all = useMemo(() => {
    const hours = startHours(rows);
    const started = hours.reduce((a, b) => a + b, 0);
    return { earlyShare: started ? hours.slice(4, 8).reduce((a, b) => a + b, 0) / started : 0 };
  }, [rows]);

  const dawn = all.earlyShare >= 0.5;
  const span = facts.days.length ? `${monthYear(facts.days[0])} – ${monthYear(facts.days[facts.days.length - 1])}` : "";
  const noun = sport ? FAMILY_LABELS[sport].toLowerCase() : "sessions";
  const caption = {
    overview: `Every dot is one session, stacked on the week it happened. ${int(view.length)} ${noun}; the bigger the dot, the further it went.`,
    calendar: `Weeks run left to right, Monday to Sunday top to bottom. ${int(facts.days.length)} active days${facts.streak > 1 ? `, the longest unbroken run of them ${facts.streak}` : ""}.`,
    rhythm: `A 24-hour dial with midnight at the top; the oldest sessions sit at the centre.${facts.earlyShare ? ` ${Math.round(facts.earlyShare * 100)}% start between 4 and 8 am.` : ""}`,
    stats: `Further right is longer, higher is faster.${facts.longest?.distance ? ` The far edge is ${facts.longest.name}, ${(facts.longest.distance / 1000).toFixed(1)} km.` : ""}`,
    facts: `Average heart rate against time out. ${int(facts.withHr)} of ${int(view.length)} ${noun} carry a heart-rate trace.`,
    routes: `Each session at the height it climbed, in the order it happened.${facts.t.elevationGain ? ` ${int(facts.t.elevationGain)} m in all.` : ""}`,
    log: "The whole log in reading order, newest first. Search and filter below; what does not match dims.",
  }[lens];

  const swarmHeight = typeof window !== "undefined" && window.innerWidth < 640 ? 360 : 440;

  return (
    <div className="ar-root tr-root flex flex-col gap-6 w-full">
      <section className="ar-stage" aria-labelledby="tr-title">
        <div className="px-5 pt-6 md:px-10 md:pt-8 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="ar-kicker mb-0 ar-stage-ember">{`Training log${span ? ` · ${span}` : ""}`}</p>
            <div className="flex flex-wrap items-center gap-2">
              {demo && <SampleRibbon dark />}
              <FilmButton label="The film · 60 s">
                <div className="tr-night" style={{ background: "none", border: 0 }}><TrainingFilm dark /></div>
              </FilmButton>
            </div>
          </div>

          <div className="grid gap-6 items-end lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <h1 id="tr-title" className="ar-title">
              {dawn ? <>Before <em>sunrise.</em></> : <>Every <em>session.</em></>}
            </h1>
            <p className="mb-0 text-base md:text-lg leading-relaxed ar-stage-muted max-w-md">
              {`${int(rows.length)} sessions off the watch — runs, walks, hikes and strength`}
              {dawn ? `, ${Math.round(all.earlyShare * 100)}% of them begun between 4 and 8 in the morning. ` : ". "}
              Every one is a dot below. Change the lens and they rearrange themselves.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <LensTabs tabs={LENSES} active={lens} onChange={(id) => setFilter("tab", id)} label="Lens" />
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sport">
              <Chip active={!sport} onClick={() => setFilter("sport", "")}>{`Everything · ${int(rows.length)}`}</Chip>
              {families.map(([f, n]) => (
                <Chip key={f} active={sport === f} onClick={() => setFilter("sport", sport === f ? "" : f)}>
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: STAGE_COLORS[f] }} aria-hidden="true" />
                  {`${FAMILY_LABELS[f]} · ${int(n)}`}
                </Chip>
              ))}
              {raceIds.size > 0 && (
                <span className="inline-flex items-center gap-1.5 ml-1 ar-kicker ar-stage-muted" style={{ fontSize: "0.6rem" }}>
                  <span className="inline-block w-2.5 h-2.5 rounded-full border-[1.5px] border-[#ffc861]" aria-hidden="true" />
                  Race day
                </span>
              )}
            </div>
          </div>
          <p key={lens} className="ar-swap mb-0 text-sm md:text-[15px] leading-relaxed text-white/85 max-w-3xl min-h-[2.75rem]">{caption}</p>
        </div>

        <Swarm
          rows={rows}
          lens={lens}
          isActive={isActive}
          raceIds={raceIds}
          height={swarmHeight}
          label={`${int(rows.length)} training sessions as dots. ${caption}`}
        />

        <Readout
          items={[
            { label: sport ? FAMILY_LABELS[sport] : "Sessions", value: facts.t.count },
            { label: "Kilometres", value: Math.round(facts.t.distance / 1000) },
            { label: "Hours moving", value: Math.round(facts.t.movingTime / 3600) },
            { label: "Steps", value: facts.steps ? facts.steps.total : null },
            { label: "Metres climbed", value: Math.round(facts.t.elevationGain) },
            { label: "Active days", value: facts.days.length },
          ]}
        />
      </section>

      <div id="ar-lens-panel" role="tabpanel" aria-labelledby={`ar-tab-${lens}`} key={`${lens}-${sport}`} className="ar-swap">
        {view.length === 0 && <p className="italic text-center py-12 mb-0" style={{ color: "var(--ar-muted)" }}>Nothing for this sport yet.</p>}
        {view.length > 0 && lens === "overview" && <OverviewLens rows={view} demo={demo} />}
        {view.length > 0 && lens === "calendar" && <CalendarLens rows={view} demo={demo} year={filters.year} onYear={(y) => setFilter("year", String(y))} />}
        {view.length > 0 && lens === "rhythm" && <RhythmLens rows={view} />}
        {view.length > 0 && lens === "stats" && <RecordsLens rows={view} demo={demo} sport={sport} />}
        {view.length > 0 && lens === "facts" && <EngineLens rows={view} />}
        {view.length > 0 && lens === "routes" && <RoutesLens rows={rows} demo={demo} filterState={filterState} sport={sport} />}
        {view.length > 0 && lens === "log" && <LogLens rows={rows} filterState={filterState} />}
      </div>
    </div>
  );
};

TrainingArena.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  demo: PropTypes.bool.isRequired,
  filterState: PropTypes.shape({
    filters: PropTypes.shape({}).isRequired,
    setFilter: PropTypes.func.isRequired,
    filtered: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    hasFilters: PropTypes.bool.isRequired,
  }).isRequired,
};

export default TrainingArena;
