import React, { useState } from "react";
import PropTypes from "prop-types";
import { bookShape } from "./shapes";
import { clothFor, isMarathi } from "../../lib/bookShelf";

// A book as an object: its cover on a block of pages, turned a little toward
// the reader (books.css `.bk-object`). A stored cover URL can 404 — most are
// hot-linked — and a few Marathi titles never had one, so the fallback is a
// designed thing: the book's own binding cloth with the title set on it.
const BookCover = ({ book, className, eager }) => {
  const [broken, setBroken] = useState(false);
  const showImage = !!book.cover_url && !broken;

  return (
    <span className={`bk-stage block ${className}`}>
      <span className="bk-object block">
        <span className="bk-cover block" style={{ "--cloth": clothFor(book.category) }}>
          {/* The cloth title sits under the image, so a cover that is still
              loading (or never arrives) is a bound book, not a blank. */}
          <span className="bk-cover__blank" aria-hidden="true" lang={isMarathi(book) ? "mr" : undefined}>
            <strong>{book.title}</strong>
            {book.author && <small>{book.author}</small>}
          </span>
          {showImage && (
            <img
              src={book.cover_url}
              alt={`Cover of ${book.title}`}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
            />
          )}
        </span>
      </span>
    </span>
  );
};

BookCover.propTypes = {
  book: bookShape.isRequired,
  className: PropTypes.string,
  eager: PropTypes.bool,
};

BookCover.defaultProps = { className: "", eager: false };

export default BookCover;
