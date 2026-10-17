// /feed.xml — RSS 2.0 of the newest things on the site, linking to its own pages.
//
// The only feed before this was Substack's, proxied for the home page. Feed
// readers, aggregators and several AI crawlers discover a site through its
// feed, and this one covers everything — races, treks, books, issues, posts.
//
// Pure: functions/feed.xml.js reads the inventory and passes it in.

import { SITE_URL, SITE_NAME, PAGE_META } from "../../data/pageMeta";
import { viewOf } from "./entities";
import { clip, escXml } from "./text";

export const FEED_SIZE = 50;

const LABELS = {
  book: "Book",
  trek: "Trek",
  sport: "Race",
  project: "Project",
  blog: "Essay",
  presentation: "Presentation",
  newsletter: "Newsletter",
  microblog: "Micro-post",
};

// The date a row happened, else when it was added. Never updated_at: an edit
// would float an old trek to the top of every reader.
const whenOf = (view, row) => {
  const date = view.date && /^\d{4}-\d{2}-\d{2}/.test(view.date) ? view.date : null;
  const when = new Date(date || row.created_at || 0);
  return Number.isNaN(when.getTime()) ? null : when;
};

/**
 * @param {Record<string, any[]|null>} inventory  loadInventory() output
 * @returns {{ title, path, date: Date, description, category }[]} newest first
 */
export function feedItems(inventory = {}, size = FEED_SIZE) {
  return Object.keys(LABELS)
    .flatMap((kind) => (inventory[kind] || []).map((row) => {
      const view = viewOf(kind, row);
      const when = whenOf(view, row);
      return when ? {
        title: kind === "microblog" ? clip(view.title, 90) : view.title,
        path: view.path,
        date: when,
        description: clip(view.description, 300),
        category: LABELS[kind],
      } : null;
    }))
    .filter(Boolean)
    .sort((a, b) => b.date - a.date)
    .slice(0, size);
}

export function buildFeed(items, { now = new Date() } = {}) {
  const feedUrl = `${SITE_URL}/feed.xml`;
  const entries = items.map((item) => [
    "    <item>",
    `      <title>${escXml(item.title)}</title>`,
    `      <link>${escXml(`${SITE_URL}${item.path}`)}</link>`,
    `      <guid isPermaLink="true">${escXml(`${SITE_URL}${item.path}`)}</guid>`,
    `      <pubDate>${item.date.toUTCString()}</pubDate>`,
    `      <category>${escXml(item.category)}</category>`,
    item.description ? `      <description>${escXml(item.description)}</description>` : "",
    "    </item>",
  ].filter(Boolean).join("\n"));
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <description>${escXml(PAGE_META["/"].description)}</description>
    <language>en</language>
    <lastBuildDate>${(items[0]?.date || now).toUTCString()}</lastBuildDate>
${entries.join("\n")}
  </channel>
</rss>
`;
}
