#!/usr/bin/env node
/**
 * Fill the blanks in scripts/books-metadata-fill.json with Gemini's proposals.
 *
 * Step 2.5 of an existing three-step pipeline, not a new one:
 *
 *   npm run books:template          # what is still missing  (unchanged)
 *   npm run books:propose           # THIS — proposes into the same file
 *   npm run books:apply -- --dry-run
 *   npm run books:apply             # the human gate         (unchanged)
 *
 * It writes only into the template file, never into the database, so the review
 * step that already exists stays the review step. The API backfill
 * (books:backfill) reaches most English titles; this is aimed at what it cannot
 * — the Marathi half of the shelf, which no book API indexes.
 *
 * Usage:
 *   npm run books:propose -- --dry-run   print proposals, leave the file alone
 *   npm run books:propose                write them into the template
 *   npm run books:propose -- --limit 5   first N books only
 *   npm run books:propose -- --force     re-propose fields that already have a value
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY in .env, and the
 * book_metadata switch on under AI features in /admin/ask/settings.
 *
 * A proposal is a guess. `cover_url` is deliberately never proposed — a
 * hallucinated ISBN is visible in review, a hallucinated image URL is a 404 that
 * books:apply would try to download.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { makeClient } from "./build-docs.mjs";
import { askGemini, parseJson, tiersForFeature } from "./lib/gemini.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILL_FILE = path.join(ROOT, "scripts", "books-metadata-fill.json");

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const LIMIT = Number(argValue("--limit")) || 0;

// What the model may propose. cover_url is not on this list on purpose: see the
// header. Keys match the template's, which match the books columns.
const FIELDS = ["isbn", "page_count", "publisher", "first_published"];
const NUMERIC = new Set(["page_count", "first_published"]);

const SYSTEM = [
  "You are filling bibliographic metadata for a personal reading list.",
  "Given a book's title and author, return what you know about that edition as JSON.",
  'Shape: {"isbn": string|null, "page_count": number|null, "publisher": string|null, "first_published": number|null}.',
  "first_published is the year the work first appeared, not this edition's year.",
  "Marathi titles are expected; answer for the Marathi edition where the title is Marathi.",
  "Use null for anything you are not confident about. A null is correct; a guess is not.",
  "Return the JSON object alone, with no prose and no code fence.",
].join(" ");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const isBlank = (v) => v === null || v === undefined || v === "";

/** Keeps only fields the template actually asked for and the model answered. */
function usable(entry, proposed) {
  const out = {};
  FIELDS.forEach((key) => {
    if (!(key in entry)) return; // the template did not ask for this one
    if (!FORCE && !isBlank(entry[key])) return; // already filled in by hand
    const value = proposed?.[key];
    if (isBlank(value)) return;
    if (NUMERIC.has(key)) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) out[key] = Math.round(n);
      return;
    }
    const text = String(value).trim();
    // An ISBN is 10 or 13 digits once the hyphens are gone. Anything else is
    // the model narrating, and it would reach the database through books:apply.
    if (key === "isbn" && !/^\d{10}(\d{3})?$/.test(text.replace(/[-\s]/g, ""))) return;
    if (text) out[key] = key === "isbn" ? text.replace(/[-\s]/g, "") : text;
  });
  return out;
}

async function main() {
  const supabase = makeClient();
  const tiers = await tiersForFeature(supabase, "book_metadata");

  if (!fs.existsSync(FILL_FILE)) {
    console.error(`No ${path.relative(ROOT, FILL_FILE)}. Run npm run books:template first.`);
    process.exit(1);
  }
  const fill = JSON.parse(fs.readFileSync(FILL_FILE, "utf8"));

  let ids = Object.keys(fill);
  if (LIMIT) ids = ids.slice(0, LIMIT);
  console.log(`${ids.length} book(s) in the template${DRY_RUN ? " [dry run]" : ""}`);

  let filled = 0;
  let empty = 0;
  let failed = 0;

  for (const id of ids) {
    const entry = fill[id];
    const wanted = FIELDS.filter((k) => k in entry && (FORCE || isBlank(entry[k])));
    if (!wanted.length) continue;

    const prompt = [
      `Title: ${entry._title || ""}`,
      `Author: ${entry._author || ""}`,
      entry._language ? `Language: ${entry._language}` : null,
      `Fields wanted: ${wanted.join(", ")}`,
    ].filter(Boolean).join("\n");

    let proposed;
    try {
      // eslint-disable-next-line no-await-in-loop
      proposed = parseJson(await askGemini({ tiers, system: SYSTEM, prompt }));
    } catch (err) {
      console.error(`  ${id} ${entry._title}: ${err.message}`);
      failed += 1;
      continue;
    }

    const accepted = usable(entry, proposed);
    if (!Object.keys(accepted).length) {
      console.log(`  ${id} ${entry._title}: nothing usable`);
      empty += 1;
      continue;
    }
    console.log(`  ${id} ${entry._title}: ${JSON.stringify(accepted)}`);
    Object.assign(entry, accepted);
    filled += 1;
  }

  if (!DRY_RUN && filled) {
    fs.writeFileSync(FILL_FILE, `${JSON.stringify(fill, null, 2)}\n`, "utf8");
  }

  console.log(
    DRY_RUN
      ? `\nDry run: ${filled} book(s) would be filled, ${empty} had nothing usable, ${failed} failed. File untouched.`
      : `\nFilled ${filled}, ${empty} had nothing usable, ${failed} failed.`
      + (filled ? " Review the file, then: npm run books:apply -- --dry-run" : ""),
  );
}

main().catch((err) => {
  console.error(`\n${err.message || err}`);
  process.exit(1);
});
