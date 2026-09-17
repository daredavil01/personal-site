// A stats payload for rendering cards offline.
//
// `npm run og:fallbacks` normally pulls the real snapshot from the live
// /api/stats so the committed cards carry true numbers. This stands in when
// that is unreachable, and it is what the Jest layout tests use, so a card is
// always exercised against plausible figures rather than empty ones.

export const STATS_FIXTURE = {
  version: 1,
  stats: {
    booksCount: 118,
    booksMarathi: 41,
    booksEnglish: 77,
    booksWithReviews: 23,
    topGenres: [{ name: "philosophy" }, { name: "fiction" }, { name: "technology" }],
    topBookTags: [
      { name: "philosophy" }, { name: "marathi" }, { name: "fiction" }, { name: "technology" },
      { name: "history" }, { name: "essays" }, { name: "biography" }, { name: "poetry" },
    ],
    booksPerYearSorted: [[2021, 12], [2022, 19], [2023, 24], [2024, 28], [2025, 21], [2026, 14]],
    offloadCount: 63,
    offloadPercentage: 63,
    topPlatforms: [{ name: "Substack" }],
    blogMonthCounts: [4, 6, 9, 5, 7, 3, 8, 6, 5, 9, 4, 7],
    totalRaces: 17,
    totalKmRun: 612,
    bestTenKTime: "00:52:41",
    bestHmTime: "02:01:19",
    bestMarathonTime: "04:38:12",
    racesPerYearSorted: [[2023, 3], [2024, 6], [2025, 5], [2026, 3]],
    totalTreks: 21,
    hardTreks: 6,
    trekYearsActive: 7,
    latestTrek: "Harishchandragad",
    instaPostCount: 34,
    totalPhotos: 212,
    projectCount: 9,
    presentationCount: 4,
    certCount: 6,
    orgCount: 3,
    degreeCount: 2,
    topSkills: ["React", "Node.js", "Cloudflare", "Postgres", "Python"],
  },
  micro: { total: 1643, longestStreak: 31, activeDays: 742, perYear: [120, 260, 410, 380, 290, 183] },
  tags: [
    { id: 1, name: "मराठी", color: "#f97316", total: 65 },
    { id: 2, name: "treks", color: "#14b8a6", total: 48 },
    { id: 3, name: "philosophy", color: "#a78bfa", total: 37 },
    { id: 4, name: "running", color: "#dc2626", total: 31 },
    { id: 5, name: "writing", color: "#3b82f6", total: 28 },
    { id: 6, name: "books", color: "#fbbf24", total: 24 },
    { id: 7, name: "monsoon", color: "#67e8f9", total: 19 },
    { id: 8, name: "habits", color: "#7c3aed", total: 16 },
    { id: 9, name: "forts", color: "#14b8a6", total: 14 },
    { id: 10, name: "technology", color: "#1d4ed8", total: 12 },
    { id: 11, name: "poetry", color: "#f97316", total: 11 },
    { id: 12, name: "essays", color: "#a78bfa", total: 9 },
    { id: 13, name: "cricket", color: "#14b8a6", total: 8 },
    { id: 14, name: "design", color: "#3b82f6", total: 7 },
    { id: 15, name: "travel", color: "#fbbf24", total: 6 },
    { id: 16, name: "घर", color: "#dc2626", total: 5 },
  ],
};

export default STATS_FIXTURE;
