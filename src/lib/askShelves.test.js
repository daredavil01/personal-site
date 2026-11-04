import {
  buildShelves, categoryLabel, categoryOf, shelfLabel, shelfQuestions, shelfTotal, surpriseQuestion,
} from "./askShelves";

const SHELVES = {
  index: {
    microblog: 1677, book: 52, trek: 20, site: 27, page: 1, tag: 132, changelog: 120, resume: 22, bogus: "x",
  },
  newest: {
    book: [{ t: "Patyara", u: "/books/50" }, { t: "Tsubaki", u: "/books/51" }],
    trek: [{ t: "Rajgad", u: "/treks/1" }],
  },
};

const POOL = [
  { q: "Which genre does he read most?", c: "reading" },
  { q: "Longest trek?", c: "treks" },
  { q: "What does he build?", c: "work" },
  { q: "  ", c: "work" },
  null,
];

describe("buildShelves", () => {
  it("drops scaffolding kinds and non-numbers, largest first", () => {
    const list = buildShelves(SHELVES, POOL);
    expect(list.map((s) => s.type)).toEqual(["microblog", "book", "resume", "trek"]);
  });

  it("shares add up to one over the shown shelves", () => {
    const list = buildShelves(SHELVES, POOL);
    const sum = list.reduce((a, s) => a + s.share, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(shelfTotal(list)).toBe(1677 + 52 + 22 + 20);
  });

  it("is empty when the endpoint sent nothing", () => {
    expect(buildShelves(null, POOL)).toEqual([]);
    expect(buildShelves({}, POOL)).toEqual([]);
  });

  it("carries the newest title", () => {
    const book = buildShelves(SHELVES, POOL).find((s) => s.type === "book");
    expect(book.newest).toBe("Patyara");
    expect(book.label).toBe("Books");
  });
});

describe("shelfQuestions", () => {
  it("titles first, then the pool category, capped", () => {
    expect(shelfQuestions("book", SHELVES, POOL)).toEqual([
      "What is Patyara about?",
      "What is Tsubaki about?",
      "Which genre does he read most?",
    ]);
    expect(shelfQuestions("book", SHELVES, POOL, 1)).toHaveLength(1);
  });

  it("a kind with no roster and no category offers nothing", () => {
    expect(shelfQuestions("stats", SHELVES, POOL)).toEqual([]);
  });
});

describe("labels and lookups", () => {
  it("names kinds and categories", () => {
    expect(shelfLabel("microblog")).toBe("Micro posts");
    expect(shelfLabel("reading_list")).toBe("Reading list");
    expect(categoryLabel("site")).toBe("This site");
    expect(categoryLabel(null)).toBe("Ask");
    expect(categoryLabel("travel")).toBe("Travel");
  });

  it("finds a starter's category", () => {
    expect(categoryOf("Longest trek?", POOL)).toBe("treks");
    expect(categoryOf("Unknown?", POOL)).toBeNull();
  });
});

describe("surpriseQuestion", () => {
  it("never repeats an asked question, case-insensitively", () => {
    const q = surpriseQuestion(POOL, ["longest trek?", "What does he build?"], () => 0);
    expect(q).toBe("Which genre does he read most?");
  });

  it("is null when the pool is spent", () => {
    expect(surpriseQuestion(POOL, POOL.filter(Boolean).map((p) => p.q))).toBeNull();
  });
});
