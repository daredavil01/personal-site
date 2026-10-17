// /sitemap.xml, built from the route manifest and the live tables.
//
// Pages only, never individual entities: a route is listed because the
// manifest says it is indexable, and a section page is dated by the newest
// row it lists. Detail pages (/books/12, /micro-blog/5, /tags/x …) stay
// crawlable through their section pages, which link every one.
//
// Pure: functions/sitemap.xml.js does the reading and passes the inventory in.

import { SITE_URL } from "../../data/pageMeta";
import { ROUTE_MANIFEST } from "../../data/routeManifest";
import { SECTION_KINDS } from "./entities";
import { isNeverIndexed } from "./indexing";
import { newestUpdate } from "./inventory";
import { escXml } from "./text";

// Static pages served straight out of public/, which the manifest cannot see.
export const STATIC_PAGES = ["/writing-ledger.html"];

const isLiteral = (path) => !path.includes(":") && !path.includes("*");

/** Indexable routes with no parameter: the pages every visitor can reach. */
export const indexableFixedRoutes = () => ROUTE_MANIFEST
  .filter((e) => e.indexable && isLiteral(e.path) && !isNeverIndexed(e.path))
  .map((e) => e.path);

const abs = (path) => `${SITE_URL}${path === "/" ? "/" : path}`;

/**
 * @param {Record<string, any[]|null>} inventory  loadInventory() output
 * @returns {{ path: string, lastmod: string|null }[]}
 */
export function sitemapEntries(inventory = {}) {
  const fixed = indexableFixedRoutes().map((path) => {
    const kind = SECTION_KINDS[path];
    return { path, lastmod: kind ? newestUpdate(inventory[kind]) : null };
  });
  return [...fixed, ...STATIC_PAGES.map((path) => ({ path, lastmod: null }))];
}

export function buildSitemap(entries) {
  const urls = entries.map(({ path, lastmod }) => `  <url><loc>${escXml(abs(path))}</loc>${
    lastmod ? `<lastmod>${escXml(lastmod)}</lastmod>` : ""
  }</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
