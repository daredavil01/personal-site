import { projectYear, projectTime } from "./projectDate";

// Filter, search and sort for /presentations. Pure so it can be tested without
// a router; the page keeps the state in the URL.
//
// Same semantics as /books and /projects: picked tags combine with OR (each one
// adds decks) and the search box narrows.

export const UNDATED = "undated";

const lower = (v) => String(v ?? "").toLowerCase();

/** Years with decks (newest first) and every tag, most-used first, with counts. */
export function deckFacets(decks) {
  const years = new Map();
  const tags = new Map();
  decks.forEach((d) => {
    const y = projectYear(d.date) ?? UNDATED;
    years.set(y, (years.get(y) ?? 0) + 1);
    (d.tags ?? []).forEach((t) => tags.set(lower(t), (tags.get(lower(t)) ?? 0) + 1));
  });
  const byCount = (a, b) => b.count - a.count || a.name.localeCompare(b.name);
  return {
    // Undated last: it is the absence of a year, not the oldest one.
    years: [...years.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => (a.name === UNDATED) - (b.name === UNDATED) || b.name.localeCompare(a.name)),
    tags: [...tags.entries()].map(([name, count]) => ({ name, count })).sort(byCount),
  };
}

export function filterDecks(decks, {
  q = "", year = "", tags = [], sort = "date", dir = "desc",
} = {}) {
  const needle = q.trim().toLowerCase();
  const picked = tags.map(lower);

  const result = decks.filter((d) => {
    if (year && (projectYear(d.date) ?? UNDATED) !== year) return false;
    const owned = (d.tags ?? []).map(lower);
    if (picked.length && !picked.some((t) => owned.includes(t))) return false;
    if (needle && ![d.title, d.description, ...owned].join(" ").toLowerCase().includes(needle)) return false;
    return true;
  });

  const sign = dir === "asc" ? 1 : -1;
  const byTitle = (a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""));
  return result.sort((a, b) => {
    if (sort === "title") return sign * byTitle(a, b);
    // Undated sinks in both directions — missing, not oldest.
    const at = projectTime(a.date);
    const bt = projectTime(b.date);
    if (at === null && bt === null) return byTitle(a, b);
    if (at === null) return 1;
    if (bt === null) return -1;
    return sign * (at - bt) || byTitle(a, b);
  });
}
