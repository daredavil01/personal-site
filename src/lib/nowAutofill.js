// Maps existing content rows (blogs / sports / books / treks / micro-posts) into
// the row shapes the Now page's month sections expect, so the admin month editor
// can pre-fill a month instead of having it retyped.
//
// The three date formats are normalized by monthDigest's parseContentDate; the
// Now components run new Date(x) on their dates, so everything is emitted ISO.
// Micro-posts are the exception: they are not in ContentContext (1,600+ rows),
// so the caller fetches the month server-side and passes them in pre-filtered.

import { itemMonthKey, parseContentDate, toIsoDate } from "./monthDigest";

const clean = (v) => (typeof v === "string" ? v.trim() : v) || "";

const isoOf = (item, type) => toIsoDate(parseContentDate(item, type));

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
      url: clean(b.blog_link),
      description: clean(b.blog_description),
      platform: clean(b.blog_platform),
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
    }),
  },
  {
    key: "books",
    type: "book",
    section: "books",
    label: "Books",
    // Books only store a year, so parseContentDate falls back to created_at.
    note: "bucketed by date added",
    map: (b) => ({
      title: clean(b.title),
      author: clean(b.author),
      link: clean(b.blog_link),
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
    }),
  },
];

// The field that identifies a row within its section, for duplicate detection
// and for the preview label.
const TITLE_KEY = {
  blogs: "title", running: "event", books: "title", events: "name", micro: "text",
};

/**
 * True when `row` already appears in `existing` — by archive id when both have
 * one, else by url, else by title.
 */
export function isDuplicate(existing, row, section) {
  const titleKey = TITLE_KEY[section];
  const urlKey = section === "blogs" ? "url" : "link";
  const rowUrl = clean(row[urlKey]).toLowerCase();
  const rowTitle = clean(row[titleKey]).toLowerCase();
  return (existing || []).some((e) => {
    if (row.id && e.id) return String(row.id) === String(e.id);
    const eUrl = clean(e[urlKey]).toLowerCase();
    if (rowUrl && eUrl) return rowUrl === eUrl;
    return !!rowTitle && clean(e[titleKey]).toLowerCase() === rowTitle;
  });
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
    const rows = (data[source.key] || [])
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

export default collectMonthRecords;
