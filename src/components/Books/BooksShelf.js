import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { bookShape } from "./shapes";
import BookCover from "./BookCover";
import Stars from "./Stars";

const BookCard = ({ book, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(book)}
    className="group flex flex-col text-left bg-transparent border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded-lg"
  >
    <div className="relative w-full transition-transform duration-300 group-hover:-translate-y-1.5">
      <BookCover book={book} size="md" className="w-full" />

      {book.blog_link && (
        <span className="absolute top-0 left-[6%] px-2 py-1 bg-secondary text-white font-label text-[9px] uppercase tracking-widest rounded-b-sm">
          Review
        </span>
      )}
    </div>

    <div className="mt-3 flex flex-col gap-1">
      <Stars rating={book.rating} size="xs" />
      <p className="mb-0 font-body font-bold text-sm text-stone-800 dark:text-stone-100 leading-snug line-clamp-2">
        {book.title}
      </p>
      <p className="mb-0 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 line-clamp-1">
        {book.author}
      </p>
    </div>
  </button>
);

BookCard.propTypes = { book: bookShape.isRequired, onOpen: PropTypes.func.isRequired };

// The default view: covers first, everything else secondary. Six across on a
// wide screen, two on a phone — a cover has to stay big enough to recognise,
// which is the whole reason for fetching one.
const BooksShelf = ({ books, onOpen }) => {
  const reading = useMemo(() => books.filter((b) => b.status === "reading"), [books]);
  const rest = useMemo(() => books.filter((b) => b.status !== "reading"), [books]);

  return (
    <div className="flex flex-col gap-10 w-full">
      {reading.length > 0 && (
        <section>
          <h2 className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold mb-4">
            Currently reading
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
            {reading.map((book) => <BookCard key={book.id} book={book} onOpen={onOpen} />)}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
        {rest.map((book) => <BookCard key={book.id} book={book} onOpen={onOpen} />)}
      </div>
    </div>
  );
};

BooksShelf.propTypes = {
  books: PropTypes.arrayOf(bookShape).isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default BooksShelf;
