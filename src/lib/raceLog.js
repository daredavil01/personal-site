// Every derived number the /sports page shows, computed in one place.
//
// Pure and dependency-free so it is tested without a browser. Rows arrive in
// the shape src/lib/api/sports.js returns: `date` is "Month DD, YYYY",
// `distance` a label such as "21 Kms", `time` "H:MM:SS" or "HH:MM:SS".
//
// A number with no data is null, never 0 — the page omits it.

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// A "21 Kms" race is a half marathon: pace uses the real course length.
const COURSE_KM = { 21: 21.0975, 42: 42.195 };

export const DISTANCE_NAMES = {
  10: "10K",
  21: "Half marathon",
  35: "35K ultra",
  42: "Marathon",
  50: "50K ultra",
};

const pad = (n) => String(n).padStart(2, "0");

/** "February 02, 2025" → Date (local midnight), or null. */
export function parseRaceDate(value) {
  if (!value || typeof value !== "string") return null;
  const m = value.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS.findIndex((name) => name.toLowerCase().startsWith(m[1].toLowerCase().slice(0, 3)));
    if (month >= 0) return new Date(Number(m[3]), month, Number(m[2]));
  }
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

/** "21 Kms" → 21 (the label's whole number), or null. */
export function distanceKey(label) {
  const m = String(label ?? "").match(/(\d+(?:\.\d+)?)/);
  return m ? Math.round(Number(m[1])) : null;
}

/** The distance actually run, in km. */
export const courseKm = (key) => (key == null ? null : COURSE_KM[key] ?? key);

export const distanceName = (key) => DISTANCE_NAMES[key] ?? `${key}K`;

/** "2:17:13" → 8233; null when unparseable or zero. */
export function parseDuration(value) {
  if (!value || typeof value !== "string") return null;
  const parts = value.trim().split(":").map((p) => Number(p));
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) return null;
  let secs = null;
  if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) secs = parts[0] * 60 + parts[1];
  return secs > 0 ? secs : null;
}

