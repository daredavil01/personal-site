// Every derived number the /treks page shows, computed in one place.
//
// Pure and dependency-free. Rows arrive in the shape src/lib/api/treks.js
// returns: `date` is "DD-MM-YYYY", `trek_time` free text such as "2 hrs",
// "0.5 Hrs", "22 Hours", `endurance_level` Easy / Medium / Hard.
//
// A number with no data is null, never 0 — the page omits it.

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const LEVELS = ["Easy", "Medium", "Hard"];

// The Sahyadri's three seasons, by month index. The monsoon is the one that
// shapes the trekking year, so it is named first.
export const SEASONS = [
  { id: "monsoon", name: "Monsoon", months: [5, 6, 7, 8], blurb: "Jun–Sep" },
  { id: "winter", name: "Winter", months: [9, 10, 11, 0, 1], blurb: "Oct–Feb" },
  { id: "summer", name: "Summer", months: [2, 3, 4], blurb: "Mar–May" },
];

export const seasonOf = (month) => (month == null ? null : SEASONS.find((s) => s.months.includes(month))?.id ?? null);

const DAY = 86400000;
const daysBetween = (a, b) => Math.round((b - a) / DAY);

/** "17-02-2019" → Date (local midnight), or null. */
export function parseTrekDay(value) {
  const m = String(value ?? "").trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "1.5 Hrs" → 1.5, "22 Hours" → 22, "45 min" → 0.75; null when unreadable. */
export function parseTrekHours(value) {
  const text = String(value ?? "").toLowerCase();
  const m = text.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!(n > 0)) return null;
  return /min/.test(text) && !/h/.test(text) ? n / 60 : n;
}

export const formatTrekHours = (h) => {
  if (h == null) return "";
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
};

