import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useSearchParams } from "react-router-dom";
import {
  searchMicroblog, getMicroblogTagFacets, getMicroblogActivity, getMicroblogMonthTags,
} from "../../lib/api/microblog";
import { colorForTag } from "../../lib/generativeArt";
import { LoadingBlock, ErrorBlock } from "../common/AsyncStates";
import PostCard from "./PostCard";
import PinboardCard from "./PinboardCard";
import MonthRiver from "./MonthRiver";
import OnThisDay from "./OnThisDay";
import { monthLabel } from "./charts";

// Posts: every post, searched and paged in Postgres (1,600+ rows never load at
// once). Filters live in the URL so a link reproduces the list, and they are
// MERGED into the existing params: `view` (the atlas/classic shell), `tab`
// and `year` belong to others and must survive a keystroke here.

const PAGE_SIZE = 24;
const OWNED = ["q", "tags", "source", "type", "kind", "month", "sort", "layout"];

const SOURCES = [
  { value: "", label: "All sources" },
  { value: "tumblr", label: "Tumblr" },
  { value: "manual", label: "Manual" },
];
const TYPES = [
  { value: "", label: "All formats" },
  { value: "text", label: "Text" },
  { value: "quote", label: "Quote" },
  { value: "photo", label: "Photo" },
];
// post_kind (0025) — what a post IS, where TYPES is the Tumblr export's format
// label. "All kinds" includes the posts no classifier has reached yet.
const KINDS = [
  { value: "", label: "All kinds" },
  { value: "own", label: "Own words" },
  { value: "quote", label: "Quotes" },
  { value: "reblog", label: "Reblogs" },
  { value: "link", label: "Links" },
];
const SORTS = [
  { value: "date_desc", label: "Newest" },
  { value: "date_asc", label: "Oldest" },
  { value: "random", label: "Shuffle" },
];

const selectClass = "h-10 bg-[var(--mb-card)] border border-[var(--mb-line)] rounded-full px-3 font-label text-[11px] uppercase tracking-wider text-[var(--mb-muted)] outline-none cursor-pointer hover:border-[var(--mb-accent)] focus-visible:border-[var(--mb-accent)] transition-colors";

