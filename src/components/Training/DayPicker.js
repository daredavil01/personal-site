import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import DayStory from "./DayStory";
import { getActivity } from "../../lib/api/training";
import { isRaceWorkout, sportFamily } from "../../lib/training";
import { formatDistance } from "../../lib/strava";

// The day story on /training itself: a handful of days worth opening — the
// latest, the longest, the most climbing, the latest hike, race and gym
// session — as chips, and the chosen one told in full (the list rows carry
// no splits or streams, so the full row is read when a chip is picked).
// DayLoader is the same reader for one id, used by the calendar's day panel.

const longDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

function useActivity(id, demo) {
  const [state, setState] = useState({ id: null, activity: null });
  useEffect(() => {
    let live = true;
    if (!id) return undefined;
    const read = demo
      ? import("../../lib/trainingDemo").then((m) => m.demoActivity(id))
      : getActivity(id);
    read.then((a) => live && setState({ id, activity: a })).catch(() => live && setState({ id, activity: null }));
    return () => { live = false; };
  }, [id, demo]);
  return state.id === id ? state.activity : undefined;
}

export const DayLoader = ({ id, demo, title }) => {
  const activity = useActivity(id, demo);
  if (activity === undefined) return <div className="h-80 rounded-2xl bg-stone-100 dark:bg-stone-900 animate-pulse" aria-label="Loading the day" />;
  if (!activity) return null;
  return <DayStory key={activity.id} activity={activity} title={title} />;
};
DayLoader.propTypes = {
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  demo: PropTypes.bool,
  title: PropTypes.string,
};
DayLoader.defaultProps = { demo: false, title: null };

/** The chips: [{ key, label, row }], each a different activity, in this order. */
export function notableDays(rows) {
  const list = (rows || []).filter((r) => r.date);
  const moving = list.filter((r) => (r.distance || 0) > 500);
  const first = (arr) => arr[0] || null;
  const max = (arr, fn) => arr.reduce((b, r) => (fn(r) > (b ? fn(b) : -Infinity) ? r : b), null);
  const picks = [
    // A 1 km stroll is a thin story for a group of ten: "latest" means the
    // latest outing of at least 3 km (any distance when there is none).
    ["latest", "Latest", first(moving.filter((r) => r.distance >= 3000)) || first(moving)],
    ["longest", "Longest", max(moving, (r) => r.distance || 0)],
    ["climb", "Most climbing", max(moving, (r) => r.elevationGain || 0)],
    ["race", "Latest race", first(moving.filter((r) => r.sportId || isRaceWorkout(r.workoutType)))],
    ["hike", "Latest hike", first(moving.filter((r) => sportFamily(r.sport) === "hike"))],
    ["run", "Latest run", first(moving.filter((r) => sportFamily(r.sport) === "run"))],
    ["gym", "Latest session", first(list.filter((r) => !(r.distance > 0)))],
  ];
  const seen = new Set();
  return picks.filter(([, , row]) => {
    if (!row || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  }).map(([key, label, row]) => ({ key, label, row }));
}

const DayPicker = ({ rows, demo }) => {
  const days = useMemo(() => notableDays(rows), [rows]);
  const [key, setKey] = useState(null);
  const chosen = days.find((d) => d.key === key) || days[0];
  if (!chosen) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Pick a day">
        {days.map((d) => {
          const active = d.key === chosen.key;
          return (
            <button
              key={d.key}
              type="button"
              aria-pressed={active}
              onClick={() => setKey(d.key)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${active
                ? "bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-stone-900 dark:border-white"
                : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-amber-400"}`}
            >
              <span className="font-bold">{d.label}</span>
              <span className="opacity-70">{` · ${d.row.distance > 0 ? formatDistance(d.row.distance) : d.row.name}`}</span>
            </button>
          );
        })}
        <Link to={`/training/${chosen.row.id}`} className="ml-auto font-label text-[10px] uppercase tracking-widest text-secondary no-underline font-bold">
          Open the full activity →
        </Link>
      </div>
      <DayLoader id={chosen.row.id} demo={demo} title={`${chosen.row.name} · ${longDate(chosen.row.date)}`} />
    </div>
  );
};

DayPicker.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  demo: PropTypes.bool,
};
DayPicker.defaultProps = { demo: false };

export default DayPicker;
