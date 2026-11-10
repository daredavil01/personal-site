import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import {
  Chip, Fig, Plate, useSeen,
} from "../Arena/Arena";
import {
  FAMILY_LABELS, cumulativeYear, sportFamily, streaks, totals, totalsByFamily, yearsOf,
} from "../../lib/training";
import {
  factsOf, formTrends, inventory, stepStats,
} from "../../lib/trainingFacts";
import { formatDistance } from "../../lib/strava";
import { FAMILY_ICONS, famColor } from "./shared";
import { useTrainingExtra } from "./useTrainingData";
import {
  HourStrip, Inventory, WeekdayBars, ZoneBar,
} from "./FactsParts";
import DayPicker from "./DayPicker";
import Milestones from "./Milestones";
import RecordMedals from "./RecordMedals";
import RouteGrid from "./RouteGrid";
import StatsPRs from "./StatsPRs";
import YearHeatmap from "./YearHeatmap";
import ActivityLog from "./figures/ActivityLog";
import Departures from "./figures/Departures";
import FilterBar from "./figures/FilterBar";
import GhostRace from "./figures/GhostRace";
import MonthlyBars from "./figures/MonthlyBars";
import NightMap from "./figures/NightMap";
import ShoeRack from "./figures/ShoeRack";
import WeeklyTides from "./figures/WeeklyTides";
import YearRace from "./figures/YearRace";

// What sits under the swarm for each lens of /training. Every lens is the
// same log read one way: Overview (the year, the months, a day up close),
// Calendar, Rhythm (when), Records, Engine (the body: steps, heart, form),
// Routes and the Log itself. Numbers come from src/lib/training.js and
// src/lib/trainingFacts.js; nothing is counted in here.

const int = (n) => Math.round(n).toLocaleString("en-GB");
const monthName = (ym, long) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: long ? "long" : "short", year: long ? "numeric" : "2-digit", timeZone: "UTC" });
const rowsType = PropTypes.arrayOf(PropTypes.shape({})).isRequired;

/** A facts group (src/lib/trainingFacts.js) as figures; a best links to its activity. */
const FactFigs = ({ facts, cols }) => (
  <div className={`ar-figs ${cols === 4 ? "ar-figs-4" : ""} ${cols === 6 ? "ar-figs-wide" : ""}`}>
    {facts.map((f) => (
      <Fig key={f.label} label={f.label} value={f.value} note={f.to ? `${f.detail || ""}${f.when ? ` · ${f.when}` : ""}` : f.detail} to={f.to} LinkAs={Link} />
    ))}
  </div>
);
FactFigs.propTypes = { facts: PropTypes.arrayOf(PropTypes.shape({})).isRequired, cols: PropTypes.number };
FactFigs.defaultProps = { cols: 3 };

