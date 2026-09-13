import { computeSiteStats, microblogActivity, tagAnalysis } from "./siteStats";

describe("computeSiteStats", () => {
  const now = new Date(2026, 8, 13);

  it("computes endurance figures from mixed distance labels", () => {
    const s = computeSiteStats({
      now,
      sports: [
        { title: "Pune", distance: "42 Kms", time: "04:10:00", date: "December 1, 2025" },
        { title: "Mumbai", distance: "42 Kms", time: "03:59:30", date: "January 19, 2026" },
        { title: "Satara", distance: "21 Kms", time: "01:55:00", date: "September 7, 2026" },
      ],
    });
    expect(s.totalRaces).toBe(3);
    expect(s.totalKmRun).toBe(105);
    expect(s.pbMarathon.title).toBe("Mumbai");
    expect(s.bestMarathonTime).toBe("03:59");
    expect(s.racesPerYearSorted).toEqual([["2025", 1], ["2026", 2]]);
  });

  it("reads tags from client rows and Postgres rows alike, minus the challenge tag", () => {
    const s = computeSiteStats({
      now,
      blogs: [
        { blog_date: "2026-03-02", blog_platform: "Substack", tags: ["100_days_to_offload", "running"] },
        { blog_date: "2026-03-09", blog_platform: "Substack", tag_names: ["running", "books"] },
      ],
    });
    expect(s.topBlogTags).toEqual([["running", 2], ["books", 1]]);
    expect(s.blogMonthCounts[2]).toBe(2);
    expect(s.busiestMonthIndex).toBe(2);
  });

  it("never divides by an empty max", () => {
    const s = computeSiteStats({ now });
    expect(s.maxBooksInYear).toBe(1);
    expect(s.maxRacesInYear).toBe(1);
    expect(s.latestTrek).toBe("-");
  });

  it("counts presentations", () => {
    expect(computeSiteStats({ now }).presentationCount).toBe(0);
    expect(computeSiteStats({ now, presentations: [{ id: 1 }, { id: 2 }] }).presentationCount).toBe(2);
  });
});

it("microblogActivity finds the longest posting streak", () => {
  const a = microblogActivity(["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-10", "2021-05-01"]);
  expect(a.longestStreak).toBe(3);
  expect(a.perYear).toEqual([["2020", 4], ["2021", 1]]);
  expect(a.total).toBe(5);
});

it("tagAnalysis counts cross-content themes", () => {
  const t = tagAnalysis([
    { name: "running", total: 5, counts: { sport: 3, blog: 2 } },
    { name: "fort", total: 1, counts: { trek: 1 } },
    { name: "100_days_to_offload", total: 60, counts: { blog: 60 } },
  ]);
  expect(t.used.map((x) => x.name)).toEqual(["running", "fort"]);
  expect(t.bridges.map((x) => x.name)).toEqual(["running"]);
  expect(t.oncePercent).toBe(50);
});
