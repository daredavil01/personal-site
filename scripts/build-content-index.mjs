#!/usr/bin/env node
/**
 * Builds `content_chunks` — the search index behind /ask — from every source in
 * scripts/ask-sources/ (see scripts/lib/registry.mjs), then regenerates docs/.
 *
 * Incremental by content, not by time. Each chunk is hashed twice
 * (scripts/lib/chunking.mjs) and sorted into:
 *   unchanged — same text, same metadata: not written at all
 *   metadata  — same text, new title/url/image: upserted, vector untouched
 *   reuse     — text already embedded under another key (the changelog grew at
 *               the top, so every chunk below shifted one index): vector copied
 *   embed     — genuinely new text: the only thing sent to Workers AI
 * Rows indexed before migration 0016 have no hashes; their bodies are hashed on
 * the first run here, so upgrading does not re-embed the archive either.
 *
 * A source that fails to load is reported and its existing chunks are left
 * alone — the run exits non-zero, but an outage never empties the index.
 *
 * Usage:
 *   npm run ask:index                incremental
 *   npm run ask:index -- --dry-run   what would change, per type; writes and embeds nothing
 *   npm run ask:index -- --full      re-embed everything (after changing EMBEDDING_MODEL)
 *
 * .env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 * VITE_SUPABASE_PUBLISHABLE_KEY (stats fallback), and CF_ACCOUNT_ID + CF_API_TOKEN
 * for embeddings (not needed for --dry-run). Service role key: local or CI only.
 */

import path from "path";
import { fileURLToPath } from "url";
import { buildDocs, makeClient } from "./build-docs.mjs";
import { EMBEDDING_MODEL, entityUrl } from "../src/data/askConfig.js";
import { embedTexts } from "./lib/workersAi.mjs";
import * as chunking from "./lib/chunking.mjs";
import {
  chunkKey, collectChunks, loadSources, planChunks, planOrphans,
} from "./lib/registry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EMBED_BATCH = 32;
// Workers AI rejects a request whose texts total more than 60k tokens, and it
// counts every text in the batch PADDED to the longest one — so the cost of a
// batch is (item count x longest item), not the sum of the items.
const EMBED_TOKEN_BUDGET = 45000;
const UPSERT_BATCH = 200;
const VECTOR_LOOKUP_BATCH = 50;
const PAGE = 1000;
const FULL = process.argv.includes("--full");
const DRY_RUN = process.argv.includes("--dry-run");

const supabase = makeClient();
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

// --- reads ------------------------------------------------------------------

