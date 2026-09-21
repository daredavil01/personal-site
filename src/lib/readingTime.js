// How long a post takes to read. Arithmetic, not a model — the proposal's E5
// says so outright, and the "difficulty band" half of it is deliberately not
// built: a depth label nobody can check is a number that reads as fact.
//
// 200 words per minute is the conventional adult silent-reading rate for
// non-technical prose. Devanagari is counted the same way: word counts are
// whitespace-delimited in both scripts here, and a separate Marathi rate would
// be a number invented to look precise.
const WPM = 200;

/** Whitespace-delimited words. Empty or missing text is 0, never NaN. */
export function countWords(text) {
  const t = String(text || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Whole minutes, floored at 1 for anything with words in it.
 *
 * Returns 0 for no words, which is the caller's signal to render nothing: a
 * photo micro-post with no text should not claim "1 min read".
 */
export function readingMinutes(words) {
  const n = Number(words) || 0;
  if (n <= 0) return 0;
  return Math.max(1, Math.round(n / WPM));
}

/** "4 min read", or "" when there is nothing to read. */
export function readingLabel(words) {
  const mins = readingMinutes(words);
  return mins ? `${mins} min read` : "";
}
