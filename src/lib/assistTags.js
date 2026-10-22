// Tag suggestions as Jev classification: one yes/no question per tag in the
// central vocabulary, answered with a calibrated probability each.
//
// Used by functions/api/assist.js when the assist ladder's first usable rung is
// a `jev` rung. A language-model rung still answers the old way (pick names
// from a list as JSON). In src/ because Pages routes every file under functions/.

export const SUGGEST_AT = 0.7;
export const MAYBE_AT = 0.4;
const MAX_EACH = 5;
const MAX_DESCRIPTION = 160;
const MAX_FIELD_CHARS = 1500;
const MAX_FIELDS = 12;

/**
 * The question set. Keys are positional (`t0`, `t1`…) rather than the names
 * themselves: tag names are free text (Marathi, spaces, punctuation) and a
 * question key is an identifier.
 */
export function tagQuestions(vocabulary) {
  const names = [];
  const spec = {};
  (vocabulary || []).forEach((tag, i) => {
    const name = String(tag?.name || "").trim();
    if (!name) return;
    const about = String(tag.description || "").trim().slice(0, MAX_DESCRIPTION);
    names.push(name);
    spec[`t${i}`] = {
      type: "bool",
      instructions: `The entry belongs under the tag "${name}"${about ? ` (${about})` : ""}`,
    };
  });
  return { spec, names: Object.fromEntries(Object.keys(spec).map((k, i) => [k, names[i]])) };
}

/** The entry as a typed state: its content type and its filled scalar fields. */
export function tagState(resource, values) {
  const entry = Object.fromEntries(Object.entries(values || {})
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
    .slice(0, MAX_FIELDS)
    .map(([k, v]) => [k, String(v).slice(0, MAX_FIELD_CHARS)]));
  return { content_type: String(resource || "entry").slice(0, 60), entry };
}

// `noul` from TypeSafe's endpoint, `probability` through the AI Gateway.
const yes = (answer) => {
  const p = Number(answer?.noul ?? answer?.probability);
  return Number.isFinite(p) ? p : null;
};

/**
 * Jev's answers → `{ suggested, maybe }`, most likely first, at most five each.
 * Tags already on the row are left out; names come back exactly as stored.
 */
export function pickTags(answers, names, exclude = []) {
  const taken = new Set((exclude || []).map((n) => String(n).toLowerCase()));
  const scored = Object.entries(names || {})
    .map(([key, name]) => ({ name, p: yes(answers?.[key]) }))
    .filter(({ name, p }) => p !== null && !taken.has(name.toLowerCase()))
    .sort((a, b) => b.p - a.p);
  return {
    suggested: scored.filter(({ p }) => p >= SUGGEST_AT).slice(0, MAX_EACH).map(({ name }) => name),
    maybe: scored.filter(({ p }) => p >= MAYBE_AT && p < SUGGEST_AT).slice(0, MAX_EACH).map(({ name }) => name),
  };
}
