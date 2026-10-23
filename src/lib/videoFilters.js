import { projectTime, projectYear } from "./projectDate";

// Filter, search and sort for /videos. Pure so it can be tested without a
// router; useVideoFilters keeps the state in the URL.
//
// Same semantics as /presentations and /projects: picked tags combine with OR
// (each one adds videos); the type, year and playlist pickers and the search
// box narrow. Rows are the shape src/lib/api/videos.js returns.

export const UNDATED = "undated";

export const VIDEO_TYPES = [
  { key: "", label: "All" },
  { key: "video", label: "Videos" },
  { key: "short", label: "Shorts" },
];

// A missing number (no view count, no duration) sinks in every order — it is
// unknown, not zero or infinite.
export const VIDEO_SORTS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "views", label: "Most viewed" },
  { key: "longest", label: "Longest" },
  { key: "shortest", label: "Shortest" },
];
export const DEFAULT_SORT = "newest";

const lower = (v) => String(v ?? "").toLowerCase();
const byCount = (a, b) => b.count - a.count || a.name.localeCompare(b.name);

/** Counts per type, years (newest first, undated last), tags and playlists by use. */
export function videoFacets(videos) {
  const types = { "": videos.length, video: 0, short: 0 };
  const years = new Map();
  const tags = new Map();
  const playlists = new Map();
  videos.forEach((v) => {
    types[v.kind === "short" ? "short" : "video"] += 1;
    const y = projectYear(v.date) ?? UNDATED;
    years.set(y, (years.get(y) ?? 0) + 1);
    new Set((v.tags ?? []).map(lower)).forEach((t) => tags.set(t, (tags.get(t) ?? 0) + 1));
    new Set(v.playlists ?? []).forEach((p) => playlists.set(p, (playlists.get(p) ?? 0) + 1));
  });
  const list = (map) => [...map.entries()].map(([name, count]) => ({ name, count })).sort(byCount);
  return {
    types,
    years: [...years.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => (a.name === UNDATED) - (b.name === UNDATED) || b.name.localeCompare(a.name)),
    tags: list(tags),
    playlists: list(playlists),
  };
}

/** Ascending or descending on a number that may be missing; missing always last. */
const numeric = (key, dir) => (a, b) => {
  const av = Number.isFinite(a[key]) ? a[key] : null;
  const bv = Number.isFinite(b[key]) ? b[key] : null;
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return dir * (av - bv);
};

const byDate = (dir) => (a, b) => {
  const at = projectTime(a.date);
  const bt = projectTime(b.date);
  if (at === null && bt === null) return 0;
  if (at === null) return 1;
  if (bt === null) return -1;
  return dir * (at - bt);
};

const ORDERS = {
  newest: byDate(-1),
  oldest: byDate(1),
  views: numeric("viewCount", -1),
  longest: numeric("durationSeconds", -1),
  shortest: numeric("durationSeconds", 1),
};

export function filterVideos(videos, {
  q = "", type = "", tags = [], year = "", playlist = "", sort = DEFAULT_SORT,
} = {}) {
  const needle = q.trim().toLowerCase();
  const picked = tags.map(lower);

  const result = videos.filter((v) => {
    if (type && (v.kind === "short" ? "short" : "video") !== type) return false;
    if (year && (projectYear(v.date) ?? UNDATED) !== year) return false;
    if (playlist && !(v.playlists ?? []).includes(playlist)) return false;
    const owned = (v.tags ?? []).map(lower);
    if (picked.length && !picked.some((t) => owned.includes(t))) return false;
    if (needle) {
      const haystack = [v.title, v.description, ...owned, ...(v.ytTags ?? []), ...(v.playlists ?? [])]
        .join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const order = ORDERS[sort] || ORDERS[DEFAULT_SORT];
  // Ties fall back to newest first, then id, so the grid never reshuffles.
  return result.sort((a, b) => order(a, b) || ORDERS.newest(a, b) || (b.id ?? 0) - (a.id ?? 0));
}
