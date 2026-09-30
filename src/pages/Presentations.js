import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Link, useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { usePresentations } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import TagLinks from "../components/common/TagLinks";
import { formatProjectDate } from "../lib/projectDate";
import { deckFacets, filterDecks, UNDATED } from "../lib/deckFilters";

// A live, non-interactive thumbnail: the deck renders at 4x the card size and
// is scaled down to fit, so it looks like the first slide at desktop width.
// ponytail: each card loads the whole deck; switch to image thumbnails past ~20 decks.
export const DeckPreview = ({ url, title }) => (
  <div className="relative aspect-video overflow-hidden bg-stone-100 dark:bg-stone-800">
    <iframe
      src={url}
      title={`Preview of ${title}`}
      loading="lazy"
      tabIndex={-1}
      aria-hidden="true"
      sandbox="allow-scripts allow-same-origin"
      className="absolute top-0 left-0 w-[400%] h-[400%] origin-top-left scale-[.25] pointer-events-none border-0"
    />
  </div>
);

DeckPreview.propTypes = { url: PropTypes.string.isRequired, title: PropTypes.string.isRequired };

const FILTER_PARAMS = ["q", "year", "tags"];
const DEFAULTS = { q: "", year: "", tags: "", sort: "date", dir: "desc" };

const selectClass = "h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-label text-xs uppercase tracking-wider text-stone-800 dark:text-stone-200 outline-none cursor-pointer hover:border-secondary transition-colors";

const Presentations = () => {
  const { data: decks, loading, error } = usePresentations();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => ({
    q: searchParams.get("q") ?? DEFAULTS.q,
    year: searchParams.get("year") ?? DEFAULTS.year,
    tags: (searchParams.get("tags") ?? "").split(",").filter(Boolean),
    sort: searchParams.get("sort") ?? DEFAULTS.sort,
    dir: searchParams.get("dir") ?? DEFAULTS.dir,
  }), [searchParams]);

  // Merge rather than replace: `view` (useViewMode) shares the query string.
  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    const serialized = Array.isArray(value) ? value.join(",") : value;
    if (!serialized || serialized === DEFAULTS[key]) next.delete(key);
    else next.set(key, serialized);
    setSearchParams(next, { replace: true });
  };
  const toggleTag = (name) => setFilter("tags", filters.tags.includes(name)
    ? filters.tags.filter((t) => t !== name)
    : [...filters.tags, name]);
  // Keeps sort/dir: those are how you read the page, not what you looked for.
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    FILTER_PARAMS.forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  };
  const hasFilters = !!(filters.q || filters.year || filters.tags.length);

  const facets = useMemo(() => deckFacets(decks), [decks]);
  const shown = useMemo(() => filterDecks(decks, filters), [decks, filters]);

  return (
    <PageShell region="creator">
      <div className="flex flex-col gap-10 w-full">
        <header>
          <p className="font-label text-xs uppercase tracking-widest text-secondary mb-4 font-bold">Slide Decks</p>
          <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-8">
            Presentations.
          </h1>
          <p className="max-w-2xl text-xl text-stone-500 dark:text-stone-400 font-light leading-relaxed mb-3">
            Talks, dossiers and data stories, built as HTML decks. Open one to click through it here.
          </p>
        </header>

        {loading && <LoadingBlock label="Loading presentations…" />}
        {error && <ErrorBlock />}

        {!loading && !error && decks.length > 0 && (
          <div className="flex flex-col gap-3 p-4 bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800 rounded-xl">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex-1 min-w-[12rem]" htmlFor="deck-search">
                <span className="sr-only">Search presentations</span>
                <input
                  id="deck-search"
                  type="search"
                  value={filters.q}
                  onChange={(e) => setFilter("q", e.target.value)}
                  placeholder="Search presentations…"
                  className="w-full h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-body text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-secondary transition-colors"
                />
              </label>

              <select
                aria-label="Filter by year"
                value={filters.year}
                onChange={(e) => setFilter("year", e.target.value)}
                className={selectClass}
              >
                <option value="">All Years</option>
                {facets.years.map(({ name, count }) => (
                  <option key={name} value={name}>{`${name === UNDATED ? "Undated" : name} (${count})`}</option>
                ))}
              </select>

              <select
                aria-label="Sort by"
                value={filters.sort}
                onChange={(e) => setFilter("sort", e.target.value)}
                className={selectClass}
              >
                <option value="date">Sort: Date</option>
                <option value="title">Sort: Title</option>
              </select>

              <button
                type="button"
                onClick={() => setFilter("dir", filters.dir === "asc" ? "desc" : "asc")}
                aria-label={filters.dir === "asc" ? "Sort descending" : "Sort ascending"}
                className={`${selectClass} flex items-center gap-1`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {filters.dir === "asc" ? "arrow_upward" : "arrow_downward"}
                </span>
                {filters.dir === "asc" ? "Asc" : "Desc"}
              </button>
            </div>

            {facets.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">Tags:</span>
                {facets.tags.map(({ name, count }) => {
                  const isActive = filters.tags.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => toggleTag(name)}
                      className={`px-3 py-1 rounded-md text-xs border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                        isActive
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-secondary/40 hover:text-secondary"
                      }`}
                    >
                      {`#${name} ${count}`}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="mb-0 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500" aria-live="polite">
                {shown.length === decks.length
                  ? `${decks.length} deck${decks.length === 1 ? "" : "s"}`
                  : `${shown.length} of ${decks.length} decks`}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-secondary font-label text-[10px] uppercase tracking-widest font-bold hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && !error && decks.length > 0 && shown.length === 0 && (
          <p className="text-stone-500 dark:text-stone-400 font-body italic text-center py-12 mb-0">
            No presentations match these filters.
          </p>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shown.map((d) => (
              <article
                key={d.id}
                className="group bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 hover:border-secondary rounded-2xl overflow-hidden flex flex-col transition-colors"
              >
                <Link to={`/presentations/${d.id}`} className="no-underline block" aria-label={d.title}>
                  <DeckPreview url={d.url} title={d.title} />
                </Link>
                <div className="p-6 flex flex-col gap-3">
                  <Link
                    to={`/presentations/${d.id}`}
                    className="font-headline text-xl font-bold text-stone-900 dark:text-stone-100 group-hover:text-secondary transition-colors no-underline"
                  >
                    {d.title}
                  </Link>
                  {d.date && (
                    <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-0">
                      {formatProjectDate(d.date)}
                    </p>
                  )}
                  {d.description && (
                    <p className="font-body text-sm text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-3 mb-0">
                      {d.description}
                    </p>
                  )}
                  <TagLinks tags={d.tags} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default Presentations;
