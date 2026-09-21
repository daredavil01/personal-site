// Turns a list of commits into the numbers /changelog/graph draws.
//
// Kept out of the page component so each piece has a runnable check: the lane
// assignment in particular is the kind of index arithmetic that is wrong by one
// and still looks plausible on screen.

/**
 * Assigns each commit a lane, the way `git log --graph` does.
 *
 * Commits arrive newest first. A commit keeps the lane its child reserved for
 * it; its first parent inherits that lane, and any further parent (a merge)
 * takes a lane of its own. A lane is released once nothing is waiting in it, so
 * a finished branch does not hold a column open forever.
 *
 * @param {{sha: string, parents: string[]}[]} commits newest first
 * @returns {{ rows: {sha, lane, parents}[], edges: {from, to, fromLane, toLane}[], lanes: number }}
 */
export function layoutGraph(commits) {
  // lanes[i] is the sha that lane i is currently reserved for, or null.
  const lanes = [];
  const laneOf = new Map();
  const indexOf = new Map();
  const rows = [];

  const claim = (sha) => {
    const existing = lanes.indexOf(sha);
    if (existing !== -1) return existing;
    const free = lanes.indexOf(null);
    const lane = free === -1 ? lanes.length : free;
    lanes[lane] = sha;
    return lane;
  };

  commits.forEach((commit, i) => {
    const lane = claim(commit.sha);
    laneOf.set(commit.sha, lane);
    indexOf.set(commit.sha, i);
    rows.push({ sha: commit.sha, lane, parents: commit.parents || [] });

    const parents = commit.parents || [];
    // The first parent continues straight down this lane; the lane is freed
    // when there is no first parent (a root commit).
    lanes[lane] = parents[0] || null;
    // A merge's other parents each need a lane, unless one is already held.
    parents.slice(1).forEach((p) => {
      if (!lanes.includes(p)) claim(p);
    });
  });

  // Edges are only drawn between two commits that are both in the window: a
  // parent outside it has no row to point at.
  const edges = [];
  rows.forEach((row) => {
    row.parents.forEach((parent) => {
      if (!indexOf.has(parent)) return;
      edges.push({
        from: row.sha,
        to: parent,
        fromLane: row.lane,
        toLane: laneOf.get(parent),
        fromIndex: indexOf.get(row.sha),
        toIndex: indexOf.get(parent),
      });
    });
  });

  return { rows, edges, lanes: lanes.length || 1 };
}

/** "YYYY-MM-DD" → the Monday of its ISO week, as "YYYY-MM-DD". */
export function weekStart(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  // getUTCDay: 0 is Sunday, and the week starts on Monday.
  const shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d.toISOString().slice(0, 10);
}

/**
 * Commits → one bucket per week: commits, additions, deletions.
 * Weeks with no commits are filled in, so the chart has no false continuity
 * between two months either side of a gap.
 */
export function weeklyActivity(commits) {
  const buckets = new Map();
  commits.forEach((c) => {
    const key = weekStart(c.authored_on);
    if (!buckets.has(key)) buckets.set(key, { week: key, commits: 0, additions: 0, deletions: 0 });
    const b = buckets.get(key);
    b.commits += 1;
    b.additions += c.additions || 0;
    b.deletions += c.deletions || 0;
  });
  if (!buckets.size) return [];

  const keys = [...buckets.keys()].sort();
  const out = [];
  const cursor = new Date(`${keys[0]}T00:00:00Z`);
  const last = new Date(`${keys[keys.length - 1]}T00:00:00Z`);
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    out.push(buckets.get(key) || {
      week: key, commits: 0, additions: 0, deletions: 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return out;
}

/** Commits → { "YYYY-MM-DD": count } for the heatmap. */
export function dailyCounts(commits) {
  const days = new Map();
  commits.forEach((c) => days.set(c.authored_on, (days.get(c.authored_on) || 0) + 1));
  return days;
}

/**
 * The longest run of consecutive days with at least one commit.
 * Days are compared as dates, so a month or year boundary is not a break.
 */
export function longestStreak(days) {
  const sorted = [...days.keys()].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  sorted.forEach((day) => {
    const d = new Date(`${day}T00:00:00Z`);
    const gap = previous ? Math.round((d - previous) / 86400000) : null;
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
    previous = d;
  });
  return best;
}

/** All-time totals, from the same rows the charts use. */
export function repoTotals(commits) {
  const days = dailyCounts(commits);
  const busiest = [...days.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  return {
    commits: commits.length,
    merges: commits.filter((c) => (c.parents || []).length > 1).length,
    additions: commits.reduce((n, c) => n + (c.additions || 0), 0),
    deletions: commits.reduce((n, c) => n + (c.deletions || 0), 0),
    files: commits.reduce((n, c) => n + (c.files || 0), 0),
    activeDays: days.size,
    longestStreak: longestStreak(days),
    busiestDay: busiest ? { date: busiest[0], commits: busiest[1] } : null,
    first: commits.length ? commits[0].authored_on : null,
    last: commits.length ? commits[commits.length - 1].authored_on : null,
  };
}

/**
 * Version rows → one entry per major: releases, lines, commits.
 * A version with no measurement (it shipped inside another version's commit)
 * contributes its release to the count but no lines, which is why the two are
 * counted separately rather than inferred from each other.
 */
export function rollUpMajors(versions) {
  const majors = new Map();
  versions.forEach((v) => {
    if (!majors.has(v.major)) {
      majors.set(v.major, {
        major: v.major,
        releases: 0,
        measured: 0,
        added: 0,
        removed: 0,
        files: 0,
        commits: 0,
        entries: 0,
        latest: v.version,
        newest: v.released_on,
        oldest: v.released_on,
      });
    }
    const m = majors.get(v.major);
    m.releases += 1;
    m.entries += v.entry_count || 0;
    if (v.lines_added !== null && v.lines_added !== undefined) {
      m.measured += 1;
      m.added += v.lines_added || 0;
      m.removed += v.lines_removed || 0;
      m.files += v.files_changed || 0;
      m.commits += v.commit_count || 0;
    }
    if (v.released_on < m.oldest) m.oldest = v.released_on;
    if (v.released_on > m.newest) m.newest = v.released_on;
  });
  return [...majors.values()].sort((a, b) => b.major - a.major);
}
