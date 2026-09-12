import React from "react";
import PropTypes from "prop-types";
import { facetsShape, filtersShape } from "./shapes";

const selectClass = "h-11 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-label text-xs uppercase tracking-wider text-stone-800 dark:text-stone-200 outline-none cursor-pointer hover:border-secondary transition-colors";

const labelClass = "font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500";

// One filter bar, shared by every view. Controls are 44px tall so they are
// usable with a thumb, and on a phone the whole thing folds into a disclosure —
// eight controls above a shelf would push the books themselves below the fold.
const BookFilters = ({
  filters, setFilter, toggleFilter, clearFilters, hasFilters, facets, resultCount, totalCount,
}) => {
  const activeCount = [
    filters.q, filters.category, filters.language, filters.status,
    filters.year, filters.rating, filters.reviewed,
  ].filter(Boolean).length + filters.tags.length;

  // How many *axes* are in play — the search box excluded, since it narrows
  // while the rest widen.
  const axisCount = [
    filters.category, filters.language, filters.status,
    filters.year, filters.rating, filters.reviewed,
    filters.tags.length ? "tags" : "",
  ].filter(Boolean).length;

  const controls = (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {/* aria-label rather than a <label for>: the bar is rendered twice (the
            phone disclosure and the desktop row) and duplicate ids would break
            both associations. */}
        <input
          type="search"
          aria-label="Search books"
          value={filters.q}
          onChange={(e) => setFilter("q", e.target.value)}
          placeholder="Title, author, publisher…"
          className="flex-1 min-w-[12rem] h-11 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-body text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-secondary transition-colors"
        />

        <select
          aria-label="Filter by category"
          value={filters.category}
          onChange={(e) => setFilter("category", e.target.value)}
          className={selectClass}
        >
          <option value="">All Categories</option>
          {facets.categories.map(({ name, count }) => (
            <option key={name} value={name}>{`${name} (${count})`}</option>
          ))}
        </select>

        <select
          aria-label="Filter by language"
          value={filters.language}
          onChange={(e) => setFilter("language", e.target.value)}
          className={selectClass}
        >
          <option value="">All Languages</option>
          {facets.languages.map(({ name, count }) => (
            <option key={name} value={name}>{`${name} (${count})`}</option>
          ))}
        </select>

        <select
          aria-label="Filter by year read"
          value={filters.year}
          onChange={(e) => setFilter("year", e.target.value)}
          className={selectClass}
        >
          <option value="">All Years</option>
          {facets.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          aria-label="Filter by rating"
          value={filters.rating}
          onChange={(e) => setFilter("rating", e.target.value)}
          className={selectClass}
        >
          <option value="">Any Rating</option>
          <option value="5">★★★★★</option>
          <option value="4">★★★★ +</option>
          <option value="3">★★★ +</option>
        </select>

        <select
          aria-label="Filter by review"
          value={filters.reviewed}
          onChange={(e) => setFilter("reviewed", e.target.value)}
          className={selectClass}
        >
          <option value="">Reviewed or not</option>
          <option value="yes">Reviewed</option>
          <option value="no">No review</option>
        </select>

        <select
          aria-label="Sort by"
          value={filters.sort}
          onChange={(e) => setFilter("sort", e.target.value)}
          className={selectClass}
        >
          <option value="date">Sort: Date read</option>
          <option value="title">Sort: Title</option>
          <option value="author">Sort: Author</option>
          <option value="category">Sort: Category</option>
          <option value="rating">Sort: Rating</option>
          <option value="pages">Sort: Pages</option>
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
          <span className={labelClass}>Tags:</span>
          {facets.tags.slice(0, 24).map(({ name }) => {
            const isActive = filters.tags.some((t) => t.toLowerCase() === name.toLowerCase());
            return (
              <button
                key={name}
                type="button"
                aria-pressed={isActive}
                onClick={() => toggleFilter("tags", name)}
                className={`px-3 py-1.5 rounded-md text-xs border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                  isActive
                    ? "bg-secondary text-white border-secondary"
                    : "bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-secondary/40 hover:text-secondary"
                }`}
              >
                {`#${name}`}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="mb-0 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500" aria-live="polite">
          {resultCount === totalCount
            ? `${totalCount} book${totalCount === 1 ? "" : "s"}`
            : `${resultCount} of ${totalCount} books`}
          {/* Filters union rather than intersect, so two selections return more
              books, not fewer. Said out loud because that is the opposite of
              what a filter bar usually does. */}
          {axisCount > 1 && <span className="ml-2 normal-case tracking-normal">matching any of your filters</span>}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 bg-transparent border-0 text-secondary font-label text-[10px] uppercase tracking-widest font-bold hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Clear filters
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="p-4 bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800 rounded-xl">
      {/* Phone: folded away by default, with the active count on the summary so
          a filtered-but-collapsed bar can't silently hide why the shelf is short. */}
      <details className="sm:hidden group">
        <summary className="flex items-center justify-between cursor-pointer list-none font-label text-xs uppercase tracking-widest font-bold text-stone-700 dark:text-stone-200 py-1.5">
          <span>
            Filters
            {activeCount > 0 && <span className="ml-2 text-secondary">{`(${activeCount})`}</span>}
          </span>
          <span className="material-symbols-outlined text-lg transition-transform group-open:rotate-180">expand_more</span>
        </summary>
        <div className="flex flex-col gap-3 pt-4">{controls}</div>
      </details>

      <div className="hidden sm:flex flex-col gap-3">{controls}</div>
    </div>
  );
};

BookFilters.propTypes = {
  filters: filtersShape.isRequired,
  setFilter: PropTypes.func.isRequired,
  toggleFilter: PropTypes.func.isRequired,
  clearFilters: PropTypes.func.isRequired,
  hasFilters: PropTypes.bool.isRequired,
  facets: facetsShape.isRequired,
  resultCount: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
};

export default BookFilters;
