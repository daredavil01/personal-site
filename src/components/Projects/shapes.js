import PropTypes from "prop-types";

// Shared PropTypes for the projects views. Declared once rather than as
// PropTypes.object in eight files — the lint rule that forbids the loose type is
// right: these shapes are the contract between the api mapper and the views.

export const linkShape = PropTypes.shape({
  label: PropTypes.string,
  url: PropTypes.string,
});

export const slideShape = PropTypes.shape({
  url: PropTypes.string,
  caption: PropTypes.string,
});

export const projectShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  title: PropTypes.string,
  subtitle: PropTypes.string,
  desc: PropTypes.string,
  link: PropTypes.string,
  image: PropTypes.string,
  date: PropTypes.string,
  category: PropTypes.string,
  status: PropTypes.string,
  role: PropTypes.string,
  org: PropTypes.string,
  featured: PropTypes.bool,
  visible: PropTypes.bool,
  problem: PropTypes.string,
  solution: PropTypes.string,
  outcome: PropTypes.string,
  techStack: PropTypes.arrayOf(PropTypes.string),
  highlights: PropTypes.arrayOf(PropTypes.string),
  tags: PropTypes.arrayOf(PropTypes.string),
  links: PropTypes.arrayOf(linkShape),
  slideImages: PropTypes.arrayOf(slideShape),
});

/** One option in a filter facet, with how many projects carry it. */
export const facetEntryShape = PropTypes.shape({
  name: PropTypes.string,
  count: PropTypes.number,
});

export const facetsShape = PropTypes.shape({
  categories: PropTypes.arrayOf(facetEntryShape),
  statuses: PropTypes.arrayOf(facetEntryShape),
  tech: PropTypes.arrayOf(facetEntryShape),
  tags: PropTypes.arrayOf(facetEntryShape),
  years: PropTypes.arrayOf(PropTypes.string),
});

export const filtersShape = PropTypes.shape({
  q: PropTypes.string,
  category: PropTypes.string,
  status: PropTypes.string,
  year: PropTypes.string,
  tech: PropTypes.arrayOf(PropTypes.string),
  tags: PropTypes.arrayOf(PropTypes.string),
  sort: PropTypes.string,
  dir: PropTypes.string,
});