const useFacts = (rows) => useMemo(() => {
  const groups = factsOf(rows);
  return Object.fromEntries(groups.map((g) => [g.id, g]));
}, [rows]);

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export const OverviewLens = ({ rows, demo }) => {
  const years = useMemo(() => yearsOf(rows), [rows]);
  const [year, setYear] = useState(null);
  const shownYear = year && years.includes(year) ? year : years[0];
  const fams = useMemo(() => totalsByFamily(rows), [rows]);
  const totalDist = fams.reduce((s, f) => s + f.distance, 0) || 1;
  const totalTime = fams.reduce((s, f) => s + f.movingTime, 0) || 1;
  const facts = useFacts(rows);
  const [mixRef, mixSeen] = useSeen();

  const pace = useMemo(() => {
    if (years.length < 2) return null;
    const now = cumulativeYear(rows, years[0]);
    const before = cumulativeYear(rows, years[1]);
    const d = now.length - 1;
    if (d < 0) return null;
    return { now: now[d], before: before[Math.min(d, before.length - 1)], y: years[0], prev: years[1] };
  }, [rows, years]);
  const ahead = pace && pace.now >= pace.before;

  return (
    <div className="ar-grid">
      <Plate
        kicker="Year against year"
        title={pace ? `${int(pace.now / 1000)} km so far in ${pace.y}` : "The years, day by day"}
        sub="Kilometres added up day by day. The running year is the bright line and stops at today."
        action={pace && pace.before > 0 && (
          <span className="ar-display text-2xl font-semibold" style={{ color: ahead ? "var(--ar-good)" : "var(--ar-muted)" }}>
            {`${ahead ? "+" : "−"}${int(Math.abs(pace.now - pace.before) / 1000)} km vs ${pace.prev}`}
          </span>
        )}
      >
        <YearRace rows={rows} />
      </Plate>

      {facts.volume && (
        <Plate kicker="How much" title="The whole log, added up">
          <FactFigs facts={facts.volume.facts} cols={6} />
        </Plate>
      )}

      <div className="ar-grid ar-grid-21">
        <Plate
          kicker="Month by month"
          title={`${shownYear}, by sport`}
          action={years.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Year">
              {years.map((y) => <Chip key={y} paper active={y === shownYear} onClick={() => setYear(y)}>{y}</Chip>)}
            </div>
          )}
        >
          <MonthlyBars rows={rows} year={shownYear} />
        </Plate>

        <Plate kicker="The mix" title="Where the time went" sub="Bars are hours; kilometres beside them.">
          <ul ref={mixRef} className={`flex flex-col gap-4 pl-0 mb-0 list-none ${mixSeen ? "is-seen" : ""}`}>
            {fams.map((f, i) => (
              <li key={f.family}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ar-ink)" }}>
                    <span className="material-symbols-outlined text-base" style={{ color: famColor(f.family) }} aria-hidden="true">{FAMILY_ICONS[f.family]}</span>
                    {FAMILY_LABELS[f.family]}
                    <span className="font-normal text-xs" style={{ color: "var(--ar-muted)" }}>{`${f.count} sessions`}</span>
                  </span>
                  <span className="ar-display text-xl font-semibold whitespace-nowrap">
                    {`${int(f.movingTime / 3600)} h`}
                    {f.distance > 0 && <span className="text-sm font-medium ml-2" style={{ color: "var(--ar-muted)" }}>{`${int(f.distance / 1000)} km · ${Math.round((f.distance / totalDist) * 100)}%`}</span>}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--ar-plate-2)" }}>
                  <div className="ar-bar h-full rounded-full" style={{ width: `${Math.max(1.5, (f.movingTime / totalTime) * 100)}%`, background: famColor(f.family), "--ar-delay": `${i * 90}ms` }} />
                </div>
              </li>
            ))}
          </ul>
        </Plate>
      </div>

      <Plate kicker="One day, up close" title="Ten set out. Watch who stays where" sub="Pick a day: its terrain draws itself on that day's clock, and one of the ten stays wherever something happened — the fastest kilometre, a stop, the hardest climb.">
        <DayPicker rows={rows} demo={demo} />
      </Plate>

      <Plate kicker="The road so far" title="Firsts and round numbers">
        <Milestones rows={rows} />
      </Plate>

      <Departures rows={rows} />
    </div>
  );
};
OverviewLens.propTypes = { rows: rowsType, demo: PropTypes.bool };
OverviewLens.defaultProps = { demo: false };

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export const CalendarLens = ({
  rows, demo, year, onYear,
}) => {
  const years = useMemo(() => yearsOf(rows), [rows]);
  const shown = years.includes(Number(year)) ? Number(year) : years[0];
  const facts = useFacts(rows);
  const all = useMemo(() => streaks(rows), [rows]);
  const habit = (facts.habits?.facts || []).filter((f) => ["Longest streak", "Doubles", "Longest break", "Biggest month"].includes(f.label));
  const days = (facts.volume?.facts || []).find((f) => f.label === "Active days");
  if (!shown) return null;
  return (
    <div className="ar-grid">
      <Plate kicker="Consistency" title="Showing up">
        <div className="ar-figs ar-figs-wide">
          {days && <Fig label={days.label} value={days.value} note={days.detail} />}
          {all.current > 1 && <Fig label="Current streak" value={`${all.current} days`} note="in a row, up to today" />}
          {habit.map((f) => <Fig key={f.label} label={f.label} value={f.value} note={f.detail} />)}
        </div>
      </Plate>
      <Plate kicker="Day by day" title={`${shown}, every day`} sub="Darker is further. Pick a day to see what happened on it — and watch it replayed.">
        <YearHeatmap rows={rows} year={shown} years={years} onYear={onYear} demo={demo} />
      </Plate>
      <WeeklyTides rows={rows} />
    </div>
  );
};
CalendarLens.propTypes = {
  rows: rowsType, demo: PropTypes.bool, year: PropTypes.string, onYear: PropTypes.func.isRequired,
};
CalendarLens.defaultProps = { demo: false, year: "" };

