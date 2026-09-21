// Parses src/data/changelog.md into structured entries so the admin's Now-month
// editor can offer that month's shipped work as "Website Updates" highlights,
// instead of having them retyped from the changelog by hand.
//
// The format is the one CLAUDE.md mandates:
//   ## [v12.0.0] — 2026-07-20
//   ### Added
//   - **Feature Name** (`src/path.js`): What it is and why.
// The backticked path group is optional, and a handful of older bullets are
// plain prose with no bold name — both are tolerated.

import changelogUrl from "../data/changelog.md?url";

const VERSION_RE = /^##\s+\[?(v[\d.]+)\]?\s*[—–-]\s*(\d{4}-\d{2}-\d{2})/;
const KIND_RE = /^###\s+(\w+)/;

/**
 * Fetch the raw changelog markdown. The static URL import keeps the markdown
 * asset reference in the main bundle for Cloudflare Pages' asset server.
 */
export async function loadChangelog() {
  const res = await fetch(changelogUrl);
  if (!res.ok) throw new Error(`Changelog fetch failed (${res.status})`);
  const text = await res.text();
  return text.replace(/^---[\s\S]*?---\s*\n/, "");
}

// "- **Name** (`path`): body"  →  { name, body }
function parseBullet(raw) {
  let rest = raw.replace(/^-\s+/, "").trim();
  let name = "";

  const bold = rest.match(/^\*\*(.+?)\*\*/);
  if (bold) {
    name = bold[1].trim();
    rest = rest.slice(bold[0].length).trim();
    // Drop the optional file-path parenthetical. Paths never contain ")".
    rest = rest.replace(/^\([^)]*\)/, "").trim();
    rest = rest.replace(/^:/, "").trim();
  }

  // Strip inline markdown emphasis/code so the highlight reads as plain text.
  const body = rest.replace(/[`*]/g, "").trim();
  return { name: name.replace(/[`*]/g, ""), body };
}

// The reader-facing paragraph npm run changelog:notes writes under a version
// heading, as a blockquote. One per version, before the first `###` section.
const SUMMARY_RE = /^>\s*(.+)/;

/**
 * Parse changelog markdown into version entries.
 * @returns {{version, date, monthKey, summary, changes: {kind, name, body}[]}[]}
 */
export function parseChangelog(md) {
  const entries = [];
  let entry = null;
  let kind = null;
  let bullet = null;

  const flush = () => {
    if (!bullet || !entry) { bullet = null; return; }
    const parsed = parseBullet(bullet);
    if (parsed.name || parsed.body) entry.changes.push({ kind: kind || "Changed", ...parsed });
    bullet = null;
  };

  (md || "").split("\n").forEach((line) => {
    const version = line.match(VERSION_RE);
    if (version) {
      flush();
      entry = {
        version: version[1],
        date: version[2],
        monthKey: version[2].slice(0, 7),
        summary: "",
        changes: [],
      };
      entries.push(entry);
      kind = null;
      return;
    }

    // Before the first section heading, and only the first one: a blockquote
    // deeper in a version block is somebody quoting something, not the summary.
    const summary = line.match(SUMMARY_RE);
    if (summary && entry && !kind && !entry.summary) {
      flush();
      entry.summary = summary[1].trim();
      return;
    }

    const kindMatch = line.match(KIND_RE);
    if (kindMatch) {
      flush();
      [, kind] = kindMatch; // Added | Changed | Fixed | Removed
      return;
    }

    if (/^-\s+/.test(line)) {
      flush();
      bullet = line;
      return;
    }

    // A bullet can wrap across lines; anything else ends it.
    if (bullet && line.trim() && !line.startsWith("#") && !line.startsWith("---")) {
      bullet += ` ${line.trim()}`;
      return;
    }
    flush();
  });

  flush();
  return entries;
}

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

export default parseChangelog;
