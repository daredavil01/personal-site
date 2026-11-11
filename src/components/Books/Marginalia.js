import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { bookShape } from "./shapes";
import { clothFor, isMarathi } from "../../lib/bookShelf";
import { openOnPlainClick } from "../../lib/plainClick";

// The lines kept from the books that have one, each on its own slip, edged in
// the book's binding cloth.
const Marginalia = ({ books, onOpen }) => {
  const kept = useMemo(() => books.filter((b) => b.quote), [books]);

  if (!kept.length) {
    return <p className="bk-lead py-10">No kept lines among these books. Clear a filter to see the rest.</p>;
  }

  return (
    <div className="bk-lines">
      {kept.map((book) => (
        <figure className="bk-line" key={book.id} style={{ "--cloth": clothFor(book.category) }}>
          <blockquote lang={/[ऀ-ॿ]/.test(book.quote) ? "mr" : undefined}>{book.quote.trim()}</blockquote>
          <figcaption>
            <Link to={`/books/${book.id}`} onClick={openOnPlainClick(() => onOpen(book))}>
              <b lang={isMarathi(book) ? "mr" : undefined}>{book.title.trim()}</b>
              {book.author ? ` · ${book.author.trim()}` : ""}
            </Link>
          </figcaption>
        </figure>
      ))}
    </div>
  );
};

Marginalia.propTypes = {
  books: PropTypes.arrayOf(bookShape).isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default Marginalia;
