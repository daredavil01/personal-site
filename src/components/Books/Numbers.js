import React, { useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { bookShape, facetsShape } from "./shapes";
import BookCover from "./BookCover";
import {
  clothFor, hash, isMarathi, libraryFacts, pilesByYear, waitOf,
} from "../../lib/bookShelf";
import { bookYear } from "../../lib/bookDate";
import { useWidth } from "../Logbook/shared";
import { openOnPlainClick } from "../../lib/plainClick";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const num = (n) => Number(n).toLocaleString("en-IN");

const Mark = ({
  book, onOpen, onPoint, ...rect
}) => (
  <a
    href={`/books/${book.id}`}
    onClick={openOnPlainClick(() => onOpen(book))}
    onPointerEnter={() => onPoint(book)}
    onFocus={() => onPoint(book)}
    aria-label={book.title}
  >
    <rect {...rect} fill={clothFor(book.category)} rx="1.2" />
  </a>
);
Mark.propTypes = { book: bookShape.isRequired, onOpen: PropTypes.func.isRequired, onPoint: PropTypes.func.isRequired };

// Each row is a reading year; each mark a book, set at the year it was
// written. The red tick is the year of reading, so the gap between a mark and
// the tick is how long the book waited.
const WrittenAndRead = ({ books, onOpen }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 720);
  const [pointed, setPointed] = useState(null);

  const model = useMemo(() => {
    const dated = books.filter((b) => b.first_published && bookYear(b));
    if (!dated.length) return null;
    const rows = pilesByYear(dated).reverse();
    const from = Math.floor(Math.min(...dated.map((b) => b.first_published)) / 10) * 10;
    const to = Math.max(...dated.map((b) => Number(bookYear(b))));
    return { rows, from, to };
  }, [books]);

  if (!model) return null;
  const { rows, from, to } = model;
  const left = 46;
  const right = 12;
  const x = (year) => left + ((year - from) / Math.max(1, to - from)) * (width - left - right);
  const markW = Math.max(4, Math.min(9, (width - left - right) / (to - from) - 1));
  const slab = 7;

  let y = 8;
  const laid = rows.map((row) => {
    const stacks = new Map();
    const marks = row.books.map((book) => {
      const n = stacks.get(book.first_published) ?? 0;
      stacks.set(book.first_published, n + 1);
      return { book, n };
    });
    const tall = Math.max(...stacks.values());
    const h = Math.max(30, tall * slab + 16);
    const base = y + h - 6;
    y += h;
    return {
      ...row, marks, base, first: Math.min(...row.books.map((b) => b.first_published)),
    };
  });
  const axisY = y + 4;
  const ticks = [];
  for (let d = from; d <= to; d += width < 520 ? 20 : 10) ticks.push(d);
  const wait = pointed ? waitOf(pointed) : null;

  return (
    <div ref={ref}>
      <svg className="bk-fig" width={width} height={axisY + 22} role="img" aria-label="When each book was written, by the year it was read">
        {ticks.map((d) => (
          <g key={d}>
            <line x1={x(d)} x2={x(d)} y1={4} y2={axisY} stroke="var(--bk-rule)" strokeDasharray="2 4" />
            <text x={x(d)} y={axisY + 16} textAnchor="middle">{d}</text>
          </g>
        ))}
        {laid.map((row) => (
          <g key={row.key}>
            <text className="bk-fig__strong" x={0} y={row.base + 1}>{row.key}</text>
            <line x1={x(row.first)} x2={x(Number(row.key))} y1={row.base + 0.5} y2={row.base + 0.5} stroke="var(--bk-faint)" strokeWidth="1" />
            <line x1={x(Number(row.key)) + markW / 2 + 3} x2={x(Number(row.key)) + markW / 2 + 3} y1={row.base - 14} y2={row.base + 3} stroke="var(--bk-red)" strokeWidth="2" />
            {row.marks.map(({ book, n }) => (
              <Mark
                key={book.id}
                book={book}
                onOpen={onOpen}
                onPoint={setPointed}
                x={x(book.first_published) - markW / 2}
                y={row.base - (n + 1) * slab}
                width={markW}
                height={slab - 1}
              />
            ))}
          </g>
        ))}
      </svg>
      <p className="bk-figline" aria-live="polite">
        {pointed ? (
          <>
            <b lang={isMarathi(pointed) ? "mr" : undefined}>{pointed.title.trim()}</b>
            {` — written ${pointed.first_published}, read ${bookYear(pointed)}`}
            {wait !== null && (wait === 0 ? ", the year it came out" : `, a wait of ${plural(wait, "year")}`)}
          </>
        ) : "Point at a mark to see the book. The red tick is the year I read it."}
      </p>
    </div>
  );
};
WrittenAndRead.propTypes = { books: PropTypes.arrayOf(bookShape).isRequired, onOpen: PropTypes.func.isRequired };

