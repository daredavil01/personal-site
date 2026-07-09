import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import {
  searchMicroblog, getMicroblogTagFacets, getMicroblogStats,
} from "../lib/api/microblog";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import PostCard from "../components/MicroBlog/PostCard";
import PostModal from "../components/MicroBlog/PostModal";

const PAGE_SIZE = 24;

const SOURCES = [
  { value: "", label: "All sources" },
  { value: "tumblr", label: "Tumblr" },
  { value: "manual", label: "Manual" },
];

const TYPES = [
  { value: "", label: "All types" },
  { value: "text", label: "Text" },
  { value: "quote", label: "Quote" },
  { value: "photo", label: "Photo" },
];

const SORTS = [
  { value: "date_desc", label: "Newest" },
  { value: "date_asc", label: "Oldest" },
  { value: "random", label: "Shuffle" },
];

const selectClass = "h-11 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-label text-xs uppercase tracking-wider text-stone-600 dark:text-stone-300 outline-none cursor-pointer hover:border-secondary transition-colors";

// Legacy theme CSS force-styles bare <button> elements — use div[role="button"] on public pages.
const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

const parseTags = (raw) => (raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : []);

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const TYPE_COLORS = {
  text: "bg-blue-400",
  quote: "bg-violet-400",
  photo: "bg-amber-400",
};

