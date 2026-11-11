import {
  ARRANGEMENTS, CLOTH, SPINE, SPINE_INK, arrangeShelf, contrast, formatStack,
  libraryFacts, pickBook, pilesByYear, spineOf, spineWidth, waitOf,
} from "./bookShelf";
import { BOOK_CATEGORIES } from "./api/books";

jest.mock("./supabaseClient", () => ({ toStorageUrl: (v) => v, supabase: {} }));

const BOOKS = [
  {
    id: 1, title: "Sapiens", category: "History", language: "English", year: 2021, date_finished: "2021-04-15", page_count: 443, first_published: 2011, blog_link: "https://example.com", quote: "A line.",
  },
  {
    id: 2, title: "हिंदू", category: "Fiction", language: "Marathi", year: 2025, date_finished: "2025-02-15", page_count: 604, first_published: 2010,
  },
  {
    id: 3, title: "Animal Farm", category: "Fiction", language: "English", year: 2021, date_finished: "2021-09-15", page_count: 112, first_published: 1945,
  },
  {
    id: 4, title: "पट्यारा", category: "Biography & Memoir", language: "Marathi", year: 2026, date_finished: "2026-03-01", first_published: 2026,
  },
];

describe("spines", () => {
  it("has a cloth for every category Postgres accepts, legible under the ink", () => {
    BOOK_CATEGORIES.forEach((c) => {
      expect(CLOTH[c]).toBeDefined();
      expect(contrast(CLOTH[c], SPINE_INK)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("is as wide as the book is long, within the floor and ceiling", () => {
    expect(spineWidth(72)).toBe(SPINE.minW);
    expect(spineWidth(2000)).toBe(SPINE.maxW);
    expect(spineWidth(443)).toBeGreaterThan(spineWidth(112));
    // An unknown length is drawn as an ordinary book, not as the thinnest.
    expect(spineWidth(null)).toBe(spineWidth(SPINE.unknownPages));
  });

  it("draws the same spine for the same row every time", () => {
    expect(spineOf(BOOKS[0])).toEqual(spineOf({ ...BOOKS[0] }));
    const s = spineOf(BOOKS[0]);
    expect(s.h).toBeGreaterThanOrEqual(SPINE.minH);
    expect(s.h).toBeLessThanOrEqual(SPINE.maxH);
    expect(s).toMatchObject({ reviewed: true, quoted: true, marathi: false });
    expect(spineOf(BOOKS[1]).marathi).toBe(true);
  });
});

describe("arrangeShelf", () => {
  const ids = (bays) => bays.flatMap((b) => b.books.map((x) => x.id));

  it("keeps every book in every arrangement", () => {
    ARRANGEMENTS.forEach(({ id }) => {
      expect(ids(arrangeShelf(BOOKS, id)).sort()).toEqual([1, 2, 3, 4]);
    });
  });

  it("shelves by reading year, newest first", () => {
    const bays = arrangeShelf(BOOKS, "year");
    expect(bays.map((b) => b.key)).toEqual(["2026", "2025", "2021"]);
    expect(bays[2].books.map((b) => b.id)).toEqual([3, 1]);
    expect(bays[2].pages).toBe(555);
  });

  it("puts the biggest subject first and the oldest decade first", () => {
    expect(arrangeShelf(BOOKS, "subject")[0].key).toBe("Fiction");
    expect(arrangeShelf(BOOKS, "published").map((b) => b.key)).toEqual(["1940s", "2010s", "2020s"]);
  });

  it("runs thickness and A–Z as one bay with no divider", () => {
    const [bay] = arrangeShelf(BOOKS, "thickness");
    expect(bay.label).toBeNull();
    expect(bay.books[0].id).toBe(3);
    expect(bay.books[3].id).toBe(2);
    expect(arrangeShelf(BOOKS, "title")).toHaveLength(1);
  });
});

describe("libraryFacts", () => {
  it("counts what it can and leaves the rest null", () => {
    const f = libraryFacts(BOOKS);
    expect(f).toMatchObject({
      total: 4, pages: 1159, pagesKnown: 3, marathi: 2, english: 2, reviewed: 1, firstYear: 2021, lastYear: 2026,
    });
    expect(f.thickest.id).toBe(2);
    expect(f.slimmest.id).toBe(3);
    expect(f.oldest.id).toBe(3);
    expect(f.longestWait.id).toBe(3);
    expect(f.latest.id).toBe(4);
    expect(f.busiestYear).toEqual({ year: "2021", count: 2 });
    expect(f.sameYear).toBe(1);

    const empty = libraryFacts([]);
    expect(empty.pages).toBeNull();
    expect(empty.stackCm).toBeNull();
    expect(empty.latest).toBeNull();
  });

  it("measures the wait between written and read", () => {
    expect(waitOf(BOOKS[2])).toBe(76);
    expect(waitOf(BOOKS[3])).toBe(0);
    expect(waitOf({ year: 2024 })).toBeNull();
  });

  it("formats the pile", () => {
    expect(formatStack(84)).toBe("84 cm");
    expect(formatStack(123)).toBe("1.2 m");
    expect(formatStack(null)).toBeNull();
  });
});

describe("piles and picks", () => {
  it("piles by year, oldest first, in reading order", () => {
    const piles = pilesByYear(BOOKS);
    expect(piles.map((p) => p.key)).toEqual(["2021", "2025", "2026"]);
    expect(piles[0].books.map((b) => b.id)).toEqual([1, 3]);
  });

  it("never hands back the book already open", () => {
    for (let seed = 0; seed < 8; seed += 1) expect(pickBook(BOOKS, seed, 2).id).not.toBe(2);
    expect(pickBook([], 3)).toBeNull();
  });
});