export const formatTrekDay = (d) => (d ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` : "");

/** "Dhak_Bahiri" → "Dhak Bahiri". */
export const trekTitle = (t) => String(t?.fort_name ?? "").replace(/_/g, " ").trim();

export function placeKey(label) {
  const w = String(label).toLowerCase().replace(/\bfort\b/g, "").replace(/[^a-z]/g, "");
  return w ? w[0] + w.slice(1).replace(/[aeiou]/g, "") : "";
}

/**
 * The places a trek touches, as comparable keys: "Katraj To Sinhgad" is
 * Katraj and Sinhagad. Spelling drifts ("Sinhgad"/"Sinhagad"), so vowels after
 * the first letter and the words fort/gad-suffix noise are dropped.
 */
export function placesOf(name) {
  return String(name ?? "")
    .replace(/_/g, " ")
    .split(/\s+to\s+/i)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((label) => ({ label: label.replace(/\s+fort$/i, ""), key: placeKey(label) }));
}

/** Each row with its parsed facts, oldest first. */
export function enrichTreks(rows) {
  const treks = (rows ?? []).map((t) => {
    const dateObj = parseTrekDay(t.date);
    const month = dateObj ? dateObj.getMonth() : null;
    return {
      ...t,
      title: trekTitle(t),
      dateObj,
      year: dateObj ? dateObj.getFullYear() : null,
      month,
      season: seasonOf(month),
      hours: parseTrekHours(t.trek_time),
      level: LEVELS.includes(t.endurance_level) ? t.endurance_level : null,
      places: placesOf(t.fort_name),
      photos: (t.slideImages ?? []).length,
    };
  });
  treks.sort((a, b) => (a.dateObj ?? Infinity) - (b.dateObj ?? Infinity) || a.id - b.id);
  const seen = new Set();
  /* eslint-disable no-param-reassign -- the rows were built just above */
  treks.forEach((t, i) => {
    t.number = i + 1;
    t.newPlaces = t.places.filter((p) => !seen.has(p.key)).length;
    t.places.forEach((p) => seen.add(p.key));
  });
  /* eslint-enable no-param-reassign */
  return treks;
}

const countBy = (items, keyOf) => {
  const m = new Map();
  items.forEach((i) => {
    const k = keyOf(i);
    if (k != null && k !== "") m.set(k, (m.get(k) ?? 0) + 1);
  });
  return m;
};

export function trekFacets(treks) {
  const years = [...countBy(treks, (t) => t.year)].map(([name, count]) => ({ name: String(name), count }))
    .sort((a, b) => b.name.localeCompare(a.name));
  const levels = LEVELS.map((name) => ({ name, count: treks.filter((t) => t.level === name).length })).filter((l) => l.count);
  const seasons = SEASONS.map((s) => ({ ...s, count: treks.filter((t) => t.season === s.id).length })).filter((s) => s.count);
  return { years, levels, seasons };
}

export function filterTreks(treks, {
  year = "", level = "", season = "", q = "", sort = "date", dir = "desc",
} = {}) {
  const needle = q.trim().toLowerCase();
  const out = treks.filter((t) => {
    if (year && String(t.year) !== year) return false;
    if (level && t.level !== level) return false;
    if (season && t.season !== season) return false;
    if (needle && ![t.title, ...(t.tags ?? [])].join(" ").toLowerCase().includes(needle)) return false;
    return true;
  });
  const sign = dir === "asc" ? 1 : -1;
  const rank = { Easy: 1, Medium: 2, Hard: 3 };
  const val = {
    date: (t) => t.dateObj?.getTime() ?? null,
    hours: (t) => t.hours,
    level: (t) => rank[t.level] ?? null,
    title: (t) => t.title,
  }[sort] ?? ((t) => t.dateObj?.getTime() ?? null);
  return out.sort((a, b) => {
    const av = val(a);
    const bv = val(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") return sign * av.localeCompare(bv);
    return sign * (av - bv) || (b.dateObj - a.dateObj);
  });
}

/** Places reached more than once, with each visit. */
export function returnVisits(treks) {
  const byKey = new Map();
  treks.forEach((t) => t.places.forEach((p) => {
    const g = byKey.get(p.key) ?? { label: p.label, visits: [] };
    // A trek to just this place names it best ("Sinhagad", not "Sinhgad").
    if (t.places.length === 1) g.label = p.label;
    if (!g.visits.includes(t)) g.visits.push(t);
    byKey.set(p.key, g);
  }));
  return [...byKey.values()].filter((g) => g.visits.length > 1).sort((a, b) => b.visits.length - a.visits.length);
}

export const monthCounts = (treks) => MONTHS.map((_, m) => treks.filter((t) => t.month === m).length);

export function perYear(treks) {
  const years = [...new Set(treks.map((t) => t.year).filter((y) => y != null))].sort();
  return years.map((year) => {
    const at = treks.filter((t) => t.year === year);
    return {
      year,
      count: at.length,
      hours: at.reduce((s, t) => s + (t.hours ?? 0), 0),
      levels: LEVELS.map((l) => at.filter((t) => t.level === l).length),
    };
  });
}

export function trekSummary(treks, today = new Date()) {
  if (!treks.length) return null;
  const dated = treks.filter((t) => t.dateObj);
  const timed = treks.filter((t) => t.hours);
  const hours = timed.reduce((s, t) => s + t.hours, 0);
  const places = new Set(treks.flatMap((t) => t.places.map((p) => p.key)));

  let longestGap = null;
  for (let i = 1; i < dated.length; i += 1) {
    const days = daysBetween(dated[i - 1].dateObj, dated[i].dateObj);
    if (!longestGap || days > longestGap.days) longestGap = { days, from: dated[i - 1], to: dated[i] };
  }
  const seasons = SEASONS.map((s) => ({ ...s, count: treks.filter((t) => t.season === s.id).length }));
  const topSeason = seasons.reduce((a, b) => (b.count > a.count ? b : a));
  const years = perYear(treks);
  const busiestYear = years.reduce((a, b) => (!a || b.count > a.count ? b : a), null);
  const longest = timed.reduce((a, b) => (!a || b.hours > a.hours ? b : a), null);
  const sortedHours = timed.map((t) => t.hours).sort((a, b) => a - b);
  const median = sortedHours.length ? sortedHours[Math.floor(sortedHours.length / 2)] : null;
  const last = dated[dated.length - 1] ?? null;

  return {
    count: treks.length,
    hours: hours || null,
    places: places.size,
    years: years.length,
    first: dated[0] ?? null,
    last,
    daysSinceLast: last ? Math.max(0, daysBetween(last.dateObj, today)) : null,
    longestGap,
    seasons,
    topSeason: topSeason.count ? topSeason : null,
    busiestYear,
    longest,
    medianHours: median,
    hard: treks.filter((t) => t.level === "Hard").length,
    withStory: treks.filter((t) => t.blog_link).length,
    photos: treks.reduce((s, t) => s + t.photos, 0),
  };
}
