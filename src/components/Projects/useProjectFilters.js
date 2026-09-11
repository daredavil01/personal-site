import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { projectTime, projectYear } from "../../lib/projectDate";

// One filter/sort state for all four views, synced to the URL so a filtered
// view is shareable and survives a reload.
//
// Semantics: `q`, `category`, `status` and `year` are single-valued; `tech` and
// `tags` are multi-select with OR *within* an axis and AND *across* axes — so
// picking React + Supabase widens the tech axis, while also picking a category
// still narrows the result.

const LIST_PARAMS = ["tech", "tags"];
const DEFAULTS = {
  q: "", category: "", status: "", year: "", tech: [], tags: [], sort: "date", dir: "desc",
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
    // A row that lists the same tech twice shouldn't count twice.
    new Set(values.map((v) => String(v).trim()).filter(Boolean)).forEach((value) => {
      const k = value.toLowerCase();
      const entry = counts.get(k);
      if (entry) entry.count += 1;
      else counts.set(k, { name: value, count: 1 });
    });
  });
  return [...counts.values()].sort(byCount);
};

export default function useProjectFilters(projects) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => ({
    q: searchParams.get("q") ?? DEFAULTS.q,
    category: searchParams.get("category") ?? DEFAULTS.category,
    status: searchParams.get("status") ?? DEFAULTS.status,
    year: searchParams.get("year") ?? DEFAULTS.year,
    tech: parseList(searchParams.get("tech")),
    tags: parseList(searchParams.get("tags")),
    sort: searchParams.get("sort") ?? DEFAULTS.sort,
    dir: searchParams.get("dir") ?? DEFAULTS.dir,
  }), [searchParams]);

  // Merge rather than replace: `view` and the filters share the query string.
  // (Treks.js calls setSearchParams({ view }), which wipes siblings — not an
  // option here.)
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

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    ["q", "category", "status", "year", ...LIST_PARAMS].forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const hasFilters = !!(filters.q || filters.category || filters.status
    || filters.year || filters.tech.length || filters.tags.length);

  const facets = useMemo(() => ({
    categories: scalarFacet(projects, "category"),
    statuses: scalarFacet(projects, "status"),
    tech: listFacet(projects, "techStack"),
    tags: listFacet(projects, "tags"),
    years: [...new Set(projects.map((p) => projectYear(p.date)).filter(Boolean))]
      .sort((a, b) => b.localeCompare(a)),
  }), [projects]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const tech = filters.tech.map(lower);
    const tags = filters.tags.map(lower);

    const result = projects.filter((p) => {
      if (filters.category && p.category !== filters.category) return false;
      if (filters.status && p.status !== filters.status) return false;
      if (filters.year && projectYear(p.date) !== filters.year) return false;

      if (tech.length) {
        const owned = (p.techStack ?? []).map(lower);
        if (!tech.some((t) => owned.includes(t))) return false;
      }
      if (tags.length) {
        const owned = (p.tags ?? []).map(lower);
        if (!tags.some((t) => owned.includes(t))) return false;
      }

      if (q) {
        const haystack = [p.title, p.subtitle, p.desc, p.org, p.role]
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
      if (filters.sort === "category") {
        return sign * String(a.category ?? "").localeCompare(String(b.category ?? ""))
          || String(a.title ?? "").localeCompare(String(b.title ?? ""));
      }
      // Date. Undated rows sink to the bottom in both directions — "no date" is
      // missing information, not an extreme value.
      const at = projectTime(a.date);
      const bt = projectTime(b.date);
      if (at === null && bt === null) return 0;
      if (at === null) return 1;
      if (bt === null) return -1;
      return sign * (at - bt);
    });
  }, [projects, filters]);

  return {
    filters, setFilter, toggleFilter, clearFilters, hasFilters, filtered, facets,
  };
}
