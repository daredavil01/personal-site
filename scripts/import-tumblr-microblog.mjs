#!/usr/bin/env node
/**
 * One-time / re-runnable importer:
 *   knowledge_base/tumblr_posts.json  →  Supabase `microblog` table.
 *
 * Cleans each exported Tumblr post (HTML-entity decode, <br> → newline),
 * normalises post_type, and UPSERTs on (source, source_id). It does NOT
 * clear the table first, so admin-authored `manual` rows are preserved and
 * re-runs never duplicate.
 *
 * Tags go to the central tag tables via the set_entity_tags RPC (not onto the
 * row), and only for posts whose export carries tags — so tags added in the
 * admin to an untagged Tumblr post survive a re-import.
 *
 * Uses the SERVICE ROLE key (bypasses RLS) — run locally only, never ship it.
 *
 * Usage:
 *   1. Apply supabase/migrations/0002_microblog.sql and 0003_centralized_tags.sql.
 *   2. Fill .env with SUPABASE_URL (or VITE_SUPABASE_URL) and
 *      SUPABASE_SERVICE_ROLE_KEY.
 *   3. npm run microblog:import
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_FILE = path.join(ROOT, "knowledge_base", "tumblr_posts.json");
const BATCH_SIZE = 500;

// --- minimal .env loader (so the script works without --env-file) ----------
function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Fill .env (see .env.example).",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// --- text cleanup ----------------------------------------------------------
const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", middot: "·", bull: "•", deg: "°",
  copy: "©", reg: "®", trade: "™", eacute: "é", hearts: "♥",
};

// Decode HTML entities (named + numeric) found in the exported `text` field.
function decodeEntities(input) {
  return input.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (match, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named !== undefined ? named : match;
  });
}

function cleanText(raw) {
  if (!raw) return "";
  let t = String(raw);
  t = t.replace(/<br\s*\/?>/gi, "\n"); // <br>, <br/>, <br /> → newline
  t = decodeEntities(t);
  t = t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n"); // tidy whitespace
  return t.trim();
}

const POST_TYPE_MAP = {
  npf_text: "text",
  npf_quote: "quote",
  photo: "photo",
  text: "text",
};

function toRow(post) {
  return {
    source: "tumblr",
    source_id: String(post.id),
    post_type: POST_TYPE_MAP[post.metadata?.post_type] || "text",
    date: post.date,
    title: cleanText(post.title) || "",
    text: cleanText(post.text) || "",
    url: post.url || null,
    image_url: null, // photo media isn't in the repo yet — backfilled later
  };
}

// --- run -------------------------------------------------------------------
async function importAll() {
  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`Source file not found: ${SOURCE_FILE}`);
  }

  const posts = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"))
    .filter((p) => p && p.id && p.date); // a valid date is required (NOT NULL column)
  const rows = posts.map(toRow);
  const tagsBySourceId = new Map(posts
    .filter((p) => Array.isArray(p.tags) && p.tags.length)
    .map((p) => [String(p.id), p.tags]));

  console.log(`\nImporting ${rows.length} posts → Supabase (microblog)\n`);

  let processed = 0;
  let tagged = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("microblog")
      .upsert(batch, { onConflict: "source,source_id" })
      .select("id, source_id");
    if (error) throw new Error(`batch ${i / BATCH_SIZE + 1}: ${error.message}`);
    processed += batch.length;

    for (const { id, source_id: sourceId } of data) {
      const tags = tagsBySourceId.get(sourceId);
      if (!tags) continue;
      const { error: tagErr } = await supabase.rpc("set_entity_tags", {
        p_type: "microblog", p_id: id, p_names: tags,
      });
      if (tagErr) throw new Error(`tags for post ${sourceId}: ${tagErr.message}`);
      tagged += 1;
    }
    console.log(`  ✓ upserted ${processed}/${rows.length} (${tagged} tagged)`);
  }

  const { count, error: countErr } = await supabase
    .from("microblog")
    .select("*", { count: "exact", head: true });
  if (countErr) throw new Error(`count: ${countErr.message}`);

  console.log(`\nDone. ${processed} posts upserted. Table now has ${count} rows.\n`);
}

importAll().catch((err) => {
  console.error(`\nImport failed: ${err.message}\n`);
  process.exit(1);
});
