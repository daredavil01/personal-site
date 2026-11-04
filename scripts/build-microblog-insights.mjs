#!/usr/bin/env node
/**
 * Builds public/data/microblog-insights.json — the Overview story and the
 * Stats tab of /micro-blog — from every row of the `microblog` table.
 * No model calls; the analysis is src/lib/microblogInsights.js (tested).
 *
 * The table is public under RLS, so this reads with the service-role key when
 * .env has one and the committed publishable key (wrangler.toml) otherwise.
 * What ships is derived: counts, the posting clock, tag lives, phrases, four
 * quoted moments, a quote per year and the id pool the daily ten are drawn
 * from. Post text stays in Supabase; the page fetches the ten by id.
 *
 * Meaning comes from the vectors /ask already stores in content_chunks (one
 * mean vector per post): the tone of each post (assignMoods — nearest to the
 * posts I tagged #calmness, #love, …) and the topic map (a seeded UMAP layout
 * here, then k-means regions named by their tags in buildMap). Posts not yet
 * indexed are left off the map, never placed at the origin. Run after
 * `npm run ask:index` for the newest posts to appear.
 *
 * Usage: npm run microblog:insights [-- --dry-run]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { UMAP } from "umap-js";
import { loadEnv } from "./build-docs.mjs";
import { writeJsonIfChanged } from "./lib/dataFile.mjs";
import { buildInsights } from "../src/lib/microblogInsights.js";
import { seededRandom } from "../src/lib/generativeArt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/data/microblog-insights.json");
const DRY_RUN = process.argv.includes("--dry-run");
const PAGE = 1000;
const VEC_PAGE = 250; // a 1024-d vector is ~12 KB of text
const SEED = 1677;

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

/** Map post id → unit mean vector over its chunks. Empty when the index is unreadable. */
async function loadVectors(supabase) {
  const sums = new Map();
  for (let from = 0; ; from += VEC_PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("content_chunks")
      .select("entity_id, embedding")
      .eq("entity_type", "microblog")
      .not("embedding", "is", null)
      .order("id", { ascending: true })
      .range(from, from + VEC_PAGE - 1);
    if (error) {
      console.warn(`  content_chunks unreadable (${error.message}): no moods or map this run`);
      return new Map();
    }
    (data || []).forEach(({ entity_id: id, embedding }) => {
      const v = Array.isArray(embedding) ? embedding : JSON.parse(embedding);
      const s = sums.get(id);
      if (s) for (let i = 0; i < v.length; i += 1) s[i] += v[i];
      else sums.set(id, v.slice());
    });
    if (!data || data.length < VEC_PAGE) break;
  }
  const out = new Map();
  sums.forEach((v, id) => {
    const n = Math.hypot(...v) || 1;
    out.set(Number(id), v.map((x) => x / n));
  });
  return out;
}

const supabase = client();
const rows = await loadRows(supabase);
if (!rows.length) {
  console.error("No micro-posts came back — refusing to write an empty file.");
  process.exit(1);
}
const vectors = await loadVectors(supabase);
let layout = null;
if (vectors.size >= 50) {
  const ids = [...vectors.keys()].sort((a, b) => a - b);
  const umap = new UMAP({
    nComponents: 2, nNeighbors: 15, minDist: 0.15, random: seededRandom(SEED),
  });
  const xy = umap.fit(ids.map((id) => vectors.get(id)));
  layout = new Map(ids.map((id, i) => [id, xy[i]]));
}
console.log(`  ${vectors.size} posts with vectors${layout ? ", map laid out" : ""}`);
const doc = buildInsights(rows, { vectors, layout });
const text = `${JSON.stringify(doc)}\n`;
const { all } = doc;
console.log(`  ${all.posts} posts, ${doc.years.length} years, ${all.timed} timed, pool ${doc.pool.length}`);
if (doc.moods) console.log(`  moods: ${doc.moods.list.map((m, i) => `${m.id} ${doc.moods.totals[i]}`).join(", ")} · agreement ${doc.moods.agreement}`);
if (doc.map) console.log(`  map: ${doc.map.regions.map((r) => `${r.posts} [${r.tags.join(", ")}]`).join(" · ")}`);
console.log(`  ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`);
if (DRY_RUN) {
  console.log("  dry run: nothing written");
} else {
  console.log(writeJsonIfChanged(OUT, text) ? `  wrote ${path.relative(ROOT, OUT)}` : "  unchanged");
}
