// Turning a live /ask thread into the row that backs a shared page.
//
// In src/ like the rest of the ask helpers: Pages routes every file under
// functions/, so a shared module cannot live there. Dependency-free apart from
// askFormat, which is itself dependency-free by contract.
//
// The derived fields are computed here rather than in SQL because this is where
// markdown can be stripped properly and where the configured refusal note is
// known. That is safe only because create_ask_share is service-role-only — the
// worker is the only thing that can reach it, so its derivations are trusted.

import { stripMarkdownImages } from "./askFormat";

export const MAX_TURNS = 20;
export const MAX_BYTES = 100000;
export const SUMMARY_CHARS = 200;

// What a shared page needs to render a turn, and nothing else. Notably absent:
// `linkable` (hoisted to the share, it is the same list every turn), `media`
// (recomputed from the answer and its sources), `streaming` and `retry` (state
// for a turn in flight), and `browse` (a live listing link, not a record).
function slimTurn(turn) {
  const base = { role: turn.role === "assistant" ? "assistant" : "user", content: String(turn.content || "") };
  if (base.role === "user") return base;
  return {
    ...base,
    sources: (turn.sources || []).map((s) => ({
      entity_type: s.entity_type,
      entity_id: s.entity_id,
      title: s.title,
      url: s.url,
      date: s.date,
      image: s.image || null,
      tags: s.tags || [],
      external: !!s.external,
      domain: s.domain || null,
    })),
    widened: !!turn.widened,
    scope: turn.scope || "",
    // The reader's own verdict travels with the conversation; it is part of
    // what they are passing on.
    feedback: turn.feedback?.rating ? { rating: turn.feedback.rating } : null,
  };
}

const firstBy = (turns, role) => turns.find((t) => t.role === role);

/**
 * Builds the snapshot, or explains why it cannot.
 *
 * Returns `{ ok: false, reason }` for a thread that is empty, unfinished or
 * over the caps, so the caller can say something specific rather than failing
 * with a generic error.
 */
export function buildShareSnapshot(turns, { types = [], refusalNote = "" } = {}) {
  const usable = (Array.isArray(turns) ? turns : []).filter(
    (t) => t && !t.streaming && String(t.content || "").trim(),
  );
  if (!usable.length) return { ok: false, reason: "empty" };
  if (!usable.some((t) => t.role === "assistant")) return { ok: false, reason: "no-answer" };
  if (usable.length > MAX_TURNS) return { ok: false, reason: "too-long" };

  const thread = usable.map(slimTurn);
  const answers = thread.filter((t) => t.role === "assistant");

  // One list per share rather than per turn: it is the same roster every time,
  // and repeating ~100 urls per turn would be most of the row.
  const linkable = [...new Set(usable.flatMap((t) => t.linkable || []).filter(Boolean))];

  const title = firstBy(thread, "user")?.content?.trim() || "A conversation with the archive";
  const firstAnswer = stripMarkdownImages(answers[0]?.content || "").replace(/\s+/g, " ").trim();
  const summary = firstAnswer.length > SUMMARY_CHARS
    ? `${firstAnswer.slice(0, SUMMARY_CHARS - 1).trimEnd()}…`
    : firstAnswer;

  const plainText = thread
    .map((t) => `${t.role === "user" ? "Q" : "A"}: ${stripMarkdownImages(t.content)}`)
    .join("\n\n");

  const note = String(refusalNote || "").trim().toLowerCase();
  const snapshot = {
    thread,
    linkable,
    title,
    summary,
    plainText,
    types: [...new Set(types || [])],
    hasDownvote: answers.some((t) => t.feedback?.rating === -1),
    // Matched on the configured note rather than a hardcoded phrase, so it keeps
    // working when that copy is edited at /admin.
    hasRefusal: !!note && answers.some((t) => t.content.toLowerCase().includes(note)),
    noSources: answers.some((t) => !t.sources.length),
  };

  if (JSON.stringify(snapshot.thread).length > MAX_BYTES) {
    return { ok: false, reason: "too-large" };
  }
  return { ok: true, snapshot };
}

export const SHARE_REFUSALS = {
  empty: "There is nothing to share yet.",
  "no-answer": "Wait for an answer before sharing.",
  "too-long": `A shared conversation can hold ${MAX_TURNS} turns. Clear and start a shorter one.`,
  "too-large": "This conversation is too big to share.",
};
