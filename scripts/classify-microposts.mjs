#!/usr/bin/env node
/**
 * Decides whether each micro-post is the author's own thought, a quote, a
 * reblog or a link-share, and stores the verdict in microblog.post_kind (0025).
 *
 * CLAUDE.md currently tells the /ask persona to say, in prose, that a
 * micro-post "may be a reblog of someone else — not a considered position".
 * That is a warning a model has to remember to give. A column makes it
 * structural: the card can label it, the reader can filter to the posts that
 * are actually his, and /ask can weight it.
 *
 * Usage:
 *   npm run microblog:classify -- --dry-run --limit 20   print, write nothing
 *   npm run microblog:classify -- --limit 50             a slice
 *   npm run microblog:classify                           everything unclassified
 *   npm run microblog:classify -- --undo <journal.json>  put it back
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY in .env, and the
 * microblog_kind switch on under AI features in /admin/ask/settings.
 *
 * Same bargain as microblog:tag, for the same reasons: every real run writes a
 * journal to knowledge_base/microblog-kind-journal-<timestamp>.json holding
 * each row's value before and after, --undo replays it backwards, and the pass
 * is resumable because a row that already has a post_kind is skipped.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { makeClient } from "./build-docs.mjs";
import { askGemini, parseJson, tiersForFeature } from "./lib/gemini.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JOURNAL_DIR = path.join(ROOT, "knowledge_base");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = Number(argValue("--limit")) || 0;
const UNDO = argValue("--undo");

const PAGE = 1000;
const MAX_TEXT = 900;

// Must match the CHECK constraint in 0025. An answer outside this set is
// dropped rather than coerced — a wrong verdict is worse than no verdict.
const KINDS = ["own", "quote", "reblog", "link"];

const SYSTEM = [
  "You classify short posts from one person's micro-blog, imported from Tumblr.",
  "Decide what the post IS, not what it is about.",
  "own: the author's own words — a thought, an observation, a note to self.",
  "quote: someone else's words presented as a quotation, usually with an attribution.",
  "reblog: someone else's post passed along, with little or nothing added.",
  "link: a link shared with at most a line of framing.",
  `Return JSON: {"kind": one of ${KINDS.join(" | ")}, "confidence": 0 to 1}.`,
  "Confidence is your own, and a genuinely ambiguous post should score low rather than be forced.",
  "Marathi and English posts are both expected; the language says nothing about the kind.",
  "Return the JSON object alone, with no prose and no code fence.",
].join(" ");

async function fetchUnclassified(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("microblog")
      .select("id, title, text, post_type, url, post_kind")
      .is("post_kind", null)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

function buildPrompt(row) {
  return [
    row.title ? `Title: ${row.title}` : null,
    // The Tumblr export's own label ('text' | 'quote' | 'photo'). Evidence,
    // not an answer: a great many 'text' posts are reblogs.
    row.post_type ? `Tumblr post type: ${row.post_type}` : null,
    row.url ? `Carries a link: ${row.url}` : null,
    `Post:\n${String(row.text || "").slice(0, MAX_TEXT)}`,
  ].filter(Boolean).join("\n");
}

/** The model's answer, or null when it is not one of the four. */
function readVerdict(answer) {
  const parsed = parseJson(answer);
  const kind = String(parsed?.kind || "").trim().toLowerCase();
  if (!KINDS.includes(kind)) return null;
  const raw = Number(parsed?.confidence);
  const confidence = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 1) : null;
  return { kind, confidence };
}

async function undo(supabase, file) {
  const journal = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Restoring ${journal.entries.length} row(s) from ${path.basename(file)}`);
  let restored = 0;
  for (const entry of journal.entries) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await supabase
      .from("microblog")
      .update({ post_kind: entry.before, post_kind_confidence: entry.beforeConfidence ?? null })
      .eq("id", entry.id);
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

  const tiers = await tiersForFeature(supabase, "microblog_kind");

  let rows = await fetchUnclassified(supabase);
  const total = rows.length;
  if (LIMIT) rows = rows.slice(0, LIMIT);

  console.log(`${total} unclassified post(s), ${rows.length} in this run${DRY_RUN ? " [dry run]" : ""}`);
  if (!DRY_RUN && rows.length) {
    console.log("At ~15 requests a minute this takes about "
      + `${Math.ceil((rows.length * 4.5) / 60)} minute(s). Ctrl-C is safe — it resumes.`);
  }

  const entries = [];
  const tally = {};
  let unsure = 0;
  let failed = 0;

  for (const row of rows) {
    let verdict;
    try {
      // eslint-disable-next-line no-await-in-loop
      const answer = await askGemini({ tiers, system: SYSTEM, prompt: buildPrompt(row) });
      verdict = readVerdict(answer);
    } catch (err) {
      console.error(`  ${row.id}: ${err.message}`);
      failed += 1;
      continue;
    }

    if (!verdict) {
      unsure += 1;
      continue;
    }

    const preview = String(row.title || row.text || "").replace(/\s+/g, " ").slice(0, 60);
    const shown = verdict.confidence === null
      ? verdict.kind
      : `${verdict.kind} ${verdict.confidence.toFixed(2)}`;
    console.log(`  ${row.id} ${preview} → ${shown}`);
    tally[verdict.kind] = (tally[verdict.kind] || 0) + 1;
    if (DRY_RUN) continue;

    // eslint-disable-next-line no-await-in-loop
    const { error } = await supabase
      .from("microblog")
      .update({ post_kind: verdict.kind, post_kind_confidence: verdict.confidence })
      .eq("id", row.id);
    if (error) {
      console.error(`  ${row.id}: write failed — ${error.message}`);
      failed += 1;
      continue;
    }
    entries.push({
      id: row.id,
      before: row.post_kind ?? null,
      beforeConfidence: null,
      after: verdict.kind,
    });
  }

  if (entries.length) {
    fs.mkdirSync(JOURNAL_DIR, { recursive: true });
    const file = path.join(
      JOURNAL_DIR,
      `microblog-kind-journal-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );
    fs.writeFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), entries }, null, 2)}\n`, "utf8");
    console.log(`\nJournal: ${path.relative(ROOT, file)}`);
    console.log(`Undo with: npm run microblog:classify -- --undo ${path.relative(ROOT, file)}`);
  }

  const counts = KINDS.filter((k) => tally[k]).map((k) => `${tally[k]} ${k}`).join(", ") || "none";
  console.log(
    `\n${DRY_RUN ? "Dry run: " : ""}${counts}`
    + `${unsure ? `, ${unsure} unreadable answer(s) left unclassified` : ""}`
    + `${failed ? `, ${failed} failed` : ""}.`
    + (DRY_RUN ? " Nothing written." : ""),
  );
}

main().catch((err) => {
  console.error(`\n${err.message || err}`);
  process.exit(1);
});
