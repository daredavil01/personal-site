import {
  filterActivities, heatmap, intensity, monthTotals, sportFamily, streaks, totals,
  totalsByFamily, totalsByMonth, totalsByYear, yearsOf,
} from "./training";

const row = (id, date, sport, distance, extra = {}) => ({
  id, date, startDate: `${date}T06:00:00Z`, name: `${sport} ${id}`, sport, distance, movingTime: distance / 3, elevationGain: 10, kudos: 1, tags: [], ...extra,
});

const ROWS = [
  row(1, "2025-12-31", "Run", 10000),
  row(2, "2026-01-01", "Run", 5000, { tags: ["Marathon"] }),
  row(3, "2026-01-02", "Ride", 30000),
  row(4, "2026-01-02", "TrailRun", 8000, { workoutType: 1 }),
  row(5, "2026-02-10", "Swim", 1500),
];

test("families", () => {
  expect(sportFamily("TrailRun")).toBe("run");
  expect(sportFamily("GravelRide")).toBe("ride");
  expect(sportFamily("Yoga")).toBe("other");
});

test("totals add up and tolerate gaps", () => {
  expect(totals(ROWS)).toMatchObject({ count: 5, distance: 54500, elevationGain: 50 });
  expect(totals([{ distance: null }])).toMatchObject({ count: 1, distance: 0 });
  expect(totals([])).toMatchObject({ count: 0, distance: 0 });
});

test("by year, family and month", () => {
  const years = totalsByYear(ROWS);
  expect(years.map((y) => y.year)).toEqual([2026, 2025]);
  expect(years[0].byFamily.run.count).toBe(2);
  expect(totalsByFamily(ROWS)[0]).toMatchObject({ family: "run", count: 3 });
  expect(monthTotals(ROWS, "2026-01")).toMatchObject({ count: 3, distance: 43000 });
  const months = totalsByMonth(ROWS);
  expect(months[0].month).toBe("2026-02");
  expect(months[1].longest.id).toBe(3);
  expect(yearsOf(ROWS)).toEqual([2026, 2025]);
});

test("heatmap lays out Monday-first weeks covering the year", () => {
  const h = heatmap(ROWS, 2026);
  // 1 Jan 2026 is a Thursday: three empty slots before it.
  expect(h.weeks[0].slice(0, 3)).toEqual([null, null, null]);
  expect(h.weeks[0][3]).toMatchObject({ date: "2026-01-01", distance: 5000, count: 1 });
  expect(h.weeks[0][4]).toMatchObject({ date: "2026-01-02", distance: 38000, count: 2 });
  const days = h.weeks.flat().filter(Boolean);
  expect(days).toHaveLength(365);
  expect(h.max).toBe(38000);
  expect(h.activeDays).toBe(3);
  expect(intensity(38000, h.max)).toBe(4);
  expect(intensity(5000, h.max)).toBe(1);
  expect(intensity(0, h.max)).toBe(0);
});

test("streaks", () => {
  expect(streaks(ROWS, "2026-02-11")).toEqual({ longest: 3, current: 1 });
  expect(streaks(ROWS, "2026-03-01").current).toBe(0);
  expect(streaks([])).toEqual({ longest: 0, current: 0 });
});

test("filters", () => {
  expect(filterActivities(ROWS, { sport: "run" }).map((r) => r.id)).toEqual([4, 2, 1]);
  expect(filterActivities(ROWS, { year: "2025" }).map((r) => r.id)).toEqual([1]);
  expect(filterActivities(ROWS, { tags: ["marathon"] }).map((r) => r.id)).toEqual([2]);
  expect(filterActivities(ROWS, { q: "ride" }).map((r) => r.id)).toEqual([3]);
  expect(filterActivities(ROWS, { races: true }).map((r) => r.id)).toEqual([4]);
  expect(filterActivities(ROWS, { sort: "distance" })[0].id).toBe(3);
});

describe("the /now Strava group", () => {
  // eslint-disable-next-line global-require
  const { stravaMonthStats } = require("./training");
  // eslint-disable-next-line global-require
  const { mergeMonthRecords } = require("./nowAutofill");

  test("bare numbers for the month, null when it is empty", () => {
    expect(stravaMonthStats(ROWS, "2026-01")).toEqual({
      activities: 3, km: 43, hours: 4, elevationMeters: 30, approximate: false,
    });
    expect(stravaMonthStats(ROWS, "2024-01")).toBeNull();
  });

  test("merged into a month, but a hand-typed group wins", () => {
    expect(mergeMonthRecords({ activities: ROWS }, "2026-01", {}).stats.strava.activities).toBe(3);
    const typed = { stats: { strava: { activities: 9, km: 1 } } };
    expect(mergeMonthRecords({ activities: ROWS }, "2026-01", typed).stats.strava.activities).toBe(9);
    expect(mergeMonthRecords({ activities: ROWS }, "2024-01", {}).stats).toBeUndefined();
  });
});
