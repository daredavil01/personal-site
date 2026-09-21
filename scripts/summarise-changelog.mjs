#!/usr/bin/env node
/**
 * Writes one reader-facing paragraph under each version heading in
 * src/data/changelog.md.
 *
 * The engineering entries stay exactly as they are. They explain *why*, which
 * is the reason this changelog is worth reading at all — but a visitor landing
 * on /changelog meets `fts_en`, RRF and `ts_rank_cd` in the first sentence.
 * The paragraph goes in as a blockquote directly under the `## [vX.Y.Z]` line,
 * so markdown-to-jsx renders it on /changelog with no component work, and the
 * parser in src/lib/changelogEntries.js ignores it (it reads `-` bullets under
 * `###` headings, and a blockquote is neither).
 *
 * Usage:
 *   npm run changelog:notes -- --dry-run      print, write nothing
 *   npm run changelog:notes                   fill versions that have none
 *   npm run changelog:notes -- --limit 3      newest N versions only
 *   npm run changelog:notes -- --version v18.2.0
 *   npm run changelog:notes -- --force        rewrite existing paragraphs
 *
 * Needs GEMINI_API_KEY in .env and the release_notes switch on under AI
 * features in /admin/ask/settings. SUPABASE_SERVICE_ROLE_KEY is needed only to
 * read that switch and the model ladder.
 *
 * The human gate is git: this edits a tracked file and nothing is published
 * until the diff is read and committed.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeClient } from "./build-docs.mjs";
import { askGemini, tiersForFeature } from "./lib/gemini.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "src", "data", "changelog.md");

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const LIMIT = Number(argValue("--limit")) || 0;
const ONLY = argValue("--version");

const VERSION_RE = /^##\s+\[?(v[\d.]+)\]?\s*[—–-]\s*(\d{4}-\d{2}-\d{2})/;

const SYSTEM = [
  "You write the short public summary of a software release for a personal website.",
  "The site belongs to Sanket Tambare: books, running, trekking, software projects, blog posts, micro-posts, and an /ask second brain over all of it.",
  "You are given the engineering changelog entries for one version. Write ONE paragraph, 2 to 3 sentences, saying what changed for someone who uses the site.",
  "Rules: no version number, no dates, no file paths, no function or column names, no jargon a reader would have to look up.",
  "Do not invent anything that is not in the entries. Do not say 'this release' or 'we'. Do not use bullet points, headings or quotation marks.",
  "Plain, factual, unexcited. Return the paragraph alone.",
].join(" ");

/**
 * Splits the file into blocks, one per `## [vX]` heading, plus the preamble.
 *
 * Text-level rather than reusing parseChangelog(): that returns structured
 * changes and deliberately drops everything it does not recognise, and this
 * script has to write the file back byte for byte apart from the lines it adds.
 */
function splitVersions(md) {
  const lines = md.split("\n");
  const blocks = [];
  let current = { version: null, date: null, start: 0 };

  lines.forEach((line, i) => {
    const m = line.match(VERSION_RE);
    if (!m) return;
    current.end = i;
    blocks.push(current);
    current = { version: m[1], date: m[2], start: i };
  });
  current.end = lines.length;
  blocks.push(current);

  return { lines, blocks: blocks.filter((b) => b.version) };
}

/** Whether a block already carries a summary blockquote under its heading. */
function hasSummary(lines, block) {
  for (let i = block.start + 1; i < block.end; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    return line.startsWith(">");
  }
  return false;
}

/** The bullets of one version, as the model should see them. */
function bulletsOf(lines, block) {
  return lines
    .slice(block.start + 1, block.end)
    .filter((l) => /^[-*]\s+/.test(l))
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

  const md = fs.readFileSync(FILE, "utf8");
  const { lines, blocks } = splitVersions(md);

  let targets = blocks.filter((b) => FORCE || !hasSummary(lines, b));
  if (ONLY) targets = targets.filter((b) => b.version === ONLY);
  if (LIMIT) targets = targets.slice(0, LIMIT);

  console.log(
    `${blocks.length} versions, ${targets.length} to summarise`
    + `${FORCE ? " (--force: rewriting existing)" : ""}${DRY_RUN ? " [dry run]" : ""}`,
  );

  // Collected and applied in one pass at the end: line numbers shift the
  // moment anything is inserted, and editing while iterating is how an
  // off-by-one silently moves a paragraph under the wrong version.
  const inserts = [];
  let failed = 0;

  for (const block of targets) {
    const bullets = bulletsOf(lines, block);
    if (!bullets.trim()) {
      console.log(`  ${block.version}: no entries, skipped`);
      continue;
    }

    let paragraph;
    try {
      // eslint-disable-next-line no-await-in-loop
      paragraph = tidy(await askGemini({
        tiers,
        system: SYSTEM,
        prompt: `Version ${block.version}, released ${block.date}.\n\n${bullets}`,
      }));
    } catch (err) {
      console.error(`  ${block.version}: ${err.message}`);
      failed += 1;
      continue;
    }
    if (!paragraph) {
      console.error(`  ${block.version}: empty answer`);
      failed += 1;
      continue;
    }

    console.log(`\n  ${block.version} → ${paragraph}`);
    inserts.push({ block, paragraph });
  }

  if (DRY_RUN || !inserts.length) {
    console.log(`\n${inserts.length} ready, ${failed} failed. Nothing written.`);
    return;
  }

  const out = [...lines];
  // Bottom-up, so an insertion never moves a line number still to be used.
  inserts
    .sort((a, b) => b.block.start - a.block.start)
    .forEach(({ block, paragraph }) => {
      if (FORCE && hasSummary(lines, block)) {
        const at = out.findIndex((l, i) => i > block.start && l.trim().startsWith(">"));
        if (at !== -1) out.splice(at, 1);
      }
      out.splice(block.start + 1, 0, "", `> ${paragraph}`);
    });

  fs.writeFileSync(FILE, out.join("\n"), "utf8");
  console.log(`\nWrote ${inserts.length} summaries into ${path.relative(ROOT, FILE)}, ${failed} failed.`);
  console.log("Read the diff before committing — nothing here has been seen by a human yet.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
