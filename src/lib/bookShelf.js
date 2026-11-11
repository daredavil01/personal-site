// The Reading Room's model — everything /books draws that is not a filter.
// Pure (it imports only the date helpers and the site's hash), so the page, the detail
// sheet and the tests agree on what a spine looks like and what a number means.
//
// The idea of the page: a book is one object, its spine, and the spine is data.
// Width is the page count, colour is the subject, the mark at its foot is the
// language, a ribbon means a review exists and a paper tab means a line was
// kept. Every arrangement re-shelves the same spines.

import { bookYear } from "./bookDate";
import { hashString } from "./generativeArt";

/** The site's seeded hash (FNV-1a), so a spine and a tag colour agree on a seed. */
export const hash = (value) => hashString(String(value));

// Binding cloth per subject. Chosen dark enough that the cream ink below holds
// 4.5:1 on every one of them (bookShelf.test.js checks), and far enough apart
// that the shelf reads as a chart of subjects before a title is legible.
export const CLOTH = {
  Fiction: "#8a2f2b",
  "Non-fiction": "#4a5560",
  Technology: "#1d5c63",
  "Public Policy": "#27406e",
  Philosophy: "#56356b",
  "Psychology & Self-Help": "#8f5a0c",
  "Biography & Memoir": "#2e5d3f",
  Society: "#a24a2a",
  History: "#5b4636",
  Sports: "#0f6a8a",
  "Travel & Adventure": "#56631f",
};
export const CLOTH_FALLBACK = "#4a4640";
export const SPINE_INK = "#f8efdc";

export const clothFor = (category) => CLOTH[category] ?? CLOTH_FALLBACK;

export const isMarathi = (book) => /marathi/i.test(book?.language ?? "");

// Spine geometry in CSS pixels at scale 1. A 72-page pamphlet still has to
// carry a line of 11px type, hence the floor; the ceiling keeps one 600-page
// history from eating a phone's whole row.
export const SPINE = {
  minW: 22, maxW: 60, minH: 146, maxH: 190, unknownPages: 240,
};

export const spineWidth = (pages) => {
  const p = Number(pages) > 0 ? Number(pages) : SPINE.unknownPages;
  return Math.round(Math.min(SPINE.maxW, Math.max(SPINE.minW, 15 + p * 0.075)));
};

export const SPINE_STYLES = ["bands", "label", "half", "plain"];

/** Everything a spine needs to be drawn. Seeded by the row, so it never moves. */
export const spineOf = (book) => {
  const seed = hash(`${book.id ?? ""}${book.title ?? ""}`);
  const w = spineWidth(book.page_count);
  return {
    w,
    h: SPINE.minH + (seed % (SPINE.maxH - SPINE.minH + 1)),
    cloth: clothFor(book.category),
    // A paper label needs room for the title to be set on it.
    style: SPINE_STYLES[Math.floor(seed / 256) % SPINE_STYLES.length],
    // ±1 step of lightness so twenty books of one subject are not one slab.
    shade: (Math.floor(seed / 16) % 3) - 1,
    marathi: isMarathi(book),
    reviewed: !!book.blog_link,
    quoted: !!book.quote,
    lines: w >= 44 ? 2 : 1,
  };
};

const time = (book) => {
  if (book?.date_finished) {
    const t = Date.parse(book.date_finished);
    if (!Number.isNaN(t)) return t;
  }
  return book?.year ? Date.parse(`${book.year}-12-31`) : 0;
};

const newestFirst = (a, b) => time(b) - time(a) || String(a.title).localeCompare(String(b.title));
const byTitle = (a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""));
const pagesOf = (list) => list.reduce((sum, b) => sum + (b.page_count ?? 0), 0);

export const decadeOf = (year) => (year ? `${Math.floor(year / 10) * 10}s` : null);

export const ARRANGEMENTS = [
  { id: "year", label: "Year read" },
  { id: "subject", label: "Subject" },
  { id: "language", label: "Language" },
  { id: "published", label: "Written in" },
  { id: "thickness", label: "Thickness" },
  { id: "title", label: "A–Z" },
];

const group = (books, keyOf, sortGroups, sortBooks) => {
  const map = new Map();
  books.forEach((b) => {
    const key = keyOf(b) ?? "Unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(b);
  });
  return [...map.entries()]
    .map(([key, list]) => ({
      key, label: key, books: [...list].sort(sortBooks), pages: pagesOf(list),
    }))
    .sort(sortGroups);
};

const unknownLast = (cmp) => (a, b) => {
  if (a.key === "Unknown") return 1;
  if (b.key === "Unknown") return -1;
  return cmp(a, b);
};

/**
 * The shelf as bays: [{ key, label, books, pages }]. A bay with a null label
 * has no divider — "Thickness" and "A–Z" are one unbroken run.
 */
