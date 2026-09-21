#!/usr/bin/env node
/**
 * Writes one reader-facing paragraph into each `changelog` row's `summary`.
 *
 * The engineering entries stay exactly as they are. They explain *why*, which
 * is the reason this changelog is worth reading at all — but a visitor landing
 * on /changelog meets `fts_en`, RRF and `ts_rank_cd` in the first sentence.
 * /changelog renders the summary above the entries, and the Now-month editor
 * offers it first, pre-checked, because it is already written in the words a
 * Now page wants.
 *
 * Usage:
 *   npm run changelog:notes -- --dry-run      print, write nothing
 *   npm run changelog:notes                   fill versions that have none
 *   npm run changelog:notes -- --limit 3      newest N versions only
 *   npm run changelog:notes -- --version v18.2.0
 *   npm run changelog:notes -- --force        rewrite existing paragraphs
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY in .env, and the
 * release_notes switch on under AI features in /admin/ask/settings.
 *
 * This used to splice blockquotes into src/data/changelog.md, where the human
 * gate was git: it edited a tracked file and nothing shipped until the diff was
 * read. The version history is a table now and that file is only a staging
 * buffer, so the gate moved — review a paragraph at /admin/changelog, or run
 * --dry-run first, which prints exactly what would be written.
 */

import { makeClient } from "./build-docs.mjs";
import { askGemini, tiersForFeature } from "./lib/gemini.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const LIMIT = Number(argValue("--limit")) || 0;
const ONLY = argValue("--version");

const SYSTEM = [
  "You write the short public summary of a software release for a personal website.",
  "The site belongs to Sanket Tambare: books, running, trekking, software projects, blog posts, micro-posts, and an /ask second brain over all of it.",
  "You are given the engineering changelog entries for one version. Write ONE paragraph, 2 to 3 sentences, saying what changed for someone who uses the site.",
  "Rules: no version number, no dates, no file paths, no function or column names, no jargon a reader would have to look up.",
  "Do not invent anything that is not in the entries. Do not say 'this release' or 'we'. Do not use bullet points, headings or quotation marks.",
  "Plain, factual, unexcited. Return the paragraph alone.",
].join(" ");

/** The version's changes, as the model should see them. */
function bulletsOf(row) {
  return (Array.isArray(row.changes) ? row.changes : [])
    .map((c) => `- ${[c.name, c.body].filter(Boolean).join(": ")}`)
    .filter((l) => l !== "- ")
    .join("\n");
}

// The model is told to return one bare paragraph; this is the guard for when
// it returns three, or wraps them in quotes.
function tidy(text) {
  return String(text || "")
    .trim()
    .split(/\n{2,}/)[0]
    .replace(/\n/g, " ")
    .replace(/^[-*>\s]+/, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

async function main() {
  const supabase = makeClient();
  const tiers = await tiersForFeature(supabase, "release_notes");

  let query = supabase
    .from("changelog")
    .select("id, version, released_on, summary, changes")
    .order("major", { ascending: false })
    .order("minor", { ascending: false })
    .order("patch", { ascending: false });
  if (!FORCE) query = query.is("summary", null);
  if (ONLY) query = query.eq("version", ONLY);

  const { data, error } = await query;
  if (error) throw new Error(`read: ${error.message}`);

  let targets = data || [];
  if (LIMIT) targets = targets.slice(0, LIMIT);

  console.log(
    `${targets.length} version${targets.length === 1 ? "" : "s"} to summarise`
    + `${FORCE ? " (--force: rewriting existing)" : ""}${DRY_RUN ? " [dry run]" : ""}`,
  );

  const writes = [];
  let failed = 0;

  for (const row of targets) {
    const bullets = bulletsOf(row);
    if (!bullets.trim()) {
      console.log(`  ${row.version}: no entries, skipped`);
      continue;
    }

    let paragraph;
    try {
      // eslint-disable-next-line no-await-in-loop
      paragraph = tidy(await askGemini({
        tiers,
        system: SYSTEM,
        prompt: `Version ${row.version}, released ${row.released_on}.\n\n${bullets}`,
      }));
    } catch (err) {
      console.error(`  ${row.version}: ${err.message}`);
      failed += 1;
      continue;
    }
    if (!paragraph) {
      console.error(`  ${row.version}: empty answer`);
      failed += 1;
      continue;
    }

    console.log(`\n  ${row.version} → ${paragraph}`);
    writes.push({ id: row.id, version: row.version, summary: paragraph });
  }

  if (DRY_RUN || !writes.length) {
    console.log(`\n${writes.length} ready, ${failed} failed. Nothing written.`);
    return;
  }

  for (const { id, version, summary } of writes) {
    // eslint-disable-next-line no-await-in-loop
    const { error: writeErr } = await supabase
      .from("changelog").update({ summary }).eq("id", id);
    if (writeErr) throw new Error(`${version}: ${writeErr.message}`);
  }

  console.log(`\nWrote ${writes.length} summaries, ${failed} failed.`);
  console.log("Review them at /admin/changelog, then run `npm run ask:index`.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
