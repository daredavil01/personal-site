import React from "react";
import PropTypes from "prop-types";
import { facetsShape, filtersShape } from "./shapes";
import TechChips from "./TechChips";

// The one filter bar, shared by every view. Markup follows the established
// Sports/Treks control bar so the site reads consistently.
const selectClass = "h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-label text-xs uppercase tracking-wider text-stone-800 dark:text-stone-200 outline-none cursor-pointer hover:border-secondary transition-colors";

const labelClass = "font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500";

const ProjectFilters = ({
  filters, setFilter, toggleFilter, clearFilters, hasFilters, facets, resultCount, totalCount,
}) => (
  <div className="flex flex-col gap-3 p-4 bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800 rounded-xl">
    {/* Search + selects */}
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex-1 min-w-[12rem]" htmlFor="project-search">
        <span className="sr-only">Search projects</span>
        <input
          id="project-search"
          type="search"
          value={filters.q}
          onChange={(e) => setFilter("q", e.target.value)}
          placeholder="Search projects…"
          className="w-full h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-body text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-secondary transition-colors"
        />
      </label>

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
        aria-label="Filter by status"
        value={filters.status}
        onChange={(e) => setFilter("status", e.target.value)}
        className={selectClass}
      >
        <option value="">All Statuses</option>
        {facets.statuses.map(({ name, count }) => (
          <option key={name} value={name}>{`${name} (${count})`}</option>
        ))}
      </select>

      <select
        aria-label="Filter by year"
        value={filters.year}
        onChange={(e) => setFilter("year", e.target.value)}
        className={selectClass}
      >
        <option value="">All Years</option>
        {facets.years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>

      <select
        aria-label="Sort by"
        value={filters.sort}
        onChange={(e) => setFilter("sort", e.target.value)}
        className={selectClass}
      >
        <option value="date">Sort: Date</option>
        <option value="title">Sort: Title</option>
        <option value="category">Sort: Category</option>
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

    {/* Tech chips */}
    {facets.tech.length > 0 && (
      <div className="flex flex-wrap items-center gap-2">
        <span className={labelClass}>Tech:</span>
        <TechChips
          tech={facets.tech.map((t) => t.name)}
          active={filters.tech}
          onToggle={(name) => toggleFilter("tech", name)}
        />
      </div>
    )}

    {/* Central tags */}
    {facets.tags.length > 0 && (
      <div className="flex flex-wrap items-center gap-2">
        <span className={labelClass}>Tags:</span>
        {facets.tags.map(({ name }) => {
          const isActive = filters.tags.some((t) => t.toLowerCase() === name.toLowerCase());
          return (
            <button
              key={name}
              type="button"
              aria-pressed={isActive}
              onClick={() => toggleFilter("tags", name)}
              className={`px-3 py-1 rounded-md text-xs border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
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

    {/* Result count + clear */}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="mb-0 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500" aria-live="polite">
        {resultCount === totalCount
          ? `${totalCount} project${totalCount === 1 ? "" : "s"}`
          : `${resultCount} of ${totalCount} projects`}
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
);

ProjectFilters.propTypes = {
  filters: filtersShape.isRequired,
  setFilter: PropTypes.func.isRequired,
  toggleFilter: PropTypes.func.isRequired,
  clearFilters: PropTypes.func.isRequired,
  hasFilters: PropTypes.bool.isRequired,
  facets: facetsShape.isRequired,
  resultCount: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
};

export default ProjectFilters;
