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
//
// `?full=1` adds each post's body (`html`, the raw content:encoded) and its
// cover image. The Social kit in /admin reads it to fill a post's title,
// subtitle and text from one request; the home page asks without it and gets
// the same small payload as before. The body stays HTML here and becomes text
// in the browser (src/lib/htmlText.js): turning ~0.5 MB of HTML into text is
// the one step that could cost more than the Worker's 10 ms of CPU. The feed
// carries the latest 20 posts — anything older is pasted in by hand.

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
function parseRss(xml, { full = false } = {}) {
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  return itemBlocks.map((block) => {
    const item = {
      title: extractTag(block, "title"),
      link: extractTag(block, "link"),
      pubDate: extractTag(block, "pubDate"),
      description: extractTag(block, "description"),
      guid: extractTag(block, "guid"),
    };
    if (!full) return item;
    const image = /<enclosure[^>]*\burl="([^"]+)"/.exec(block);
    return {
      ...item,
      html: extractTag(block, "content:encoded") || "",
      image: image ? image[1].replace(/&amp;/g, "&") : null,
    };
  });
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
  const full = new URL(context.request.url).searchParams.get("full") === "1";
  const items = parseRss(xml, { full });

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
