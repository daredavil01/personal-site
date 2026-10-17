// /feed.xml — RSS 2.0 of the newest additions across the site
// (src/lib/seo/feed.js). Linked from index.html as rel="alternate".
//
// The site-wide _middleware.js skips this path: it has a file extension.
import { loadInventory } from "../src/lib/seo/inventory";
import { feedItems, buildFeed, FEED_SIZE } from "../src/lib/seo/feed";
import { serveCached, isComplete, HOUR } from "../src/lib/seo/serve";

// Every table but the micro-blog is small enough to read whole; the micro-blog
// contributes its newest posts with text, which is all a feed could show.
const KINDS = ["book", "trek", "sport", "project", "blog", "presentation", "newsletter", "microblog"];

export async function onRequestGet(context) {
  return serveCached(context, async () => {
    const inventory = await loadInventory(context.env, {
      kinds: KINDS,
      limit: { microblog: FEED_SIZE },
      cacheOrigin: new URL(context.request.url).origin,
      ttl: HOUR,
    });
    return { body: buildFeed(feedItems(inventory)), complete: isComplete(inventory) };
  }, "application/rss+xml; charset=utf-8");
}
