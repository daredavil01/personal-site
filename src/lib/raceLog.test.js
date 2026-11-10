import {
  cityOf, distanceKey, enrichRaces, filterRaces, formatDelta, formatDuration, formatPace,
  parseDuration, parseRaceDate, personalBests, raceSummary, repeatEvents, riegel, seriesKey,
} from "./raceLog";

const ROWS = [
  { id: 1, title: "NDA Marathon 2023", date: "October 15, 2023", place: "NDA, Pune", distance: "10 Kms", time: "01:26:40" },
  { id: 2, title: "Pune City Marathon 2024", date: "March 3, 2024", place: "Pune", distance: "21 Kms", time: "02:45:52" },
  { id: 3, title: "Satara Half Hill Marathon 2024", date: "September 01, 2024", place: "Satara", distance: "21 Kms", time: "02:43:09" },
  { id: 4, title: "Satara Hill Half Marathon 2025", date: "September 14, 2025", place: "Satara", distance: "21 Kms", time: "2:06:55" },
  { id: 5, title: "Neerathon 2026", date: "February 15, 2026", place: "Pune, India", distance: "10 Kms", time: "00:55:28" },
  { id: 6, title: "Satara Hill Half Marathon 2026", date: "September 6, 2026", place: "Satara", distance: "21 Kms", time: "02:20:00" },
  { id: 7, title: "Mystery run", date: "", place: "", distance: "", time: "" },
];
const TODAY = new Date(2026, 10, 4);

describe("parsing", () => {
  it("reads the admin's date, distance and time formats", () => {
    expect(parseRaceDate("February 02, 2025")).toEqual(new Date(2025, 1, 2));
    expect(parseRaceDate("September 6, 2026")).toEqual(new Date(2026, 8, 6));
    expect(parseRaceDate("nonsense")).toBeNull();
    expect(distanceKey("21 Kms")).toBe(21);
    expect(distanceKey("")).toBeNull();
    expect(parseDuration("2:17:13")).toBe(8233);
    expect(parseDuration("55:28")).toBe(3328);
    expect(parseDuration("00:00:00")).toBeNull();
    expect(parseDuration("x")).toBeNull();
  });

  it("formats durations, deltas and pace", () => {
    expect(formatDuration(8233)).toBe("2:17:13");
    expect(formatDuration(3328)).toBe("55:28");
    expect(formatDelta(65)).toBe("+1:05");
    expect(formatDelta(-65)).toBe("−1:05");
    expect(formatPace(391)).toBe("6:31");
  });

  it("names the city and the series", () => {
    expect(cityOf("MILIT, Pune")).toBe("Pune");
    expect(cityOf("Pune, India")).toBe("Pune");
    expect(cityOf("")).toBeNull();
    expect(seriesKey("Satara Half Hill Marathon 2024")).toBe(seriesKey("Satara Hill Half Marathon 2026"));
    expect(seriesKey("Vrukshathon 2024")).not.toBe(seriesKey("NMDC Hyderabad Marathon 2024"));
  });
});

describe("enrichRaces", () => {
  const races = enrichRaces(ROWS);

  it("orders by date and sinks undated rows", () => {
    expect(races.map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("uses the real course length for a half", () => {
    expect(races.find((r) => r.id === 4).km).toBeCloseTo(21.0975);
  });

  it("marks PBs as they happened and the standing best", () => {
    const by = Object.fromEntries(races.map((r) => [r.id, r]));
    expect(by[2].wasPB && by[2].firstAtDistance).toBe(true);
    expect(by[3].wasPB).toBe(true);
    expect(by[3].improvedBy).toBe(163);
    expect(by[4].isBest).toBe(true);
    expect(by[6].wasPB).toBe(false);
    expect(by[6].gapToBest).toBe(8400 - 7615);
    expect(by[7].wasPB).toBeUndefined();
  });
});

describe("derived stats", () => {
  const races = enrichRaces(ROWS);

  it("summarises without inventing zeros", () => {
    const s = raceSummary(races, TODAY);
    expect(s.count).toBe(7);
    expect(s.daysSinceLast).toBe(59);
    expect(s.longest.distKey).toBe(21);
    expect(s.fastest.id).toBe(5);
    expect(s.pbCount).toBe(3); // 3 and 4 at 21K, 5 at 10K
    expect(s.cities.slice(0, 2).map(([, n]) => n)).toEqual([3, 3]); // Pune and Satara tie
    expect(raceSummary([])).toBeNull();
  });

  it("builds a PB ladder per distance", () => {
    const [ten, half] = personalBests(races, TODAY);
    expect(ten.best.id).toBe(5);
    expect(ten.gainedSecs).toBe(5200 - 3328);
    expect(half.history.map((r) => r.id)).toEqual([2, 3, 4]);
    expect(half.count).toBe(4);
  });

  it("finds an event run in several years", () => {
    const [satara] = repeatEvents(races);
    expect(satara.runs.map((r) => r.id)).toEqual([3, 4, 6]);
    expect(satara.best.id).toBe(4);
    expect(satara.change).toBe(8400 - 9789);
  });

  it("filters and sorts with missing values last", () => {
    expect(filterRaces(races, { year: "2024" }).map((r) => r.id)).toEqual([3, 2]);
    expect(filterRaces(races, { dist: "10", sort: "time", dir: "asc" }).map((r) => r.id)).toEqual([5, 1]);
    expect(filterRaces(races, { q: "satara", sort: "pace", dir: "desc" })[0].id).toBe(3);
    const byTime = filterRaces(races, { sort: "time", dir: "desc" });
    expect(byTime[byTime.length - 1].id).toBe(7);
  });

  it("applies Riegel's formula", () => {
    expect(riegel(3600, 10, 10)).toBe(3600);
    expect(Math.round(riegel(3600, 10, 20))).toBe(Math.round(3600 * 2 ** 1.06));
    expect(riegel(null, 10, 20)).toBeNull();
  });
});

describe("raceStanding", () => {
  // eslint-disable-next-line global-require
  const { enrichRaces: enrich, ordinal, raceIso, raceStanding } = require("./raceLog");
  const races = enrich([
    { id: 1, title: "Hill Half 2024", date: "March 3, 2024", distance: "21 Kms", time: "2:40:00" },
    { id: 2, title: "City 10K 2024", date: "April 7, 2024", distance: "10 Kms", time: "1:00:00" },
    { id: 3, title: "Lake Half 2025", date: "February 2, 2025", distance: "21 Kms", time: "2:10:00" },
    { id: 4, title: "Hill Half 2025", date: "March 2, 2025", distance: "21 Kms", time: "2:20:00" },
  ]);

  it("ranks a race at its distance and finds the attempt before it", () => {
    const s = raceStanding(races[3], races);
    expect(s.rank).toBe(2);
    expect(s.field.map((r) => r.id)).toEqual([3, 4, 1]);
    expect(s.sameEvent.id).toBe(1);
    expect(s.sameEventDelta).toBe(-1200);
    expect(s.previous.id).toBe(3);
    expect(s.previousDelta).toBe(600);
    expect(s.older.id).toBe(3);
    expect(s.newer).toBeNull();
    expect(s.ordinal).toBe(4);
  });

  it("returns null for a race that is not in the log, and formats ordinals and dates", () => {
    expect(raceStanding({ id: 99 }, races)).toBeNull();
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
    expect(raceIso(races[0])).toBe("2024-03-03");
  });
});
