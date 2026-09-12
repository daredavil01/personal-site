import React from "react";
import PropTypes from "prop-types";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import useBookFilters from "../../components/Books/useBookFilters";

const BOOKS = [
  {
    id: 1, title: "Sapiens", author: "Yuval Noah Harari", category: "History", language: "English", year: 2021, rating: 5, status: "read", date_finished: "2021-04-15", date_precision: "year", page_count: 443, tags: ["history"], blog_link: "https://example.com/sapiens",
  },
  {
    id: 2, title: "हिंदू", author: "भालचंद्र नेमाडे", category: "Fiction", language: "Marathi", year: 2025, rating: 4, status: "read", date_finished: "2025-02-15", date_precision: "year", page_count: null, tags: ["religion"], blog_link: null,
  },
  {
    id: 3, title: "Animal Farm", author: "George Orwell", category: "Fiction", language: "English", year: 2021, rating: 3, status: "read", date_finished: "2021-09-15", date_precision: "year", page_count: 112, tags: ["philosophy"], blog_link: null,
  },
  {
    id: 4, title: "पट्यारा", author: "संतोष नागो शिंदे", category: "Biography & Memoir", language: "Marathi", year: 2026, rating: 4, status: "reading", date_finished: null, date_precision: "year", page_count: null, tags: [], blog_link: null,
  },
];

// The hook is the only place the four views agree on what "filtered" means, so
// the matrix is tested directly rather than through any one view.
let api;
const Probe = ({ books }) => {
  api = useBookFilters(books);
  return <div data-testid="ids">{api.filtered.map((b) => b.id).join(",")}</div>;
};
Probe.propTypes = { books: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

const setup = (books = BOOKS, initialEntries = ["/books"]) => {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Probe books={books} />
    </MemoryRouter>,
  );
};

const ids = () => screen.getByTestId("ids").textContent;
const run = (fn) => act(() => { fn(); });

describe("useBookFilters", () => {
  // A row with no date_finished still has a read year, so it sorts by that
  // rather than sinking — only a book with neither falls to the bottom.
  it("defaults to newest-read first, falling back to the read year", () => {
    setup();
    expect(ids()).toBe("4,2,3,1");
  });

  // The reason the page unions instead of intersecting: Marathi AND Fiction is
  // one book, Marathi OR Fiction is four, and the second is what browsing a
  // shelf should feel like.
  it("unions the facet axes instead of intersecting them", () => {
    setup();
    run(() => api.setFilter("language", "Marathi"));
    expect(ids()).toBe("4,2");

    run(() => api.setFilter("category", "Fiction"));
    // Marathi (2, 4) ∪ Fiction (2, 3) — not the single book that is both.
    expect(ids()).toBe("4,2,3");
  });

  it("still narrows with the search box while the axes widen", () => {
    setup();
    run(() => api.setFilter("category", "Fiction"));
    run(() => api.setFilter("language", "Marathi"));
    run(() => api.setFilter("q", "orwell"));
    // q intersects the union rather than adding to it.
    expect(ids()).toBe("3");
  });

  it("ORs within the tags axis", () => {
    setup();
    run(() => api.toggleFilter("tags", "religion"));
    run(() => api.toggleFilter("tags", "philosophy"));
    expect(ids()).toBe("2,3");
  });

  it("treats rating as a floor", () => {
    setup();
    run(() => api.setFilter("rating", "4"));
    expect(ids()).toBe("4,2,1");
  });

  it("sinks unknown page counts in both sort directions", () => {
    setup();
    run(() => api.setFilter("sort", "pages"));
    expect(ids()).toBe("1,3,2,4");
    run(() => api.setFilter("dir", "asc"));
    expect(ids()).toBe("3,1,2,4");
  });

  it("keeps sort and dir when the filters are cleared", () => {
    setup();
    run(() => api.setFilter("sort", "title"));
    run(() => api.setFilter("category", "Fiction"));
    run(() => api.clearFilters());
    expect(api.filters.sort).toBe("title");
    expect(api.filters.category).toBe("");
    expect(api.hasFilters).toBe(false);
  });

  it("reads its whole state out of the URL", () => {
    setup(BOOKS, ["/books?language=Marathi&sort=title&dir=asc&tags=religion"]);
    expect(api.filters.language).toBe("Marathi");
    expect(api.filters.tags).toEqual(["religion"]);
    expect(api.filters.sort).toBe("title");
    // Marathi (2, 4) ∪ religion (2), by title ascending.
    expect(ids()).toBe("4,2");
  });
});
