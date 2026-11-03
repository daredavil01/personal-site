// /training's numbers: filters, totals, the year heatmap and monthly rollups.
// Pure (rows in, numbers out) so the page, /now's autofill, /stats and the
// /ask source all count the same way, and so it is tested.
//
// Rows are the shape of fromActivityRow in src/lib/api/training.js.

/** Coarse families, so a filter chip covers Run + TrailRun + VirtualRun. */
const FAMILY = {
  Run: "run",
  TrailRun: "run",
  VirtualRun: "run",
  Ride: "ride",
  MountainBikeRide: "ride",
  GravelRide: "ride",
  EBikeRide: "ride",
  EMountainBikeRide: "ride",
  VirtualRide: "ride",
  Velomobile: "ride",
  Handcycle: "ride",
  Walk: "walk",
  Hike: "hike",
  Swim: "swim",
};

/** Strava's workout_type: 1 is a race for runs, 11 for rides. */
export const isRaceWorkout = (t) => t === 1 || t === 11;

export const sportFamily = (sport) => FAMILY[sport] || "other";

export const FAMILY_LABELS = {
  run: "Runs", ride: "Rides", walk: "Walks", hike: "Hikes", swim: "Swims", other: "Other",
};

const year = (row) => (row.date ? Number(row.date.slice(0, 4)) : null);
const month = (row) => (row.date ? row.date.slice(0, 7) : null);

/** Sum of a list of rows. Every figure is omitted-safe (0 when absent). */
export function totals(rows) {
  return (rows || []).reduce((t, r) => ({
    count: t.count + 1,
    distance: t.distance + (Number(r.distance) || 0),
    movingTime: t.movingTime + (Number(r.movingTime) || 0),
    elevationGain: t.elevationGain + (Number(r.elevationGain) || 0),
    kudos: t.kudos + (Number(r.kudos) || 0),
  }), {
    count: 0, distance: 0, movingTime: 0, elevationGain: 0, kudos: 0,
  });
}

/** key → rows, keys in first-seen order. */
function groupBy(rows, keyOf) {
  const map = new Map();
  (rows || []).forEach((r) => {
    const k = keyOf(r);
    if (k == null) return;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  });
  return map;
}

/** [{ year, family, ...totals }] newest year first. */
export function totalsByYear(rows) {
  const out = [];
  groupBy(rows, year).forEach((list, y) => {
    out.push({ year: y, ...totals(list), byFamily: Object.fromEntries([...groupBy(list, (r) => sportFamily(r.sport))].map(([f, l]) => [f, totals(l)])) });
  });
  return out.sort((a, b) => b.year - a.year);
}

/** [{ family, ...totals }] largest count first. */
export function totalsByFamily(rows) {
  return [...groupBy(rows, (r) => sportFamily(r.sport))]
    .map(([family, list]) => ({ family, ...totals(list) }))
    .sort((a, b) => b.count - a.count);
}

/** "YYYY-MM" → totals, for /now, the newsletter and /ask. */
export function monthTotals(rows, ym) {
  return totals((rows || []).filter((r) => month(r) === ym));
}