// A year's reading as the pile it would make: one slab per book, as thick as
// the book is long, in the order they were read (first at the bottom).
const Piles = ({ books, onOpen }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 720);
  const [pointed, setPointed] = useState(null);
  const piles = useMemo(() => pilesByYear(books.filter((b) => b.page_count)), [books]);
  if (!piles.length) return null;

  const tallest = Math.max(...piles.map((p) => p.pages));
  const top = 16;
  const pileH = 190;
  const base = top + pileH;
  const col = width / piles.length;
  const gap = 1.5;

  return (
    <div ref={ref}>
      <svg className="bk-fig" width={width} height={base + 44} role="img" aria-label="Pages read each year, as piles of books">
        <line x1={0} x2={width} y1={base + 0.5} y2={base + 0.5} stroke="var(--bk-ink)" strokeWidth="2" />
        {piles.map((pile, i) => {
          const k = (pileH - pile.books.length * gap) / tallest;
          const cx = col * i + col / 2;
          const maxW = Math.min(col - 10, 96);
          let yy = base - 1;
          return (
            <g key={pile.key}>
              {pile.books.map((book) => {
                const h = Math.max(2, book.page_count * k);
                const seed = hash(`${book.id}${book.title}`);
                const w = maxW * (0.72 + (seed % 28) / 100);
                const dx = (Math.floor(seed / 32) % 9) - 4;
                yy -= h + gap;
                return (
                  <Mark key={book.id} book={book} onOpen={onOpen} onPoint={setPointed} x={cx - w / 2 + dx} y={yy + gap} width={w} height={h} />
                );
              })}
              <text className="bk-fig__strong" x={cx} y={base + 18} textAnchor="middle">{pile.key}</text>
              <text x={cx} y={base + 33} textAnchor="middle">{col > 74 ? `${num(pile.pages)} pp` : num(pile.pages)}</text>
            </g>
          );
        })}
      </svg>
      <p className="bk-figline" aria-live="polite">
        {pointed ? (
          <>
            <b lang={isMarathi(pointed) ? "mr" : undefined}>{pointed.title.trim()}</b>
            {` — ${num(pointed.page_count)} pages`}
          </>
        ) : "Each slab is a book, as thick as it is long."}
      </p>
    </div>
  );
};
Piles.propTypes = WrittenAndRead.propTypes;

const Record = ({
  label, book, detail, onOpen,
}) => (book ? (
  <li>
    <Link to={`/books/${book.id}`} onClick={openOnPlainClick(() => onOpen(book))} className="bk-record">
      <BookCover book={book} />
      <span className="min-w-0">
        <span className="bk-small block">{label}</span>
        <strong lang={isMarathi(book) ? "mr" : undefined}>{book.title.trim()}</strong>
        <small>{detail}</small>
      </span>
    </Link>
  </li>
) : null);
Record.propTypes = {
  label: PropTypes.string.isRequired, book: bookShape, detail: PropTypes.string, onOpen: PropTypes.func.isRequired,
};
Record.defaultProps = { book: null, detail: "" };

