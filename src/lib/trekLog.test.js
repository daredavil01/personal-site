import {
  enrichTreks, filterTreks, parseTrekDay, parseTrekHours, placeKey, placesOf, returnVisits,
  seasonOf, trekFacets, trekSummary, formatTrekHours,
} from "./trekLog";

const ROWS = [
  { id: 1, fort_name: "Tikona", date: "17-02-2019", trek_time: "1 Hrs", endurance_level: "Easy", slideImages: ["a", "b"] },
  { id: 2, fort_name: "Panhala", date: "25-06-2019", trek_time: "0.5 Hrs", endurance_level: "Easy" },
  { id: 3, fort_name: "Katraj To Sinhgad", date: "30-12-2023", trek_time: "6 Hrs", endurance_level: "Hard", blog_link: "https://x" },
  { id: 4, fort_name: "Sinhagad", date: "07-09-2024", trek_time: "2 hrs", endurance_level: "Medium" },
  { id: 5, fort_name: "Panhala to Pawankhind", date: "02-08-2025", trek_time: "22 Hours", endurance_level: "Hard", blog_link: "https://y" },
  { id: 6, fort_name: "Dhak_Bahiri", date: "bad", trek_time: "?", endurance_level: "" },
];
const TODAY = new Date(2026, 10, 4);

describe("parsing", () => {
  it("reads dates and durations", () => {
    expect(parseTrekDay("07-09-2024")).toEqual(new Date(2024, 8, 7));
    expect(parseTrekDay("2024-09-07")).toBeNull();
    expect(parseTrekHours("0.5 Hrs")).toBe(0.5);
    expect(parseTrekHours("22 Hours")).toBe(22);
    expect(parseTrekHours("45 min")).toBe(0.75);
    expect(parseTrekHours("?")).toBeNull();
    expect(formatTrekHours(0.5)).toBe("30 min");
    expect(formatTrekHours(1.5)).toBe("1.5 h");
  });

  it("knows the Sahyadri seasons", () => {
    expect(seasonOf(6)).toBe("monsoon");
    expect(seasonOf(0)).toBe("winter");
    expect(seasonOf(3)).toBe("summer");
    expect(seasonOf(null)).toBeNull();
  });

  it("splits traverses and forgives spelling", () => {
    expect(placesOf("Katraj To Sinhgad").map((p) => p.label)).toEqual(["Katraj", "Sinhgad"]);
    expect(placeKey("Sinhgad")).toBe(placeKey("Sinhagad"));
    expect(placeKey("Ghangad Fort")).toBe(placeKey("Ghangad"));
    expect(placeKey("Panhala")).not.toBe(placeKey("Pawankhind"));
  });
});

describe("enrichTreks and stats", () => {
  const treks = enrichTreks(ROWS);
  const by = Object.fromEntries(treks.map((t) => [t.id, t]));

  it("numbers treks in order and spots first visits", () => {
    expect(treks.map((t) => t.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(by[6].title).toBe("Dhak Bahiri");
    expect(by[4].newPlaces).toBe(0);
    expect(by[5].newPlaces).toBe(1);
    expect(by[1].photos).toBe(2);
  });

  it("groups return visits under the plain name", () => {
    const groups = returnVisits(treks);
    expect(groups.map((g) => g.label).sort()).toEqual(["Panhala", "Sinhagad"]);
  });

  it("summarises", () => {
    const s = trekSummary(treks, TODAY);
    expect(s.count).toBe(6);
    expect(s.hours).toBe(31.5);
    expect(s.places).toBe(6);
    expect(s.longest.id).toBe(5);
    expect(s.hard).toBe(2);
    expect(s.withStory).toBe(2);
    expect(s.topSeason.id).toBe("monsoon"); // Jun, Sep, Aug
    expect(s.longestGap.from.id).toBe(2);
    expect(trekSummary([])).toBeNull();
  });

  it("facets and filters", () => {
    const f = trekFacets(treks);
    expect(f.levels.map((l) => l.name)).toEqual(["Easy", "Medium", "Hard"]);
    expect(filterTreks(treks, { level: "Hard" }).map((t) => t.id)).toEqual([5, 3]);
    expect(filterTreks(treks, { season: "monsoon" }).map((t) => t.id)).toEqual([5, 4, 2]);
    expect(filterTreks(treks, { q: "sinh" }).length).toBe(2);
    const byHours = filterTreks(treks, { sort: "hours", dir: "asc" });
    expect(byHours[0].id).toBe(2);
    expect(byHours[byHours.length - 1].id).toBe(6);
  });
});
