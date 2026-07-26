// Maps existing content rows (blogs / sports / books / treks) into the row
// shapes the Now page's month sections expect, so the admin month editor can
// pre-fill a month instead of having it retyped.
//
// The three date formats are normalized by monthDigest's parseContentDate; the
// Now components run new Date(x) on their dates, so everything is emitted ISO.

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
];

// The field that identifies a row within its section, for duplicate detection.
const TITLE_KEY = {
  blogs: "title", running: "event", books: "title", events: "name",
};

/** True when `row` already appears in `existing` (same url, else same title). */
export function isDuplicate(existing, row, section) {
  const titleKey = TITLE_KEY[section];
  const urlKey = section === "blogs" ? "url" : "link";
  const rowUrl = clean(row[urlKey]).toLowerCase();
  const rowTitle = clean(row[titleKey]).toLowerCase();
  return (existing || []).some((e) => {
    const eUrl = clean(e[urlKey]).toLowerCase();
    if (rowUrl && eUrl) return rowUrl === eUrl;
    return !!rowTitle && clean(e[titleKey]).toLowerCase() === rowTitle;
  });
}

/**
 * Collect every content row that falls in `monthKey` ("YYYY-MM"), mapped into
 * Now section rows and grouped by target section. Rows already present in
 * `sections` are dropped.
 *
 * @param {{blogs?: any[], sports?: any[], books?: any[], treks?: any[]}} data
 * @param {string} monthKey
 * @param {object} sections current sections blob (for duplicate filtering)
 * @returns {{key, label, section, note?, rows: {row, label, meta}[]}[]}
 */
export function collectMonthRecords(data, monthKey, sections = {}) {
  if (!monthKey) return [];
  return SOURCES.map((source) => {
    const rows = (data[source.key] || [])
      .filter((item) => itemMonthKey(item, source.type) === monthKey)
      .map(source.map)
      .filter((row) => clean(row[TITLE_KEY[source.section]]))
      .filter((row) => !isDuplicate(sections[source.section], row, source.section));
    return {
      key: source.key,
      label: source.label,
      section: source.section,
      note: source.note,
      rows: rows.map((row) => ({
        row,
        label: row[TITLE_KEY[source.section]],
        meta: [row.date, row.platform, row.author, row.distance && `${row.distance} km`]
          .filter(Boolean).join(" · "),
      })),
    };
  }).filter((group) => group.rows.length > 0);
}

export default collectMonthRecords;
