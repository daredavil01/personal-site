#!/usr/bin/env node
/**
 * One-time migration: legacy text[] tag columns → the central `tags` +
 * `tag_associations` tables (supabase/migrations/0003_centralized_tags.sql).
 *
 *   books.tags, blogs.blog_tags, instagram.tags, microblog.tags
 *
 * Each row's tags go through the same set_entity_tags RPC the admin uses, so
 * normalization (lowercase, trim, dedupe) is identical. Idempotent: the RPC
 * replaces a row's whole tag set, and rows whose legacy column is now empty
 * have their associations cleared — safe to re-run right before deploying.
 * Original casing that differs from the lowercase name is kept as the tag's
 * display_name (only where none is set yet).
 *
 * Ends with a verify step: for every type, the legacy (row, tag) pairs must
 * equal the tag_associations rows. Exits non-zero on any mismatch.
 *
 * Uses the SERVICE ROLE key (bypasses RLS) — run locally only, never ship it.
 *
 * Usage:
 *   1. Apply 0003_centralized_tags.sql. Do NOT apply 0004 until this passes.
 *   2. Fill .env with SUPABASE_URL (or VITE_SUPABASE_URL) and
 *      SUPABASE_SERVICE_ROLE_KEY.
 *   3. npm run tags:migrate -- --dry-run     (prints the plan, writes nothing)
 *   4. npm run tags:migrate
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.includes("--dry-run");
const PAGE = 1000;

const SOURCES = [
  { table: "books", column: "tags", type: "book" },
  { table: "blogs", column: "blog_tags", type: "blog" },
  { table: "instagram", column: "tags", type: "instagram" },
  { table: "microblog", column: "tags", type: "microblog" },
];

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

// Mirrors set_entity_tags: lowercase, trim, drop blanks, dedupe in order.
const normalize = (names) => [...new Set(
  (names || []).map((n) => String(n).trim().toLowerCase()).filter(Boolean),
)];

async function fetchTaggedRows({ table, column }) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${column}`)
      .neq(column, "{}")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) {
      if (/does not exist/.test(error.message)) {
        throw new Error(`${table}.${column} is gone — 0004 was already applied; nothing left to migrate.`);
      }
      throw new Error(`${table}: ${error.message}`);
    }
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function countAssociations(type) {
  const { count, error } = await supabase
    .from("tag_associations")
    .select("*", { count: "exact", head: true })
    .eq("entity_type", type);
  if (error) throw new Error(`count ${type}: ${error.message}`);
  return count ?? 0;
}

async function run() {
  console.log(`\nMigrating legacy tag columns → tags / tag_associations${DRY_RUN ? " (dry run)" : ""}\n`);

  const displayNames = new Map(); // name → first non-lowercase original spelling
  const plan = [];

  for (const source of SOURCES) {
    const rows = await fetchTaggedRows(source);
    const entries = rows.map((r) => {
      (r[source.column] || []).forEach((raw) => {
        const original = String(raw).trim();
        const name = original.toLowerCase();
        if (original && original !== name && !displayNames.has(name)) displayNames.set(name, original);
      });
      return { id: r.id, names: normalize(r[source.column]) };
    }).filter((e) => e.names.length);
    const pairs = entries.reduce((n, e) => n + e.names.length, 0);
    plan.push({ ...source, entries, pairs });
    console.log(`  ${source.table.padEnd(10)} ${String(entries.length).padStart(5)} rows  ${String(pairs).padStart(5)} tag links`);
  }

  const distinct = new Set(plan.flatMap((p) => p.entries.flatMap((e) => e.names)));
  console.log(`\n  ${distinct.size} distinct tags, ${displayNames.size} with a display spelling\n`);

  if (DRY_RUN) {
    console.log("Dry run — nothing written.\n");
    return;
  }

  for (const source of plan) {
    for (const { id, names } of source.entries) {
      const { error } = await supabase.rpc("set_entity_tags", {
        p_type: source.type, p_id: id, p_names: names,
      });
      if (error) throw new Error(`${source.table} #${id}: ${error.message}`);
    }

    // Rows whose legacy tags were emptied since an earlier run.
    const ids = source.entries.map((e) => e.id);
    let clear = supabase.from("tag_associations").delete().eq("entity_type", source.type);
    if (ids.length) clear = clear.not("entity_id", "in", `(${ids.join(",")})`);
    const { error: clearErr } = await clear;
    if (clearErr) throw new Error(`clearing stale ${source.type} tags: ${clearErr.message}`);

    console.log(`  ✓ ${source.table}`);
  }

  for (const [name, displayName] of displayNames) {
    const { error } = await supabase
      .from("tags")
      .update({ display_name: displayName })
      .eq("name", name)
      .is("display_name", null);
    if (error) throw new Error(`display name for "${name}": ${error.message}`);
  }

  console.log("\nVerifying…");
  let ok = true;
  for (const { type, table, pairs } of plan) {
    const actual = await countAssociations(type);
    const match = actual === pairs;
    ok = ok && match;
    console.log(`  ${match ? "✓" : "✗"} ${table.padEnd(10)} expected ${pairs}, found ${actual}`);
  }

  if (!ok) {
    console.error("\nMismatch — do NOT apply 0004. Re-run, and check for tag edits made meanwhile.\n");
    process.exit(1);
  }
  console.log("\nDone. Safe to deploy, then apply 0004_drop_legacy_tag_columns.sql.\n");
}

run().catch((err) => {
  console.error(`\nMigration failed: ${err.message}\n`);
  process.exit(1);
});