const MicroBlog = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState(() => searchParams.get("tab") || "list");

  // List filters — initialise from URL so links are shareable/bookmarkable.
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") || "");
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "");
  const [activeTags, setActiveTags] = useState(() => parseTags(searchParams.get("tags")));
  const [source, setSource] = useState(() => searchParams.get("source") || "");
  const [type, setType] = useState(() => searchParams.get("type") || "");
  const [sort, setSort] = useState(() => searchParams.get("sort") || "date_desc");

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [facets, setFacets] = useState([]);
  const [selected, setSelected] = useState(null);

  // Stats tab
  const [stats, setStats] = useState(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  const activeTagsKey = activeTags.join("|");

  // Debounce the search box → searchTerm.
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Mirror active filters into the URL (replace so typing doesn't spam history).
  useEffect(() => {
    const next = {};
    if (tab !== "list") next.tab = tab;
    if (searchTerm) next.q = searchTerm;
    if (activeTags.length) next.tags = activeTags.join(",");
    if (source) next.source = source;
    if (type) next.type = type;
    if (sort !== "date_desc") next.sort = sort;
    setSearchParams(next, { replace: true });
  }, [tab, searchTerm, activeTagsKey, source, type, sort, setSearchParams]);

  // Tag facets load once (used by both tabs).
  useEffect(() => {
    getMicroblogTagFacets().then(setFacets).catch(() => setFacets([]));
  }, []);

  // Load stats the first time the stats tab is opened.
  useEffect(() => {
    if (tab !== "stats" || statsLoaded) return;
    setStatsLoaded(true);
    setStatsLoading(true);
    setStatsError(null);
    getMicroblogStats()
      .then(setStats)
      .catch((e) => setStatsError(e))
      .finally(() => setStatsLoading(false));
  }, [tab, statsLoaded]);

  // Fresh search whenever a filter or sort changes.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const apiSort = sort === "random" ? "date_desc" : sort;
    searchMicroblog({
      query: searchTerm, tags: activeTags, source, type, page: 0, pageSize: PAGE_SIZE, sort: apiSort,
    })
      .then(({ rows: r, count: c }) => {
        if (!active) return;
        setRows(sort === "random" ? shuffleArray(r) : r);
        setCount(c);
        setPage(0);
      })
      .catch((e) => { if (active) setError(e); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [searchTerm, activeTagsKey, source, type, sort]);

  const loadMore = () => {
    const next = page + 1;
    setLoadingMore(true);
    const apiSort = sort === "random" ? "date_desc" : sort;
    searchMicroblog({
      query: searchTerm, tags: activeTags, source, type, page: next, pageSize: PAGE_SIZE, sort: apiSort,
    })
      .then(({ rows: r }) => {
        setRows((prev) => [...prev, ...(sort === "random" ? shuffleArray(r) : r)]);
        setPage(next);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const handleSortClick = (v) => {
    if (v === "random" && sort === "random") {
      // Re-shuffle already-loaded rows without a network round-trip.
      setRows((prev) => shuffleArray([...prev]));
    } else {
      setSort(v);
    }
  };

  const toggleTag = (tag) => setActiveTags((prev) => (
    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
  ));

  const hasFilters = searchTerm || activeTags.length > 0 || source || type;
  const clearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setActiveTags([]);
    setSource("");
    setType("");
  };

  const hasMore = rows.length < count;
  const topTags = useMemo(() => facets.slice(0, 40), [facets]);

  // ── Stats panel ─────────────────────────────────────────────────────────────
  const renderStats = () => {
    if (statsLoading) return <LoadingBlock label="Loading stats…" />;
    if (statsError) return <ErrorBlock />;
    if (!stats) return null;

    const {
      total, minDate, maxDate, byType, bySource,
    } = stats;
    const topTagList = facets.slice(0, 15);
    const maxTagCount = topTagList[0]?.count ?? 1;

    return (
      <div className="flex flex-col gap-10">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Posts", value: total.toLocaleString() },
            { label: "Unique Tags", value: facets.length.toLocaleString() },
            { label: "Since", value: minDate ?? "—" },
            { label: "Latest", value: maxDate ?? "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl p-5"
            >
              <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1.5">
                {label}
              </p>
              <p className="font-headline text-2xl font-black text-stone-900 dark:text-stone-100 mb-0">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Post type breakdown */}
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-4">
            Post types
          </p>
          <div className="flex flex-col gap-3">
            {Object.entries(byType).map(([t, c]) => (
              <div key={t} className="flex items-center gap-3">
                <span className="font-label text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 w-12 shrink-0">
                  {t}
                </span>
                <div className="flex-1 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${TYPE_COLORS[t] ?? "bg-secondary"}`}
                    style={{ width: `${total > 0 ? ((c / total) * 100).toFixed(1) : 0}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-stone-500 dark:text-stone-400 w-14 text-right shrink-0">
                  {c.toLocaleString()}
                </span>
                <span className="font-mono text-[10px] text-stone-400 dark:text-stone-600 w-9 text-right shrink-0">
                  {total > 0 ? `${((c / total) * 100).toFixed(0)}%` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Source breakdown */}
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-4">
            Sources
          </p>
          <div className="flex flex-col gap-3">
            {Object.entries(bySource).map(([s, c]) => (
              <div key={s} className="flex items-center gap-3">
                <span className="font-label text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 w-16 shrink-0">
                  {s}
                </span>
                <div className="flex-1 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{ width: `${total > 0 ? (((c ?? 0) / total) * 100).toFixed(1) : 0}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-stone-500 dark:text-stone-400 w-14 text-right shrink-0">
                  {(c ?? 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 15 tags */}
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-4">
            Top 15 tags
          </p>
          <div className="flex flex-col gap-2">
            {topTagList.map(({ tag, count: c }, i) => (
              <div key={tag} className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-stone-300 dark:text-stone-700 w-5 text-right shrink-0">
                  {i + 1}
                </span>
                <span className="font-label text-xs text-stone-600 dark:text-stone-300 w-32 truncate shrink-0">
                  #{tag}
                </span>
                <div className="flex-1 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary/60"
                    style={{ width: `${((c / maxTagCount) * 100).toFixed(1)}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-stone-400 dark:text-stone-500 w-10 text-right shrink-0">
                  {c}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <PageShell
      region="writer"
      title="Micro Blog"
      description="A searchable archive of short posts, quotes, and captures imported from Tumblr — spanning years of thoughts, one micro-post at a time."
    >
      <div className="flex flex-col gap-8 w-full max-w-4xl" id="micro-blog">
        {/* Hero */}
        <header>
          <span className="font-label text-xs uppercase tracking-[0.3em] text-secondary font-bold mb-4 block">
            Archive
          </span>
          <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-[0.9] tracking-tighter mb-4">
            Micro Blog.
          </h1>
          <p className="font-body text-stone-500 dark:text-stone-400 leading-relaxed mb-0 max-w-2xl">
            Years of short posts, quotes, and captures — preserved and made fully searchable.
            Imported from Tumblr; more sources to come.
          </p>
        </header>

        {/* Tabs */}
        <div data-tour="micro-tabs" className="flex border-b border-stone-100 dark:border-stone-800">
          {[{ value: "list", label: "Posts" }, { value: "stats", label: "Stats" }].map(({ value: v, label }) => (
            <div
              key={v}
              role="button"
              tabIndex={0}
              onClick={() => setTab(v)}
              onKeyDown={keyActivate(() => setTab(v))}
              className={`px-5 py-2.5 font-label text-xs uppercase tracking-widest font-bold border-b-2 -mb-px cursor-pointer transition-colors ${
                tab === v
                  ? "border-secondary text-secondary"
                  : "border-transparent text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Stats panel */}
        {tab === "stats" && renderStats()}

        {/* List panel */}
        {tab === "list" && (
          <>
            {/* Search + filters */}
            <section data-tour="micro-search">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search posts…"
                className="w-full mb-3 px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl font-body text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-secondary transition-colors"
              />

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <select className={selectClass} value={source} onChange={(e) => setSource(e.target.value)}>
                  {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                <div className="flex items-center gap-3 ml-auto">
                  <div className="flex gap-1">
                    {SORTS.map(({ value: v, label }) => (
                      <div
                        key={v}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSortClick(v)}
                        onKeyDown={keyActivate(() => handleSortClick(v))}
                        title={v === "random" && sort === "random" ? "Click to reshuffle" : undefined}
                        className={`px-2.5 py-1 rounded-lg font-label text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
                          sort === v
                            ? "bg-secondary text-white"
                            : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-secondary dark:hover:text-secondary"
                        }`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                    {rows.length} of {count}
                  </span>
                </div>
              </div>

              {topTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {topTags.map(({ tag, count: c }) => (
                    <div
                      key={tag}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleTag(tag)}
                      onKeyDown={keyActivate(() => toggleTag(tag))}
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-label border cursor-pointer transition-all ${
                        activeTags.includes(tag)
                          ? "bg-secondary text-white border-secondary"
                          : "bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-100 dark:border-stone-700 hover:border-secondary hover:text-secondary"
                      }`}
                    >
                      #{tag} {c}
                    </div>
                  ))}
                </div>
              )}

              {hasFilters && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={clearFilters}
                  onKeyDown={keyActivate(clearFilters)}
                  className="inline-flex items-center gap-1 font-label text-xs font-bold text-secondary cursor-pointer hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  Clear all filters
                </div>
              )}
            </section>

            {/* Results */}
            <section>
              {error && <ErrorBlock />}
              {!error && loading && rows.length === 0 && <LoadingBlock label="Loading posts…" />}
              {!error && !loading && rows.length === 0 && (
                <p className="text-stone-500 dark:text-stone-400 font-body italic text-center py-12 mb-0">
                  No posts match these filters.
                </p>
              )}
              {!error && rows.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rows.map((post) => (
                    <PostCard key={post.id} post={post} onOpen={setSelected} />
                  ))}
                </div>
              )}

              {!error && hasMore && (
                <div className="flex justify-center mt-8">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={loadingMore ? undefined : loadMore}
                    onKeyDown={keyActivate(() => !loadingMore && loadMore())}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-label text-xs uppercase tracking-widest font-bold border transition-all ${
                      loadingMore
                        ? "bg-stone-100 dark:bg-stone-800 text-stone-400 border-stone-100 dark:border-stone-800 cursor-default"
                        : "bg-white dark:bg-stone-900 text-secondary border-secondary/40 hover:bg-secondary hover:text-white cursor-pointer"
                    }`}
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <PostModal post={selected} onClose={() => setSelected(null)} />
    </PageShell>
  );
};

export default MicroBlog;
