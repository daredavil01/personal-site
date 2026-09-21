#!/usr/bin/env node
/**
 * Writes one summary per major version into `changelog_majors`
 * (0030_changelog_majors.sql): a headline, a paragraph, and the additions and
 * fixes worth naming.
 *
 * /changelog shows one major at a time. A major holds up to seventeen releases
 * and several hundred engineering entries, and the first thing a reader meets
 * should say what that chapter was about — so this is rendered first and the
 * entries are collapsed under it.
 *
 * The input is the per-version summaries `npm run changelog:notes` already
 * wrote, falling back to a version's entry names where it has none. Summarising
 * summaries keeps the prompt small (v6 alone is seventeen releases) and keeps
 * one voice across both levels.
 *
 * Usage:
 *   npm run changelog:majors -- --dry-run    print, write nothing
 *   npm run changelog:majors                 fill majors whose input changed
 *   npm run changelog:majors -- --major 18   one major
 *   npm run changelog:majors -- --force      rewrite even if nothing changed
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY in .env, and the
 * release_notes switch on under AI features in /admin/ask/settings — the same
 * switch and ladder the per-version summaries answer to.
 */

import { createHash } from "node:crypto";
import { makeClient } from "./build-docs.mjs";
import { askGemini, tiersForFeature } from "./lib/gemini.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const ONLY = argValue("--major") === null ? null : Number(argValue("--major"));

// Entry names only, not their bodies: the bodies are the engineering prose this
// summary exists to replace, and a major's worth of them does not fit in a
// prompt worth paying for.
const ENTRY_CAP = 40;

const SYSTEM = [
  "You write the chapter summary of a major version of a personal website, for its public changelog.",
  "The site belongs to Sanket Tambare: books, running, trekking, software projects, blog posts, micro-posts, and an /ask second brain over all of it.",
  "You are given every release inside one major version, newest first.",
  "Return JSON and nothing else, with exactly these keys:",
  '  "headline": under 8 words, naming what this major was about. No version number.',
  '  "summary": ONE paragraph, 2 to 4 sentences, what changed for someone who uses the site.',
  '  "added": up to 5 strings, the new things worth naming, one short phrase each.',
  '  "fixed": up to 4 strings, the fixes worth naming, one short phrase each.',
  "Rules: no version numbers, no dates, no file paths, no function or column names, no jargon a reader would look up.",
  "Do not invent anything absent from the releases. Do not say 'this release', 'we', or 'the site now'. No markdown, no bullets, no quotation marks inside the values.",
  "Leave a list empty rather than padding it. Plain, factual, unexcited.",
].join("\n");

/** The text a major is summarised from — and what its hash is taken over. */
function sourceFor(versions) {
  return versions.map((v) => {
    const names = (Array.isArray(v.changes) ? v.changes : [])
      .slice(0, ENTRY_CAP)
      .map((c) => `${c.kind || "Changed"}: ${c.name || (c.body || "").slice(0, 80)}`)
      .join("\n");
    // The reader-facing paragraph where there is one; the entry names otherwise.
    return `${v.version} (${v.released_on})\n${v.summary || names}`;
  }).join("\n\n");
}

const hash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 32);

/**
 * The model is told to return bare JSON; this is the guard for when it wraps it
 * in a fence or adds a sentence before it.
 */
function parseAnswer(raw) {
  const text = String(raw || "").trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in the answer");
  const parsed = JSON.parse(text.slice(start, end + 1));

  const list = (value, cap) => (Array.isArray(value) ? value : [])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, cap);

  const headline = String(parsed.headline || "").trim();
  const summary = String(parsed.summary || "").trim().replace(/\s*\n+\s*/g, " ");
  if (!headline || !summary) throw new Error("headline or summary missing");

  return {
    headline,
    summary,
    highlights: { added: list(parsed.added, 5), fixed: list(parsed.fixed, 4) },
  };
}

async function main() {
  const supabase = makeClient();
  const tiers = await tiersForFeature(supabase, "release_notes");

  const { data: rows, error } = await supabase
    .from("changelog")
    .select("version, released_on, major, minor, patch, summary, changes")
    .order("major", { ascending: false })
    .order("minor", { ascending: false })
    .order("patch", { ascending: false });
  if (error) throw new Error(`changelog: ${error.message}`);

  const byMajor = new Map();
  (rows || []).forEach((r) => {
    if (!byMajor.has(r.major)) byMajor.set(r.major, []);
    byMajor.get(r.major).push(r);
  });

  const { data: existing, error: readErr } = await supabase
    .from("changelog_majors")
    .select("major, source_hash");
  if (readErr) throw new Error(`changelog_majors: ${readErr.message}`);
  const knownHash = new Map((existing || []).map((r) => [r.major, r.source_hash]));

  let majors = [...byMajor.keys()].sort((a, b) => b - a);
  if (ONLY !== null) majors = majors.filter((m) => m === ONLY);

  const targets = majors.filter((m) => {
    const source = sourceFor(byMajor.get(m));
    return FORCE || knownHash.get(m) !== hash(source);
  });

  console.log(
    `${majors.length} majors, ${targets.length} to summarise`
    + `${FORCE ? " (--force)" : ""}${DRY_RUN ? " [dry run]" : ""}`,
  );

  const writes = [];
  let failed = 0;

  for (let i = 0; i < targets.length; i += 1) {
    const major = targets[i];
    const versions = byMajor.get(major);
    const source = sourceFor(versions);

    let answer;
    try {
      // eslint-disable-next-line no-await-in-loop
      const raw = await askGemini({
        tiers,
        system: SYSTEM,
        prompt: `Major version ${major}. ${versions.length} release${versions.length === 1 ? "" : "s"}.\n\n${source}`,
      });
      answer = parseAnswer(raw);
    } catch (err) {
      console.error(`  v${major}: ${err.message}`);
      failed += 1;
      continue;
    }

    console.log(`\n  v${major} — ${answer.headline}`);
    console.log(`    ${answer.summary}`);
    answer.highlights.added.forEach((a) => console.log(`    + ${a}`));
    answer.highlights.fixed.forEach((f) => console.log(`    ~ ${f}`));

    writes.push({
      major,
      headline: answer.headline,
      summary: answer.summary,
      highlights: answer.highlights,
      source_hash: hash(source),
      model: "gemini",
      generated_at: new Date().toISOString(),
    });
  }

  if (DRY_RUN || !writes.length) {
    console.log(`\n${writes.length} ready, ${failed} failed. Nothing written.`);
    return;
  }

  const { error: writeErr } = await supabase
    .from("changelog_majors")
    .upsert(writes, { onConflict: "major" });
  if (writeErr) throw new Error(`upsert: ${writeErr.message}`);

  console.log(`\nWrote ${writes.length} major summaries, ${failed} failed.`);
  console.log("Read them on /changelog before anyone else does.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
