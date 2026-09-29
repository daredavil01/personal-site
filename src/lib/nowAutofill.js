// Maps existing content rows (blogs / sports / books / treks / micro-posts) into
// the row shapes the Now page's month sections expect, so the admin month editor
// can pre-fill a month instead of having it retyped.
//
// The three date formats are normalized by monthDigest's parseContentDate; the
// Now components run new Date(x) on their dates, so everything is emitted ISO.
// Micro-posts are the exception: they are not in ContentContext (1,600+ rows),
// so the caller fetches the month server-side and passes them in pre-filtered.

// Explicit extension: scripts/newsletter-draft.mjs imports this under Node.
// eslint-disable-next-line import/extensions
import { itemMonthKey, parseContentDate, toIsoDate } from "./monthDigest.js";

const clean = (v) => (typeof v === "string" ? v.trim() : v) || "";

const isoOf = (item, type) => toIsoDate(parseContentDate(item, type));

// The archive row a section row came from. The newsletter uses it to share the
// item as an image and to pin it into an "ask about this issue" question.
const refOf = (type, id) => (id == null ? undefined : { type, id });

// A book with no day-precise finish date falls back to its created_at — right
// for one added the month it was read, wrong for the 47 imported on one day in
// June 2026, which made that month "37 books". Rows created together carry the
// import's date, not their own, so they are left out of every month.
// ponytail: "5+ books added the same day = an import"; giving a book a real
// finish date (date_precision "day") puts it back in its month for good.
const BULK_IMPORT_MIN = 5;
const addedDay = (row) => String(row.created_at || "").slice(0, 10);
export const notBulkImported = (rows) => {
  const perDay = {};
  rows.forEach((r) => { perDay[addedDay(r)] = (perDay[addedDay(r)] || 0) + 1; });
  return (r) => r.date_precision === "day" || (perDay[addedDay(r)] || 0) < BULK_IMPORT_MIN;
};

/**
 * "21 Kms" → "21". NowRunningSection renders `{distance} km`, so the stored
 * value must be a bare number or the card reads "21 Kms km".
 */
export function bareDistance(value) {
  if (value === null || value === undefined) return "";
  const match = String(value).match(/\d+(?:\.\d+)?/);
  return match ? match[0] : "";
}

// Each source declares which content type it is (for parseContentDate), which
// Now section it lands in, and how one row maps across.
const SOURCES = [
  {
    key: "blogs",
    type: "blog",
    section: "blogs",
    label: "Blogs",
    map: (b) => ({
      title: clean(b.blog_title),
      date: isoOf(b, "blog"),
      url: clean(b.blog_link),
      description: clean(b.blog_description),
      platform: clean(b.blog_platform),
      ref: refOf("blog", b.id),
    }),
  },
  {
    key: "sports",
    type: "sport",
    section: "running",
    label: "Races",
    map: (s) => ({
      event: clean(s.title),
      date: isoOf(s, "sport"),
      distance: bareDistance(s.distance),
      time: clean(s.time),
      note: clean(s.place),
      link: clean(s.timeCertificateLink),
      ref: refOf("sport", s.id),
    }),
  },
  {
    key: "books",
    type: "book",
    section: "books",
    label: "Books",
    // The finish date when it is day-precise, else the date the row was added.
    note: "by finish date, else date added",
    usable: notBulkImported,
    map: (b) => ({
      title: clean(b.title),
      author: clean(b.author),
      link: clean(b.blog_link),
      ref: refOf("book", b.id),
    }),
  },
  {
    key: "treks",
    type: "trek",
    section: "events",
    label: "Treks",
    // The Now page has no trek section; treks read naturally as events.
    note: "added as events",
    map: (t) => ({
      name: clean(t.fort_name),
      date: isoOf(t, "trek"),
      description: [clean(t.trek_time), clean(t.endurance_level)].filter(Boolean).join(" · "),
      link: clean(t.blog_link),
      ref: refOf("trek", t.id),
    }),
  },
  {
    key: "micro",
    section: "micro",
    label: "Micro posts",
    // Already restricted to the month by getMicroblogByMonth.
    preFiltered: true,
    // A photo post can carry an image and no words at all.
    keep: (row) => !!(row.text || row.title || row.imageUrl),
    map: (p) => ({
      id: p.id,
      date: clean(p.date),
      postType: p.postType || "text",
      title: clean(p.title),
      text: clean(p.text),
      tags: p.tags ?? [],
      imageUrl: clean(p.imageUrl),
      ref: refOf("microblog", p.id),
    }),
  },
];

// The field that identifies a row within its section, for duplicate detection
// and for the preview label.
const TITLE_KEY = {
  blogs: "title", running: "event", books: "title", events: "name", micro: "text",
};

/**
 * True when `row` already appears in `existing`: the same archive id or ref,
 * else the same url OR the same title, else — for races — the same day.
 *
 * A url mismatch does not make two rows different: a race typed by hand on
 * /now links its certificate, the archive row links something else, and both
 * are the same race. Before this, "Tata Ultra Marathon" and "Tata Ultra
 * Marathon 2026" both stayed in February and the issue counted 100 km.
 */
