// PostgREST reads for the crawler layer: functions/_middleware.js and the Pages
// Functions behind /sitemap.xml, /feed.xml and /llms-full.txt.
//
// It lives here and not under functions/ because Pages turns every file there
// into a route. Reads go out with the publishable anon key, so RLS applies
// exactly as it does for a visitor: a hidden project or an unpublished issue
// never reaches a crawler.
//
// The result separates "the row does not exist" ({ ok: true, rows: [] }) from
// "the database could not be asked" ({ ok: false }). The middleware answers the
// first with a 404 and the second with the page as it always was — an outage
// must never tell a search engine that every page has gone.

// PostgREST caps a response at 1,000 rows by default (Supabase `max_rows`).
export const PAGE_SIZE = 1000;

export function restConfig(env = {}) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

// The Workers Cache API, when there is one (absent under Jest and wrangler's
// local dev). Keys live on the serving origin rather than supabase.co so the
// entries belong to this zone.
const edgeCache = () => (typeof caches !== "undefined" && caches.default) || null;

/**
 * One PostgREST request. `path` is everything after /rest/v1/, query included.
 * POST with `body` calls an RPC. `ttl` seconds of edge caching; 0 disables it.
 * @returns {Promise<{ ok: boolean, rows: any }>}
 */
export async function rest(env, path, { body, ttl = 300, cacheOrigin } = {}) {
  const config = restConfig(env);
  if (!config) return { ok: false, rows: null };

  const cache = ttl && cacheOrigin ? edgeCache() : null;
  const cacheKey = cache
    ? `${cacheOrigin}/__seo-cache/${encodeURIComponent(path)}${body ? `/${encodeURIComponent(JSON.stringify(body))}` : ""}`
    : null;

  try {
    if (cache) {
      const hit = await cache.match(cacheKey);
      if (hit) return { ok: true, rows: await hit.json() };
    }
    const res = await fetch(`${config.url}/rest/v1/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.ok === false) return { ok: false, rows: null };
    const rows = await res.json();
    if (cache) {
      await cache.put(cacheKey, new Response(JSON.stringify(rows), {
        headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttl}` },
      }));
    }
    return { ok: true, rows };
  } catch (_) {
    return { ok: false, rows: null };
  }
}

/**
 * Every row of a select, paged past the 1,000-row cap with limit/offset. The
 * micro-blog alone has more than 1,600. Fails as a whole: a sitemap missing
 * half a table is worse than one that says it could not be built.
 */
export async function restAll(env, path, options = {}) {
  const rows = [];
  const sep = path.includes("?") ? "&" : "?";
  for (let offset = 0; offset < 50 * PAGE_SIZE; offset += PAGE_SIZE) {
    // eslint-disable-next-line no-await-in-loop -- each page decides whether there is a next one
    const page = await rest(env, `${path}${sep}limit=${PAGE_SIZE}&offset=${offset}`, options);
    if (!page.ok || !Array.isArray(page.rows)) return { ok: false, rows: null };
    rows.push(...page.rows);
    if (page.rows.length < PAGE_SIZE) break;
  }
  return { ok: true, rows };
}
