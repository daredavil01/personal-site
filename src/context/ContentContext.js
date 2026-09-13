import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { getBooks } from "../lib/api/books";
import { getSports } from "../lib/api/sports";
import { getTreks } from "../lib/api/treks";
import { getProjects } from "../lib/api/projects";
import { getPresentations } from "../lib/api/presentations";
import { getBlogs } from "../lib/api/blogs";
import { getInstagram } from "../lib/api/instagram";
import { getResume } from "../lib/api/resume";
import { getNowMeta, getNowMonths } from "../lib/api/now";
import { getTagsWithCounts } from "../lib/api/tags";

// One fetcher per logical collection. Each is loaded lazily the first time a
// component asks for it, then cached for the lifetime of the app — so the
// Sports page's four sub-components share a single `sports` fetch, and visiting
// the home page never fetches collections it doesn't render.
const FETCHERS = {
  books: getBooks,
  sports: getSports,
  treks: getTreks,
  projects: getProjects,
  presentations: getPresentations,
  blogs: getBlogs,
  instagram: getInstagram,
  resume: getResume,
  nowMeta: getNowMeta,
  nowMonths: getNowMonths,
  tags: getTagsWithCounts,
};

// Stable fallbacks so consumers don't re-render on identity changes while loading.
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};
const EMPTY_RESUME = {
  positions: EMPTY_ARRAY,
  degrees: EMPTY_ARRAY,
  certifications: EMPTY_ARRAY,
  skills: EMPTY_ARRAY,
};

const ContentContext = createContext(null);

export const ContentProvider = ({ children }) => {
  const [entries, setEntries] = useState({});
  const started = useRef({});

  // `force` re-fetches an already-loaded key, keeping the stale data visible
  // until the fresh copy lands (the admin uses it after editing tags).
  const load = useCallback((key, force = false) => {
    if (started.current[key] && !force) return;
    started.current[key] = true;
    setEntries((prev) => ({
      ...prev, [key]: { data: prev[key]?.data ?? null, loading: true, error: null },
    }));
    FETCHERS[key]()
      .then((data) => setEntries((prev) => ({
        ...prev, [key]: { data, loading: false, error: null },
      })))
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(`[content] failed to load "${key}":`, error);
        setEntries((prev) => ({ ...prev, [key]: { data: null, loading: false, error } }));
      });
  }, []);

  const value = useMemo(() => ({ entries, load }), [entries, load]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
};

const useResource = (key, fallback) => {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("Content hooks must be used within <ContentProvider>");
  const { entries, load } = ctx;
  useEffect(() => { load(key); }, [key, load]);
  const entry = entries[key];
  return {
    data: entry?.data ?? fallback,
    loading: entry ? entry.loading : true,
    error: entry?.error ?? null,
  };
};

export const useBooks = () => useResource("books", EMPTY_ARRAY);
export const useSports = () => useResource("sports", EMPTY_ARRAY);
export const useTreks = () => useResource("treks", EMPTY_ARRAY);
export const useProjects = () => useResource("projects", EMPTY_ARRAY);
export const usePresentations = () => useResource("presentations", EMPTY_ARRAY);
export const useBlogs = () => useResource("blogs", EMPTY_ARRAY);
export const useInstagram = () => useResource("instagram", EMPTY_ARRAY);
export const useResume = () => useResource("resume", EMPTY_RESUME);
export const useNowMeta = () => useResource("nowMeta", EMPTY_OBJECT);
export const useNowMonths = () => useResource("nowMonths", EMPTY_ARRAY);
export const useTags = () => useResource("tags", EMPTY_ARRAY);

// Tag list for widgets that can also render outside <ContentProvider> (the
// admin form fields, in unit tests): returns [] there instead of throwing.
export const useOptionalTags = () => {
  const ctx = useContext(ContentContext);
  const load = ctx?.load;
  useEffect(() => { if (load) load("tags"); }, [load]);
  return ctx?.entries.tags?.data ?? EMPTY_ARRAY;
};

// Returns `refresh(key)`, which re-fetches one cached collection.
export const useContentRefresh = () => {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("Content hooks must be used within <ContentProvider>");
  const { load } = ctx;
  return useCallback((key) => load(key, true), [load]);
};

// name → "#rrggbb" for every tag, so a whole page of cards shares one lookup.
export const useTagColors = () => {
  const { data } = useTags();
  return useMemo(() => new Map(data.map((t) => [t.name, t.color || null])), [data]);
};
