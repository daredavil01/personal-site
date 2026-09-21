#!/usr/bin/env node
/**
 * Tags the untagged half of the micro-blog against the central vocabulary.
 *
 * The Tumblr import only wrote tags "for posts that have them", so a large share
 * of the 1,600+ rows carry none and are invisible to /tags, to the `?tags=`
 * filter and to microblog_tag_facets(). Nothing needs building to fix that —
 * the tag pages, filters and facets exist and are starved of data.
 *
 * Writes go through set_entity_tags, the same RPC the admin form uses, so tag
 * arrays are never written onto the row and a new tag is never created here:
 * the model's answer is intersected with the existing vocabulary first.
 *
 * Usage:
 *   npm run microblog:tag -- --dry-run --limit 20   print, write nothing
 *   npm run microblog:tag -- --limit 50             a slice
 *   npm run microblog:tag                           the whole untagged set
 *   npm run microblog:tag -- --undo <journal.json>  put it back
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY in .env, and the
 * microblog_autotag switch on under AI features in /admin/ask/settings.
 *
 * Reversible on purpose. Every real run appends to a journal in
 * knowledge_base/microblog-tag-journal-<timestamp>.json holding each row's tags
 * before and after; --undo replays it backwards. At ~15 requests a minute this
 * is a long run, so it is also resumable: a row that already has tags is skipped.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { makeClient } from "./build-docs.mjs";
import { askGemini, parseJson, tiersForFeature } from "./lib/gemini.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JOURNAL_DIR = path.join(ROOT, "knowledge_base");

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = Number(argValue("--limit")) || 0;
const UNDO = argValue("--undo");

const PAGE = 1000;
// Enough of a post for the subject to be clear; a long one is rambling by then.
const MAX_TEXT = 900;
const MAX_TAGS = 4;

const SYSTEM = [
  "You file short posts from a personal micro-blog under tags that already exist.",
  "You are given one post and the site's full tag vocabulary.",
  "Choose only from that vocabulary. Never invent a tag, never translate one, never change its spelling.",
  `Return JSON: {"tags": [at most ${MAX_TAGS} names]}.`,
  "Prefer few and right over many. An empty list is the correct answer for a post that fits nothing.",
  "Many posts are reblogs or quotes rather than the author's own thoughts — tag them by subject anyway.",
  "Marathi tag names are expected and are returned exactly as given.",
  "Return the JSON object alone, with no prose and no code fence.",
].join(" ");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

async function fetchAllUntagged(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("microblog")
      .select("id, title, text, post_type, date, tag_names")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  // Resumable: anything already tagged, by hand or by an earlier run, is done.
  return rows.filter((r) => !(r.tag_names || []).length);
}

function buildPrompt(row, vocabulary) {
  return [
    row.title ? `Title: ${row.title}` : null,
    row.post_type ? `Type: ${row.post_type}` : null,
    `Post:\n${String(row.text || "").slice(0, MAX_TEXT)}`,
    `\nThe tag vocabulary (${vocabulary.length}):\n${vocabulary.join(", ")}`,
  ].filter(Boolean).join("\n");
}

/**
 * Model names → stored names, dropping anything that is not a real tag.
 *
 * Case-insensitive because tag names are stored lowercase, and it returns the
 * STORED spelling so a title-cased answer cannot create a duplicate.
 */
function knownOnly(names, bySlug) {
  const out = [];
  (Array.isArray(names) ? names : []).forEach((raw) => {
    const real = bySlug.get(String(raw || "").trim().toLowerCase());
    if (real && !out.includes(real)) out.push(real);
  });
  return out.slice(0, MAX_TAGS);
}

async function undo(supabase, file) {
  const journal = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Restoring ${journal.entries.length} row(s) from ${path.basename(file)}`);
  let restored = 0;
  for (const entry of journal.entries) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await supabase.rpc("set_entity_tags", {
      p_type: "microblog",
      p_id: entry.id,
      p_names: entry.before,
    });
    if (error) console.error(`  ${entry.id}: ${error.message}`);
    else restored += 1;
  }
  console.log(`\nRestored ${restored} of ${journal.entries.length}.`);
}

async function main() {
  const supabase = makeClient();

  if (UNDO) {
    await undo(supabase, path.resolve(UNDO));
    return;
  }

  const tiers = await tiersForFeature(supabase, "microblog_autotag");

  const { data: tagRows, error: tagError } = await supabase.from("tags").select("name").order("name");
  if (tagError) throw tagError;
  const vocabulary = tagRows.map((t) => t.name).filter(Boolean);
  const bySlug = new Map(vocabulary.map((n) => [n.toLowerCase(), n]));

  let rows = await fetchAllUntagged(supabase);
  const total = rows.length;
  if (LIMIT) rows = rows.slice(0, LIMIT);

  console.log(
    `${total} untagged post(s), ${rows.length} in this run, ${vocabulary.length} tags`
    + `${DRY_RUN ? " [dry run]" : ""}`,
  );
  if (!DRY_RUN && rows.length) {
    console.log("At ~15 requests a minute this takes about "
      + `${Math.ceil((rows.length * 4.5) / 60)} minute(s). Ctrl-C is safe — it resumes.`);
  }

  const entries = [];
  let tagged = 0;
  let none = 0;
  let failed = 0;

  for (const row of rows) {
    let chosen;
    try {
      // eslint-disable-next-line no-await-in-loop
      const answer = await askGemini({ tiers, system: SYSTEM, prompt: buildPrompt(row, vocabulary) });
      chosen = knownOnly(parseJson(answer)?.tags, bySlug);
    } catch (err) {
      console.error(`  ${row.id}: ${err.message}`);
      failed += 1;
      continue;
    }

    if (!chosen.length) {
      none += 1;
      continue;
    }

    const preview = String(row.title || row.text || "").replace(/\s+/g, " ").slice(0, 60);
    console.log(`  ${row.id} ${preview} → ${chosen.join(", ")}`);
    if (DRY_RUN) continue;

    // eslint-disable-next-line no-await-in-loop
    const { error } = await supabase.rpc("set_entity_tags", {
      p_type: "microblog",
      p_id: row.id,
      p_names: chosen,
    });
    if (error) {
      console.error(`  ${row.id}: write failed — ${error.message}`);
      failed += 1;
      continue;
    }
    entries.push({ id: row.id, before: row.tag_names || [], after: chosen });
    tagged += 1;
  }

  if (entries.length) {
    fs.mkdirSync(JOURNAL_DIR, { recursive: true });
    const file = path.join(
      JOURNAL_DIR,
      `microblog-tag-journal-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );
    fs.writeFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), entries }, null, 2)}\n`, "utf8");
    console.log(`\nJournal: ${path.relative(ROOT, file)}`);
    console.log(`Undo with: npm run microblog:tag -- --undo ${path.relative(ROOT, file)}`);
  }

  console.log(
    DRY_RUN
      ? `\nDry run: ${rows.length - none - failed} would be tagged, ${none} fit nothing, ${failed} failed. Nothing written.`
      : `\nTagged ${tagged}, ${none} fit nothing, ${failed} failed.`
      + (tagged ? " Re-run `npm run ask:index` to reindex." : ""),
  );
}

main().catch((err) => {
  console.error(`\n${err.message || err}`);
  process.exit(1);
});
