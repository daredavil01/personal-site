#!/usr/bin/env node
/**
 * The periodic upkeep, in order, as one command.
 *
 *   npm run refresh                     every step
 *   npm run refresh -- changelog        one step (or several: changelog ask)
 *   npm run refresh -- --dry-run        forwarded; steps without one are skipped
 *
 * Steps: changelog (push buffer, per-version notes, major summaries),
 * repo (commit graph), blogs (word counts), ask (index + docs).
 * `npm run ask:gaps` is left out: it spends model tokens on a report.
 * Stops at the first failure. Each script still runs alone:
 * `node scripts/<file>.mjs`.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));

// `dry` = the script understands --dry-run.
const STEPS = {
  changelog: [
    // ["push-changelog.mjs", true],
    ["summarise-changelog.mjs", true],
    ["summarise-majors.mjs", true],
  ],
  repo: [["sync-repo-history.mjs", true]],
  blogs: [["blog-word-counts.mjs", false]],
  ask: [["build-content-index.mjs", true]], // also runs docs:build
};

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const names = args.filter((a) => !a.startsWith("--"));
const unknown = names.filter((n) => !STEPS[n]);
if (unknown.length) {
  console.error(
    `Unknown step: ${unknown.join(", ")}. Steps: ${Object.keys(STEPS).join(", ")}`,
  );
  process.exit(1);
}

for (const name of names.length ? names : Object.keys(STEPS)) {
  for (const [file, hasDry] of STEPS[name]) {
    if (dry && !hasDry) {
      console.log(`\n== ${name}: ${file} skipped (no --dry-run)`);
      continue;
    }
    console.log(`\n== ${name}: ${file}`);
    const r = spawnSync(
      process.execPath,
      [path.join(DIR, file), ...(dry ? ["--dry-run"] : [])],
      { stdio: "inherit" },
    );
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}