// The core of a race's name: "Nanded City LSOM 21 Kms Run" and "Nanded City
// LSOM 2026" are one race typed twice — once on /now with a distance, once in
// the archive with a year.
const raceName = (title) => clean(title).toLowerCase()
  .replace(/\((.*?)\)/g, " $1 ")
  .replace(/\b(19|20)\d{2}\b/g, " ")
  .replace(/\b\d+(\.\d+)?\s*(kms?|km|k)\b/g, " ")
  .replace(/\b(run|race)\b/g, " ")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

const sameRace = (a, b) => {
  const x = raceName(a.event);
  const y = raceName(b.event);
  if (x.length < 6 || y.length < 6) return false;
  const named = x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `);
  return named && bareDistance(a.distance) === bareDistance(b.distance);
};

export function isDuplicate(existing, row, section) {
  const titleKey = TITLE_KEY[section];
  const urlKey = section === "blogs" ? "url" : "link";
  const rowUrl = clean(row[urlKey]).toLowerCase();
  const rowTitle = clean(row[titleKey]).toLowerCase();
  return (existing || []).some((e) => {
    if (row.id && e.id) return String(row.id) === String(e.id);
    if (row.ref && e.ref) return row.ref.type === e.ref.type && String(row.ref.id) === String(e.ref.id);
    // Hand-typed races were often dated the 1st, so a race matches by name and
    // distance before the dates get a say.
    if (section === "running" && sameRace(e, row)) return true;
    // Two dated rows on different days are two things, whatever they are called.
    if (clean(row.date) && clean(e.date) && clean(row.date) !== clean(e.date)) return false;
    const eUrl = clean(e[urlKey]).toLowerCase();
    if (rowUrl && eUrl && rowUrl === eUrl) return true;
    if (rowTitle && clean(e[titleKey]).toLowerCase() === rowTitle) return true;
    // One race a day: the names and links differ, the date does not.
    return section === "running" && !!clean(row.date) && clean(e.date) === clean(row.date);
  });
}

// A typed row that turns out to be an archive row takes the archive's ref and
// its date — the archive is where the real date lives; /now often had the 1st.
const adopt = (typed, archived) => (typed.ref || !archived.ref
  ? typed
  : { ...typed, ref: archived.ref, ...(clean(archived.date) ? { date: archived.date } : {}) });

// `rows` with `row` added, or folded into the row it duplicates.
const absorb = (rows, row, section) => {
  const i = rows.findIndex((e) => isDuplicate([e], row, section));
  if (i < 0) return [...rows, row];
  return rows.map((e, j) => (j === i ? adopt(e, row) : e));
};

/**
 * Collapses rows that describe the same thing within each section, keeping
 * the first (the hand-typed one, since the merge appends) and moving the
 * archive ref of a dropped duplicate onto it. Repairs months merged before
 * isDuplicate knew that a race keeps its date when it changes its name.
 */
export function dedupeSections(sections = {}) {
  const next = { ...sections };
  Object.keys(TITLE_KEY).forEach((section) => {
    if (!Array.isArray(sections[section])) return;
    next[section] = sections[section].reduce((kept, row) => absorb(kept, row, section), []);
  });
  return next;
}

const ellipsis = (text, max = 90) => (text.length > max ? `${text.slice(0, max).trim()}…` : text);

/**
 * Collect every content row that falls in `monthKey` ("YYYY-MM"), mapped into
 * Now section rows and grouped by target section. Rows already present in
 * `sections` are dropped.
 *
 * `data.micro` is expected to be already restricted to the month (micro-posts
 * are fetched server-side); every other source is filtered here.
 *
 * @param {{blogs?: any[], sports?: any[], books?: any[], treks?: any[], micro?: any[]}} data
 * @param {string} monthKey
 * @param {object} sections current sections blob (for duplicate filtering)
 * @returns {{key, label, section, note?, rows: {row, label, meta}[]}[]}
 */
export function collectMonthRecords(data, monthKey, sections = {}) {
  if (!monthKey) return [];
  return SOURCES.map((source) => {
    const keep = source.keep || ((row) => clean(row[TITLE_KEY[source.section]]));
    const all = data[source.key] || [];
    const rows = all
      .filter(source.usable ? source.usable(all) : Boolean)
      .filter((item) => source.preFiltered || itemMonthKey(item, source.type) === monthKey)
      .map(source.map)
      .filter(keep)
      .filter((row) => !isDuplicate(sections[source.section], row, source.section));
    return {
      key: source.key,
      label: source.label,
      section: source.section,
      note: source.note,
      rows: rows.map((row) => ({
        row,
        label: ellipsis(clean(row[TITLE_KEY[source.section]]) || clean(row.title) || "(image only)"),
        meta: [row.date, row.platform, row.author, row.postType,
          row.distance && `${row.distance} km`].filter(Boolean).join(" · "),
      })),
    };
  }).filter((group) => group.rows.length > 0);
}

/**
 * The month's sections with every content row of `monthKey` merged in — what
 * `npm run newsletter:draft` writes. Idempotent: a row already present is not
 * added again, but gains the archive `ref` it was missing (rows typed by hand,
 * or pulled before refs existed), so re-running it over an old month upgrades
 * that month rather than duplicating it.
 */
export function mergeMonthRecords(data, monthKey, sections = {}) {
  const next = dedupeSections(sections);
  collectMonthRecords(data, monthKey, {}).forEach(({ section, rows }) => {
    next[section] = rows.reduce((merged, { row }) => absorb(merged, row, section), next[section] || []);
  });
  return next;
}

export default collectMonthRecords;
