import {
  layoutGraph, weekStart, weeklyActivity, longestStreak, dailyCounts, rollUpMajors,
} from "./repoGraph";

// A small history, newest first, with one merge:
//   e ── d ──┬── b ── a
//            └── c ──┘
const COMMITS = [
  { sha: "e", parents: ["d"] },
  { sha: "d", parents: ["b", "c"] },
  { sha: "c", parents: ["a"] },
  { sha: "b", parents: ["a"] },
  { sha: "a", parents: [] },
];

describe("layoutGraph", () => {
  const { rows, edges, lanes } = layoutGraph(COMMITS);

  it("keeps the first parent in its child's lane", () => {
    const lane = (sha) => rows.find((r) => r.sha === sha).lane;
    expect(lane("e")).toBe(0);
    expect(lane("d")).toBe(0);
    // d's first parent is b, so b inherits lane 0 and c takes a new one.
    expect(lane("b")).toBe(0);
    expect(lane("c")).toBe(1);
  });

  it("opens a second lane for the merge's other parent, and no more", () => {
    expect(lanes).toBe(2);
  });

  it("draws an edge for every parent inside the window", () => {
    // e→d, d→b, d→c, c→a, b→a
    expect(edges).toHaveLength(5);
    expect(edges.every((e) => e.fromIndex < e.toIndex)).toBe(true);
  });

  it("drops an edge to a parent outside the window", () => {
    const { edges: windowed } = layoutGraph(COMMITS.slice(0, 2));
    // e→d is inside; d's parents b and c are not.
    expect(windowed).toHaveLength(1);
  });

  it("reuses a lane once the branch it held has ended", () => {
    const { lanes: n } = layoutGraph([
      { sha: "z", parents: ["y"] },
      { sha: "y", parents: [] },
      { sha: "x", parents: [] },
    ]);
    expect(n).toBe(1);
  });
});

describe("weekStart", () => {
  it("snaps to the Monday of the ISO week", () => {
    expect(weekStart("2026-09-22")).toBe("2026-09-21"); // Tuesday → Monday
    expect(weekStart("2026-09-21")).toBe("2026-09-21"); // Monday stays
    expect(weekStart("2026-09-20")).toBe("2026-09-14"); // Sunday → Monday before
  });
});

describe("weeklyActivity", () => {
  it("fills the empty weeks between two bursts", () => {
    const weeks = weeklyActivity([
      { authored_on: "2026-09-01", additions: 10, deletions: 1 },
      { authored_on: "2026-09-22", additions: 5, deletions: 0 },
    ]);
    // 2026-08-31 .. 2026-09-21 inclusive is four Mondays.
    expect(weeks).toHaveLength(4);
    expect(weeks[0]).toMatchObject({ commits: 1, additions: 10 });
    expect(weeks[1]).toMatchObject({ commits: 0, additions: 0 });
    expect(weeks[3]).toMatchObject({ commits: 1, additions: 5 });
  });

  it("returns nothing for no commits", () => {
    expect(weeklyActivity([])).toEqual([]);
  });
});

describe("longestStreak", () => {
  it("counts consecutive days across a month boundary", () => {
    const days = dailyCounts([
      { authored_on: "2026-08-30" },
      { authored_on: "2026-08-31" },
      { authored_on: "2026-09-01" },
      { authored_on: "2026-09-05" },
    ]);
    expect(longestStreak(days)).toBe(3);
  });

  it("is zero with no commits and one with a single day", () => {
    expect(longestStreak(new Map())).toBe(0);
    expect(longestStreak(dailyCounts([{ authored_on: "2026-09-01" }]))).toBe(1);
  });
});

describe("rollUpMajors", () => {
  it("counts an unmeasured release without counting zero lines for it", () => {
    const [v18] = rollUpMajors([
      {
        major: 18, version: "v18.1.2", released_on: "2026-09-20", lines_added: 100, lines_removed: 10, files_changed: 5, commit_count: 2,
      },
      {
        major: 18, version: "v18.1.1", released_on: "2026-09-20", lines_added: null, lines_removed: null, files_changed: null, commit_count: null,
      },
    ]);
    expect(v18).toMatchObject({
      releases: 2, measured: 1, added: 100, commits: 2,
    });
  });
});
