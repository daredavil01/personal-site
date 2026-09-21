#!/usr/bin/env node
/**
 * Reads the local git clone and writes the commit history into Postgres, so
 * /changelog/graph can draw the release rail, the commit DAG, the contribution
 * heatmap and the code-frequency chart without touching the GitHub API.
 *
 * Why git and not api.github.com: the clone already holds every commit, and an
 * unauthenticated GitHub API allows 60 requests an hour — a public page cannot
 * live inside that, and per-commit stats there are one request per commit.
 *
 * Two things are written (0029_repo_history.sql):
 *   repo_commits — every commit reachable from HEAD, with its parents.
 *   changelog    — each version's release commit and what it cost.
 *
 * A version has no git tag (this repository has none). It has the commit that
 * added its `## [vX.Y.Z]` heading to src/data/changelog.md, which by the
 * CLAUDE.md convention is the commit it shipped in — verified: 90 commits touch
 * that file against 91 versions. The version's cost is the diff from the
 * previous version's release commit to its own.
 *
 * Usage:
 *   npm run repo:sync -- --dry-run    print the plan, write nothing
 *   npm run repo:sync                 upsert commits and version stats
 *   npm run repo:sync -- --commits    commits only, skip the version mapping
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env. Run it from a full clone: a CI
 * checkout with `fetch-depth: 1` sees one commit and would publish a history
 * of one, so a shallow clone is refused rather than written.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeClient } from "./build-docs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DRY_RUN = process.argv.includes("--dry-run");
const COMMITS_ONLY = process.argv.includes("--commits");

const UPSERT_BATCH = 200;

// git's hash for the empty tree — the "before" side of the first version's
// diff, so the oldest release is measured against nothing rather than skipped.
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

// ponytail: package-lock.json and sourcemaps are excluded from a version's line
// count. One lockfile bump is tens of thousands of lines and would dwarf every
// real change on the chart. Per-commit numbers in repo_commits are git's own,
// unfiltered — only the per-version totals are narrowed. Revisit if the
// exclusion list starts needing judgement calls.
const EXCLUDE = [":(exclude)package-lock.json", ":(exclude)*.map"];

const git = (...args) => execFileSync("git", args, {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 256 * 1024 * 1024,
}).trim();

// Record and field separators that cannot appear in a commit subject.
const RS = "\x1e";
const FS = "\x1f";

/**
 * Every commit reachable from HEAD, newest first, with its numstat.
 * One `git log`, not one call per commit.
 */
function readCommits() {
  const raw = git(
    "log",
    "--numstat",
    "--no-renames",
    `--format=${RS}%H${FS}%P${FS}%aI${FS}%an${FS}%s`,
  );

  return raw.split(RS).filter((block) => block.trim()).map((block) => {
    const [header, ...statLines] = block.split("\n");
    const [sha, parents, authoredAt, author, subject] = header.split(FS);

    let additions = 0;
    let deletions = 0;
    let files = 0;
    statLines.forEach((line) => {
      const m = /^(\d+|-)\t(\d+|-)\t/.exec(line);
      if (!m) return;
      files += 1;
      // "-" is git's marker for a binary file: counted as a changed file, but
      // it has no line count to add.
      if (m[1] !== "-") additions += Number(m[1]);
      if (m[2] !== "-") deletions += Number(m[2]);
    });

    return {
      sha,
      parents: parents ? parents.split(" ").filter(Boolean) : [],
      authored_on: authoredAt.slice(0, 10),
      authored_at: authoredAt,
      author: author || "",
      subject: subject || "",
      additions,
      deletions,
      files,
    };
  });
}

/**
 * The commit that introduced a version's heading into the changelog buffer.
 * `git log -S` searches for a change in the number of occurrences of the
 * string, so it finds the commit that added the heading and not the hundred
 * commits that merely touched the file afterwards.
 */
function releaseCommitFor(version) {
  const out = git(
    "log", "-S", `## [${version}]`, "--format=%H", "--", "src/data/changelog.md",
  );
  // Newest first; the oldest match is the one that introduced the heading.
  const shas = out.split("\n").filter(Boolean);
  return shas.length ? shas[shas.length - 1] : null;
}

/** Lines and files changed between two commits, lockfiles excluded. */
function diffStat(fromSha, toSha) {
  const out = git("diff", "--numstat", "--no-renames", fromSha, toSha, "--", ...EXCLUDE);
  let additions = 0;
  let deletions = 0;
  let files = 0;
  out.split("\n").forEach((line) => {
    const m = /^(\d+|-)\t(\d+|-)\t/.exec(line);
    if (!m) return;
    files += 1;
    if (m[1] !== "-") additions += Number(m[1]);
    if (m[2] !== "-") deletions += Number(m[2]);
  });
  return { additions, deletions, files };
}

