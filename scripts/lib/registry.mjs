// The /ask source registry.
//
// Every *.mjs file in scripts/ask-sources/ is a source: a default export of
//   { type, load(ctx), toChunks(data, ctx), owns?, order? }
// Dropping a file in that folder is the whole integration — the indexer finds
// it, content_chunks accepts any well-formed type name (migration 0016), and
// the chat UI falls back to a title-cased label for a type it has never seen.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

export const SOURCES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../ask-sources",
);

const TYPE_RE = /^[a-z][a-z0-9_]*$/;

export async function loadSources(dir = SOURCES_DIR) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mjs") && !f.startsWith("_") && !f.includes(".test."))
    .sort();

  const sources = [];
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const mod = await import(pathToFileURL(path.join(dir, file)).href);
    const source = mod.default;
    if (
      !source
      || typeof source.type !== "string"
      || typeof source.load !== "function"
      || typeof source.toChunks !== "function"
    ) {
      throw new Error(`${file}: default export needs { type, load(), toChunks() }`);
    }
    if (!TYPE_RE.test(source.type)) {
      throw new Error(`${file}: type "${source.type}" must match ${TYPE_RE}`);
    }
    sources.push({ file, ...source });
  }
  return sources.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.file.localeCompare(b.file));
}

/**
 * Runs every source. A source that throws is reported and its types — its own
 * plus any it declares in `owns` — are marked failed, so the caller never
 * deletes their existing chunks. A Substack outage must not empty the index.
 */
export async function collectChunks(sources, ctx) {
  const chunks = [];
  const failedTypes = new Set();
  const report = [];
  for (const source of sources) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const data = await source.load(ctx);
      // eslint-disable-next-line no-await-in-loop
      const out = ((await source.toChunks(data, ctx)) || []).filter(
        (c) => c && String(c.body || "").trim(),
      );
      chunks.push(...out);
      report.push({ type: source.type, file: source.file, chunks: out.length });
    } catch (err) {
      failedTypes.add(source.type);
      (source.owns || []).forEach((t) => failedTypes.add(t));
      report.push({ type: source.type, file: source.file, error: err.message || String(err) });
    }
  }
  return { chunks, failedTypes, report };
}

export const chunkKey = (c) => `${c.entity_type}:${c.entity_id}:${c.chunk_index}`;

/** Existing rows that no live chunk claims, excluding types whose source failed. */
export function planOrphans(existing, chunks, failedTypes) {
  const live = new Set(chunks.map(chunkKey));
  return existing.filter((r) => !live.has(chunkKey(r)) && !failedTypes.has(r.entity_type));
}

/**
 * Sorts chunks into what the indexer must do with each.
 *   unchanged — same key, same content_hash: nothing to write
 *   metadata  — same key, same embed_hash: upsert without touching the vector
 *   reuse     — text already embedded under another key: copy that vector
 *   embed     — genuinely new text: call Workers AI
 * `existing` rows carry { entity_type, entity_id, chunk_index, content_hash, embed_hash }.
 */
export function planChunks(chunks, existing, { full = false } = {}) {
  const byKey = new Map(existing.map((r) => [chunkKey(r), r]));
  // Legacy rows (indexed before migration 0016) carry an embed_hash computed
  // locally from their body: good for keeping their own vector in place, but
  // not findable by a hash lookup in the database, so never a reuse donor.
  const known = new Set(existing.filter((r) => !r.legacy).map((r) => r.embed_hash).filter(Boolean));
  const plan = { unchanged: [], metadata: [], reuse: [], embed: [] };
  for (const c of chunks) {
    const prev = byKey.get(chunkKey(c));
    if (full) plan.embed.push(c);
    else if (prev && prev.content_hash && prev.content_hash === c.content_hash) plan.unchanged.push(c);
    else if (prev && prev.embed_hash && prev.embed_hash === c.embed_hash) plan.metadata.push(c);
    else if (known.has(c.embed_hash)) plan.reuse.push(c);
    else plan.embed.push(c);
  }
  return plan;
}
