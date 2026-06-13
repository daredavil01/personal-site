import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { getBooks } from "../lib/api/books";
import { getSports } from "../lib/api/sports";
import { getTreks } from "../lib/api/treks";
import { getProjects } from "../lib/api/projects";
import { getBlogs } from "../lib/api/blogs";
import { getInstagram } from "../lib/api/instagram";
import { getResume } from "../lib/api/resume";
import { getNowMeta, getNowMonths } from "../lib/api/now";

// One fetcher per logical collection. Each is loaded lazily the first time a
// component asks for it, then cached for the lifetime of the app — so the
// Sports page's four sub-components share a single `sports` fetch, and visiting
// the home page never fetches collections it doesn't render.
const FETCHERS = {
  books: getBooks,
  sports: getSports,
  treks: getTreks,
  projects: getProjects,
  blogs: getBlogs,
  instagram: getInstagram,
  resume: getResume,
  nowMeta: getNowMeta,
  nowMonths: getNowMonths,
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

  const load = useCallback((key) => {
    if (started.current[key]) return;
    started.current[key] = true;
    setEntries((prev) => ({ ...prev, [key]: { data: null, loading: true, error: null } }));
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
export const useBlogs = () => useResource("blogs", EMPTY_ARRAY);
export const useInstagram = () => useResource("instagram", EMPTY_ARRAY);
export const useResume = () => useResource("resume", EMPTY_RESUME);
export const useNowMeta = () => useResource("nowMeta", EMPTY_OBJECT);
export const useNowMonths = () => useResource("nowMonths", EMPTY_ARRAY);
