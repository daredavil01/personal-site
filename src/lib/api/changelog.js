import createResource from "./_crud";
import { supabase } from "../supabaseClient";

// The version history (0028_changelog.sql). Postgres is the source of truth;
// src/data/changelog.md is only the staging buffer a code change appends to,
// which `npm run changelog:push` drains into this table.
//
// Ordering is major/minor/patch, the generated integer columns — text sorts
// v5.0.0 above v18.2.1, and released_on is not a fallback either (v18.2.1 is
// dated the day *before* v18.2.0).
const ORDER = [
  { column: "major", ascending: false },
  { column: "minor", ascending: false },
  { column: "patch", ascending: false },
];

// `changes` is [{ kind, name, path, body }] — the shape changelogParse.js
// produces from a markdown bullet, stored verbatim.
const fromRow = (r) => ({
  id: r.id,
  version: r.version,
  date: r.released_on,
  monthKey: (r.released_on || "").slice(0, 7),
  summary: r.summary ?? "",
  changes: Array.isArray(r.changes) ? r.changes : [],
});

const toRow = (v) => ({
  version: v.version.trim(),
  released_on: v.date,
  summary: v.summary || null,
  changes: Array.isArray(v.changes) ? v.changes : [],
});

const changelog = createResource({
  table: "changelog", order: ORDER, fromRow, toRow,
});

const applyOrder = (query) => ORDER.reduce(
  (q, { column, ascending }) => q.order(column, { ascending }),
  query,
);

/**
 * The major versions that exist, newest first, with how many releases each
 * holds and its newest version string. Selects two columns over ~90 rows, so
 * the tab strip costs a few hundred bytes rather than the archive's prose.
 * @returns {Promise<{ major: number, count: number, latest: string }[]>}
 */
export async function getChangelogMajors() {
  const { data, error } = await applyOrder(
    supabase.from("changelog").select("major, version"),
  );
  if (error) throw error;
  const groups = new Map();
  (data || []).forEach((r) => {
    // Rows arrive newest first, so the first one seen in a group is its latest.
    if (!groups.has(r.major)) groups.set(r.major, { major: r.major, count: 0, latest: r.version });
    groups.get(r.major).count += 1;
  });
  return [...groups.values()];
}

/**
 * Every version in one major, newest first. A major holds at most seventeen
 * releases, so it is one query rather than a paged one.
 */
export async function getChangelogByMajor(major) {
  const { data, error } = await applyOrder(
    supabase.from("changelog").select("*").eq("major", major),
  );
  if (error) throw error;
  return (data || []).map(fromRow);
}

/**
 * Every version released inside `monthKey` ("YYYY-MM"), in the shape
 * changelogHighlights() expects. The Now-month editor needs one month, not the
 * archive.
 */
export async function getChangelogMonth(monthKey) {
  if (!monthKey) return [];
  // Half-open date bounds, not a LIKE: released_on is a real date column and
  // `date ~~ text` is not an operator Postgres has.
  const [y, m] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const end = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
  const { data, error } = await applyOrder(
    supabase.from("changelog").select("*").gte("released_on", start).lt("released_on", end),
  );
  if (error) throw error;
  return (data || []).map(fromRow);
}

/**
 * The written summary of one major version (0030_changelog_majors.sql):
 * headline, paragraph, and the additions and fixes worth naming. Null when
 * `npm run changelog:majors` has not reached that major yet — /changelog then
 * shows the releases without a chapter heading rather than an empty card.
 */
export async function getMajorSummary(major) {
  if (major === null || major === undefined) return null;
  const { data, error } = await supabase
    .from("changelog_majors")
    .select("major, headline, summary, highlights, generated_at")
    .eq("major", major)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const h = data.highlights || {};
  return {
    ...data,
    highlights: {
      added: Array.isArray(h.added) ? h.added : [],
      fixed: Array.isArray(h.fixed) ? h.fixed : [],
    },
  };
}

export const getChangelog = changelog.list;
export default changelog;