// ---------------------------------------------------------------------------
// Rhythm
// ---------------------------------------------------------------------------

export const RhythmLens = ({ rows }) => {
  const facts = useFacts(rows);
  const g = facts.habits;
  if (!g) return null;
  const pick = (labels) => g.facts.filter((f) => labels.includes(f.label));
  return (
    <div className="ar-grid">
      <div className="ar-grid ar-grid-2">
        <Plate kicker="The hour" title="When the watch starts" sub="Starts in each hour of the local day; the busiest hour is gold.">
          {g.viz && <HourStrip hours={g.viz.hours} />}
          <div className="mt-6"><FactFigs facts={pick(["Favourite hour"])} /></div>
        </Plate>
        <Plate kicker="The week" title="Which days carry the kilometres">
          {g.viz && <WeekdayBars weekdayKm={g.viz.weekdayKm} />}
          <div className="mt-6"><FactFigs facts={pick(["Favourite day"])} /></div>
        </Plate>
      </div>
      {facts.conditions && (
        <Plate kicker="Conditions" title="What it was like out there">
          <FactFigs facts={facts.conditions.facts} />
        </Plate>
      )}
      <Departures rows={rows} />
    </div>
  );
};
RhythmLens.propTypes = { rows: rowsType };

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export const RecordsLens = ({ rows, demo, sport }) => {
  const efforts = useTrainingExtra("efforts", demo);
  const gear = useTrainingExtra("gear", demo);
  const facts = useFacts(rows);
  const showRace = !sport || sport === "run";
  return (
    <div className="ar-grid">
      <Plate kicker="The medal case" title="Personal records" sub="Turn a medal over to see the day it was won.">
        <RecordMedals rows={rows} />
      </Plate>
      {facts.bests && (
        <Plate kicker="Bests" title="The furthest, highest, hardest">
          <FactFigs facts={facts.bests.facts} />
        </Plate>
      )}
      {showRace && efforts && efforts.length > 0 && <GhostRace efforts={efforts} />}
      <Plate kicker="Year by year" title="Totals and fastest efforts">
        <StatsPRs rows={rows} demo={demo} />
      </Plate>
      {gear && gear.length > 0 && <ShoeRack gear={gear} />}
    </div>
  );
};
RecordsLens.propTypes = { rows: rowsType, demo: PropTypes.bool, sport: PropTypes.string };
RecordsLens.defaultProps = { demo: false, sport: "" };

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/** One metric's monthly line, drawn once seen, with where it began and where it is. */
const Trend = ({ t, delay }) => {
  const W = 220;
  const H = 56;
  const vals = t.series.map((s) => s.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const x = (i) => 4 + (i / (vals.length - 1)) * (W - 8);
  const y = (v) => (hi === lo ? H / 2 : 6 + (1 - (v - lo) / (hi - lo)) * (H - 12));
  const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const change = t.last - t.first;
  const flat = Math.abs(change) < Math.abs(t.first) * 0.005;
  const word = t.key === "pace" ? (change > 0 ? "slower" : "quicker") : (change > 0 ? "up" : "down"); // eslint-disable-line no-nested-ternary
  return (
    <div className="ar-fig">
      <span className="ar-fig-label">{t.label}</span>
      <span className="ar-fig-value">
        {t.text.last}
        <span className="ar-unit">{t.unit}</span>
      </span>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" role="img" aria-label={`${t.label} by month, from ${t.text.first} to ${t.text.last} ${t.unit}`}>
        <path d={d} fill="none" stroke="var(--ar-accent)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" pathLength="1" className="ar-draw" style={{ "--ar-delay": `${delay}ms` }} />
        <circle cx={x(vals.length - 1)} cy={y(vals[vals.length - 1])} r="3" fill="var(--ar-accent)" className="ar-pop" style={{ "--ar-delay": `${delay + 1400}ms` }} />
      </svg>
      <span className="ar-fig-note">
        {`${t.text.first} in ${monthName(t.series[0].month)}`}
        {!flat && <span className="font-semibold">{` · ${word} since`}</span>}
      </span>
    </div>
  );
};
Trend.propTypes = { t: PropTypes.shape({}).isRequired, delay: PropTypes.number.isRequired };

export const EngineLens = ({ rows }) => {
  const facts = useFacts(rows);
  const steps = useMemo(() => stepStats(rows), [rows]);
  const trends = useMemo(() => formTrends(rows), [rows]);
  const items = useMemo(() => inventory(rows), [rows]);
  const [stepRef, stepSeen] = useSeen();
  const [trendRef, trendSeen] = useSeen();
  const [open, setOpen] = useState(false);
  const maxSteps = steps ? Math.max(...steps.months.map((m) => m.steps)) : 1;
  const t = totals(rows);

  return (
    <div className="ar-grid">
      {steps && (
        <Plate night kicker="Steps" title={`${int(steps.total)} steps on the watch`} sub={`Counted by the watch in ${int(steps.sessions)} sessions — about ${int(steps.perDay)} on each of the ${int(steps.days)} days it was worn out of the door.`}>
          <div ref={stepRef} className={stepSeen ? "is-seen" : ""}>
            <div className="flex items-end gap-[3px] h-36" role="img" aria-label={`Steps a month; the most in ${monthName(steps.bestMonth.month, true)}: ${int(steps.bestMonth.steps)}`}>
              {steps.months.map((m, i) => (
                <span
                  key={m.month}
                  title={`${monthName(m.month, true)}: ${int(m.steps)} steps`}
                  className="ar-vbar flex-1 rounded-t-[3px]"
                  style={{
                    height: `${Math.max(2, (m.steps / maxSteps) * 100)}%`,
                    background: m.month === steps.bestMonth.month ? "var(--ar-gold)" : "linear-gradient(180deg, #ff6b3d, #7a2b3f)",
                    "--ar-delay": `${i * 28}ms`,
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 ar-kicker" style={{ fontSize: "0.58rem", color: "var(--ar-night-muted)" }} aria-hidden="true">
              <span>{monthName(steps.months[0].month)}</span>
              <span>Steps a month</span>
              <span>{monthName(steps.months[steps.months.length - 1].month)}</span>
            </div>
          </div>
          <div className="ar-figs ar-figs-4 mt-7">
            <Fig label="Most in one session" value={int(steps.biggest.steps)} note={`${steps.biggest.row.name} · ${steps.biggest.row.date}`} to={`/training/${steps.biggest.row.id}`} LinkAs={Link} />
            <Fig label="Biggest month" value={int(steps.bestMonth.steps)} note={monthName(steps.bestMonth.month, true)} />
            {steps.families.slice(0, 2).map((f) => (
              <Fig key={f.family} label={`From ${FAMILY_LABELS[f.family].toLowerCase()}`} value={`${Math.round(f.share * 100)}%`} note={`${int(f.steps)} steps`} />
            ))}
          </div>
        </Plate>
      )}

      {facts.heart && (
        <Plate kicker="Heart" title="Where the heart spends its time" sub={facts.heart.viz ? `Share of every recorded second in each zone, against a working maximum of ${facts.heart.viz.hrMax} bpm.` : null}>
          {facts.heart.viz && <ZoneBar zones={facts.heart.viz.zones} />}
          <div className="mt-7"><FactFigs facts={facts.heart.facts} cols={4} /></div>
        </Plate>
      )}

      {(trends.length > 0 || facts.form) && (
        <Plate kicker="Running form" title="How the stride has moved" sub="Each line is the monthly average over every run of a kilometre or more. The big number is the latest month.">
          {trends.length > 0 && (
            <div ref={trendRef} className={`ar-figs mb-8 ${trendSeen ? "is-seen" : ""}`}>
              {trends.map((tr, i) => <Trend key={tr.key} t={tr} delay={i * 120} />)}
            </div>
          )}
          {facts.form && <FactFigs facts={facts.form.facts.filter((f) => ["Power", "Getting quicker", "Hills, accounted for"].includes(f.label))} />}
        </Plate>
      )}

      {facts.strength && (
        <Plate kicker="Strength" title="Under the bar">
          <FactFigs facts={facts.strength.facts} />
        </Plate>
      )}

      <Plate
        kicker="What is recorded"
        title={`${items.length} variables, ${int(t.count)} sessions`}
        sub="Everything the watch or Strava recorded and the import kept, with how many sessions carry it."
        action={<Chip paper active={open} onClick={() => setOpen(!open)}>{open ? "Hide the list" : "Show the list"}</Chip>}
      >
        {open && <Inventory items={items} total={rows.length} />}
      </Plate>
    </div>
  );
};
EngineLens.propTypes = { rows: rowsType };

// ---------------------------------------------------------------------------
// Routes and the log
// ---------------------------------------------------------------------------

export const RoutesLens = ({
  rows, demo, filterState, sport,
}) => {
  const routes = useTrainingExtra("routes", demo);
  const years = useMemo(() => yearsOf(rows), [rows]);
  const {
    filters, setFilter, clearFilters, hasFilters, filtered,
  } = filterState;
  const lit = useMemo(() => (routes || []).filter((r) => r.route && (!sport || sportFamily(r.sport) === sport)), [routes, sport]);
  const climbed = totals(rows).elevationGain;
  return (
    <div className="ar-grid">
      {lit.length > 0 && <NightMap key={`map-${sport}`} routes={lit} />}
      <Plate
        kicker="Every route"
        title={routes ? `${int(lit.length)} routes, drawn small` : "Routes, drawn small"}
        sub={`Starts and finishes are trimmed for privacy.${climbed ? ` ${int(climbed)} m climbed across the whole log.` : ""}`}
      >
        <div className="flex flex-col gap-5">
          <FilterBar rows={rows} years={years} filters={filters} setFilter={setFilter} clearFilters={clearFilters} hasFilters={hasFilters} count={filtered.length} />
          <RouteGrid filters={filters} demo={demo} />
        </div>
      </Plate>
    </div>
  );
};
RoutesLens.propTypes = {
  rows: rowsType, demo: PropTypes.bool, filterState: PropTypes.shape({}).isRequired, sport: PropTypes.string,
};
RoutesLens.defaultProps = { demo: false, sport: "" };

export const LogLens = ({ rows, filterState }) => {
  const years = useMemo(() => yearsOf(rows), [rows]);
  const {
    filters, setFilter, clearFilters, hasFilters, filtered,
  } = filterState;
  const t = totals(filtered);
  return (
    <Plate
      kicker="Every entry"
      title={`${int(filtered.length)} ${filtered.length === 1 ? "session" : "sessions"}${hasFilters ? " match" : ""}`}
      sub={[formatDistance(t.distance), t.movingTime ? `${int(t.movingTime / 3600)} hours` : null].filter(Boolean).join(" · ") || null}
    >
      <div className="flex flex-col gap-6">
        <FilterBar rows={rows} years={years} filters={filters} setFilter={setFilter} clearFilters={clearFilters} hasFilters={hasFilters} count={filtered.length} />
        {filtered.length
          ? <ActivityLog rows={filtered} />
          : <p className="italic text-center py-12 mb-0" style={{ color: "var(--ar-muted)" }}>No sessions match these filters.</p>}
      </div>
    </Plate>
  );
};
LogLens.propTypes = { rows: rowsType, filterState: PropTypes.shape({}).isRequired };
