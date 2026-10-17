// /sitemap.xml — every indexable page, built from the route manifest
// (src/lib/seo/sitemap.js). Individual entities are not listed; the tables are
// read only to date each section page by its newest row.
//
// The site-wide _middleware.js skips this path: it has a file extension.
import { loadInventory } from "../src/lib/seo/inventory";
import { sitemapEntries, buildSitemap } from "../src/lib/seo/sitemap";
import { serveCached, isComplete, HOUR } from "../src/lib/seo/serve";

// Dates only — the micro-blog alone is 1,600+ rows. Tags are not read: their
// rows carry no updated_at, so /tags has no lastmod either way.
const KINDS = ["book", "trek", "sport", "project", "blog", "presentation", "newsletter", "microblog"];
const SELECT = Object.fromEntries(KINDS.map((kind) => [kind, "updated_at"]));

export async function onRequestGet(context) {
  return serveCached(context, async () => {
    const inventory = await loadInventory(context.env, {
      kinds: KINDS,
      select: SELECT,
      cacheOrigin: new URL(context.request.url).origin,
      ttl: HOUR,
    });
    return { body: buildSitemap(sitemapEntries(inventory)), complete: isComplete(inventory) };
  }, "application/xml; charset=utf-8");
}
