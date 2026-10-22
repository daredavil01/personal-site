// How the crawler-facing Pages Functions (/sitemap.xml, /feed.xml, /llms.txt,
// /llms-full.txt) answer: build the body once an hour per data centre, keep it
// in the edge cache, and say how fresh it is.
//
// Lives outside functions/ because Pages turns every file there into a route.

export const HOUR = 60 * 60;

/**
 * @param {object} context      the Pages Function context
 * @param {() => Promise<{ body: string, complete?: boolean }>} build
 * @param {string} contentType
 * Incomplete output (a table could not be read) is still served, but cached
 * for five minutes instead of an hour, so it heals on its own.
 */
export async function serveCached(context, build, contentType) {
  const cache = (typeof caches !== "undefined" && caches.default) || null;
  // Path only: a query string is not part of these documents, and keying on it
  // would let "?1", "?2"… force a fresh build (and table reads) per request.
  const { origin, pathname } = new URL(context.request.url);
  const key = `${origin}${pathname}`;
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  const { body, complete = true } = await build();
  const response = new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${complete ? HOUR : 300}`,
    },
  });
  if (cache) {
    const put = cache.put(key, response.clone());
    if (context.waitUntil) context.waitUntil(put); else await put;
  }
  return response;
}

export const isComplete = (inventory) => Object.values(inventory).every((rows) => rows !== null);