// Lowercased because tag names are stored lowercase — keeps old ?tags=Life links working.
const parseTags = (raw) => (raw ? raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : []);

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const PostsTab = ({ onOpen, tagColors }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(() => (searchParams.get("layout") === "list" ? "list" : "wall"));
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") || "");
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "");
  const [activeTags, setActiveTags] = useState(() => parseTags(searchParams.get("tags")));
  const [source, setSource] = useState(() => searchParams.get("source") || "");
  const [type, setType] = useState(() => searchParams.get("type") || "");
  const [kind, setKind] = useState(() => searchParams.get("kind") || "");
  const [month, setMonth] = useState(() => searchParams.get("month") || "");
  const [sort, setSort] = useState(() => searchParams.get("sort") || "date_desc");
  const [showAllTags, setShowAllTags] = useState(false);

  const [activity, setActivity] = useState(null);
  const [monthTags, setMonthTags] = useState(null);
  const [facets, setFacets] = useState([]);
  useEffect(() => {
    getMicroblogActivity().then(setActivity).catch(() => setActivity(null));
    getMicroblogMonthTags().then(setMonthTags).catch(() => setMonthTags(null));
    getMicroblogTagFacets().then(setFacets).catch(() => setFacets([]));
  }, []);

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const activeTagsKey = activeTags.join("|");

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Mirror the filters into the URL — merged, and replace so typing doesn't spam history.
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      OWNED.forEach((k) => next.delete(k));
      if (view === "list") next.set("layout", "list");
      if (searchTerm) next.set("q", searchTerm);
      if (activeTags.length) next.set("tags", activeTags.join(","));
      if (source) next.set("source", source);
      if (type) next.set("type", type);
      if (kind) next.set("kind", kind);
      if (month) next.set("month", month);
      if (sort !== "date_desc") next.set("sort", sort);
      return next;
    }, { replace: true });
  }, [view, searchTerm, activeTagsKey, source, type, kind, month, sort, setSearchParams]);

  const query = (p) => searchMicroblog({
    query: searchTerm, tags: activeTags, source, type, kind, month, page: p, pageSize: PAGE_SIZE, sort: sort === "random" ? "date_desc" : sort,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    query(0)
      .then(({ rows: r, count: c }) => {
        if (!active) return;
        setRows(sort === "random" ? shuffleArray(r) : r);
        setCount(c);
        setPage(0);
      })
      .catch((e) => { if (active) setError(e); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [searchTerm, activeTagsKey, source, type, kind, month, sort]);

  const loadMore = () => {
    const next = page + 1;
    setLoadingMore(true);
    query(next)
      .then(({ rows: r }) => {
        setRows((prev) => [...prev, ...(sort === "random" ? shuffleArray(r) : r)]);
        setPage(next);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const handleSort = (v) => {
    if (v === "random" && sort === "random") setRows((prev) => shuffleArray([...prev]));
    else setSort(v);
  };
  const toggleTag = (tag) => setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const hasFilters = Boolean(searchTerm || activeTags.length || source || type || kind || month);
  // How many *axes* are in play. Search is excluded: it narrows while tags /
  // source / type / month widen (they OR together, matching /books).
  const axisCount = [activeTags.length ? "tags" : "", source, type, month].filter(Boolean).length;
  const clearFilters = () => {
    setSearchInput(""); setSearchTerm(""); setActiveTags([]); setSource(""); setType(""); setKind(""); setMonth("");
  };
  const visibleTags = useMemo(() => facets.slice(0, showAllTags ? 80 : 18), [facets, showAllTags]);

  const activeChips = [
    searchTerm && { key: "q", label: `“${searchTerm}”`, clear: () => { setSearchInput(""); setSearchTerm(""); } },
    ...activeTags.map((t) => ({ key: `t-${t}`, label: `#${t}`, clear: () => toggleTag(t) })),
    month && { key: "m", label: monthLabel(month), clear: () => setMonth("") },
    source && { key: "s", label: SOURCES.find((x) => x.value === source)?.label, clear: () => setSource("") },
    type && { key: "ty", label: TYPES.find((x) => x.value === type)?.label, clear: () => setType("") },
    kind && { key: "k", label: KINDS.find((x) => x.value === kind)?.label, clear: () => setKind("") },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {!hasFilters && <OnThisDay />}

      <section className="mb-card p-4 md:p-5 flex flex-col gap-4" aria-label="Search and filter the posts">
        <div className="relative">
          <span aria-hidden="true" className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] mb-faint">search</span>
          <input
            type="search"
            aria-label="Search posts"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search 1,600+ posts, in English or मराठी…"
            className="w-full pl-11 pr-4 py-3 rounded-full bg-[var(--mb-wash)] border border-transparent font-body text-sm text-[var(--mb-ink)] placeholder-[var(--mb-faint)] focus:outline-none focus:border-[var(--mb-accent)] transition-colors"
          />
        </div>

        {activity && activity.monthCounts.length > 0 && (
          <MonthRiver months={activity.monthCounts} activeMonth={month || null} onSelect={(key) => setMonth(key || "")} monthTags={monthTags} tagColors={tagColors} />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Source" className={selectClass} value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select aria-label="Format" className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select aria-label="Kind" className={selectClass} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
          <div className="flex items-center gap-1 ml-auto" role="group" aria-label="Sort">
            {SORTS.map(({ value: v, label }) => (
              <button key={v} type="button" className="mb-chip" aria-pressed={sort === v} onClick={() => handleSort(v)} title={v === "random" && sort === "random" ? "Shuffle again" : undefined}>{label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Layout">
            {[["wall", "dashboard", "Pinboard"], ["list", "view_agenda", "List"]].map(([v, icon, label]) => (
              <button key={v} type="button" className="mb-chip" aria-pressed={view === v} onClick={() => setView(v)} title={label}>
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">{icon}</span>
                <span className="sr-only">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map(({ tag, count: c }) => (
              <button key={tag} type="button" className="mb-chip" aria-pressed={activeTags.includes(tag)} onClick={() => toggleTag(tag)}>
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: colorForTag(tag, tagColors.get(tag)) }} />
                {`#${tag}`}
                <span className="font-mono opacity-60">{c}</span>
              </button>
            ))}
            {facets.length > 18 && (
              <button type="button" className="mb-link ml-1" onClick={() => setShowAllTags((v) => !v)}>
                {showAllTags ? "Fewer tags" : `All ${facets.length} tags`}
              </button>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2 min-h-[2rem]" aria-live="polite">
        <span className="font-label text-[11px] uppercase tracking-widest mb-muted mr-2">
          {loading ? "Searching…" : `${count.toLocaleString("en-IN")} ${count === 1 ? "post" : "posts"}`}
        </span>
        {activeChips.map((c) => (
          <button key={c.key} type="button" className="mb-chip" onClick={c.clear} aria-label={`Remove filter ${c.label}`}>
            {c.label}
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">close</span>
          </button>
        ))}
        {activeChips.length > 1 && <button type="button" className="mb-link ml-1" onClick={clearFilters}>Clear all</button>}
        {axisCount > 1 && <span className="font-body text-xs mb-faint w-full">Tags, months, sources and formats add posts together: showing posts that match any of them.</span>}
      </div>

      <section>
        {error && <ErrorBlock />}
        {!error && loading && rows.length === 0 && <LoadingBlock label="Loading posts…" />}
        {!error && !loading && rows.length === 0 && (
          <div className="text-center py-14">
            <p className="font-headline text-2xl mb-2">Nothing matches.</p>
            {hasFilters && <button type="button" className="mb-link" onClick={clearFilters}>Clear the filters</button>}
          </div>
        )}
        {!error && rows.length > 0 && (view === "wall" ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 px-1 pt-2">
            {rows.map((post) => <PinboardCard key={post.id} post={post} onOpen={onOpen} tagColors={tagColors} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((post) => <PostCard key={post.id} post={post} onOpen={onOpen} />)}
          </div>
        ))}
        {!error && rows.length < count && (
          <div className="flex flex-col items-center gap-2 mt-8">
            <button
              type="button"
              disabled={loadingMore}
              onClick={loadMore}
              className="px-6 py-3 rounded-full font-label text-xs uppercase tracking-widest font-bold border border-[var(--mb-accent)] text-[var(--mb-accent)] bg-transparent cursor-pointer hover:bg-[var(--mb-accent)] hover:text-white disabled:opacity-50 disabled:cursor-default transition-colors"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
            <span className="font-mono text-[11px] mb-faint">{`${rows.length.toLocaleString("en-IN")} of ${count.toLocaleString("en-IN")}`}</span>
          </div>
        )}
      </section>
    </div>
  );
};

PostsTab.propTypes = { onOpen: PropTypes.func.isRequired, tagColors: PropTypes.instanceOf(Map).isRequired };

export default PostsTab;