/** How many commits are in `from..to`, or up to `to` when there is no `from`. */
function countCommits(fromSha, toSha) {
  const range = fromSha === EMPTY_TREE ? toSha : `${fromSha}..${toSha}`;
  return Number(git("rev-list", "--count", range) || 0);
}

async function main() {
  // A shallow clone would publish a history of one commit over the real one.
  const shallow = git("rev-parse", "--is-shallow-repository");
  if (shallow === "true") {
    throw new Error("Shallow clone: run with a full history (actions/checkout fetch-depth: 0).");
  }

  const commits = readCommits();
  console.log(
    `${commits.length} commits, ${commits.filter((c) => c.parents.length > 1).length} merges, `
    + `${commits[commits.length - 1]?.authored_on} → ${commits[0]?.authored_on}`
    + `${DRY_RUN ? " [dry run]" : ""}`,
  );

  const supabase = makeClient();

  if (!DRY_RUN) {
    for (let i = 0; i < commits.length; i += UPSERT_BATCH) {
      // eslint-disable-next-line no-await-in-loop
      const { error } = await supabase
        .from("repo_commits")
        .upsert(commits.slice(i, i + UPSERT_BATCH), { onConflict: "sha" });
      if (error) throw new Error(`repo_commits: ${error.message}`);
    }
    console.log(`  upserted ${commits.length} commits`);
  }

  if (COMMITS_ONLY) return;

  // --- versions ------------------------------------------------------------

  const { data: versions, error } = await supabase
    .from("changelog")
    .select("id, version, released_on, major, minor, patch")
    .order("major", { ascending: true })
    .order("minor", { ascending: true })
    .order("patch", { ascending: true });
  if (error) throw new Error(`changelog: ${error.message}`);

  const known = new Set(commits.map((c) => c.sha));
  const ordered = versions || [];

  // Several versions can share one release commit: v17.0.2 and v17.1.0 both
  // landed in 5b46d2e, and the nine oldest were back-written into 3c57c76 when
  // the changelog was first created. Their costs cannot be told apart, so the
  // diff is attributed to the NEWEST version in the group — the one the commit
  // actually shipped as, and the one its subject line names — and the others
  // are left unmeasured. Null, not zero: they still carry commit_sha, so the
  // page can say which version they shipped alongside.
  const shaFor = new Map();
  ordered.forEach((row) => {
    const sha = releaseCommitFor(row.version);
    if (!sha) {
      console.log(`  ${row.version}: no release commit found, left unmeasured`);
      return;
    }
    // A sha outside repo_commits would violate the foreign key — and means the
    // heading was introduced on a branch that never reached HEAD.
    if (!known.has(sha)) {
      console.log(`  ${row.version}: release commit ${sha.slice(0, 7)} is not on HEAD, skipped`);
      return;
    }
    shaFor.set(row.version, sha);
  });

  // Oldest first, so the newest version of each group is the last one written.
  const bearer = new Map();
  ordered.forEach((row) => {
    const sha = shaFor.get(row.version);
    if (sha) bearer.set(sha, row.version);
  });

  let previous = EMPTY_TREE;
  let mapped = 0;
  let shared = 0;
  const updates = [];

  ordered.forEach((row) => {
    const sha = shaFor.get(row.version);
    if (!sha) return;

    if (bearer.get(sha) !== row.version) {
      updates.push({
        id: row.id,
        version: row.version,
        commit_sha: sha,
        lines_added: null,
        lines_removed: null,
        files_changed: null,
        commit_count: null,
      });
      shared += 1;
      return;
    }

    const stat = diffStat(previous, sha);
    updates.push({
      id: row.id,
      version: row.version,
      commit_sha: sha,
      lines_added: stat.additions,
      lines_removed: stat.deletions,
      files_changed: stat.files,
      commit_count: countCommits(previous, sha),
    });
    previous = sha;
    mapped += 1;
  });

  console.log(`
${mapped} of ${ordered.length} versions measured, ${shared} shipped alongside a newer one`);
  updates.slice(-8).forEach((u) => console.log(
    `  ${u.version}  ${u.commit_sha.slice(0, 7)}  `
    + (u.lines_added === null
      ? `shipped with ${bearer.get(u.commit_sha)}`
      : `+${u.lines_added} -${u.lines_removed}  ${u.files_changed} files  ${u.commit_count} commits`),
  ));

  if (DRY_RUN) {
    console.log("\nNothing written.");
    return;
  }

  for (let i = 0; i < updates.length; i += 1) {
    const {
      id, version, commit_sha, lines_added, lines_removed, files_changed, commit_count,
    } = updates[i];
    // eslint-disable-next-line no-await-in-loop
    const { error: writeErr } = await supabase
      .from("changelog")
      .update({
        commit_sha, lines_added, lines_removed, files_changed, commit_count,
      })
      .eq("id", id);
    if (writeErr) throw new Error(`${version}: ${writeErr.message}`);
  }

  console.log(`\nWrote ${updates.length} version measurements.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
