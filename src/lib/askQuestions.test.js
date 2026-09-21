import { matchQuestions, pickQuestions, validPool } from "./askQuestions";

const pool = [
  { q: "books 1", c: "reading" }, { q: "books 2", c: "reading" },
  { q: "run 1", c: "running" }, { q: "run 2", c: "running" },
  { q: "trek 1", c: "treks" },
  { q: "write 1", c: "writing" },
  { q: "work 1", c: "work" },
  { q: "site 1", c: "site" },
];
const categoryOf = (q) => pool.find((p) => p.q === q).c;

describe("pickQuestions", () => {
  it("draws one question per category, never two from the same", () => {
    // Every draw, not one lucky one — the whole point of stratifying.
    for (let i = 0; i < 50; i += 1) {
      const picked = pickQuestions(pool, 4);
      expect(picked).toHaveLength(4);
      const cats = picked.map(categoryOf);
      expect(new Set(cats).size).toBe(4);
    }
  });

  it("still fills every chip when the pool has one category", () => {
    const single = [
      { q: "a", c: "reading" }, { q: "b", c: "reading" },
      { q: "c", c: "reading" }, { q: "d", c: "reading" },
    ];
    const picked = pickQuestions(single, 4);
    expect(picked).toHaveLength(4);
    expect(new Set(picked).size).toBe(4);
  });

  it("returns everything when the pool is smaller than the chip count", () => {
    expect(pickQuestions([{ q: "only", c: "site" }], 4)).toEqual(["only"]);
  });

  it("varies between draws", () => {
    const draws = new Set(
      Array.from({ length: 20 }, () => pickQuestions(pool, 4).join("|")),
    );
    expect(draws.size).toBeGreaterThan(1);
  });

  it("is deterministic when the randomness is", () => {
    const fixed = () => 0;
    expect(pickQuestions(pool, 4, fixed)).toEqual(pickQuestions(pool, 4, fixed));
  });

  it("falls back to nothing the caller can misread", () => {
    expect(pickQuestions([], 4)).toEqual([]);
    expect(pickQuestions(null, 4)).toEqual([]);
    expect(pickQuestions(pool, 0)).toEqual([]);
  });
});

describe("validPool", () => {
  it("drops entries an admin edit could leave behind", () => {
    expect(validPool([
      { q: "keep", c: "site" }, { q: "   ", c: "site" }, { c: "site" }, null, "nope",
    ])).toEqual([{ q: "keep", c: "site" }]);
  });
});

describe("matchQuestions", () => {
  const live = [
    { q: "How many marathons has he run?", c: "running" },
    { q: "What was his slowest marathon?", c: "running" },
    { q: "Which Marathi books has he read?", c: "reading" },
  ];

  it("matches a word anywhere in the question, not only the start", () => {
    expect(matchQuestions(live, "marathon")).toEqual([
      "How many marathons has he run?", "What was his slowest marathon?",
    ]);
  });

  it("requires every typed word", () => {
    expect(matchQuestions(live, "slowest marathon")).toEqual(["What was his slowest marathon?"]);
  });

  it("stays quiet until there is something to go on", () => {
    expect(matchQuestions(live, "ma")).toEqual([]);
    expect(matchQuestions(live, "   ")).toEqual([]);
  });

  it("drops the question already typed out in full", () => {
    expect(matchQuestions(live, "how many marathons has he run?")).toEqual([]);
  });

  it("returns nothing for an empty or malformed pool", () => {
    expect(matchQuestions(null, "marathon")).toEqual([]);
    expect(matchQuestions([{ c: "running" }], "marathon")).toEqual([]);
  });
});
