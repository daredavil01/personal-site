import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { bookShape } from "./shapes";
import BookCover from "./BookCover";
import Stars from "./Stars";
import { bookYear, formatReadDate } from "../../lib/bookDate";

const UNDATED = "Undated";

// Reading year by reading year. Not the alternating spine that
// ProjectsTimeline uses — that works for a dozen projects and turns into a
// zigzag of noise at fifty-one books. A single rail with sticky year headers
// scans far better, and is the same component on a phone as on a desktop.
const BooksTimeline = ({ books, onOpen }) => {
  const groups = useMemo(() => {
    const byYear = new Map();
    books.forEach((b) => {
      const key = bookYear(b) ?? UNDATED;
      if (!byYear.has(key)) byYear.set(key, []);
      byYear.get(key).push(b);
    });
    return [...byYear.entries()].sort(([a], [b]) => {
      if (a === UNDATED) return 1;
      if (b === UNDATED) return -1;
      return b.localeCompare(a);
    });
  }, [books]);

  return (
    <div className="flex flex-col gap-10 w-full">
      {groups.map(([year, items]) => (
        <section key={year}>
          <div className="sticky top-0 z-10 flex items-baseline gap-3 py-2 bg-white/90 dark:bg-stone-950/90 backdrop-blur-sm">
            <h3 className="mb-0 font-headline text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100">
              {year}
            </h3>
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
              {`${items.length} book${items.length === 1 ? "" : "s"}`}
            </span>
            <span className="flex-1 h-px bg-stone-200 dark:bg-stone-800" aria-hidden="true" />
          </div>

          <ul className="list-none pl-0 m-0 flex flex-col">
            {items.map((book) => (
              <li key={book.id} className="border-b border-stone-100 dark:border-stone-800/60 last:border-0">
                <button
                  type="button"
                  onClick={() => onOpen(book)}
                  className="w-full flex items-center gap-4 text-left bg-transparent border-0 py-3 px-1 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary transition-colors"
                >
                  <BookCover book={book} size="sm" className="w-12 shrink-0" />

                  <span className="min-w-0 flex-1">
                    <span className="block font-body font-bold text-sm text-stone-800 dark:text-stone-100 line-clamp-2">
                      {book.title}
                    </span>
                    <span className="block font-body text-xs text-stone-400 dark:text-stone-500 line-clamp-1">
                      {book.author}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <Stars rating={book.rating} size="xs" />
                      <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                        {formatReadDate(book)}
                      </span>
                      {book.blog_link && (
                        <span className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold">
                          Reviewed
                        </span>
                      )}
                    </span>
                  </span>

                  <span className="hidden sm:block shrink-0 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 text-right">
                    {book.category}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

BooksTimeline.propTypes = {
  books: PropTypes.arrayOf(bookShape).isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default BooksTimeline;
