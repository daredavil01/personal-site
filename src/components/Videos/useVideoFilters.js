import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_SORT, filterVideos, videoFacets } from "../../lib/videoFilters";

// /videos filter state, kept in the URL so a filtered view is shareable and
// survives a reload. The filtering itself is src/lib/videoFilters.js (pure,
// tested); this hook only reads and writes the query string.
//
// Never a `view` param: useViewMode owns it, and the merge below keeps it.

const LIST_PARAMS = ["tags"];
const FILTER_PARAMS = ["q", "type", "year", "playlist", ...LIST_PARAMS];
const DEFAULTS = {
  q: "", type: "", year: "", playlist: "", tags: [], sort: DEFAULT_SORT,
};

const parseList = (raw) => (raw
  ? raw.split(",").map((s) => s.trim()).filter(Boolean)
  : []);

const lower = (v) => String(v ?? "").toLowerCase();

export default function useVideoFilters(videos) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => ({
    q: searchParams.get("q") ?? DEFAULTS.q,
    type: searchParams.get("type") ?? DEFAULTS.type,
    year: searchParams.get("year") ?? DEFAULTS.year,
    playlist: searchParams.get("playlist") ?? DEFAULTS.playlist,
    tags: parseList(searchParams.get("tags")),
    sort: searchParams.get("sort") ?? DEFAULTS.sort,
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

  /** Add or remove one tag. */
  const toggleTag = useCallback((value) => {
    const current = parseList(searchParams.get("tags"));
    const hit = current.find((v) => lower(v) === lower(value));
    updateParams({
      tags: hit ? current.filter((v) => lower(v) !== lower(value)) : [...current, value],
    });
  }, [searchParams, updateParams]);

  // Keeps sort: that is how you read the page, not what you looked for.
  const clearFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    FILTER_PARAMS.forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const hasFilters = !!(filters.q || filters.type || filters.year
    || filters.playlist || filters.tags.length);

  const facets = useMemo(() => videoFacets(videos), [videos]);
  const filtered = useMemo(() => filterVideos(videos, filters), [videos, filters]);

  return {
    filters, setFilter, toggleTag, clearFilters, hasFilters, filtered, facets,
  };
}
