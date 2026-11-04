// The /ask page's shelves: what the archive has read, kind by kind, and the
// questions each kind can answer. Pure, so the page only draws it.
//
// Counts are passages in content_chunks (`index_by_type` from site_facts), not
// rows — they are what retrieval actually searches. Titles are the newest of
// each roster, so a shelf always offers whatever arrived last.

import { ENTITY_PLURALS } from "../data/askConfig";
import { validPool } from "./askQuestions";

// Kinds that are scaffolding rather than content: retrieval sinks them unless a
// question is about the site, so offering them as a shelf would promise
// something the re-ranker then buries.
const HIDDEN = new Set(["page", "site", "tag", "changelog"]);

// Which question-pool category speaks for each kind. The pool is admin-edited
// (seeded by 0020 and 0041); a kind with none here offers only its titles.
export const POOL_CATEGORY = {
  book: "reading",
  sport: "running",
  training: "training",
  trek: "treks",
  project: "work",
  resume: "work",
  presentation: "talks",
  video: "videos",
  instagram: "life",
  now: "newsletter",
  stats: "numbers",
  blog: "writing",
  writing: "writing",
  microblog: "micro",
};

// How to turn a roster title into a question the archive answers well.
const TITLE_QUESTION = {
  book: (t) => `What is ${t} about?`,
  sport: (t) => `How did ${t} go?`,
  trek: (t) => `Tell me about ${t}`,
  project: (t) => `What is ${t}?`,
  video: (t) => `What is the video "${t}" about?`,
  presentation: (t) => `What is the deck "${t}" about?`,
  instagram: (t) => `Tell me about the photo set "${t}"`,
};

export const SHELF_QUESTIONS = 4;

/** "micro posts" → "Micro posts". Unknown kinds keep a readable name. */
export function shelfLabel(type) {
  const plural = ENTITY_PLURALS[type] || String(type || "").replace(/_/g, " ");
  return plural.replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Questions for one shelf: the newest titles first (they name something real),
 * then pool questions of its category, never more than `limit`.
 */
export function shelfQuestions(type, shelves, pool, limit = SHELF_QUESTIONS) {
  const out = [];
  const ask = TITLE_QUESTION[type];
  if (ask) {
    (shelves?.newest?.[type] || []).forEach((row) => {
      if (row?.t) out.push(ask(row.t));
    });
  }
  const category = POOL_CATEGORY[type];
  if (category) {
    validPool(pool)
      .filter((item) => item.c === category)
      .forEach((item) => out.push(item.q.trim()));
  }
  return [...new Set(out)].slice(0, limit);
}

/**
 * Every content shelf, largest first, with its share of all shown passages.
 * Returns [] when the endpoint sent no shelves — the section is then omitted,
 * never drawn empty.
 */
export function buildShelves(shelves, pool) {
  const index = shelves?.index;
  if (!index || typeof index !== "object") return [];
  const rows = Object.entries(index)
    .map(([type, n]) => [type, Number(n)])
    .filter(([type, n]) => !HIDDEN.has(type) && Number.isFinite(n) && n > 0);
  const total = rows.reduce((sum, [, n]) => sum + n, 0);
  return rows
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([type, passages]) => ({
      type,
      label: shelfLabel(type),
      passages,
      share: passages / total,
      newest: (shelves.newest?.[type] || [])[0]?.t || null,
      questions: shelfQuestions(type, shelves, pool),
    }));
}

/** The total the shelves add up to, for the page's one headline number. */
export function shelfTotal(list) {
  return (list || []).reduce((sum, s) => sum + s.passages, 0);
}

/** A pool question's category, for the label on its starter card. */
export function categoryOf(question, pool) {
  const hit = validPool(pool).find((item) => item.q.trim() === question);
  return hit?.c || null;
}

export const CATEGORY_LABELS = {
  reading: "Reading",
  running: "Running",
  training: "Training",
  treks: "Treks",
  work: "Work",
  writing: "Writing",
  micro: "Short posts",
  videos: "Videos",
  talks: "Decks",
  newsletter: "Newsletter",
  life: "Life",
  numbers: "Numbers",
  site: "This site",
};

export function categoryLabel(c) {
  if (!c) return "Ask";
  return CATEGORY_LABELS[c] || c.replace(/^\w/, (x) => x.toUpperCase());
}

/**
 * One question not yet asked in this thread, for Surprise me. `random` is
 * injected so tests are deterministic. Null when the pool is spent.
 */
export function surpriseQuestion(pool, asked = [], random = Math.random) {
  const seen = new Set(asked.map((q) => String(q).trim().toLowerCase()));
  const fresh = validPool(pool)
    .map((item) => item.q.trim())
    .filter((q) => !seen.has(q.toLowerCase()));
  if (!fresh.length) return null;
  return fresh[Math.floor(random() * fresh.length)];
}
