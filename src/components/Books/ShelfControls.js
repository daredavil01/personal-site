import React from "react";
import PropTypes from "prop-types";
import { facetsShape, filtersShape } from "./shapes";
import { clothFor } from "../../lib/bookShelf";

const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

// Search and filters for every lens. The subject chips double as the shelf's
// colour key. Axes still union (see useBookFilters): two chips light more
// books, not fewer — said out loud below, because it is the opposite of what
// a filter bar usually does.
const ShelfControls = ({
  filters, setFilter, toggleFilter, clearFilters, hasFilters, facets, resultCount, totalCount,
}) => {
  const axisCount = [
    filters.category, filters.language, filters.status, filters.year, filters.rating, filters.reviewed,
    filters.tags.length ? "tags" : "",
  ].filter(Boolean).length;

  return (
    <div className="bk-controls">
      <div className="bk-controls__row">
        <div className="bk-search">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">search</span>
          <input
            type="search"
            aria-label="Search books"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="A title, an author, a publisher…"
          />
        </div>

        {facets.languages.map(({ name, count }) => (
          <button
            key={name}
            type="button"
            className="bk-chip"
            aria-pressed={filters.language === name}
            onClick={() => setFilter("language", filters.language === name ? "" : name)}
          >
            <span className={`bk-mark${/marathi/i.test(name) ? " bk-mark--mr" : ""}`} />
            {name}
            <i>{count}</i>
          </button>
        ))}

        <button
          type="button"
          className="bk-chip"
          aria-pressed={filters.reviewed === "yes"}
          onClick={() => setFilter("reviewed", filters.reviewed === "yes" ? "" : "yes")}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">bookmark</span>
          Reviewed
        </button>

        <span className="bk-chip bk-chip--select" data-active={!!filters.year}>
          <select aria-label="Filter by year read" value={filters.year} onChange={(e) => setFilter("year", e.target.value)}>
            <option value="">Any year</option>
            {facets.years.map((y) => <option key={y} value={y}>{`Read in ${y}`}</option>)}
          </select>
        </span>
      </div>

      <div className="bk-controls__row" role="group" aria-label="Filter by subject">
        {facets.categories.map(({ name, count }) => (
          <button
            key={name}
            type="button"
            className="bk-chip"
            aria-pressed={filters.category === name}
            onClick={() => setFilter("category", filters.category === name ? "" : name)}
          >
            <span className="bk-swatch" style={{ "--cloth": clothFor(name) }} />
            {name}
            <i>{count}</i>
          </button>
        ))}
        {filters.tags.map((tag) => (
          <button key={tag} type="button" className="bk-chip" aria-pressed="true" onClick={() => toggleFilter("tags", tag)}>
            {`#${facets.tags.find((t) => same(t.name, tag))?.name ?? tag}`}
            <span aria-hidden="true">×</span>
          </button>
        ))}
        {filters.rating && (
          <button type="button" className="bk-chip" aria-pressed="true" onClick={() => setFilter("rating", "")}>
            {`${filters.rating}★ and up`}
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 min-h-[24px]">
        <p className="bk-small" aria-live="polite">
          {resultCount === totalCount
            ? `${totalCount} book${totalCount === 1 ? "" : "s"}`
            : `${resultCount} of ${totalCount} books`}
          {axisCount > 1 && <span className="ml-2 normal-case tracking-normal">matching any of your filters</span>}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="bg-transparent border-0 p-0 bk-small cursor-pointer"
            style={{ color: "var(--bk-red)" }}
          >
            Clear filters ×
          </button>
        )}
      </div>
    </div>
  );
};

ShelfControls.propTypes = {
  filters: filtersShape.isRequired,
  setFilter: PropTypes.func.isRequired,
  toggleFilter: PropTypes.func.isRequired,
  clearFilters: PropTypes.func.isRequired,
  hasFilters: PropTypes.bool.isRequired,
  facets: facetsShape.isRequired,
  resultCount: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
};

export default ShelfControls;
