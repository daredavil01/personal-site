import { deckFacets, filterDecks, UNDATED } from "./deckFilters";

const decks = [
  { id: 1, title: "Ask the Archive", date: "2026-09-14", tags: ["ai", "data"], description: "" },
  { id: 2, title: "Projects, Reborn", date: "2026-09-11", tags: ["claude code"], description: "A redesign" },
  { id: 3, title: "E20 ka Chakravyuha", date: null, tags: [], description: "Ethanol blending" },
  { id: 4, title: "Old Talk", date: "2025-03-01", tags: ["AI"], description: "" },
];
const ids = (rows) => rows.map((d) => d.id);

describe("deckFilters", () => {
  it("sorts newest first by default and sinks undated decks either way", () => {
    expect(ids(filterDecks(decks))).toEqual([1, 2, 4, 3]);
    expect(ids(filterDecks(decks, { dir: "asc" }))).toEqual([4, 2, 1, 3]);
  });

  it("sorts by title", () => {
    expect(ids(filterDecks(decks, { sort: "title", dir: "asc" }))).toEqual([1, 3, 4, 2]);
  });

  it("combines picked tags with OR, case-insensitively", () => {
    expect(ids(filterDecks(decks, { tags: ["ai"] }))).toEqual([1, 4]);
    expect(ids(filterDecks(decks, { tags: ["data", "claude code"] }))).toEqual([1, 2]);
  });

  it("filters by year, including the undated bucket", () => {
    expect(ids(filterDecks(decks, { year: "2025" }))).toEqual([4]);
    expect(ids(filterDecks(decks, { year: UNDATED }))).toEqual([3]);
  });

  it("searches title, description and tags, and narrows the tag filter", () => {
    expect(ids(filterDecks(decks, { q: "ethanol" }))).toEqual([3]);
    expect(ids(filterDecks(decks, { q: "claude" }))).toEqual([2]);
    expect(ids(filterDecks(decks, { q: "old", tags: ["ai"] }))).toEqual([4]);
  });

  it("builds facets with undated last and tags merged by case", () => {
    const f = deckFacets(decks);
    expect(f.years.map((y) => y.name)).toEqual(["2026", "2025", UNDATED]);
    expect(f.tags[0]).toEqual({ name: "ai", count: 2 });
  });
});
