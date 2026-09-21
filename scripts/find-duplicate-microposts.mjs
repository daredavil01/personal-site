#!/usr/bin/env node
/**
 * Finds near-duplicate micro-posts — reposts and near-repeats — from the
 * embeddings that already exist.
 *
 * No model call. Not one token is spent here: `npm run ask:index` already wrote
 * a vector for every micro-post into content_chunks, and related_content_ranked
 * (0013/0014) already does nearest-neighbour lookups over them for the "more
 * like this" strip. This is that same RPC pointed at one entity type.
 *
 * Reports only. It never deletes, merges or edits anything — deciding that two
 * posts are the same thought is a judgement, and the admin dashboard is where a
 * person makes it.
 *
 * Usage:
 *   npm run microblog:dupes -- --limit 20          a slice, for a first look
 *   npm run microblog:dupes -- --threshold 0.95    stricter
 *   npm run microblog:dupes                        the whole archive
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env. No AI feature switch: there is no
 * model here to switch off.
 *
 * ponytail: one RPC per post — ~1,661 round trips against the HNSW index, a few
 * minutes. Swap for a single self-join RPC only if this gets run often.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { makeClient } from "./build-docs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = path.join(ROOT, "knowledge_base");

const PAGE = 1000;
// similarity is cosine on normalised vectors (0014), so 1.0 is identical text.
// 0.92 catches reposts and light rewrites without flagging two posts that
// merely share a subject.
const DEFAULT_THRESHOLD = 0.92;
const NEIGHBOURS = 5;

// ~59% of the Tumblr import is photo posts whose images never made it into the
// repo, so their text is blank and their chunks are near-identical to each
// other — every one of them "duplicates" every other. Skip anything too short
// to be a thought: the whole point is finding the same thought written twice.
const MIN_TEXT = 60;

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const LIMIT = Number(argValue("--limit")) || 0;
const THRESHOLD = Number(argValue("--threshold")) || DEFAULT_THRESHOLD;

const preview = (row) => String(row.title || row.text || "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 70);

async function fetchAll(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("microblog")
      .select("id, title, text, date")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

const bodyLength = (row) => String(row.text || row.title || "").trim().length;

async function main() {
  const supabase = makeClient();

  const all = await fetchAll(supabase);
  let rows = all.filter((r) => bodyLength(r) >= MIN_TEXT);
  const skipped = all.length - rows.length;
  const total = rows.length;
  if (LIMIT) rows = rows.slice(0, LIMIT);
  const byId = new Map(rows.map((r) => [r.id, r]));

  console.log(
    `${total} post(s) with text, ${rows.length} in this run, similarity ≥ ${THRESHOLD}`
    + ` (${skipped} too short to compare)`,
  );

  // A pair is reported once. The lower id is always the first member, so the
  // two directions of the same neighbourhood collapse into one row.
  const pairs = new Map();
  let failed = 0;

  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase.rpc("related_content_ranked", {
      p_type: "microblog",
      p_id: row.id,
      p_limit: NEIGHBOURS,
      p_types: ["microblog"],
    });
    if (error) {
      console.error(`  ${row.id}: ${error.message}`);
      failed += 1;
      continue;
    }
    (data || []).forEach((hit) => {
      if (hit.similarity < THRESHOLD) return;
      // The neighbour comes from the index, not from this run's slice, so it
      // has to pass the same text test the seed did.
      const other = byId.get(hit.entity_id);
      if (other && bodyLength(other) < MIN_TEXT) return;
      const [a, b] = row.id < hit.entity_id ? [row.id, hit.entity_id] : [hit.entity_id, row.id];
      const key = `${a}:${b}`;
      if (pairs.has(key)) return;
      pairs.set(key, {
        a,
        b,
        similarity: Number(hit.similarity.toFixed(4)),
        // The far side may sit outside this run's slice, so fall back to what
        // the RPC returned rather than dropping the pair.
        aText: preview(byId.get(a) || { title: hit.title }),
        bText: preview(byId.get(b) || { title: hit.title }),
      });
    });
  }

  const found = [...pairs.values()].sort((x, y) => y.similarity - x.similarity);
  found.forEach((p) => {
    console.log(`  ${p.similarity}  ${p.a} ${p.aText}`);
    console.log(`          ${p.b} ${p.bText}`);
  });

  if (found.length) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    const file = path.join(
      REPORT_DIR,
      `microblog-duplicates-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );
    fs.writeFileSync(
      file,
      `${JSON.stringify({ at: new Date().toISOString(), threshold: THRESHOLD, pairs: found }, null, 2)}\n`,
      "utf8",
    );
    console.log(`\nReport: ${path.relative(ROOT, file)}`);
  }

  console.log(
    `\n${found.length} near-duplicate pair(s)${failed ? `, ${failed} lookup(s) failed` : ""}.`
    + " Nothing was changed — review and delete in /admin.",
  );
}

main().catch((err) => {
  console.error(`\n${err.message || err}`);
  process.exit(1);
});
