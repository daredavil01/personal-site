import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { useBooks } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import useBookFilters from "../components/Books/useBookFilters";
import BooksFonts from "../components/Books/BooksFonts";
import ShelfControls from "../components/Books/ShelfControls";
import Shelf from "../components/Books/Shelf";
import BorrowerSlip from "../components/Books/BorrowerSlip";
import Numbers from "../components/Books/Numbers";
import Marginalia from "../components/Books/Marginalia";
import BooksTable from "../components/Books/BooksTable";
import BookCover from "../components/Books/BookCover";
import BookDetailsModal from "../components/Books/BookDetailsModal";
import {
  ARRANGEMENTS, arrangeShelf, formatStack, isMarathi, libraryFacts, pickBook,
} from "../lib/bookShelf";
import { formatReadDate } from "../lib/bookDate";

// The Reading Room. One object per book — its spine — and five ways to read
// the same library: the shelf (re-arrangeable), the borrower's slip (by year),
// the numbers, the lines kept, and the catalogue. The lens ids are the old
// `?view=` tab names, so earlier links still land; the lens now lives in
// `?tab=` because `?view=` belongs to the shell (atlas/classic).
const LENSES = [
  { id: "shelf", label: "Shelf" },
  { id: "timeline", label: "Borrower’s slip" },
  { id: "stats", label: "Numbers" },
  { id: "lines", label: "Marginalia" },
  { id: "table", label: "Catalogue" },
];
const isLens = (id) => LENSES.some((l) => l.id === id);

