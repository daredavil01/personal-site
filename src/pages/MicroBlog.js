import React, { useEffect, useMemo, useState } from "react";
import Main from "../layouts/Main";
import { searchMicroblog, getMicroblogTagFacets } from "../lib/api/microblog";
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

const selectClass = "h-11 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-label text-xs uppercase tracking-wider text-stone-600 dark:text-stone-300 outline-none cursor-pointer hover:border-secondary transition-colors";

// Legacy theme CSS force-styles bare <button> elements, so interactive controls
// use div[role="button"] like the rest of the site (see OneHundredDays.js).
const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const MicroBlog = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [source, setSource] = useState("");
  const [type, setType] = useState("");

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [facets, setFacets] = useState([]);
  const [selected, setSelected] = useState(null);

  const activeTagsKey = activeTags.join("|");

  // Debounce the search box → searchTerm.
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Tag facets load once.
  useEffect(() => {
    getMicroblogTagFacets()
      .then(setFacets)
      .catch(() => setFacets([]));
  }, []);

  // Fresh search whenever a filter changes. `active` flag guards against an
  // earlier (slower) request resolving after a newer one.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    searchMicroblog({
      query: searchTerm, tags: activeTags, source, type, page: 0, pageSize: PAGE_SIZE,
    })
      .then(({ rows: r, count: c }) => {
        if (!active) return;
        setRows(r);
        setCount(c);
        setPage(0);
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [searchTerm, activeTagsKey, source, type]);

  const loadMore = () => {
    const next = page + 1;
    setLoadingMore(true);
    searchMicroblog({
      query: searchTerm, tags: activeTags, source, type, page: next, pageSize: PAGE_SIZE,
    })
      .then(({ rows: r }) => {
        setRows((prev) => [...prev, ...r]);
        setPage(next);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
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

  return (
    <Main
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

        {/* Search + filters */}
        <section>
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
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 ml-auto">
              {rows.length} of {count}
            </span>
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
      </div>

      <PostModal post={selected} onClose={() => setSelected(null)} />
    </Main>
  );
};

export default MicroBlog;