export const arrangeShelf = (books, by = "year") => {
  const list = books ?? [];
  switch (by) {
    case "subject":
      return group(list, (b) => b.category, unknownLast((a, b) => b.books.length - a.books.length
        || a.key.localeCompare(b.key)), newestFirst);
    case "language":
      return group(list, (b) => b.language, unknownLast((a, b) => b.books.length - a.books.length
        || a.key.localeCompare(b.key)), newestFirst);
    case "published":
      return group(
        list,
        (b) => decadeOf(b.first_published),
        unknownLast((a, b) => a.key.localeCompare(b.key)),
        (a, b) => (a.first_published ?? 0) - (b.first_published ?? 0) || byTitle(a, b),
      );
    case "thickness":
      return [{
        key: "all",
        label: null,
        books: [...list].sort((a, b) => (a.page_count ?? SPINE.unknownPages) - (b.page_count ?? SPINE.unknownPages)
          || byTitle(a, b)),
        pages: pagesOf(list),
      }];
    case "title":
      return [{
        key: "all", label: null, books: [...list].sort(byTitle), pages: pagesOf(list),
      }];
    case "year":
    default:
      return group(list, (b) => bookYear(b), unknownLast((a, b) => b.key.localeCompare(a.key)), newestFirst);
  }
};

// A paperback runs about 0.065 mm a page (300 pages ≈ 2 cm). Good enough to
// say how tall the pile would be; the page says "about".
export const CM_PER_PAGE = 0.0065;

/** Years between a book being written and being read; null when unknown. */
export const waitOf = (book) => {
  const read = Number(bookYear(book));
  const written = Number(book?.first_published);
  if (!read || !written) return null;
  return Math.max(0, read - written);
};

const maxBy = (list, valueOf) => list.reduce((best, b) => {
  const v = valueOf(b);
  if (v === null || v === undefined) return best;
  return !best || v > valueOf(best) ? b : best;
}, null);

/** The numbers the page states. A value that cannot be known is null, never 0. */
export const libraryFacts = (books) => {
  const list = books ?? [];
  const withPages = list.filter((b) => b.page_count);
  const pages = pagesOf(withPages);
  const waits = list.map(waitOf).filter((w) => w !== null).sort((a, b) => a - b);
  const years = list.map((b) => Number(bookYear(b))).filter(Boolean);
  const marathi = list.filter(isMarathi).length;

  const perYear = new Map();
  list.forEach((b) => {
    const y = bookYear(b);
    if (y) perYear.set(y, (perYear.get(y) ?? 0) + 1);
  });
  const busiest = [...perYear.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0];

  return {
    total: list.length,
    pages: pages || null,
    pagesKnown: withPages.length,
    stackCm: pages ? Math.round(pages * CM_PER_PAGE) : null,
    marathi: marathi || null,
    english: list.length - marathi || null,
    reviewed: list.filter((b) => b.blog_link).length || null,
    quoted: list.filter((b) => b.quote).length || null,
    translated: list.filter((b) => b.translator).length || null,
    firstYear: years.length ? Math.min(...years) : null,
    lastYear: years.length ? Math.max(...years) : null,
    busiestYear: busiest ? { year: busiest[0], count: busiest[1] } : null,
    medianWait: waits.length ? waits[Math.floor(waits.length / 2)] : null,
    sameYear: waits.filter((w) => w === 0).length || null,
    thickest: maxBy(withPages, (b) => b.page_count),
    slimmest: maxBy(withPages, (b) => -b.page_count),
    oldest: maxBy(list.filter((b) => b.first_published), (b) => -b.first_published),
    longestWait: maxBy(list, waitOf),
    latest: [...list].sort(newestFirst)[0] ?? null,
  };
};

/** "1.2 m" above a metre, "84 cm" below. */
export const formatStack = (cm) => {
  if (!cm) return null;
  return cm >= 100 ? `${(cm / 100).toFixed(1)} m` : `${cm} cm`;
};

/** Per reading year, oldest first: the books (in reading order) and their pages. */
export const pilesByYear = (books) => group(
  (books ?? []).filter((b) => bookYear(b)),
  (b) => bookYear(b),
  (a, b) => a.key.localeCompare(b.key),
  (a, b) => time(a) - time(b),
);

/** A seeded pick, so "pull one at random" is testable. */
export const pickBook = (books, seed, exceptId = null) => {
  const pool = (books ?? []).filter((b) => b.id !== exceptId);
  if (!pool.length) return books?.[0] ?? null;
  return pool[Math.abs(Math.floor(seed)) % pool.length];
};

// WCAG relative luminance, for the cloth/ink contrast test.
const channel = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
