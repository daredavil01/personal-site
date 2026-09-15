// What /ask actually sends to the model, chosen from what the database returned.
//
// Lives in src/ for the same reason as askTiers.js and askFormat.js: Pages
// routes every file under functions/, so a helper there would become a public
// endpoint. Dependency-free by contract — esbuild bundles it into the worker.
//
// The chips on /ask used to be a hard scope: their types went to hybrid_search
// as p_types, which filtered BEFORE ranking, so a filtered search always came
// back with match_count items of that type however unrelated the question was.
// Asking "which forts has he trekked?" with the Books chip on returned eight
// books and an answer that either refused or borrowed a book cover as a fort
// link. Here the search runs unscoped and wide, and the chips re-rank what it
// found: they narrow when they can and get out of the way when they cannot.

// Generic chunks that describe the site itself. They are close to almost any
// question about Sanket and crowded real content out of the results, so they
// sink to the bottom unless the question is about the site.
const META_TYPES = new Set(["site", "page"]);

const META_QUESTION = /\b(site|website|web ?page|built|build|building|second brain|archive|changelog|stats page|about this)\b/i;

// Below this many in-scope items the chips are fighting the question rather
// than sharpening it, so the answer comes from everything instead.
const MIN_IN_SCOPE = 3;

/**
 * The text to search with, which is not always the text to answer.
 *
 * hybrid_search only ever saw the raw message, so a follow-up like "Tell me
 * more about Skills" searched on two words and matched whatever happened to be
 * near them. Short questions carry the previous one with them; long ones stand
 * on their own and stay untouched.
 */
export function retrievalQuery(message, history) {
  const text = String(message || "").trim();
  if (text.length >= 80) return text;

  const prior = [...(history || [])]
    .reverse()
    .find((t) => t?.role === "user" && String(t.content || "").trim());
  if (!prior) return text;

  return `${String(prior.content).trim().slice(0, 120)} ${text}`.trim();
}

/** Stable partition: `keep` first in their original order, then the rest. */
function sink(list, shouldSink) {
  const front = [];
  const back = [];
  list.forEach((c) => (shouldSink(c) ? back : front).push(c));
  return [...front, ...back];
}

/**
 * Picks the chunks the model and the reader both see.
 *
 * `chunks` arrives globally ranked by RRF and already floored by
 * min_similarity, so every step here only ever removes or reorders.
 *
 * Returns `widened: true` when the chips were dropped, which the UI says once,
 * quietly, under the answer — a narrowed search that finds nothing should read
 * as an answer, not as a refusal.
 */
export function selectChunks({
  chunks, types, question, limit = 8, perEntity = 2,
}) {
  const all = Array.isArray(chunks) ? chunks : [];
  const wanted = Array.isArray(types) ? types.filter(Boolean) : [];

  let pool = all;
  let widened = false;
  if (wanted.length) {
    const inScope = all.filter((c) => wanted.includes(c.entity_type));
    widened = inScope.length < MIN_IN_SCOPE;
    pool = widened ? all : inScope;
  }

  if (!META_QUESTION.test(String(question || ""))) {
    pool = sink(pool, (c) => META_TYPES.has(c.entity_type));
  }

  // Cards are deduped by URL after this, so without a cap one long project
  // chunked five ways leaves the answer with two things to talk about.
  const perEntityCount = new Map();
  const picked = [];
  pool.forEach((c) => {
    if (picked.length >= limit) return;
    const key = `${c.entity_type}:${c.entity_id}`;
    const seen = perEntityCount.get(key) || 0;
    if (seen >= perEntity) return;
    perEntityCount.set(key, seen + 1);
    picked.push(c);
  });

  return { picked, widened };
}
