// Which starter questions the /ask chips show, drawn fresh on every page load.
//
// In src/ for the same reason as askRetrieval.js and askFormat.js: Pages routes
// every file under functions/, so a helper there would become an endpoint.
//
// The draw is stratified by category rather than a plain shuffle. With ~29
// questions weighted towards reading and running, a flat shuffle regularly
// offers four questions about books at once — and these four chips are the only
// advertisement the archive's breadth gets before someone types anything.

/** Fisher-Yates on a copy. `random` is injected so tests are deterministic. */
function shuffled(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Keeps only well-formed `{ q, c }` entries — the pool is admin-edited. */
export function validPool(pool) {
  return (Array.isArray(pool) ? pool : []).filter(
    (item) => item && typeof item.q === "string" && item.q.trim(),
  );
}

/**
 * `count` questions, each from a different category where the pool allows it.
 *
 * Returns [] for an empty or malformed pool, which is the caller's signal to
 * fall back to ask_settings.suggested_questions.
 */
export function pickQuestions(pool, count = 4, random = Math.random) {
  const items = validPool(pool);
  if (!items.length || count < 1) return [];

  const byCategory = new Map();
  items.forEach((item) => {
    const key = item.c || "";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(item.q.trim());
  });

  const picked = [];
  shuffled([...byCategory.keys()], random)
    .slice(0, count)
    .forEach((key) => {
      const group = byCategory.get(key);
      picked.push(group[Math.floor(random() * group.length)]);
    });

  // Fewer categories than chips (or a one-category pool): top up from whatever
  // has not been drawn yet rather than showing three chips where four fit.
  if (picked.length < count) {
    const rest = shuffled(
      items.map((i) => i.q.trim()).filter((q) => !picked.includes(q)),
      random,
    );
    picked.push(...rest.slice(0, count - picked.length));
  }

  return picked;
}
