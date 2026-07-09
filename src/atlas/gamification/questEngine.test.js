import {
  distinctDaysWithin, progressOf, isComplete, evaluate,
} from "./questEngine";

const emptyWorld = () => ({
  visitedRegions: {}, actions: {}, eggs: {}, quests: {}, visitDays: [],
});

const DAY = new Date("2026-07-09T12:00:00"); // noon — not night
const NIGHT = new Date("2026-07-09T23:30:00"); // 23:30 — night window

const DEFS = [
  { id: "explorer", type: "explorer", target: 6 },
  { id: "collector_books", type: "collector", action: "book:open", target: 5 },
  { id: "egg_hunter", type: "eggs", target: 3 },
  { id: "nightowl", type: "nightowl", target: 1 },
  { id: "regular", type: "regular", target: 3 },
  { id: "completionist", type: "completionist" },
];

describe("distinctDaysWithin", () => {
  it("counts distinct days inside the window", () => {
    expect(distinctDaysWithin(["2026-07-01", "2026-07-03", "2026-07-06"], 7)).toBe(3);
  });

  it("excludes days outside any 7-day span", () => {
    expect(distinctDaysWithin(["2026-07-01", "2026-07-02", "2026-07-20"], 7)).toBe(2);
  });

  it("handles empty / malformed input", () => {
    expect(distinctDaysWithin([], 7)).toBe(0);
    expect(distinctDaysWithin(["nope"], 7)).toBe(0);
  });
});

describe("progressOf", () => {
  it("caps collector progress at the target", () => {
    const world = { ...emptyWorld(), actions: { "book:open": ["a", "b", "c", "d", "e", "f"] } };
    expect(progressOf({ type: "collector", action: "book:open", target: 5 }, world)).toEqual({ current: 5, target: 5 });
  });

  it("reports explorer progress from visited regions", () => {
    const world = { ...emptyWorld(), visitedRegions: { reader: "t", treks: "t" } };
    expect(progressOf({ type: "explorer", target: 6 }, world)).toEqual({ current: 2, target: 6 });
  });

  it("reports completionist as done-others / total-others", () => {
    const world = { ...emptyWorld(), quests: { explorer: { done: "t" } } };
    expect(progressOf({ type: "completionist" }, world, DEFS)).toEqual({ current: 1, target: 5 });
  });
});

describe("isComplete", () => {
  it("is true for a night-window clock, false at noon", () => {
    expect(isComplete({ type: "nightowl", target: 1 }, emptyWorld(), DEFS, NIGHT)).toBe(true);
    expect(isComplete({ type: "nightowl", target: 1 }, emptyWorld(), DEFS, DAY)).toBe(false);
  });

  it("needs the target count of eggs", () => {
    const two = { ...emptyWorld(), eggs: { a: "t", b: "t" } };
    const three = { ...emptyWorld(), eggs: { a: "t", b: "t", c: "t" } };
    expect(isComplete({ type: "eggs", target: 3 }, two, DEFS, DAY)).toBe(false);
    expect(isComplete({ type: "eggs", target: 3 }, three, DEFS, DAY)).toBe(true);
  });

  it("completionist requires every other quest done", () => {
    const done = {};
    DEFS.filter((q) => q.type !== "completionist").forEach((q) => { done[q.id] = { done: "t" }; });
    expect(isComplete({ type: "completionist" }, { ...emptyWorld(), quests: done }, DEFS, DAY)).toBe(true);
    expect(isComplete({ type: "completionist" }, emptyWorld(), DEFS, DAY)).toBe(false);
  });
});

describe("evaluate", () => {
  it("returns newly satisfied quests not already recorded", () => {
    const world = { ...emptyWorld(), actions: { "book:open": ["1", "2", "3", "4", "5"] } };
    const ids = evaluate(DEFS, world, DAY).map((q) => q.id);
    expect(ids).toContain("collector_books");
    expect(ids).not.toContain("explorer");
  });

  it("does not re-report a quest already done", () => {
    const world = {
      ...emptyWorld(),
      actions: { "book:open": ["1", "2", "3", "4", "5"] },
      quests: { collector_books: { done: "t" } },
    };
    expect(evaluate(DEFS, world, DAY).map((q) => q.id)).not.toContain("collector_books");
  });

  it("awards completionist in the same pass that finishes the last quest", () => {
    // Everything else already done; egg hunt finishes now → completionist too.
    const quests = {};
    DEFS.filter((q) => q.type !== "completionist" && q.type !== "eggs").forEach((q) => {
      quests[q.id] = { done: "t" };
    });
    const world = { ...emptyWorld(), eggs: { a: "t", b: "t", c: "t" }, quests };
    const ids = evaluate(DEFS, world, NIGHT).map((q) => q.id);
    expect(ids).toContain("egg_hunter");
    expect(ids).toContain("completionist");
  });
});
