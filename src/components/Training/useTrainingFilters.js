import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { filterActivities } from "../../lib/training";

// /training filter state in the URL, merged rather than replaced so `view`
// (useViewMode's) and `tab` survive. The filtering is src/lib/training.js.

const DEFAULTS = {
  q: "", sport: "", year: "", tags: [], sort: "newest", races: "",
};
export const FILTER_PARAMS = ["q", "sport", "year", "tags", "races"];

const parseList = (raw) => (raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : []);

export default function useTrainingFilters(rows) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => ({
    q: searchParams.get("q") ?? "",
    sport: searchParams.get("sport") ?? "",
    year: searchParams.get("year") ?? "",
    tags: parseList(searchParams.get("tags")),
    sort: searchParams.get("sort") ?? DEFAULTS.sort,
    races: searchParams.get("races") === "1",
    tab: searchParams.get("tab") ?? "overview",
  }), [searchParams]);

  const update = useCallback((patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      let v = Array.isArray(value) ? value.join(",") : value;
      if (v === true) v = "1";
      if (!v || v === DEFAULTS[key] || (key === "tab" && v === "overview")) next.delete(key);
      else next.set(key, String(v));
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const setFilter = useCallback((key, value) => update({ [key]: value }), [update]);

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    FILTER_PARAMS.forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => filterActivities(rows, filters), [rows, filters]);
  const hasFilters = FILTER_PARAMS.some((k) => searchParams.get(k));

  return {
    filters, setFilter, clearFilters, filtered, hasFilters,
  };
}