// Reads the filtered set, so "Marathi" then Numbers answers what the Marathi
// reading looks like. Every figure comes from lib/bookShelf.js.
const Numbers = ({
  books, facets, activeCategory, onSelectCategory, onOpen,
}) => {
  const facts = useMemo(() => libraryFacts(books), [books]);
  const subjects = useMemo(() => facets.categories
    .map(({ name }) => ({ name, count: books.filter((b) => b.category === name).length }))
    .filter((s) => s.count)
    .sort((a, b) => b.count - a.count), [books, facets]);
  const top = subjects[0]?.count ?? 1;
  const wait = facts.longestWait ? waitOf(facts.longestWait) : null;

  return (
    <div className="bk-plates">
      <section className="bk-plate bk-plate--wide">
        <p className="bk-eyebrow">Fig. 1</p>
        <h3>How long each book waited for me</h3>
        <p>
          {facts.medianWait !== null && `Half of these were read within ${plural(facts.medianWait, "year")} of being written. `}
          {facts.sameYear && `${plural(facts.sameYear, "book")} I read the year ${facts.sameYear === 1 ? "it" : "they"} came out. `}
          {facts.oldest && wait ? `The longest wait was ${wait} years.` : ""}
        </p>
        <WrittenAndRead books={books} onOpen={onOpen} />
      </section>

      <section className="bk-plate bk-plate--wide">
        <p className="bk-eyebrow">Fig. 2</p>
        <h3>A year of reading, as the pile it makes</h3>
        <p>
          {facts.pages && `${num(facts.pages)} pages in all`}
          {facts.pages && facts.pagesKnown < facts.total ? ` (from the ${facts.pagesKnown} books with a known length)` : ""}
          {facts.stackCm ? `: stacked flat, about ${facts.stackCm >= 100 ? `${(facts.stackCm / 100).toFixed(1)} metres` : `${facts.stackCm} cm`} of paper.` : ""}
          {facts.busiestYear ? ` The busiest year was ${facts.busiestYear.year}, with ${plural(facts.busiestYear.count, "book")}.` : ""}
        </p>
        <Piles books={books} onOpen={onOpen} />
      </section>

      <section className="bk-plate">
        <p className="bk-eyebrow">Fig. 3</p>
        <h3>What the shelf is made of</h3>
        <p>Pick a subject to light it up on the shelf.</p>
        <ul className="bk-bars">
          {subjects.map(({ name, count }) => (
            <li key={name}>
              <button type="button" className="bk-bar" aria-pressed={activeCategory === name} onClick={() => onSelectCategory(name)}>
                <span>{name}</span>
                <span className="bk-bar__track">
                  <span className="bk-bar__fill" style={{ width: `${(count / top) * 100}%`, "--cloth": clothFor(name) }} />
                </span>
                <b>{count}</b>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="bk-plate">
        <p className="bk-eyebrow">Fig. 4</p>
        <h3>Two languages, one shelf</h3>
        <p>
          {[
            facts.english && `${facts.english} in English`,
            facts.marathi && `${facts.marathi} in Marathi`,
            facts.translated && `${facts.translated} of them translations`,
          ].filter(Boolean).join(", ")}
          .
        </p>
        <div className="bk-split" role="img" aria-label={`${facts.english ?? 0} English, ${facts.marathi ?? 0} Marathi`}>
          {facts.english && <span style={{ flex: facts.english, background: "#3f51b5" }} />}
          {facts.marathi && <span style={{ flex: facts.marathi, background: "var(--bk-saffron)" }} />}
        </div>
        <ul className="bk-records mt-5">
          <Record label="Thickest" book={facts.thickest} detail={facts.thickest ? `${num(facts.thickest.page_count)} pages` : ""} onOpen={onOpen} />
          <Record label="Slimmest" book={facts.slimmest} detail={facts.slimmest ? `${num(facts.slimmest.page_count)} pages` : ""} onOpen={onOpen} />
          <Record label="Oldest" book={facts.oldest} detail={facts.oldest ? `First published ${facts.oldest.first_published}` : ""} onOpen={onOpen} />
        </ul>
      </section>
    </div>
  );
};

Numbers.propTypes = {
  books: PropTypes.arrayOf(bookShape).isRequired,
  facets: facetsShape.isRequired,
  activeCategory: PropTypes.string,
  onSelectCategory: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};
Numbers.defaultProps = { activeCategory: "" };

export default Numbers;
