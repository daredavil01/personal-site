import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import {
  getCommitActivity, getCommitGraph, getVersionStats,
} from "../lib/api/repoHistory";
import {
  dailyCounts, layoutGraph, repoTotals, rollUpMajors, weeklyActivity,
} from "../lib/repoGraph";

// The commit history behind /changelog, drawn from the `repo_commits` rows
// `npm run repo:sync` writes out of the local clone. Nothing here calls GitHub:
// an unauthenticated api.github.com allows 60 requests an hour, which a public
// page cannot live inside, and per-commit stats there cost one request each.
//
// Four views over the same rows — the release rail, the commit graph, the
// contribution heatmap and the code-frequency chart — plus the totals.

const GRAPH_WINDOW = 100;
const HEATMAP_WEEKS = 53;

const REPO = "https://github.com/daredavil01/personal-site";

const number = (n) => (n === null || n === undefined ? null : n.toLocaleString("en-IN"));

const Section = ({ title, hint, children }) => (
  <section className="w-full">
    <div className="mb-4">
      <p className="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-1">
        {title}
      </p>
      {hint && (
        <p className="font-body text-sm text-stone-500 dark:text-stone-400 mb-0 max-w-2xl">
          {hint}
        </p>
      )}
    </div>
    {children}
  </section>
);

// A stat with no value is omitted rather than rendered as zero — the same rule
// the share cards follow.
const Tile = ({ label, value, sub }) => (value === null ? null : (
  <div className="rounded-lg border border-stone-200 dark:border-stone-700 p-4 bg-stone-50 dark:bg-stone-900">
    <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">
      {label}
    </p>
    <p className="font-headline text-2xl font-black text-stone-900 dark:text-stone-100 mb-0">
      {value}
    </p>
    {sub && (
      <p className="font-body text-xs text-stone-500 dark:text-stone-400 mt-1 mb-0">{sub}</p>
    )}
  </div>
));

// --- the release rail -------------------------------------------------------

