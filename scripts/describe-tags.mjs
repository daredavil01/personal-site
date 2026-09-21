#!/usr/bin/env node
/**
 * Writes one sentence into tags.description for every tag that has none.
 *
 * Nothing new is built here: the column exists (0003), TagManager already edits
 * it, /tags and /tags/:name already render it, and ask-sources/tag.mjs already
 * indexes it. It is simply empty, so the pages show a bare list.
 *
 * The sentence is written from the tag's OWN items — read through the existing
 * tag_entities() RPC — so it describes what the tag actually covers on this
 * site rather than what the word means in general.
 *
 * Usage:
 *   npm run tags:describe -- --dry-run     print proposals, write nothing
 *   npm run tags:describe                  fill empty descriptions
 *   npm run tags:describe -- --force       also rewrite existing ones
 *   npm run tags:describe -- --limit 5     first N tags only
 *   npm run tags:describe -- --tag running one named tag
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY in .env, and the
 * tag_descriptions switch on under AI features in /admin/ask/settings.
 *
 * Re-runnable: without --force a tag that already has text is skipped, so a
 * hand-written description is never clobbered.
 */

import { makeClient } from "./build-docs.mjs";
import { askGemini, tiersForFeature } from "./lib/gemini.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const LIMIT = Number(argValue("--limit")) || 0;
const ONLY = argValue("--tag");

// How many of a tag's items go into the prompt. More than this and the prompt
// is long without being more informative — a tag's character shows in the first
// dozen things filed under it.
const SAMPLE = 12;

const SYSTEM = [
  "You write one-sentence descriptions of tags on a personal website.",
  "The site belongs to Sanket Tambare and covers books, running and trekking, software projects, blog posts and short micro-posts.",
  "Given a tag and a sample of the items filed under it, write ONE sentence saying what that tag covers ON THIS SITE.",
  "Rules: under 25 words. Plain English, no marketing tone. Start with a noun phrase, not 'This tag'. Do not invent items or counts. Do not use quotation marks. Return the sentence alone, nothing else.",
].join(" ");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

function buildPrompt(tag, items) {
  const lines = items
    .slice(0, SAMPLE)
    .map((it) => `- [${it.entity_type}] ${it.title}${it.subtitle ? ` — ${it.subtitle}` : ""}`);
  return [
    `Tag: ${tag.display_name || tag.name}`,
    tag.category ? `Category: ${tag.category}` : null,
    `Items filed under it (${items.length} total, showing ${lines.length}):`,
    ...lines,
  ].filter(Boolean).join("\n");
}

// The model is told to return a bare sentence; this is the guard for when it
// returns a quoted one, a bulleted one, or three.
function tidy(text) {
  const first = text.trim().split(/\n+/)[0].replace(/^[-*\s]+/, "").trim();
  return first.replace(/^["']|["']$/g, "").trim();
}

async function main() {
  const supabase = makeClient();
  const tiers = await tiersForFeature(supabase, "tag_descriptions");

  const { data: tags, error } = await supabase
    .from("tags")
    .select("id, name, display_name, category, description")
    .order("name");
  if (error) throw error;

  let targets = tags.filter((t) => FORCE || !(t.description || "").trim());
  if (ONLY) targets = targets.filter((t) => t.name === ONLY.toLowerCase());
  if (LIMIT) targets = targets.slice(0, LIMIT);

  console.log(
    `${tags.length} tags, ${targets.length} to describe`
    + `${FORCE ? " (--force: rewriting existing)" : ""}${DRY_RUN ? " [dry run]" : ""}`,
  );

  let written = 0;
  let skipped = 0;
  let failed = 0;

  for (const tag of targets) {
    // eslint-disable-next-line no-await-in-loop
    const { data: items, error: itemsError } = await supabase.rpc("tag_entities", { p_name: tag.name });
    if (itemsError) {
      console.error(`  ${tag.name}: tag_entities failed — ${itemsError.message}`);
      failed += 1;
      continue;
    }
    // A tag with nothing filed under it gets no sentence. Describing an empty
    // tag means inventing what it covers, which is exactly what we don't want.
    if (!items?.length) {
      console.log(`  ${tag.name}: no items, skipped`);
      skipped += 1;
      continue;
    }

    let sentence;
    try {
      // eslint-disable-next-line no-await-in-loop
      sentence = tidy(await askGemini({ tiers, system: SYSTEM, prompt: buildPrompt(tag, items) }));
    } catch (err) {
      console.error(`  ${tag.name}: ${err.message}`);
      failed += 1;
      continue;
    }
    if (!sentence) {
      console.error(`  ${tag.name}: empty answer`);
      failed += 1;
      continue;
    }

    console.log(`  ${tag.name} (${items.length}) → ${sentence}`);
    if (DRY_RUN) continue;

    // eslint-disable-next-line no-await-in-loop
    const { error: writeError } = await supabase
      .from("tags")
      .update({ description: sentence })
      .eq("id", tag.id);
    if (writeError) {
      console.error(`  ${tag.name}: write failed — ${writeError.message}`);
      failed += 1;
      continue;
    }
    written += 1;
  }

  console.log(
    DRY_RUN
      ? `\nDry run: ${targets.length - skipped - failed} proposed, ${skipped} skipped, ${failed} failed. Nothing written.`
      : `\nWrote ${written}, skipped ${skipped}, failed ${failed}.`
      + (written ? " Re-run `npm run ask:index` to reindex the tag chunks." : ""),
  );
}

main().catch((err) => {
  console.error(`\n${err.message || err}`);
  process.exit(1);
});
