#!/usr/bin/env node
/**
 * Builds public/data/microblog-insights.json — the Overview story and the
 * Stats tab of /micro-blog — from every row of the `microblog` table.
 * No model calls; the analysis is src/lib/microblogInsights.js (tested).
 *
 * The table is public under RLS, so this reads with the service-role key when
 * .env has one and the committed publishable key (wrangler.toml) otherwise.
 * What ships is derived: counts, the posting clock, tag lives, phrases, four
 * quoted moments and the id pool the daily ten are drawn from. Post text stays
 * in Supabase; the page fetches the ten by id.
 *
 * Usage: npm run microblog:insights [-- --dry-run]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./build-docs.mjs";
import { writeJsonIfChanged } from "./lib/dataFile.mjs";
import { buildInsights } from "../src/lib/microblogInsights.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/data/microblog-insights.json");
const DRY_RUN = process.argv.includes("--dry-run");
const PAGE = 1000;

function client() {
  loadEnv();
  const toml = fs.existsSync(path.join(ROOT, "wrangler.toml")) ? fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8") : "";
  const fromToml = (k) => (toml.match(new RegExp(`^\\s*${k}\\s*=\\s*"([^"]+)"`, "m")) || [])[1];
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || fromToml("VITE_SUPABASE_URL");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || fromToml("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    console.error("Missing a Supabase URL / key (.env or wrangler.toml).");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadRows(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("microblog")
      .select("id, source, post_type, post_kind, date, title, text, tag_names, image_url")
      .order("date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`microblog: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

const rows = await loadRows(client());
if (!rows.length) {
  console.error("No micro-posts came back — refusing to write an empty file.");
  process.exit(1);
}
const doc = buildInsights(rows);
const text = `${JSON.stringify(doc)}\n`;
const { all } = doc;
console.log(`  ${all.posts} posts, ${doc.years.length} years, ${all.timed} timed, pool ${doc.pool.length}`);
console.log(`  ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`);
if (DRY_RUN) {
  console.log("  dry run: nothing written");
} else {
  console.log(writeJsonIfChanged(OUT, text) ? `  wrote ${path.relative(ROOT, OUT)}` : "  unchanged");
}
