import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

// One filter/sort state for all four views, synced to the URL so a filtered
// shelf is shareable and survives a reload. Same contract as
// components/Projects/useProjectFilters.js — deliberately, so the two pages
// behave identically.
//
// Semantics: everything except `tags` is single-valued; `tags` is multi-select.
//
// Axes combine with OR, not AND. With eleven categories over fifty-one books,
// intersecting two axes almost always lands on an empty shelf — picking
// "Marathi" and then "Fiction" asked for books that are both and returned
// nothing useful. Unioning them reads the way people actually browse a shelf:
// each control you touch adds books rather than taking them away.
//
// The search box is the exception and still narrows. A text search that widens
// the result set is the one thing nobody expects.

const LIST_PARAMS = ["tags"];
const FILTER_PARAMS = ["q", "category", "language", "status", "year", "rating", "reviewed", ...LIST_PARAMS];
const DEFAULTS = {
  q: "",
  category: "",
  language: "",
  status: "",
  year: "",
  rating: "",
  reviewed: "",
  tags: [],
  sort: "date",
  dir: "desc",
};

const parseList = (raw) => (raw
  ? raw.split(",").map((s) => s.trim()).filter(Boolean)
  : []);

const lower = (v) => String(v ?? "").toLowerCase();

const byCount = (a, b) => b.count - a.count || a.name.localeCompare(b.name);

/** Distinct values of a scalar field, with counts, most-common first. */
const scalarFacet = (rows, key) => {
  const counts = new Map();
  rows.forEach((row) => {
    const value = row?.[key];
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort(byCount);
};

/** Distinct values of an array field, with counts, most-common first. */
const listFacet = (rows, key) => {
  const counts = new Map();
  rows.forEach((row) => {
    const values = Array.isArray(row?.[key]) ? row[key] : [];
    // A row that lists the same tag twice shouldn't count twice.
    new Set(values.map((v) => String(v).trim()).filter(Boolean)).forEach((value) => {
      const k = value.toLowerCase();
      const entry = counts.get(k);
      if (entry) entry.count += 1;
      else counts.set(k, { name: value, count: 1 });
    });
  });
  return [...counts.values()].sort(byCount);
};

/** Milliseconds for sorting; falls back to the read year when no date is set. */
export const bookTime = (book) => {
  if (book?.date_finished) {
    const t = Date.parse(book.date_finished);
    if (!Number.isNaN(t)) return t;
  }
  if (book?.year) return Date.parse(`${book.year}-12-31`);
  return null;
};

export default function useBookFilters(books) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => ({
    q: searchParams.get("q") ?? DEFAULTS.q,
    category: searchParams.get("category") ?? DEFAULTS.category,
    language: searchParams.get("language") ?? DEFAULTS.language,
    status: searchParams.get("status") ?? DEFAULTS.status,
    year: searchParams.get("year") ?? DEFAULTS.year,
    rating: searchParams.get("rating") ?? DEFAULTS.rating,
    reviewed: searchParams.get("reviewed") ?? DEFAULTS.reviewed,
    tags: parseList(searchParams.get("tags")),
    sort: searchParams.get("sort") ?? DEFAULTS.sort,
    dir: searchParams.get("dir") ?? DEFAULTS.dir,
  }), [searchParams]);

  // Merge rather than replace: `view` and the filters share the query string.
  const updateParams = useCallback((patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      const serialized = Array.isArray(value) ? value.join(",") : value;
      if (!serialized || serialized === DEFAULTS[key]) next.delete(key);
      else next.set(key, serialized);
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const setFilter = useCallback((key, value) => updateParams({ [key]: value }), [updateParams]);

  /** Add/remove one value from a multi-select axis. */
  const toggleFilter = useCallback((key, value) => {
    const current = parseList(searchParams.get(key));
    const hit = current.find((v) => lower(v) === lower(value));
    const next = hit
      ? current.filter((v) => lower(v) !== lower(value))
      : [...current, value];
    updateParams({ [key]: next });
  }, [searchParams, updateParams]);

  // Clears the filters but keeps sort/dir/view — those describe how you like to
  // read the page, not what you were looking for.
  const clearFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    FILTER_PARAMS.forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const hasFilters = !!(filters.q || filters.category || filters.language || filters.status
    || filters.year || filters.rating || filters.reviewed || filters.tags.length);

  const facets = useMemo(() => ({
    categories: scalarFacet(books, "category"),
    languages: scalarFacet(books, "language"),
    statuses: scalarFacet(books, "status"),
    tags: listFacet(books, "tags"),
    years: [...new Set(books.map((b) => b.year).filter(Boolean))]
      .sort((a, b) => b - a)
      .map(String),
  }), [books]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const tags = filters.tags.map(lower);
    const minRating = Number(filters.rating) || 0;

    // Each active axis is one predicate; a book needs to satisfy any of them.
    const axes = [];
    if (filters.category) axes.push((b) => b.category === filters.category);
    if (filters.language) axes.push((b) => b.language === filters.language);
    if (filters.status) axes.push((b) => (b.status ?? "read") === filters.status);
    if (filters.year) axes.push((b) => String(b.year) === filters.year);
    if (minRating) axes.push((b) => (b.rating ?? 0) >= minRating);
    if (filters.reviewed === "yes") axes.push((b) => !!b.blog_link);
    if (filters.reviewed === "no") axes.push((b) => !b.blog_link);
    if (tags.length) {
      axes.push((b) => {
        const owned = (b.tags ?? []).map(lower);
        return tags.some((t) => owned.includes(t));
      });
    }

    const result = books.filter((b) => {
      if (axes.length && !axes.some((match) => match(b))) return false;

      if (q) {
        // Author and publisher matter here in a way they don't on /projects —
        // "Harari" and "Mehta" are both real ways people look for a book.
        const haystack = [b.title, b.author, b.translator, b.description, b.publisher, b.category]
          .filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const sign = filters.dir === "asc" ? 1 : -1;
    return result.sort((a, b) => {
      if (filters.sort === "title") {
        return sign * String(a.title ?? "").localeCompare(String(b.title ?? ""));
      }
      if (filters.sort === "author") {
        return sign * String(a.author ?? "").localeCompare(String(b.author ?? ""))
          || String(a.title ?? "").localeCompare(String(b.title ?? ""));
      }
      if (filters.sort === "category") {
        return sign * String(a.category ?? "").localeCompare(String(b.category ?? ""))
          || String(a.title ?? "").localeCompare(String(b.title ?? ""));
      }
      if (filters.sort === "rating") {
        return sign * ((a.rating ?? 0) - (b.rating ?? 0))
          || String(a.title ?? "").localeCompare(String(b.title ?? ""));
      }
      if (filters.sort === "pages") {
        // Unknown page counts sink in both directions — missing, not zero.
        const ap = a.page_count ?? null;
        const bp = b.page_count ?? null;
        if (ap === null && bp === null) return 0;
        if (ap === null) return 1;
        if (bp === null) return -1;
        return sign * (ap - bp);
      }
      // Date read. Same rule: undated sinks either way.
      const at = bookTime(a);
      const bt = bookTime(b);
      if (at === null && bt === null) return 0;
      if (at === null) return 1;
      if (bt === null) return -1;
      return sign * (at - bt);
    });
  }, [books, filters]);

  return {
    filters, setFilter, toggleFilter, clearFilters, hasFilters, filtered, facets,
  };
}