async function fetchAll(table, columns = "*, tag_names") {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

// Paginated: PostgREST caps an unbounded select at 1000 rows, and a truncated
// picture of the index makes every run re-embed its tail.
async function selectChunks(columns, narrow = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await narrow(
      supabase.from("content_chunks").select(columns).order("id", { ascending: true }),
    ).range(from, from + PAGE - 1);
    if (error) throw new Error(`content_chunks: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function loadExisting() {
  const rows = await selectChunks("id, entity_type, entity_id, chunk_index, content_hash, embed_hash");
  if (rows.some((r) => !r.embed_hash)) {
    const bodies = await selectChunks(
      "id, body",
      (q) => q.is("embed_hash", null).not("embedding", "is", null),
    );
    const byId = new Map(bodies.map((b) => [b.id, b.body]));
    rows.forEach((r) => {
      if (r.embed_hash || !byId.has(r.id)) return;
      r.embed_hash = chunking.sha1(chunking.embedText({ body: byId.get(r.id) }));
      r.legacy = true;
    });
  }
  return rows;
}

async function loadVectors(hashes) {
  const vectors = new Map();
  for (let i = 0; i < hashes.length; i += VECTOR_LOOKUP_BATCH) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("content_chunks")
      .select("embed_hash, embedding")
      .in("embed_hash", hashes.slice(i, i + VECTOR_LOOKUP_BATCH))
      .not("embedding", "is", null);
    if (error) throw new Error(`vector lookup: ${error.message}`);
    (data || []).forEach((r) => {
      if (!vectors.has(r.embed_hash)) vectors.set(r.embed_hash, r.embedding);
    });
  }
  return vectors;
}

// --- embeddings -------------------------------------------------------------

const embed = (texts) => embedTexts(EMBEDDING_MODEL, texts);

// Batches are packed against the padded cost above, and the per-text estimate
// is deliberately pessimistic (2 chars/token) because Devanagari tokenises far
// worse than English and a good part of this archive is Marathi.
async function embedAll(chunks) {
  let done = 0;
  let cursor = 0;
  while (cursor < chunks.length) {
    const batch = [];
    let longest = 0;
    while (cursor < chunks.length && batch.length < EMBED_BATCH) {
      const text = chunking.embedText(chunks[cursor]);
      const estimate = Math.ceil(text.length / 2);
      if (batch.length && Math.max(longest, estimate) * (batch.length + 1) > EMBED_TOKEN_BUDGET) break;
      batch.push({ chunk: chunks[cursor], text });
      longest = Math.max(longest, estimate);
      cursor += 1;
    }
    // eslint-disable-next-line no-await-in-loop
    const vectors = await embed(batch.map((b) => b.text));
    batch.forEach((b, j) => { b.chunk.embedding = vectors[j]; });
    done += batch.length;
    process.stdout.write(`\r  embedded ${done}/${chunks.length}`);
  }
  if (chunks.length) process.stdout.write("\n");
}

// --- writes -----------------------------------------------------------------

const toRow = (c, withEmbedding) => ({
  entity_type: c.entity_type,
  entity_id: c.entity_id,
  chunk_index: c.chunk_index,
  title: c.title || "",
  url: c.url || "",
  body: c.body,
  chunk_date: c.chunk_date || null,
  tags: c.tags || [],
  image_url: c.image_url || null,
  content_hash: c.content_hash,
  embed_hash: c.embed_hash,
  updated_at: new Date().toISOString(),
  ...(withEmbedding ? { embedding: c.embedding } : {}),
});

// Rows with and without a vector go in separate batches: a bulk upsert takes the
// union of its rows' keys, and a missing `embedding` would overwrite with null.
async function upsert(chunks, withEmbedding) {
  for (let i = 0; i < chunks.length; i += UPSERT_BATCH) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await supabase
      .from("content_chunks")
      .upsert(chunks.slice(i, i + UPSERT_BATCH).map((c) => toRow(c, withEmbedding)), {
        onConflict: "entity_type,entity_id,chunk_index",
      });
    if (error) throw new Error(`upsert: ${error.message}`);
  }
}

async function removeRows(rows) {
  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += UPSERT_BATCH) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await supabase.from("content_chunks").delete().in("id", ids.slice(i, i + UPSERT_BATCH));
    if (error) throw new Error(`delete: ${error.message}`);
  }
}

// --- main -------------------------------------------------------------------

async function main() {
  const mode = FULL ? "rebuilding the whole index" : "indexing changed content";
  console.log(`${DRY_RUN ? "Dry run — " : ""}${mode}…`);

  const sources = await loadSources();
  const ctx = {
    ROOT,
    supabase,
    fetchAll,
    entityUrl,
    ...chunking,
    storageUrl: (v) => chunking.storageUrl(v, SUPABASE_URL),
    firstImage: (slides) => chunking.firstImage(slides, SUPABASE_URL),
  };
  const { chunks: raw, failedTypes, report } = await collectChunks(sources, ctx);
  report.forEach((r) => console.log(
    r.error ? `  ✗ ${r.type.padEnd(10)} ${r.error}` : `  ✓ ${r.type.padEnd(10)} ${r.chunks} chunks`,
  ));

  const keys = new Set();
  raw.forEach((c) => {
    const key = chunkKey(c);
    if (keys.has(key)) throw new Error(`Two chunks share the key ${key} — check the sources' ids`);
    keys.add(key);
  });
  const chunks = raw.map((c) => ({ ...c, ...chunking.hashChunk(c) }));

  const existing = await loadExisting();
  const plan = planChunks(chunks, existing, { full: FULL });
  const orphans = planOrphans(existing, chunks, failedTypes);

  console.log(
    `  ${chunks.length} chunks: ${plan.unchanged.length} unchanged · ${plan.metadata.length} metadata-only · `
    + `${plan.reuse.length} reuse a vector · ${plan.embed.length} to embed · ${orphans.length} to remove`,
  );

  if (DRY_RUN) {
    const byType = {};
    Object.entries(plan).forEach(([outcome, list]) => list.forEach((c) => {
      byType[c.entity_type] = byType[c.entity_type] || { unchanged: 0, metadata: 0, reuse: 0, embed: 0, remove: 0 };
      byType[c.entity_type][outcome] += 1;
    }));
    orphans.forEach((r) => {
      byType[r.entity_type] = byType[r.entity_type] || { unchanged: 0, metadata: 0, reuse: 0, embed: 0, remove: 0 };
      byType[r.entity_type].remove += 1;
    });
    console.table(byType);
    if (failedTypes.size) process.exitCode = 1;
    return;
  }

  const vectors = plan.reuse.length
    ? await loadVectors([...new Set(plan.reuse.map((c) => c.embed_hash))])
    : new Map();
  const reused = [];
  const toEmbed = [...plan.embed];
  plan.reuse.forEach((c) => {
    const vector = vectors.get(c.embed_hash);
    if (vector) reused.push({ ...c, embedding: vector });
    else toEmbed.push(c);
  });

  await embedAll(toEmbed);
  await upsert([...toEmbed, ...reused], true);
  await upsert(plan.metadata, false);
  await removeRows(orphans);

  console.log(
    `  embedded ${toEmbed.length} · reused ${reused.length} · updated ${plan.metadata.length} · `
    + `unchanged ${plan.unchanged.length} · removed ${orphans.length}`,
  );
  if (failedTypes.size) {
    console.warn(`  ! kept existing chunks for failed sources: ${[...failedTypes].join(", ")}`);
    process.exitCode = 1;
  }

  console.log("Regenerating docs/…");
  const { approxTokens } = await buildDocs(supabase);
  console.log(`  chatbot context ~${approxTokens} tokens`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(`\n${err.message || err}`);
  process.exit(1);
});
