import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { bookShape } from "./shapes";
import { arrangeShelf, hash, isMarathi } from "../../lib/bookShelf";
import { MONTH_LABELS } from "../../lib/bookDate";
import { openOnPlainClick } from "../../lib/plainClick";

// The stamp says only what is known. A book with a real finish date gets the
// day; one where only the year survives gets a dashed "sometime in" stamp
// (lib/bookDate.js: never print a month nobody recorded).
const stampOf = (book) => {
  const m = String(book.date_finished ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m && book.date_precision === "day") {
    return { text: `${m[3]} ${MONTH_LABELS[Number(m[2]) - 1]} ${m[1].slice(2)}`, exact: true };
  }
  return { text: "Sometime", exact: false };
};

// The reading years as a library's date-due slips, newest first.
const BorrowerSlip = ({ books, onOpen }) => {
  const years = useMemo(() => arrangeShelf(books, "year"), [books]);

  return (
    <div className="bk-slips">
      {years.map((bay) => (
        <section className="bk-slip" key={bay.key} aria-label={`Read in ${bay.label}`}>
          <header className="bk-slip__head">
            <h3 className="bk-slip__year">{bay.label}</h3>
            <p className="bk-small text-right">
              {`${bay.books.length} book${bay.books.length === 1 ? "" : "s"}`}
              {bay.pages ? ` · ${bay.pages.toLocaleString("en-IN")} pages` : ""}
            </p>
          </header>
          <ol>
            {bay.books.map((book) => {
              const stamp = stampOf(book);
              return (
                <li key={book.id}>
                  <Link
                    to={`/books/${book.id}`}
                    onClick={openOnPlainClick(() => onOpen(book))}
                    className="bk-slip__row"
                  >
                    <span
                      className={`bk-stampmark${stamp.exact ? "" : " bk-stampmark--year"}`}
                      style={{ "--tilt": `${(hash(book.id) % 7) - 3}deg` }}
                    >
                      {stamp.text}
                    </span>
                    <span className="min-w-0" lang={isMarathi(book) ? "mr" : undefined}>
                      <span className="bk-slip__title block">{book.title}</span>
                      <span className="bk-slip__by block">{book.author}</span>
                    </span>
                    {book.blog_link && (
                      <span className="bk-stampmark bk-stampmark--red" style={{ "--tilt": "3deg" }}>Reviewed</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
};

BorrowerSlip.propTypes = {
  books: PropTypes.arrayOf(bookShape).isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default BorrowerSlip;
