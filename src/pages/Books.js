import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { useBooks } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import useBookFilters from "../components/Books/useBookFilters";
import BookFilters from "../components/Books/BookFilters";
import BooksShelf from "../components/Books/BooksShelf";
import BooksTimeline from "../components/Books/BooksTimeline";
import BooksStatistics from "../components/Books/BooksStatistics";
import BooksTable from "../components/Books/BooksTable";
import BookDetailsModal from "../components/Books/BookDetailsModal";

const VIEWS = [
  { id: "shelf", label: "Shelf" },
  { id: "timeline", label: "Timeline" },
  { id: "stats", label: "Statistics" },
  { id: "table", label: "Table" },
];

const Books = () => {
  const { data: booksData, loading, error } = useBooks();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState(null);

  const view = VIEWS.some((v) => v.id === searchParams.get("view"))
    ? searchParams.get("view")
    : "shelf";

  const {
    filters, setFilter, toggleFilter, clearFilters, hasFilters, filtered, facets,
  } = useBookFilters(booksData);

  // Merge, never replace — `view` and the filter params share the query string.
  const setView = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next === "shelf") params.delete("view");
    else params.set("view", next);
    setSearchParams(params, { replace: true });
  };

  const onSort = (column) => {
    if (filters.sort === column) setFilter("dir", filters.dir === "asc" ? "desc" : "asc");
    else setFilter("sort", column);
  };

  // Clicking a bar in Statistics filters the shelf and takes you there — the
  // chart is a way in, not a dead end.
  const onSelectCategory = (name) => {
    setFilter("category", filters.category === name ? "" : name);
    setView("shelf");
  };

  const summary = useMemo(() => {
    if (!booksData.length) return "";
    const marathi = booksData.filter((b) => b.language === "Marathi").length;
    const reviewed = booksData.filter((b) => b.blog_link).length;
    const years = booksData.map((b) => b.year).filter(Boolean).sort((a, b) => a - b);
    return [
      `${booksData.length} books`,
      marathi ? `${marathi} in Marathi` : null,
      reviewed ? `${reviewed} reviewed` : null,
      years.length ? `${years[0]}–${years[years.length - 1]}` : null,
    ].filter(Boolean).join(" · ");
  }, [booksData]);

  return (
    <PageShell region="reader">
      <div className="flex flex-col gap-8 md:gap-10 w-full">
        <header>
          <p className="font-label text-xs uppercase tracking-widest text-secondary mb-4 font-bold">Reading Room</p>
          <h1 className="font-headline text-4xl sm:text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-6 md:mb-8">
            The <br />Bookshelf.
          </h1>
          <div className="max-w-2xl">
            <p className="text-lg md:text-xl text-stone-500 dark:text-stone-400 font-light leading-relaxed mb-3">
              Everything I have finished, in English and in Marathi, with the reviews I wrote about
              them. Sorted by when I read it rather than when it was published — the shelf is a
              record of a few years of attention, not a catalogue.
            </p>
            {summary && (
              <p className="mb-0 font-label text-[11px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                {summary}
              </p>
            )}
          </div>
        </header>

        {/* View tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-stone-100 dark:bg-stone-800/50 p-1.5 rounded-xl self-start">
          {VIEWS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-current={view === id}
              className={`px-4 sm:px-5 py-2.5 rounded-lg border-0 font-label text-xs uppercase tracking-widest font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                view === id
                  ? "text-secondary bg-white dark:bg-stone-700 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 bg-transparent hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <LoadingBlock label="Loading books…" />}
        {error && <ErrorBlock />}

        {!loading && !error && (
          <>
            <BookFilters
              filters={filters}
              setFilter={setFilter}
              toggleFilter={toggleFilter}
              clearFilters={clearFilters}
              hasFilters={hasFilters}
              facets={facets}
              resultCount={filtered.length}
              totalCount={booksData.length}
            />

            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-body text-stone-500 dark:text-stone-400 mb-4">
                  No books match those filters.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="bg-transparent border-0 font-label text-xs uppercase tracking-widest text-secondary font-bold hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="w-full">
                {view === "shelf" && <BooksShelf books={filtered} onOpen={setSelected} />}
                {view === "timeline" && <BooksTimeline books={filtered} onOpen={setSelected} />}
                {view === "stats" && (
                  <BooksStatistics books={filtered} facets={facets} onSelectCategory={onSelectCategory} />
                )}
                {view === "table" && (
                  <BooksTable books={filtered} onOpen={setSelected} filters={filters} onSort={onSort} />
                )}
              </div>
            )}
          </>
        )}
      </div>

      <BookDetailsModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        book={selected}
      />
    </PageShell>
  );
};

export default Books;
