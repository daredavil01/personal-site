import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { bookShape, facetsShape } from "./shapes";
import { Bars, Tile, tally } from "../common/StatBars";
import { bookYear } from "../../lib/bookDate";

const decade = (year) => (year ? `${Math.floor(year / 10) * 10}s` : null);

// Reads the *filtered* set, like ProjectsStatistics — so narrowing to Marathi
// and then opening Statistics answers "what does my Marathi reading look like",
// not "what does the whole shelf look like".
const BooksStatistics = ({ books, facets, onSelectCategory }) => {
  const stats = useMemo(() => {
    const rated = books.filter((b) => b.rating);
    const pages = books.reduce((sum, b) => sum + (b.page_count ?? 0), 0);
    const withPages = books.filter((b) => b.page_count).length;
    const years = books.map((b) => bookYear(b)).filter(Boolean).sort();
    const marathi = books.filter((b) => b.language === "Marathi").length;
    const reviewed = books.filter((b) => b.blog_link).length;

    return {
      total: books.length,
      pages,
      // Say how much of the shelf the page total actually covers — page counts
      // come from APIs that miss most Marathi titles, so the number is a floor.
      pagesSub: withPages < books.length
        ? `From the ${withPages} with a known length`
        : "Across every book",
      avgRating: rated.length
        ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1)
        : "—",
      span: years.length ? `${years[0]}–${years[years.length - 1]}` : "—",
      marathi,
      marathiPct: books.length ? Math.round((marathi / books.length) * 100) : 0,
      reviewed,
    };
  }, [books]);

  const byYear = useMemo(
    () => tally(books, (b) => bookYear(b)).sort((a, b) => b.name.localeCompare(a.name)),
    [books],
  );

  const byDecade = useMemo(
    () => tally(books, (b) => decade(b.first_published)).sort((a, b) => a.name.localeCompare(b.name)),
    [books],
  );

  const byRating = useMemo(
    () => tally(books, (b) => (b.rating ? `${"★".repeat(b.rating)}` : null))
      .sort((a, b) => b.name.length - a.name.length),
    [books],
  );

  if (!books.length) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Books" value={stats.total} sub={`${stats.reviewed} reviewed`} />
        <Tile label="Pages" value={stats.pages.toLocaleString()} sub={stats.pagesSub} />
        <Tile label="Average rating" value={stats.avgRating} sub="Out of 5" />
        <Tile label="Reading years" value={stats.span} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Bars title="Books per reading year" rows={byYear} />
        <Bars
          title="By category — click to filter"
          rows={facets.categories}
          onSelect={onSelectCategory}
          colored
        />
        <Bars title="By language" rows={tally(books, (b) => b.language)} />
        <Bars title="Published in" rows={byDecade} />
        <Bars title="By rating" rows={byRating} />
        <Bars title="Top tags" rows={facets.tags.slice(0, 10)} colored />
      </div>
    </div>
  );
};

BooksStatistics.propTypes = {
  books: PropTypes.arrayOf(bookShape).isRequired,
  facets: facetsShape.isRequired,
  onSelectCategory: PropTypes.func.isRequired,
};

export default BooksStatistics;
