// Parses changelog markdown into the rows the `changelog` table stores.
//
// This is the format CLAUDE.md mandates, which is still how an entry is
// written — src/data/changelog.md is the staging buffer a code change appends
// to, and `npm run changelog:push` runs this over it and upserts the result:
//
//   ## [v12.0.0] — 2026-07-20
//   > One reader-facing paragraph.
//   ### Added
//   - **Feature Name** (`src/path.js`): What it is and why.
//
// The backticked path group is optional, and a handful of older bullets are
// plain prose with no bold name — both are tolerated.
//
// Deliberately dependency-free: imported by the browser bundle (the Now-month
// editor), by the push script under Node, and by the unit tests. It used to
// live in changelogEntries.js beside a Vite-only `?url` import of the markdown,
// which is exactly what stopped Node from reusing it.

// The eight oldest headings predate the current convention: they carry a
// month with no day ("2025-03") and a trailing label ("(Sports Page Launch)").
// Both are tolerated rather than rewritten — released_on is a real date, so a
// month-only heading is read as its first day.
const VERSION_RE = /^##\s+\[?(v[\d.]+)\]?\s*[—–-]\s*(\d{4}-\d{2}(?:-\d{2})?)/;

// Every `## [vX…]` heading, matched or not — the push script compares this
// count against the entries it parsed and refuses to clear the buffer if one
// went missing.
export const VERSION_HEADING_RE = /^##\s+\[?v[\d.]+/;
const KIND_RE = /^###\s+(\w+)/;

// The reader-facing paragraph `npm run changelog:notes` writes, as a
// blockquote. One per version, before the first `###` section.
const SUMMARY_RE = /^>\s*(.+)/;

// "- **Name** (`path`): body"  →  { name, path, body }
function parseBullet(raw) {
  let rest = raw.replace(/^-\s+/, "").trim();
  let name = "";
  let path = "";

  const bold = rest.match(/^\*\*(.+?)\*\*/);
  if (bold) {
    name = bold[1].trim();
    rest = rest.slice(bold[0].length).trim();
    // The optional file-path parenthetical. Paths never contain ")".
    const paren = rest.match(/^\(([^)]*)\)/);
    if (paren) {
      path = paren[1].replace(/`/g, "").trim();
      rest = rest.slice(paren[0].length).trim();
    }
    rest = rest.replace(/^:/, "").trim();
  }

  // Strip inline markdown emphasis/code so the highlight reads as plain text.
  const body = rest.replace(/[`*]/g, "").trim();
  return { name: name.replace(/[`*]/g, ""), path, body };
}

/**
 * Parse changelog markdown into version entries.
 * @returns {{version, date, monthKey, summary, changes: {kind, name, path, body}[]}[]}
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
        date: version[2].length === 7 ? `${version[2]}-01` : version[2],
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

export default parseChangelog;
