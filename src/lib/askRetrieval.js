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

// At most this many of the picked items may share an entity type, unless the
// question or the chips actually asked for that type.
//
// perEntity below caps chunks per *entity*, which is a different thing: eight
// different micro-posts break no rule and still take every slot. Micro-blog is
// 1,664 of 2,969 chunks, so on any question with a common word it wins on base
// rate alone — a graded run found eight micro-posts answering "which forts has
// he trekked?". The cap is deliberately uniform rather than a micro-blog
// special case: micro-blog is just the type that reaches the ceiling first.
const MAX_PER_TYPE = 3;

// The words a reader uses for each content type, for two jobs: exempting a type
// the question actually asked for from MAX_PER_TYPE, and telling the worker
// which roster to spell out (functions/api/ask.js).
//
// Not ENTITY_PLURALS from askConfig — that is display text ("photo sets",
// "résumé entries"), written to be read rather than matched, and this module is
// dependency-free by contract. Marathi terms are here because the site answers
// in Marathi and "किल्ले" has to reach the trek roster the same as "forts" does.
const TYPE_WORDS = {
  book: /\b(books?|reads?|reading|author|novels?)\b|पुस्तक/i,
  trek: /\b(treks?|trekking|trekked|forts?|hikes?|hiking|sahyadri)\b|किल्ल|ट्रेक/i,
  sport: /\b(races?|runs?|running|ran|marathons?|ultras?|10k|21k|42k|half ?marathons?)\b|मॅरेथॉन|शर्यत|धाव/i,
  project: /\b(projects?|apps?|tools?|built|builds)\b|प्रकल्प/i,
  blog: /\b(blogs?|blog ?posts?|essays?|articles?|substack|wordpress)\b|ब्लॉग|लेख/i,
  microblog: /\b(micro ?blog|micro ?posts?|short posts?|tumblr)\b/i,
  presentation: /\b(presentations?|decks?|slides?|talks?)\b|सादरीकरण/i,
  instagram: /\b(instagram|photos?|photo sets?|pictures?)\b|फोटो/i,
  writing: /\b(writing ledger|word ?counts?)\b/i,
  resume: /\b(r[ée]sum[ée]|cv|jobs?|career|employers?|skills?)\b/i,
};

/**
 * The entity types a question names outright, in TYPE_WORDS order.
 *
 * Deliberately generous: matching a type it did not quite mean only lifts a cap
 * or offers a roster, while missing one leaves the question in exactly the
 * broken state this whole pass exists to fix.
 */
export function typesNamed(question) {
  const text = String(question || "");
  if (!text.trim()) return [];
  return Object.entries(TYPE_WORDS)
    .filter(([, re]) => re.test(text))
    .map(([type]) => type);
}

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
 *
 * `asked` is the types the question itself named; it defaults to `typesNamed`
 * and the caller passes its own only to keep one reading of the question. Those
 * types are exempt from MAX_PER_TYPE: a question about micro-posts should be
 * allowed eight micro-posts.
 *
 * Returning fewer than `limit` is normal and intended. hybrid_search floors
 * both halves now, so a question the archive cannot answer arrives here with
 * two candidates or none, and handing the model eight items anyway is exactly
 * what manufactured the confident wrong answers.
 */
export function selectChunks({
  chunks, types, question, limit = 8, perEntity = 2, asked,
}) {
  const all = Array.isArray(chunks) ? chunks : [];
  const wanted = Array.isArray(types) ? types.filter(Boolean) : [];
  const named = Array.isArray(asked) ? asked : typesNamed(question);
  const exempt = new Set([...wanted, ...named]);

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
  const perTypeCount = new Map();
  const picked = [];
  pool.forEach((c) => {
    if (picked.length >= limit) return;
    const key = `${c.entity_type}:${c.entity_id}`;
    const seen = perEntityCount.get(key) || 0;
    if (seen >= perEntity) return;
    if (!exempt.has(c.entity_type)) {
      const ofType = perTypeCount.get(c.entity_type) || 0;
      if (ofType >= MAX_PER_TYPE) return;
      perTypeCount.set(c.entity_type, ofType + 1);
    }
    perEntityCount.set(key, seen + 1);
    picked.push(c);
  });

  return { picked, widened };
}