const Books = () => {
  const { data: booksData, loading, error } = useBooks();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState(null);
  const [pulledId, setPulledId] = useState(null);
  const pullTimer = useRef(null);
  const lensRef = useRef(null);

  const rawLens = searchParams.get("tab") ?? searchParams.get("view");
  const lens = isLens(rawLens) ? rawLens : "shelf";
  const by = ARRANGEMENTS.some((a) => a.id === searchParams.get("shelf")) ? searchParams.get("shelf") : "year";
  const faceOut = searchParams.get("show") === "covers";

  const {
    filters, setFilter, toggleFilter, clearFilters, hasFilters, filtered, facets,
  } = useBookFilters(booksData);

  // Merge, never replace — the lens, the arrangement and the filters share
  // the query string.
  const patchParams = useCallback((patch) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    // A legacy ?view=timeline is replaced by ?tab=; ?view=atlas is the shell's.
    if (isLens(params.get("view"))) params.delete("view");
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const setLens = (next) => patchParams({ tab: next === "shelf" ? "" : next });

  const onSort = (column) => {
    if (filters.sort === column) setFilter("dir", filters.dir === "asc" ? "desc" : "asc");
    else setFilter("sort", column);
  };

  // A subject bar in Numbers lights that subject on the shelf and takes you
  // there — the chart is a way in, not a dead end.
  const onSelectCategory = (name) => {
    patchParams({ category: filters.category === name ? "" : name, tab: "" });
    lensRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const facts = useMemo(() => libraryFacts(booksData), [booksData]);
  const matchIds = useMemo(() => new Set(filtered.map((b) => b.id)), [filtered]);
  const quoted = useMemo(() => booksData.filter((b) => b.quote).length, [booksData]);

  // ← → in the open book walk the order you were looking at.
  const order = useMemo(() => (lens === "shelf"
    ? arrangeShelf(booksData, by).flatMap((bay) => bay.books).filter((b) => matchIds.has(b.id))
    : filtered), [lens, booksData, by, matchIds, filtered]);

  const onStep = useCallback((delta) => {
    setSelected((current) => {
      if (!current || order.length < 2) return current;
      const i = order.findIndex((b) => b.id === current.id);
      return order[(i + delta + order.length) % order.length];
    });
  }, [order]);

  useEffect(() => () => clearTimeout(pullTimer.current), []);

  // "Pull one for me": the spine tips out of the row where it stands, then
  // opens. On any other lens (or face-out) there is no spine to tip.
  const pullOne = () => {
    const pool = filtered.length ? filtered : booksData;
    const book = pickBook(pool, Math.random() * 1e6, selected?.id ?? pulledId);
    if (!book) return;
    if (lens !== "shelf" || faceOut) { setSelected(book); return; }
    setPulledId(book.id);
    document.querySelector(`[data-flip="b${book.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    clearTimeout(pullTimer.current);
    pullTimer.current = setTimeout(() => { setSelected(book); setPulledId(null); }, 1100);
  };

  const { latest } = facts;
  const readouts = [
    [facts.total, "books finished"],
    [facts.pages ? facts.pages.toLocaleString("en-IN") : null, "pages turned"],
    [formatStack(facts.stackCm), "if stacked flat"],
    [facts.marathi, "in Marathi"],
    [facts.reviewed, "reviewed"],
  ].filter(([value]) => value);

  return (
    <PageShell region="reader">
      <BooksFonts />
      <div className="bk-root flex flex-col gap-9 md:gap-12">
        <header className="bk-hero">
          <div>
            <p className="bk-eyebrow">Reading Room</p>
            <h1 className="bk-title">
              Every book,
              <br />
              <em>spine out.</em>
            </h1>
            <p className="bk-lead">
              Everything I have finished, in English and in Marathi, shelved by when I read it
              rather than when it was written. A spine is as wide as its book is long and wears
              the colour of its subject. Take one down.
            </p>
            {readouts.length > 0 && (
              <ul className="bk-readouts">
                {readouts.map(([value, label]) => (
                  <li key={label}>
                    <b>{value}</b>
                    <span className="bk-small">{label}</span>
                  </li>
                ))}
              </ul>
            )}
            {booksData.length > 1 && (
              <div className="flex flex-wrap gap-3 mt-7">
                <button type="button" className="bk-btn" onClick={pullOne}>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">casino</span>
                  Pull one for me
                </button>
              </div>
            )}
          </div>

          {latest && (
            <button type="button" className="bk-desk" onClick={() => setSelected(latest)}>
              <BookCover book={latest} eager className="w-28 @md:w-36" />
              <span className="min-w-0">
                <span className="bk-small block">
                  {`Last finished${formatReadDate(latest) ? ` · ${formatReadDate(latest)}` : ""}`}
                </span>
                <span className="bk-serif block text-xl font-semibold leading-tight mt-2" lang={isMarathi(latest) ? "mr" : undefined}>
                  {latest.title.trim()}
                </span>
                <span className="bk-serif italic block mt-1" style={{ color: "var(--bk-soft)" }} lang={isMarathi(latest) ? "mr" : undefined}>
                  {latest.author}
                </span>
              </span>
            </button>
          )}
        </header>

        {loading && <LoadingBlock label="Loading books…" />}
        {error && <ErrorBlock />}

        {!loading && !error && (
          <div className="flex flex-col gap-6 scroll-mt-24" ref={lensRef}>
            <div className="bk-tabs" role="tablist" aria-label="Ways to read the library">
              {LENSES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={lens === id}
                  className="bk-tab"
                  onClick={() => setLens(id)}
                >
                  {label}
                  {id === "lines" && quoted > 0 && <sup>{quoted}</sup>}
                </button>
              ))}
            </div>

            <ShelfControls
              filters={filters}
              setFilter={setFilter}
              toggleFilter={toggleFilter}
              clearFilters={clearFilters}
              hasFilters={hasFilters}
              facets={facets}
              resultCount={filtered.length}
              totalCount={booksData.length}
            />

            {lens === "shelf" && (
              <Shelf
                books={booksData}
                matchIds={matchIds}
                by={by}
                onArrange={(id) => patchParams({ shelf: id === "year" ? "" : id })}
                faceOut={faceOut}
                onFaceOut={(on) => patchParams({ show: on ? "covers" : "" })}
                onOpen={setSelected}
                pulledId={pulledId}
              />
            )}

            {lens !== "shelf" && filtered.length === 0 && (
              <div className="py-16 text-center">
                <p className="bk-lead mx-auto mb-4">No books match those filters.</p>
                <button type="button" onClick={clearFilters} className="bk-btn bk-btn--ghost">Clear filters</button>
              </div>
            )}

            {filtered.length > 0 && (
              <>
                {lens === "timeline" && <BorrowerSlip books={filtered} onOpen={setSelected} />}
                {lens === "stats" && (
                  <Numbers
                    books={filtered}
                    facets={facets}
                    activeCategory={filters.category}
                    onSelectCategory={onSelectCategory}
                    onOpen={setSelected}
                  />
                )}
                {lens === "lines" && <Marginalia books={filtered} onOpen={setSelected} />}
                {lens === "table" && (
                  <BooksTable books={filtered} onOpen={setSelected} filters={filters} onSort={onSort} />
                )}
              </>
            )}
          </div>
        )}
      </div>

      <BookDetailsModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        book={selected}
        onStep={order.length > 1 ? onStep : null}
      />
    </PageShell>
  );
};

export default Books;
