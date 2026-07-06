// Cloudflare Pages Function — serves the parsed Substack RSS feed as JSON.
// Endpoint: /rss-feed (Pages uses file-based routing, so the filename is the path).
//
// Substack's feed blocks CORS, so it cannot be fetched directly from the browser.
// This runs server-side (no CORS), parses the <item> blocks with a dependency-free
// regex parser (the Workers runtime is restricted — no RSS library), and caches the
// result at the edge for 30 minutes so Substack isn't hit on every page load.
//
// The site-wide _middleware.js also runs for this path but returns the response
// unchanged because it only rewrites text/html responses (this emits JSON).

const FEED_URL = "https://sankettambare.substack.com/feed";
const CACHE_TTL_SECONDS = 60 * 30; // 30 minutes

// Extracts a tag's inner text. The `[^>]*` allows attributed tags such as
// <guid isPermaLink="false"> to match; CDATA wrappers are stripped.
function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!match) return null;
  return match[1]
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .trim();
}

// Minimal RSS <item> parser — no external deps, works in the Workers runtime.
function parseRss(xml) {
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  return itemBlocks.map((block) => ({
    title: extractTag(block, "title"),
    link: extractTag(block, "link"),
    pubDate: extractTag(block, "pubDate"),
    description: extractTag(block, "description"),
    guid: extractTag(block, "guid"),
  }));
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(context.request.url).toString(), context.request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let feedRes;
  try {
    feedRes = await fetch(FEED_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RSSFetcher/1.0)" },
    });
  } catch (_) {
    return new Response(JSON.stringify({ error: "Failed to fetch feed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!feedRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to fetch feed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const xml = await feedRes.text();
  const items = parseRss(xml);

  const body = JSON.stringify({ items, fetchedAt: new Date().toISOString() });
  const response = new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
    },
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
