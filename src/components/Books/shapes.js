import PropTypes from "prop-types";

// Shared PropTypes for the books views — the contract between the api mapper in
// lib/api/books.js and the five components that render it. Declared once rather
// than as PropTypes.object in each file; the lint rule forbidding the loose type
// is right.

export const bookShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  title: PropTypes.string,
  author: PropTypes.string,
  translator: PropTypes.string,
  category: PropTypes.string,
  language: PropTypes.string,
  description: PropTypes.string,
  // The year it was READ. first_published is the book's own publication year.
  year: PropTypes.number,
  tags: PropTypes.arrayOf(PropTypes.string),
  blog_link: PropTypes.string,
  blog_platform: PropTypes.string,
  cover_url: PropTypes.string,
  isbn: PropTypes.string,
  page_count: PropTypes.number,
  publisher: PropTypes.string,
  first_published: PropTypes.number,
  rating: PropTypes.number,
  date_finished: PropTypes.string,
  date_precision: PropTypes.oneOf(["day", "year"]),
  status: PropTypes.string,
  format: PropTypes.string,
  goodreads_url: PropTypes.string,
  quote: PropTypes.string,
  note: PropTypes.string,
});

/** One option in a filter facet, with how many books carry it. */
export const facetEntryShape = PropTypes.shape({
  name: PropTypes.string,
  count: PropTypes.number,
});

export const facetsShape = PropTypes.shape({
  categories: PropTypes.arrayOf(facetEntryShape),
  languages: PropTypes.arrayOf(facetEntryShape),
  statuses: PropTypes.arrayOf(facetEntryShape),
  tags: PropTypes.arrayOf(facetEntryShape),
  years: PropTypes.arrayOf(PropTypes.string),
});

export const filtersShape = PropTypes.shape({
  q: PropTypes.string,
  category: PropTypes.string,
  language: PropTypes.string,
  status: PropTypes.string,
  year: PropTypes.string,
  rating: PropTypes.string,
  reviewed: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string),
  sort: PropTypes.string,
  dir: PropTypes.string,
});