const ReleaseRail = ({ versions }) => {
  const widest = Math.max(...versions.map((v) => (v.lines_added || 0) + (v.lines_removed || 0)), 1);

  return (
    <ol className="list-none pl-0 m-0 border-l border-stone-200 dark:border-stone-700">
      {versions.map((v) => {
        const total = (v.lines_added || 0) + (v.lines_removed || 0);
        const share = total / widest;
        const measured = v.lines_added !== null && v.lines_added !== undefined;
        return (
          <li key={v.version} className="relative pl-6 py-2">
            <span
              className={`absolute left-0 top-4 -translate-x-1/2 rounded-full ${
                v.patch === 0 && v.minor === 0
                  ? "w-3 h-3 bg-secondary"
                  : "w-2 h-2 bg-stone-400 dark:bg-stone-600"
              }`}
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Link
                to={`/changelog?v=${v.major}#${v.version}`}
                className="font-headline font-bold text-stone-900 dark:text-stone-100 hover:text-secondary transition-colors"
              >
                {v.version}
              </Link>
              <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                {v.released_on}
              </span>
              {measured ? (
                <span className="font-label text-[10px] uppercase tracking-widest">
                  <span className="text-emerald-600 dark:text-emerald-400">{`+${number(v.lines_added)}`}</span>
                  <span className="text-rose-600 dark:text-rose-400 ml-2">{`−${number(v.lines_removed)}`}</span>
                  <span className="text-stone-400 dark:text-stone-500 ml-2">
                    {`${number(v.files_changed)} files · ${number(v.commit_count)} commits`}
                  </span>
                </span>
              ) : (
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  shipped in another version&apos;s commit
                </span>
              )}
            </div>
            {measured && total > 0 && (
              <div className="mt-1.5 flex h-1.5 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800" style={{ width: `${Math.max(share * 100, 2)}%` }}>
                <span
                  className="bg-emerald-500/70"
                  style={{ width: `${((v.lines_added || 0) / total) * 100}%` }}
                />
                <span className="bg-rose-500/70 flex-1" />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
};

// --- the commit graph -------------------------------------------------------

const ROW_H = 26;
const LANE_W = 16;
const LANE_COLOURS = [
  "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6",
];

const CommitGraph = ({ commits, releaseShas }) => {
  const { rows, edges, lanes } = useMemo(() => layoutGraph(commits), [commits]);
  const byIndex = useMemo(() => new Map(rows.map((r, i) => [r.sha, i])), [rows]);

  const width = lanes * LANE_W + 8;
  const height = rows.length * ROW_H;
  const x = (lane) => lane * LANE_W + LANE_W / 2;
  const y = (i) => i * ROW_H + ROW_H / 2;
  const colour = (lane) => LANE_COLOURS[lane % LANE_COLOURS.length];

  return (
    <div className="flex w-full overflow-x-auto">
      <svg
        width={width}
        height={height}
        className="shrink-0"
        role="img"
        aria-label={`Commit graph of the last ${rows.length} commits`}
      >
        {edges.map((e) => {
          const x1 = x(e.fromLane);
          const y1 = y(e.fromIndex);
          const x2 = x(e.toLane);
          const y2 = y(e.toIndex);
          // A branch or a merge steps sideways: drawn as a curve so the lane it
          // came from stays readable where several cross in the same rows.
          const d = x1 === x2
            ? `M${x1},${y1} L${x2},${y2}`
            : `M${x1},${y1} C${x1},${y1 + ROW_H * 0.6} ${x2},${y2 - ROW_H * 0.6} ${x2},${y2}`;
          return (
            <path
              key={`${e.from}-${e.to}`}
              d={d}
              fill="none"
              stroke={colour(x1 === x2 ? e.fromLane : e.toLane)}
              strokeWidth="1.5"
              strokeOpacity="0.55"
            />
          );
        })}
        {rows.map((row, i) => {
          const release = releaseShas.has(row.sha);
          return (
            <circle
              key={row.sha}
              cx={x(row.lane)}
              cy={y(i)}
              r={release ? 5 : 3}
              fill={release ? colour(row.lane) : "var(--graph-dot, #78716c)"}
              stroke={release ? "#fff" : "none"}
              strokeWidth={release ? 1.5 : 0}
            />
          );
        })}
      </svg>

      <ul className="list-none pl-3 m-0 min-w-0 flex-1">
        {rows.map((row) => {
          const commit = commits[byIndex.get(row.sha)];
          const release = releaseShas.has(row.sha);
          return (
            <li
              key={row.sha}
              className="flex items-center gap-3 min-w-0"
              style={{ height: ROW_H }}
            >
              <a
                href={`${REPO}/commit/${row.sha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-label text-[10px] text-stone-400 dark:text-stone-500 hover:text-secondary shrink-0"
              >
                {row.sha.slice(0, 7)}
              </a>
              <span className={`truncate font-body text-sm ${
                release
                  ? "text-stone-900 dark:text-stone-100 font-semibold"
                  : "text-stone-500 dark:text-stone-400"
              }`}
              >
                {commit?.subject}
              </span>
              <span className="ml-auto shrink-0 font-label text-[10px] text-stone-400 dark:text-stone-500">
                {commit?.authored_on}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// --- the contribution heatmap ----------------------------------------------

const CELL = 11;
const GAP = 3;

const Heatmap = ({ days }) => {
  const cells = useMemo(() => {
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    // Wind back to the Sunday that ends the grid's last column.
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (HEATMAP_WEEKS * 7 - 1));
    const out = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      out.push({ date: key, count: days.get(key) || 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return out;
  }, [days]);

  const busiest = Math.max(...cells.map((c) => c.count), 1);
  // Four steps, not a continuous ramp: a gradient over one-to-three commits a
  // day is noise, and the point is which days had any.
  const tone = (n) => {
    if (!n) return "rgba(120,113,108,0.16)";
    const step = Math.ceil((n / busiest) * 4);
    return ["rgba(16,185,129,0.35)", "rgba(16,185,129,0.55)", "rgba(16,185,129,0.75)", "rgba(16,185,129,1)"][Math.min(step, 4) - 1];
  };

  const weeks = Math.ceil(cells.length / 7);
  const firstDow = (new Date(`${cells[0]?.date}T00:00:00Z`).getUTCDay() + 6) % 7;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={weeks * (CELL + GAP)}
        height={7 * (CELL + GAP)}
        role="img"
        aria-label={`Commits per day over the last ${HEATMAP_WEEKS} weeks`}
      >
        {cells.map((cell, i) => {
          const slot = i + firstDow;
          return (
            <rect
              key={cell.date}
              x={Math.floor(slot / 7) * (CELL + GAP)}
              y={(slot % 7) * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx="2"
              fill={tone(cell.count)}
            >
              <title>{`${cell.date} — ${cell.count} commit${cell.count === 1 ? "" : "s"}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
};

// --- code frequency ---------------------------------------------------------

const CodeFrequency = ({ weeks }) => {
  if (!weeks.length) return null;
  const width = 900;
  const height = 180;
  const peak = Math.max(...weeks.map((w) => Math.max(w.additions, w.deletions)), 1);
  const step = width / weeks.length;
  const mid = height / 2;

  const path = (key, sign) => weeks
    .map((w, i) => {
      const value = (w[key] / peak) * (mid - 4);
      return `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(mid + sign * value).toFixed(1)}`;
    })
    .join(" ");

  const area = (key, sign) => `${path(key, sign)} L${width},${mid} L0,${mid} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[600px] max-w-full"
        role="img"
        aria-label="Lines added and deleted per week"
      >
        <path d={area("additions", -1)} fill="rgba(16,185,129,0.35)" />
        <path d={area("deletions", 1)} fill="rgba(244,63,94,0.30)" />
        <line x1="0" y1={mid} x2={width} y2={mid} stroke="currentColor" strokeOpacity="0.25" />
      </svg>
      <div className="flex justify-between font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-1">
        <span>{weeks[0].week}</span>
        <span>{`peak ${number(peak)} lines in a week`}</span>
        <span>{weeks[weeks.length - 1].week}</span>
      </div>
    </div>
  );
};

// --- the page ---------------------------------------------------------------

const ChangelogGraph = () => {
  const [activity, setActivity] = useState(null);
  const [graph, setGraph] = useState([]);
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getCommitActivity(), getCommitGraph(GRAPH_WINDOW), getVersionStats()])
      .then(([a, g, v]) => { setActivity(a); setGraph(g); setVersions(v); })
      .catch((err) => setError(err.message));
  }, []);

  const totals = useMemo(() => (activity ? repoTotals(activity) : null), [activity]);
  const weeks = useMemo(() => (activity ? weeklyActivity(activity) : []), [activity]);
  const days = useMemo(() => (activity ? dailyCounts(activity) : new Map()), [activity]);
  const majors = useMemo(() => rollUpMajors(versions), [versions]);
  const releaseShas = useMemo(
    () => new Set(versions.map((v) => v.commit_sha).filter(Boolean)),
    [versions],
  );

  // Changelog entries, not commits: summing commit_count across versions comes
  // back to the same 787 the first tile already shows, because every commit
  // falls inside some version's range.
  const entries = useMemo(
    () => versions.reduce((n, v) => n + (v.entry_count || 0), 0),
    [versions],
  );

  return (
    <PageShell region="person">
      <div className="flex flex-col gap-14 w-full">
        <section>
          <div className="max-w-3xl">
            <span className="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-4 block">
              Commit History
            </span>
            <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-tight mb-8">
              The graph.
            </h1>
            <p className="font-body text-xl text-stone-500 dark:text-stone-400 leading-relaxed">
              Every release in
              {" "}
              <Link to="/changelog" className="text-secondary hover:underline">the changelog</Link>
              {" "}
              has a commit behind it. This is what those commits cost: lines
              written, lines deleted, files touched, and the days they landed on.
            </p>
          </div>
        </section>

        {error && (
          <p className="font-body text-stone-500 dark:text-stone-400">
            {`Could not load the history: ${error}`}
          </p>
        )}

        {!activity && !error && (
          <p className="font-body text-stone-400 dark:text-stone-500">Loading…</p>
        )}

        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile label="Commits" value={number(totals.commits)} sub={`${number(totals.merges)} merges`} />
            <Tile label="Lines written" value={number(totals.additions)} sub={`${number(totals.deletions)} deleted`} />
            <Tile label="Releases" value={number(versions.length)} sub={`across ${majors.length} majors`} />
            <Tile label="Changelog entries" value={number(entries)} sub="features, changes and fixes" />
            <Tile label="Active days" value={number(totals.activeDays)} sub={`longest streak ${totals.longestStreak} days`} />
            <Tile
              label="Busiest day"
              value={totals.busiestDay ? number(totals.busiestDay.commits) : null}
              sub={totals.busiestDay ? totals.busiestDay.date : null}
            />
            <Tile label="First commit" value={totals.first} />
            <Tile label="Latest commit" value={totals.last} />
          </div>
        )}

        {!!weeks.length && (
          <Section
            title="Code frequency"
            hint="Lines added above the line, deleted below, one column per week since the first commit."
          >
            <CodeFrequency weeks={weeks} />
          </Section>
        )}

        {!!days.size && (
          <Section
            title="Commits per day"
            hint={`The last ${HEATMAP_WEEKS} weeks. One square per day, darker where more landed.`}
          >
            <Heatmap days={days} />
          </Section>
        )}

        {!!graph.length && (
          <Section
            title="The commit graph"
            hint={`The most recent ${graph.length} commits, branches and merges as git sees them. A ringed dot is the commit a version shipped in.`}
          >
            <CommitGraph commits={graph} releaseShas={releaseShas} />
          </Section>
        )}

        {!!majors.length && (
          <Section
            title="By major version"
            hint="A release with no measurement shipped inside another version's commit; its lines are counted once, on that version."
          >
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm font-body border-collapse min-w-[560px]">
                <thead>
                  <tr className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                    <th className="text-left py-2 pr-4">Major</th>
                    <th className="text-left py-2 pr-4">Span</th>
                    <th className="text-right py-2 pr-4">Releases</th>
                    <th className="text-right py-2 pr-4">Entries</th>
                    <th className="text-right py-2 pr-4">Commits</th>
                    <th className="text-right py-2 pr-4">Added</th>
                    <th className="text-right py-2">Deleted</th>
                  </tr>
                </thead>
                <tbody>
                  {majors.map((m) => (
                    <tr key={m.major} className="border-t border-stone-200 dark:border-stone-700">
                      <td className="py-2 pr-4">
                        <Link to={`/changelog?v=${m.major}`} className="text-secondary hover:underline font-semibold">
                          {`v${m.major}`}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-stone-500 dark:text-stone-400">
                        {m.oldest === m.newest ? m.oldest : `${m.oldest} → ${m.newest}`}
                      </td>
                      <td className="py-2 pr-4 text-right">{m.releases}</td>
                      <td className="py-2 pr-4 text-right">{number(m.entries)}</td>
                      <td className="py-2 pr-4 text-right">{number(m.commits)}</td>
                      <td className="py-2 pr-4 text-right text-emerald-600 dark:text-emerald-400">{`+${number(m.added)}`}</td>
                      <td className="py-2 text-right text-rose-600 dark:text-rose-400">{`−${number(m.removed)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {!!versions.length && (
          <Section
            title="Every release"
            hint="Newest first. The bar is the size of the diff, split into what was added and what was deleted."
          >
            <ReleaseRail versions={versions} />
          </Section>
        )}
      </div>
    </PageShell>
  );
};

export default ChangelogGraph;
