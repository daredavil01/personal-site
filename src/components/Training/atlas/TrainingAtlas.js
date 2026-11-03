import React, { useMemo } from "react";
import PropTypes from "prop-types";
import AtlasHero from "./AtlasHero";
import NightMap from "./NightMap";
import YearSpiral from "./YearSpiral";
import GhostRace from "./GhostRace";
import WeeklyTides from "./WeeklyTides";
import DayClock from "./DayClock";
import Departures from "./Departures";
import ShoeRack from "./ShoeRack";
import RecordMedals from "../RecordMedals";
import Milestones from "../Milestones";
import ActivityLog from "../classic/ActivityLog";
import DayPicker from "../DayPicker";
import { useTrainingExtra } from "../useTrainingData";
import { FAMILY_ICONS, famColor } from "../shared";
import { FAMILY_LABELS, filterActivities, sportFamily } from "../../../lib/training";

// The atlas /training: the log told as an animated story in six chapters,
// each one playing the first time it scrolls into view and then handing the
// controls to the reader. A sticky lens at the top re-tells the whole story
// for one sport (the same `sport` URL param as the classic filters). Ends on
// the departures board, the medal case, the road so far and the full log.

const TrainingAtlas = ({ rows, demo, filterState }) => {
  const { filters, setFilter } = filterState;
  const lens = filters.sport;
  const routes = useTrainingExtra("routes", demo);
  const efforts = useTrainingExtra("efforts", demo);
  const gear = useTrainingExtra("gear", demo);

  const families = useMemo(() => {
    const counts = {};
    rows.forEach((r) => { const f = sportFamily(r.sport); counts[f] = (counts[f] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const view = useMemo(() => (lens ? rows.filter((r) => sportFamily(r.sport) === lens) : rows), [rows, lens]);
  const viewRoutes = useMemo(() => (routes || []).filter((r) => r.route && (!lens || sportFamily(r.sport) === lens)), [routes, lens]);
  const logRows = useMemo(() => filterActivities(rows, { q: filters.q, sport: lens }), [rows, filters.q, lens]);
  const showRace = !lens || lens === "run";

  return (
    <div className="tr-root flex flex-col gap-6 md:gap-8 w-full">
      <AtlasHero rows={view} demo={demo} />

      <nav className="sticky top-[4.5rem] z-30 self-center max-w-full" aria-label="Tell the story for one sport">
        <div className="flex gap-1 p-1.5 rounded-full bg-slate-900/85 backdrop-blur-md shadow-2xl border border-white/10 overflow-x-auto tr-scroll-x">
          {[["", rows.length], ...families].map(([f, n]) => {
            const active = lens === f;
            return (
              <button
                key={f || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter("sport", f)}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-label uppercase tracking-wider whitespace-nowrap transition-all ${active ? "bg-white text-slate-900 shadow" : "text-slate-200 hover:bg-white/10"}`}
                title={`${n} activities`}
              >
                {f ? (
                  <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-white" style={{ background: famColor(f) }} aria-hidden="true">
                    <span className="material-symbols-outlined text-[13px]">{FAMILY_ICONS[f]}</span>
                  </span>
                ) : <span className="material-symbols-outlined text-base" aria-hidden="true">auto_awesome</span>}
                {f ? FAMILY_LABELS[f] : "Everything"}
              </button>
            );
          })}
        </div>
      </nav>

      {view.length === 0 ? (
        <p className="text-center italic py-12 mb-0">Nothing for this sport yet.</p>
      ) : (
        <>
          {viewRoutes.length > 0 && <NightMap key={`map-${lens}`} routes={viewRoutes} />}
          <section className="rounded-3xl px-4 py-8 md:px-10 md:py-10 bg-[#fbf3e2] dark:bg-stone-900 border border-[#efe0bf] dark:border-stone-800" aria-labelledby="tr-day-pick-title">
            <p className="tr-kicker mb-2 text-[#b22200]">Interlude</p>
            <h2 id="tr-day-pick-title" className="font-headline text-3xl md:text-5xl mb-1 text-stone-900 dark:text-stone-100">One day, up close</h2>
            <p className="text-sm mb-6 max-w-lg text-stone-600 dark:text-stone-400">
              Ten set out together. One stays wherever something happened — the fastest kilometre, a stop by the fire, the hardest climb — and the rest spread out to the finish.
            </p>
            <DayPicker rows={view} demo={demo} />
          </section>
          <YearSpiral rows={view} />
          {showRace && efforts && efforts.length > 0 && <GhostRace efforts={efforts} />}
          <WeeklyTides rows={view} />
          <DayClock rows={view} />
          {gear && gear.length > 0 && (!lens || lens === "run" || lens === "ride") && <ShoeRack gear={gear} />}

          <section className="tr-night px-4 py-8 md:px-10 md:py-10" aria-labelledby="tr-medals-title">
            <p className="tr-kicker mb-2" style={{ color: "var(--tr-accent)" }}>The medal case</p>
            <h2 id="tr-medals-title" className="font-headline text-3xl md:text-5xl mb-1" style={{ color: "var(--tr-ink)" }}>Records</h2>
            <p className="text-sm mb-6" style={{ color: "var(--tr-muted)" }}>Turn a medal over to see the day it was won.</p>
            <RecordMedals rows={view} dark />
            <h3 className="font-headline text-2xl md:text-3xl mt-10 mb-4" style={{ color: "var(--tr-ink)" }}>The road so far</h3>
            <Milestones rows={view} dark />
          </section>

          <Departures rows={view} />
        </>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="tr-log-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="tr-kicker mb-1 text-[#b22200]">Every entry</p>
            <h2 id="tr-log-title" className="font-headline text-3xl md:text-4xl mb-0">The full log</h2>
          </div>
          <label className="relative w-full sm:w-72" htmlFor="tr-atlas-search">
            <span className="sr-only">Search the log</span>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-lg" aria-hidden="true">search</span>
            <input
              id="tr-atlas-search"
              type="search"
              value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)}
              placeholder="Search the log…"
              className="w-full h-10 rounded-full border border-stone-300 bg-white/80 dark:bg-stone-900 dark:border-stone-700 pl-10 pr-4 text-sm outline-none focus:border-[#b22200]"
            />
          </label>
        </div>
        {logRows.length ? <ActivityLog rows={logRows} /> : <p className="italic text-center py-8 mb-0">Nothing matches.</p>}
      </section>
    </div>
  );
};

TrainingAtlas.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  demo: PropTypes.bool.isRequired,
  filterState: PropTypes.shape({ filters: PropTypes.shape({}), setFilter: PropTypes.func }).isRequired,
};

export default TrainingAtlas;
