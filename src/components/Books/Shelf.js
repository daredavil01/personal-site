import React, {
  useCallback, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { bookShape } from "./shapes";
import Spine from "./Spine";
import BookCover from "./BookCover";
import {
  ARRANGEMENTS, arrangeShelf, clothFor, hash, waitOf,
} from "../../lib/bookShelf";
import { formatReadDate } from "../../lib/bookDate";
import { openOnPlainClick } from "../../lib/plainClick";

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const placardOf = (book) => {
  const wait = waitOf(book);
  return [
    book.author?.trim(),
    book.page_count ? `${book.page_count} pages` : null,
    formatReadDate(book) ? `read ${formatReadDate(book)}` : null,
    wait ? `written ${wait} year${wait === 1 ? "" : "s"} earlier` : null,
  ].filter(Boolean).join(" · ");
};

// The whole library on one wrapping shelf. Bays are separated by dividers
// that stand among the books, so a year with two books costs two spines of
// room rather than a row of its own. Re-arranging moves every spine from
// where it stood to where it now belongs (FLIP on offsets, so scrolling
// mid-flight cannot skew it). A filter dims the books it rules out and leaves
// them standing: the shelf keeps its shape and you can see what you excluded.
const Shelf = ({
  books, matchIds, by, onArrange, faceOut, onFaceOut, onOpen, pulledId,
}) => {
  const bays = useMemo(() => arrangeShelf(books, by), [books, by]);
  const [pointed, setPointed] = useState(null);
  const shelfRef = useRef(null);
  const before = useRef(new Map());

  useLayoutEffect(() => {
    const root = shelfRef.current;
    if (!root) return;
    const next = new Map();
    root.querySelectorAll("[data-flip]").forEach((el) => {
      next.set(el.dataset.flip, { x: el.offsetLeft, y: el.offsetTop, el });
    });
    if (before.current.size && !reducedMotion()) {
      let i = 0;
      next.forEach(({ x, y, el }, key) => {
        const was = before.current.get(key);
        if (!was || !el.animate) return;
        const dx = was.x - x;
        const dy = was.y - y;
        if (!dx && !dy) return;
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
          {
            duration: 650, delay: Math.min(i * 6, 240), easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards",
          },
        );
        i += 1;
      });
    }
    before.current = next;
  }, [bays, faceOut]);

  const onPoint = useCallback((book) => setPointed(book), []);
  const shown = pointed ?? (pulledId != null ? books.find((b) => b.id === pulledId) : null);

  return (
    <section className="bk-case" aria-label="The shelf">
      <div className="bk-case__head">
        <div className="bk-arrange" role="group" aria-label="Arrange the shelf by">
          <span className="bk-small mr-2">Arrange by</span>
          {ARRANGEMENTS.map(({ id, label }) => (
            <button key={id} type="button" aria-pressed={by === id} onClick={() => onArrange(id)}>{label}</button>
          ))}
        </div>
        <div className="bk-arrange" role="group" aria-label="Show books as">
          <button type="button" aria-pressed={!faceOut} onClick={() => onFaceOut(false)}>Spines</button>
          <button type="button" aria-pressed={faceOut} onClick={() => onFaceOut(true)}>Covers</button>
        </div>
      </div>

      {!faceOut && (
        <p className="bk-placard" aria-live="polite">
          {shown ? (
            <>
              <b lang={/marathi/i.test(shown.language || "") ? "mr" : undefined}>{shown.title.trim()}</b>
              {placardOf(shown) && ` — ${placardOf(shown)}`}
            </>
          ) : "Reach for a spine. Its width is the book's length; its colour, the subject."}
        </p>
      )}

      {faceOut ? (
        <div className="bk-wall" ref={shelfRef}>
          {bays.flatMap((bay) => bay.books).map((book) => (
            <Link
              key={book.id}
              data-flip={`b${book.id}`}
              to={`/books/${book.id}`}
              onClick={openOnPlainClick(() => onOpen(book))}
              className={matchIds.has(book.id) ? "" : "is-dim"}
            >
              <BookCover book={book} />
              <p lang={/marathi/i.test(book.language || "") ? "mr" : undefined}>{book.title}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bk-shelf" ref={shelfRef}>
          {bays.flatMap((bay) => {
            const cells = [];
            if (bay.label) {
              cells.push(
                <div className="bk-cell" key={`d${bay.key}`} data-flip={`d${by}${bay.key}`}>
                  <div
                    className="bk-divider"
                    style={by === "subject" ? { borderTopColor: clothFor(bay.key) } : undefined}
                    title={`${bay.label}: ${bay.books.length} book${bay.books.length === 1 ? "" : "s"}${bay.pages ? `, ${bay.pages.toLocaleString("en-IN")} pages` : ""}`}
                  >
                    <span className="bk-divider__label">{bay.label}</span>
                    <span className="bk-divider__count">{bay.books.length}</span>
                  </div>
                </div>,
              );
            }
            bay.books.forEach((book, i) => {
              // The last book of a bay sometimes leans, as they do.
              const leaning = !!bay.label && bay.books.length > 2 && i === bay.books.length - 1
                && hash(`${by}${book.id}`) % 3 === 0;
              cells.push(
                <div className="bk-cell" key={book.id} data-flip={`b${book.id}`}>
                  <Spine
                    book={book}
                    dim={!matchIds.has(book.id)}
                    pulled={pulledId === book.id}
                    leaning={leaning}
                    onOpen={onOpen}
                    onPoint={onPoint}
                  />
                </div>,
              );
            });
            return cells;
          })}
        </div>
      )}

      {!faceOut && (
        <ul className="bk-legend" aria-label="How to read a spine">
          <li><span className="bk-spine__ribbon" />ribbon: I wrote a review</li>
          <li><span className="bk-spine__tab" />tab: I kept a line</li>
          <li><span className="bk-mark" />English</li>
          <li><span className="bk-mark bk-mark--mr" />Marathi</li>
        </ul>
      )}
    </section>
  );
};

Shelf.propTypes = {
  books: PropTypes.arrayOf(bookShape).isRequired,
  matchIds: PropTypes.instanceOf(Set).isRequired,
  by: PropTypes.string.isRequired,
  onArrange: PropTypes.func.isRequired,
  faceOut: PropTypes.bool.isRequired,
  onFaceOut: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
  pulledId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

Shelf.defaultProps = { pulledId: null };

export default Shelf;