/** [{ month: "YYYY-MM", ...totals, families }] newest first. */
export function totalsByMonth(rows) {
  return [...groupBy(rows, month)]
    .map(([m, list]) => ({
      month: m,
      ...totals(list),
      families: [...groupBy(list, (r) => sportFamily(r.sport))].map(([f, l]) => ({ family: f, ...totals(l) })),
      longest: list.reduce((best, r) => ((Number(r.distance) || 0) > (Number(best?.distance) || 0) ? r : best), null),
    }))
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

/** Years present, newest first. */
export const yearsOf = (rows) => [...new Set((rows || []).map(year).filter(Boolean))].sort((a, b) => b - a);

/**
 * The year heatmap: one cell per day of `y`, Monday-first weeks, with the
 * day's distance (metres), time and count. `weeks` is an array of 7-slot
 * arrays; a slot outside the year is null.
 */
export function heatmap(rows, y) {
  const byDay = new Map();
  (rows || []).forEach((r) => {
    if (!r.date || year(r) !== y) return;
    const cell = byDay.get(r.date) || { distance: 0, movingTime: 0, count: 0 };
    cell.distance += Number(r.distance) || 0;
    cell.movingTime += Number(r.movingTime) || 0;
    cell.count += 1;
    byDay.set(r.date, cell);
  });
  const first = new Date(Date.UTC(y, 0, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const weeks = [];
  let week = new Array(lead).fill(null);
  for (let d = new Date(first); d.getUTCFullYear() === y; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    week.push({ date: iso, ...(byDay.get(iso) || { distance: 0, movingTime: 0, count: 0 }) });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...new Array(7 - week.length).fill(null)]);
  const max = Math.max(0, ...[...byDay.values()].map((c) => c.distance));
  return { year: y, weeks, max, activeDays: byDay.size };
}

/** 0–4 intensity for a heatmap cell, quartiles of the year's busiest day. */
export function intensity(distance, max) {
  if (!distance || !max) return 0;
  return Math.min(4, Math.max(1, Math.ceil((distance / max) * 4)));
}

/** Longest run of consecutive active days, and the current one ending today/yesterday. */
export function streaks(rows, today = new Date().toISOString().slice(0, 10)) {
  const days = [...new Set((rows || []).map((r) => r.date).filter(Boolean))].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  days.forEach((d) => {
    const t = Date.parse(`${d}T00:00:00Z`);
    run = prev != null && t - prev === 86400000 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  });
  const last = days[days.length - 1];
  const gap = last ? (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / 86400000 : Infinity;
  return { longest, current: gap <= 1 ? run : 0 };
}

// ---------------------------------------------------------------------------
// Filters (URL state: q, sport, year, tags, sort)
// ---------------------------------------------------------------------------

export const SORTS = {
  newest: (a, b) => (a.startDate < b.startDate ? 1 : -1),
  oldest: (a, b) => (a.startDate > b.startDate ? 1 : -1),
  distance: (a, b) => (b.distance || 0) - (a.distance || 0),
  time: (a, b) => (b.movingTime || 0) - (a.movingTime || 0),
  elevation: (a, b) => (b.elevationGain || 0) - (a.elevationGain || 0),
  kudos: (a, b) => (b.kudos || 0) - (a.kudos || 0),
};

export function filterActivities(rows, {
  q = "", sport = "", year: y = "", tags = [], sort = "newest", races = false,
} = {}) {
  const needle = q.trim().toLowerCase();
  const tagSet = new Set((tags || []).map((t) => t.toLowerCase()));
  const out = (rows || []).filter((r) => {
    if (sport && sportFamily(r.sport) !== sport) return false;
    if (y && String(year(r)) !== String(y)) return false;
    if (races && !r.sportId && !isRaceWorkout(r.workoutType)) return false;
    if (tagSet.size && !(r.tags || []).some((t) => tagSet.has(t.toLowerCase()))) return false;
    if (needle && !`${r.name} ${r.sport} ${r.date || ""}`.toLowerCase().includes(needle)) return false;
    return true;
  });
  return out.sort(SORTS[sort] || SORTS.newest);
}

/**
 * The /now and newsletter "Strava" stat group for one month, in the shape
 * STAT_PRESETS (src/pages/admin/now/sectionSpecs.js) stores: bare numbers,
 * the component adds the units. Null when the month has no activity, so an
 * empty group is omitted rather than shown as zeros.
 */
export function stravaMonthStats(rows, ym) {
  const inMonth = (rows || []).filter((r) => (r.date || "").slice(0, 7) === ym);
  if (!inMonth.length) return null;
  const t = totals(inMonth);
  return {
    activities: t.count,
    km: Math.round(t.distance / 1000),
    hours: Math.round(t.movingTime / 3600),
    elevationMeters: Math.round(t.elevationGain),
    approximate: false,
  };
}

// ---------------------------------------------------------------------------
// The redesigned page's figures (v26): weeks, cumulative years, the hour of
// day, records and how far it all adds up to. Pure, like everything above.
// ---------------------------------------------------------------------------

/** Equatorial circumference and the mean distance to the Moon, in metres. */
export const EARTH_METRES = 40075000;
export const MOON_METRES = 384400000;

const dayMs = 86400000;
const utcDay = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** "YYYY-MM-DD" → the Monday of its week, as "YYYY-MM-DD". */
export function weekOf(iso) {
  const t = utcDay(iso);
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - dow * dayMs).toISOString().slice(0, 10);
}

/** 1-based day of the year. */
export const dayOfYear = (iso) => Math.floor((utcDay(iso) - Date.UTC(Number(iso.slice(0, 4)), 0, 1)) / dayMs) + 1;

/**
 * Weekly distance for one year, every week present (zeros included) so a line
 * over it has no holes: [{ week, distance, count }] oldest first. A week
 * belongs to the year its Monday falls in.
 */
export function weeklyTotals(rows, y) {
  const byWeek = new Map();
  (rows || []).forEach((r) => {
    if (!r.date) return;
    const w = weekOf(r.date);
    if (Number(w.slice(0, 4)) !== y) return;
    const cell = byWeek.get(w) || { distance: 0, count: 0 };
    cell.distance += Number(r.distance) || 0;
    cell.count += 1;
    byWeek.set(w, cell);
  });
  const out = [];
  let t = utcDay(weekOf(`${y}-01-01`));
  if (new Date(t).getUTCFullYear() < y) t += 7 * dayMs;
  for (; new Date(t).getUTCFullYear() === y; t += 7 * dayMs) {
    const week = new Date(t).toISOString().slice(0, 10);
    out.push({ week, ...(byWeek.get(week) || { distance: 0, count: 0 }) });
  }
  return out;
}

/**
 * Cumulative distance through a year, one value per day (index 0 = Jan 1),
 * cut at `today` for the running year so the line stops where the year does.
 */
export function cumulativeYear(rows, y, today = new Date().toISOString().slice(0, 10)) {
  const days = (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / dayMs;
  const daily = new Array(days).fill(0);
  (rows || []).forEach((r) => {
    if (!r.date || Number(r.date.slice(0, 4)) !== y) return;
    daily[dayOfYear(r.date) - 1] += Number(r.distance) || 0;
  });
  const last = Number(today.slice(0, 4)) === y ? dayOfYear(today) : days;
  const out = [];
  let sum = 0;
  for (let i = 0; i < Math.min(days, last); i += 1) {
    sum += daily[i];
    out.push(sum);
  }
  return out;
}

/** [year][month 0–11] → distance, for every year present. */
export function monthGrid(rows) {
  const out = {};
  (rows || []).forEach((r) => {
    if (!r.date) return;
    const y = Number(r.date.slice(0, 4));
    if (!out[y]) out[y] = new Array(12).fill(0).map(() => ({}));
    const cell = out[y][Number(r.date.slice(5, 7)) - 1];
    const f = sportFamily(r.sport);
    cell[f] = (cell[f] || 0) + (Number(r.distance) || 0);
  });
  return out;
}

/** Activities started in each hour of the local day (24 bins). */
export function startHours(rows) {
  const bins = new Array(24).fill(0);
  (rows || []).forEach((r) => {
    const h = r.startLocal ? Number(String(r.startLocal).slice(11, 13)) : NaN;
    if (Number.isInteger(h) && h >= 0 && h < 24) bins[h] += 1;
  });
  return bins;
}

const maxBy = (rows, fn) => (rows || []).reduce((best, r) => {
  const v = fn(r);
  return v > 0 && (!best || v > fn(best)) ? r : best;
}, null);

/**
 * The headline records. Each is the row (or a { …, value } summary) or null
 * when nothing qualifies, so the page omits it rather than showing zero.
 */
export function records(rows) {
  const list = rows || [];
  const runs = list.filter((r) => sportFamily(r.sport) === "run");
  const fastest = maxBy(runs.filter((r) => (Number(r.distance) || 0) >= 5000), (r) => Number(r.averageSpeed) || 0);
  const weeks = new Map();
  const months = new Map();
  list.forEach((r) => {
    if (!r.date) return;
    const w = weekOf(r.date);
    weeks.set(w, (weeks.get(w) || 0) + (Number(r.distance) || 0));
    const m = r.date.slice(0, 7);
    months.set(m, (months.get(m) || 0) + (Number(r.distance) || 0));
  });
  const top = (map) => [...map].reduce((best, [k, v]) => (v > 0 && (!best || v > best.value) ? { key: k, value: v } : best), null);
  return {
    longest: maxBy(list, (r) => Number(r.distance) || 0),
    longestRun: maxBy(runs, (r) => Number(r.distance) || 0),
    longestTime: maxBy(list, (r) => Number(r.movingTime) || 0),
    biggestClimb: maxBy(list, (r) => Number(r.elevationGain) || 0),
    fastestRun: fastest,
    biggestWeek: top(weeks),
    biggestMonth: top(months),
    streak: streaks(list).longest || null,
  };
}

/** How far a distance goes: laps of the equator and the share of the way to the Moon. */
export function howFar(metres) {
  const m = Number(metres) || 0;
  return { earth: m / EARTH_METRES, moon: m / MOON_METRES };
}

const KM_MARKS = [100, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 40075];

/**
 * The firsts and the round numbers, oldest first: the first 10K, half and
 * full marathon run (by distance), the first ultra, and the activity that
 * carried the running total past each mark in KM_MARKS (the last is the
 * equator). [{ date, kind: "first"|"total", label, row }]
 */
export function milestones(rows) {
  const list = [...(rows || [])].filter((r) => r.date).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const out = [];
  const firsts = [
    [10000, "First 10K"], [21097, "First half marathon"], [42195, "First marathon"], [50000, "First ultra"],
  ];
  firsts.forEach(([m, label]) => {
    const r = list.find((x) => sportFamily(x.sport) === "run" && (Number(x.distance) || 0) >= m * 0.985);
    if (r) out.push({ date: r.date, kind: "first", label, row: r });
  });
  let sum = 0;
  let k = 0;
  list.forEach((r) => {
    sum += Number(r.distance) || 0;
    while (k < KM_MARKS.length && sum >= KM_MARKS[k] * 1000) {
      out.push({
        date: r.date, kind: "total", label: KM_MARKS[k] === 40075 ? "Once around the Earth" : `${KM_MARKS[k].toLocaleString("en-IN")} km`, row: r,
      });
      k += 1;
    }
  });
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)); // eslint-disable-line no-nested-ternary
}
