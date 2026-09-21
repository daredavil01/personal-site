#!/usr/bin/env node
/**
 * Drains src/data/changelog.md into the `changelog` table, then empties the
 * file back to its header.
 *
 * Postgres is the source of truth for the version history (0028_changelog.sql).
 * The markdown file is a staging buffer: a code change still appends its entry
 * there, in the same commit and the same diff as the code, so the entry is
 * reviewable before it is published. This script is what publishes it.
 *
 * Upsert on `version`, so a re-run is idempotent and re-pushing a version you
 * edited in the buffer overwrites the row. Nothing is ever deleted here — a
 * version that is in the table and not in the buffer is simply left alone.
 *
 * Usage:
 *   npm run changelog:push -- --dry-run   parse and print, write nothing
 *   npm run changelog:push                upsert, then clear the buffer
 *   npm run changelog:push -- --keep      upsert but leave the file as it is
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeClient } from "./build-docs.mjs";
import { parseChangelog, VERSION_HEADING_RE } from "../src/lib/changelogParse.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "src", "data", "changelog.md");

const DRY_RUN = process.argv.includes("--dry-run");
const KEEP = process.argv.includes("--keep");

// What the buffer looks like with nothing waiting in it. Rewritten verbatim
// after a successful push, so the file's identity survives being emptied.
const EMPTY_BUFFER = `---
---
# Changelog

Staging buffer only — the published version history lives in the \`changelog\`
table and is read by /changelog and /ask. Append a new version's entry below,
in the format CLAUDE.md mandates, then run \`npm run changelog:push\` to upsert
it and empty this file again.

Versioning follows the semver-style rules in CLAUDE.md: major for new
pages/refactors/redesigns, minor for features and content additions (at most one
minor version per calendar week), patch for fixes and tweaks.

---
`;

const UPSERT_BATCH = 50;

async function main() {
  const md = fs.readFileSync(FILE, "utf8").replace(/^---[\s\S]*?---\r?\n/, "");
  const entries = parseChangelog(md);

  if (!entries.length) {
    console.log("Buffer holds no versions. Nothing to push.");
    return;
  }

  // A heading the parser did not recognise is a version whose bullets get
  // attached to the version above it — and then this script clears the file.
  // That is exactly what the eight oldest "## [v2.0.0] — 2025-03 (Sports Page
  // Launch)" headings did before the date pattern was widened, so the count is
  // compared rather than trusted.
  const headings = md.split(/\r?\n/).filter((l) => VERSION_HEADING_RE.test(l)).length;
  if (headings !== entries.length) {
    throw new Error(
      `${headings} version headings in the buffer but ${entries.length} parsed. `
      + "One is malformed — fix the heading and re-run. Nothing was written.",
    );
  }

  const rows = entries.map((e) => ({
    version: e.version,
    released_on: e.date,
    summary: e.summary || null,
    changes: e.changes,
  }));

  // A version the table already has is an update, not a duplicate — say which
  // is which before writing, because the buffer is usually one new entry and a
  // long list of "already published" is the sign something re-ran by mistake.
  const supabase = makeClient();
  const { data: existing, error: readErr } = await supabase
    .from("changelog")
    .select("version, summary")
    .in("version", rows.map((r) => r.version));
  if (readErr) throw new Error(`read: ${readErr.message}`);
  const known = new Map((existing || []).map((r) => [r.version, r]));

  // `npm run changelog:notes` writes the reader-facing paragraph into the row,
  // not back into the buffer — so a buffer entry almost never carries one. An
  // upsert that sent summary: null would erase it. A summary is only ever
  // written from here when the buffer actually has one.
  rows.forEach((r) => {
    if (!r.summary) delete r.summary;
  });

  console.log(
    `${rows.length} version${rows.length === 1 ? "" : "s"} in the buffer: `
    + `${rows.filter((r) => !known.has(r.version)).length} new, ${rows.filter((r) => known.has(r.version)).length} already published`
    + `${DRY_RUN ? " [dry run]" : ""}`,
  );
  rows.forEach((r) => console.log(
    `  ${known.has(r.version) ? "update" : "new   "}  ${r.version}  ${r.released_on}  `
    + `${r.changes.length} change${r.changes.length === 1 ? "" : "s"}${r.summary || known.get(r.version)?.summary ? "  (has summary)" : ""}`,
  ));

  if (DRY_RUN) {
    console.log("\nNothing written.");
    return;
  }

  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await supabase
      .from("changelog")
      .upsert(rows.slice(i, i + UPSERT_BATCH), { onConflict: "version" });
    if (error) throw new Error(`upsert: ${error.message}`);
  }
  console.log(`\nUpserted ${rows.length} rows.`);

  if (KEEP) {
    console.log("--keep: buffer left as it is.");
    return;
  }

  // Only after the upsert has succeeded. The old contents stay in git history
  // either way, but clearing a file whose rows never landed is how an entry
  // goes missing.
  fs.writeFileSync(FILE, EMPTY_BUFFER, "utf8");
  console.log(`Cleared ${path.relative(ROOT, FILE)}. Commit the emptied buffer.`);
  console.log("Run `npm run ask:index` to index the new versions into /ask.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
