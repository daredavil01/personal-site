// /sitemap.xml — every indexable URL, built from the route manifest and the
// live tables (src/lib/seo/sitemap.js). Replaces the hand-written file in
// public/, which listed 19 pages and none of the ~2,000 detail pages.
//
// The site-wide _middleware.js skips this path: it has a file extension.
import { loadInventory } from "../src/lib/seo/inventory";
import { sitemapEntries, buildSitemap } from "../src/lib/seo/sitemap";
import { serveCached, isComplete, HOUR } from "../src/lib/seo/serve";

// A sitemap needs keys and dates, nothing else — the micro-blog alone is 1,600+
// rows, so its text stays in the database. The filter is isIndexableMicroblog:
// a photo post with no words is noindexed and must not be listed.
const SELECT = {
  book: "id,updated_at",
  trek: "id,updated_at",
  sport: "id,updated_at",
  project: "id,updated_at",
  blog: "id,updated_at",
  presentation: "id,updated_at",
  newsletter: "slug,updated_at",
  microblog: "id,updated_at",
};

export async function onRequestGet(context) {
  return serveCached(context, async () => {
    const inventory = await loadInventory(context.env, {
      select: SELECT,
      cacheOrigin: new URL(context.request.url).origin,
      ttl: HOUR,
    });
    return { body: buildSitemap(sitemapEntries(inventory)), complete: isComplete(inventory) };
  }, "application/xml; charset=utf-8");
}
