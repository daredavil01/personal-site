import {
  deckSummary, enrichDecks, lengthOf, readMinutes, slideCount, wordNumber,
} from "./deckStats";
import { filterDecks } from "./deckFilters";

describe("slideCount", () => {
  it.each([
    ["A 12-slide deck on E20.", 12],
    ["Sixty-two illustrated slides on the website.", 62],
    ["Twenty-two illustrated, narrated slides on how /training was built.", 22],
    ["A six-panel introduction to RunFolio.", 6],
    ["A 30 slide tour.", 30],
    ["Thirty interactive slides on how Claude Code built it.", 30],
    ["Learning Hub: Sixty days, tracked in public.", null],
    ["A deck on digital wellbeing.", null],
    ["", null],
  ])("%s → %s", (text, n) => expect(slideCount(text)).toBe(n));

  it("reads number words", () => {
    expect(wordNumber("thirty-nine")).toBe(39);
    expect(wordNumber("12")).toBe(12);
    expect(wordNumber("the")).toBeNull();
  });
});

describe("deck stats", () => {
  const decks = enrichDecks([
    { id: 1, title: "A", date: null, description: "Notes." },
    { id: 2, title: "B", date: "2026-09-11", description: "A 12-slide deck.", tags: ["AI", "data"] },
    { id: 3, title: "C", date: "2026-09-14", description: "Thirty-nine illustrated slides.", tags: ["ai"] },
    { id: 4, title: "D", date: "2026-11-03", description: "Twenty-two slides.", tags: ["running"] },
  ]);

  it("buckets lengths and estimates minutes", () => {
    expect(lengthOf(12)).toBe("short");
    expect(lengthOf(22)).toBe("medium");
    expect(lengthOf(39)).toBe("long");
    expect(lengthOf(null)).toBeNull();
    expect(readMinutes(12)).toBe(5);
    expect(readMinutes(null)).toBeNull();
  });

  it("summarises and says how many decks were counted", () => {
    const s = deckSummary(decks, new Date(2026, 10, 4));
    expect(s.slides).toBe(73);
    expect(s.counted).toBe(3);
    expect(s.biggest.id).toBe(3);
    expect(s.undated).toBe(1);
    expect(s.topTags[0]).toEqual({ name: "ai", count: 2 });
    expect(s.months.map((m) => [m.key, m.count])).toEqual([["2026-09", 2], ["2026-10", 0], ["2026-11", 1]]);
    expect(s.medianGap).toBe(50);
    expect(s.daysSinceLast).toBe(1);
    expect(deckSummary([])).toBeNull();
  });

  it("filters by length and sorts by slides with uncounted decks last", () => {
    expect(filterDecks(decks, { length: "long" }).map((d) => d.id)).toEqual([3]);
    expect(filterDecks(decks, { sort: "slides", dir: "asc" }).map((d) => d.id)).toEqual([2, 4, 3, 1]);
    expect(filterDecks(decks, { sort: "slides", dir: "desc" }).map((d) => d.id)).toEqual([3, 4, 2, 1]);
  });
});
