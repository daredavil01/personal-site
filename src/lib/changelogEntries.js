// Turns `changelog` rows into the "Website Updates" highlights the admin's
// Now-month editor offers, so a month's shipped work isn't retyped by hand.
//
// The markdown parser this file used to carry lives in ./changelogParse.js —
// the version history is in Postgres now, and the Now editor reads the one
// month it needs (getChangelogMonth) instead of fetching a 204 KB file. The
// re-export keeps the parser's one import path for callers and tests.

export { parseChangelog, default as parseChangelogDefault } from "./changelogParse";

// Words whose trailing dot is not a sentence end. A lone letter is included so
// initials ("J. Doe") don't split the line either.
const ABBREVIATION = /(?:^|\s)(?:e\.g|i\.e|vs|etc|approx|cf|fig|no|[A-Za-z])$/i;

// An em dash this early is punctuation inside a phrase, not a clause break.
const MIN_DASH_CUT = 20;

/**
 * First sentence of a description — cut at the first sentence-ending "." or at
 * a clause-breaking " — ", whichever comes first. Dots inside abbreviations and
 * numbers ("e.g.", "~3.5s") are skipped.
 */
function firstSentence(text) {
  const t = (text || "").trim();
  let cut = t.length;

  const sentenceEnd = /\.(\s|$)/g;
  for (let m = sentenceEnd.exec(t); m; m = sentenceEnd.exec(t)) {
    if (!ABBREVIATION.test(t.slice(0, m.index))) {
      cut = m.index + 1;
      break;
    }
  }

  const dash = t.indexOf(" — ");
  if (dash >= MIN_DASH_CUT && dash < cut) cut = dash;
  return t.slice(0, cut).trim();
}

function truncate(text, max = 120) {
  if (text.length <= max) return text;
  const clipped = text.slice(0, max);
  const space = clipped.lastIndexOf(" ");
  return `${(space > 40 ? clipped.slice(0, space) : clipped).replace(/[.,;:—-]$/, "")}…`;
}

// When joining a sentence after "Name — ", lowercase only leading determiners.
// Anything else is left as authored, so identifiers and proper nouns survive
// ("RegionShell renders…", "Book Forest, Coast…", "ATLAS_LIVE is now true").
const LEADING_WORDS = new Set(["The", "A", "An", "This", "These", "It", "Its", "Every", "Each"]);

function joinCase(text) {
  const first = text.split(/\s/, 1)[0];
  if (!LEADING_WORDS.has(first)) return text;
  return text[0].toLowerCase() + text.slice(1);
}

/** One change → the plain-text line that would go into sections.website. */
export function highlightLine({ name, body }) {
  const sentence = firstSentence(body);
  if (!name) return truncate(sentence || body);
  if (!sentence) return truncate(name);
  return truncate(`${name} — ${joinCase(sentence)}`);
}

/**
 * Every change from versions dated inside `monthKey` ("YYYY-MM"), flattened
 * into editable highlight candidates in changelog order.
 * @returns {{id, version, date, kind, name, line}[]}
 */
export function changelogHighlights(entries, monthKey) {
  if (!monthKey) return [];
  return (entries || [])
    .filter((e) => e.monthKey === monthKey)
    .flatMap((e) => [
      // The version's own summary first, where there is one: it is already
      // written for a reader, which is what a Now page wants and what every
      // engineering bullet below it has to be trimmed into.
      ...(e.summary ? [{
        id: `${e.version}-summary`,
        version: e.version,
        date: e.date,
        kind: "Summary",
        name: "",
        line: e.summary,
      }] : []),
      ...e.changes.map((change, i) => ({
        id: `${e.version}-${i}`,
        version: e.version,
        date: e.date,
        kind: change.kind,
        name: change.name,
        line: highlightLine(change),
      })),
    ]);
}

export default changelogHighlights;