/** 8233 → "2:17:13"; under an hour "55:28". */
export function formatDuration(secs) {
  if (secs == null || !Number.isFinite(secs)) return "";
  const s = Math.round(Math.abs(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** A signed gap: "+4:12" slower, "−1:05" faster. */
export function formatDelta(secs) {
  if (secs == null) return "";
  if (secs === 0) return "±0:00";
  return `${secs > 0 ? "+" : "−"}${formatDuration(secs)}`;
}

/** Seconds per km → "6:31". */
export function formatPace(secsPerKm) {
  if (!secsPerKm || !Number.isFinite(secsPerKm)) return "";
  const s = Math.round(secsPerKm);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** Hours, one decimal under 10. */
export const formatHours = (secs) => {
  if (secs == null) return "";
  const h = secs / 3600;
  return h < 10 ? h.toFixed(1) : String(Math.round(h));
};

const fmtDay = (d) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
export const formatRaceDay = (d) => (d ? fmtDay(d) : "");

const DAY = 86400000;
const daysBetween = (a, b) => Math.round((b - a) / DAY);

/**
 * The event a race belongs to, so the same race run in different years can be
 * compared: the year and the "Self paced" prefix are dropped, "Half Hill" and
 * "Hill Half" are the same words.
 */
export function seriesKey(title) {
  const words = String(title ?? "")
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["the", "hm", "half", "marathon", "run", "km", "kms"].includes(w));
  return words.sort().join(" ");
}

/** "MILIT, Pune" → "Pune"; "Sinhgad, Pune" → "Pune". The city is the last part. */
export function cityOf(place) {
  const parts = String(place ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return null;
  if (/^india$/i.test(last) && parts.length > 1) return parts[parts.length - 2];
  return last.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Each row with its parsed facts. Rows without a date sink to the end. */
export function enrichRaces(rows) {
  const races = (rows ?? []).map((r) => {
    const dateObj = parseRaceDate(r.date);
    const key = distanceKey(r.distance);
    const km = courseKm(key);
    const secs = parseDuration(r.time);
    return {
      ...r,
      dateObj,
      year: dateObj ? dateObj.getFullYear() : null,
      month: dateObj ? dateObj.getMonth() : null,
      distKey: key,
      km,
      secs,
      pace: secs && km ? secs / km : null,
      series: seriesKey(r.title),
      city: cityOf(r.place),
    };
  });
  races.sort((a, b) => (a.dateObj ?? Infinity) - (b.dateObj ?? Infinity) || a.id - b.id);

  /* eslint-disable no-param-reassign -- the rows were built just above */
  // Personal bests in race order: a race is a PB if it beat everything before
  // it at the same distance. `gapToBest` is against the all-time best.
  const runningBest = new Map();
  const best = new Map();
  races.forEach((r) => {
    if (!r.secs || r.distKey == null) return;
    const prev = runningBest.get(r.distKey);
    r.wasPB = prev == null || r.secs < prev.secs;
    r.firstAtDistance = prev == null;
    r.improvedBy = prev != null && r.wasPB ? prev.secs - r.secs : null;
    if (r.wasPB) runningBest.set(r.distKey, r);
    const b = best.get(r.distKey);
    if (!b || r.secs < b.secs) best.set(r.distKey, r);
  });
  races.forEach((r) => {
    const b = r.distKey != null ? best.get(r.distKey) : null;
    r.isBest = !!b && b.id === r.id;
    r.gapToBest = b && r.secs ? r.secs - b.secs : null;
  });
  /* eslint-enable no-param-reassign */
  return races;
}

const countBy = (items, keyOf) => {
  const m = new Map();
  items.forEach((i) => {
    const k = keyOf(i);
    if (k != null && k !== "") m.set(k, (m.get(k) ?? 0) + 1);
  });
  return m;
};

/** The facets the filter chips offer, with counts. */
export function raceFacets(races) {
  const years = [...countBy(races, (r) => r.year)].map(([name, count]) => ({ name: String(name), count }))
    .sort((a, b) => b.name.localeCompare(a.name));
  const distances = [...countBy(races, (r) => r.distKey)].map(([key, count]) => ({ key, name: distanceName(key), count }))
    .sort((a, b) => a.key - b.key);
  return { years, distances };
}

/** Year / distance / search filtering and sorting (all URL state). */
export function filterRaces(races, {
  year = "", dist = "", q = "", sort = "date", dir = "desc",
} = {}) {
  const needle = q.trim().toLowerCase();
  const out = races.filter((r) => {
    if (year && String(r.year) !== year) return false;
    if (dist && String(r.distKey) !== dist) return false;
    if (needle && ![r.title, r.place, r.description, ...(r.tags ?? [])].join(" ").toLowerCase().includes(needle)) return false;
    return true;
  });
  const sign = dir === "asc" ? 1 : -1;
  const val = {
    date: (r) => r.dateObj?.getTime() ?? null,
    time: (r) => r.secs,
    pace: (r) => r.pace,
    distance: (r) => r.km,
    title: (r) => r.title ?? "",
  }[sort] ?? ((r) => r.dateObj?.getTime() ?? null);
  return out.sort((a, b) => {
    const av = val(a);
    const bv = val(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // missing sinks either way
    if (bv == null) return -1;
    if (typeof av === "string") return sign * av.localeCompare(bv);
    return sign * (av - bv) || (b.dateObj - a.dateObj);
  });
}

/**
 * Riegel's endurance model, T2 = T1 × (D2/D1)^1.06 — the classic way to read
 * one result as an equivalent at another distance. An estimate, labelled so.
 */
export const riegel = (secs, fromKm, toKm) => (secs && fromKm && toKm ? secs * (toKm / fromKm) ** 1.06 : null);

/** Personal bests per distance, each with how it got there. */
export function personalBests(races, today = new Date()) {
  const keys = [...new Set(races.filter((r) => r.secs && r.distKey != null).map((r) => r.distKey))].sort((a, b) => a - b);
  return keys.map((key) => {
    const at = races.filter((r) => r.distKey === key && r.secs);
    const best = at.find((r) => r.isBest);
    const first = at[0];
    const history = at.filter((r) => r.wasPB);
    return {
      key,
      name: distanceName(key),
      km: courseKm(key),
      best,
      count: at.length,
      history,
      // How much faster the PB is than the first time at this distance.
      gainedSecs: first && best && first.id !== best.id ? first.secs - best.secs : null,
      standingDays: best?.dateObj ? Math.max(0, daysBetween(best.dateObj, today)) : null,
      avgSecs: Math.round(at.reduce((s, r) => s + r.secs, 0) / at.length),
    };
  });
}

/** Events run more than once, oldest attempt first, with the change. */
export function repeatEvents(races) {
  const groups = new Map();
  races.forEach((r) => {
    if (!r.series || !r.secs) return;
    const g = groups.get(r.series) ?? [];
    g.push(r);
    groups.set(r.series, g);
  });
  return [...groups.values()]
    .filter((g) => g.length > 1 && new Set(g.map((r) => r.distKey)).size === 1)
    .map((g) => {
      const best = g.reduce((a, b) => (b.secs < a.secs ? b : a));
      const last = g[g.length - 1];
      const firstRun = g[0];
      return {
        name: firstRun.title.replace(/\s*\b(19|20)\d{2}\b\s*/g, " ").replace(/\s+/g, " ").trim(),
        distKey: firstRun.distKey,
        runs: g,
        best,
        change: last.secs - firstRun.secs,
      };
    })
    .sort((a, b) => b.runs.length - a.runs.length || a.change - b.change);
}

/** Races per calendar month (0–11), across every year. */
export const monthCounts = (races) => MONTHS.map((_, m) => races.filter((r) => r.month === m).length);

/** Race count and kilometres per year, oldest first. */
export function perYear(races) {
  const years = [...new Set(races.map((r) => r.year).filter((y) => y != null))].sort();
  return years.map((year) => {
    const at = races.filter((r) => r.year === year);
    return {
      year,
      count: at.length,
      km: at.reduce((s, r) => s + (r.km ?? 0), 0),
      secs: at.reduce((s, r) => s + (r.secs ?? 0), 0),
    };
  });
}

/** The headline numbers, plus the facts the insight cards read. */
export function raceSummary(races, today = new Date()) {
  if (!races.length) return null;
  const dated = races.filter((r) => r.dateObj);
  const timed = races.filter((r) => r.secs);
  const km = races.reduce((s, r) => s + (r.km ?? 0), 0);
  const secs = timed.reduce((s, r) => s + r.secs, 0);
  const cities = [...countBy(races, (r) => r.city)].sort((a, b) => b[1] - a[1]);

  let longestGap = null;
  for (let i = 1; i < dated.length; i += 1) {
    const days = daysBetween(dated[i - 1].dateObj, dated[i].dateObj);
    if (!longestGap || days > longestGap.days) longestGap = { days, from: dated[i - 1], to: dated[i] };
  }
  const gaps = dated.slice(1).map((r, i) => daysBetween(dated[i].dateObj, r.dateObj));
  const medianGap = gaps.length ? [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : null;

  const months = monthCounts(races);
  const peak = Math.max(...months);
  const years = perYear(races);
  const busiestYear = years.reduce((a, b) => (!a || b.count > a.count ? b : a), null);
  const fastest = timed.reduce((a, b) => (!a || b.pace < a.pace ? b : a), null);
  const longest = races.reduce((a, b) => (!a || (b.km ?? 0) > (a.km ?? 0) ? b : a), null);
  const last = dated[dated.length - 1] ?? null;

  return {
    count: races.length,
    km,
    secs: secs || null,
    cities,
    first: dated[0] ?? null,
    last,
    daysSinceLast: last ? Math.max(0, daysBetween(last.dateObj, today)) : null,
    longestGap,
    medianGap,
    busiestMonths: peak ? months.map((c, i) => (c === peak ? i : -1)).filter((i) => i >= 0) : [],
    busiestYear,
    fastest,
    longest,
    pbCount: races.filter((r) => r.wasPB && !r.firstAtDistance).length,
  };
}
