// The hourly /stats snapshot, for Pages Functions only (uses the Cache API).
//
// One computation per hour per Cloudflare location, shared by GET /api/stats
// (the /stats page and the nightly /ask indexer) and the /api/ask facts card.
// Lives in src/ because Pages turns every file under functions/ into a route.
//
// ponytail: concurrent cache misses each rebuild the snapshot (no lock). At
// this traffic that is a handful of extra Supabase reads an hour; add a
// stale-while-revalidate lock if it ever shows up in the logs.

import { buildStatsPayload } from "./siteStats";
import { loadSiteStatsInput } from "./siteStatsInput";
import personalFacts from "../data/stats/personalFacts";

export const STATS_TTL_SECONDS = 60 * 60;
// Versioned so a payload-shape change never serves the old cached JSON.
const CACHE_PATH = "/__stats/v1";

export async function getStatsPayload(context) {
  const { env, request } = context;
  const cache = caches.default;
  const key = new Request(new URL(CACHE_PATH, request.url).toString());

  const hit = await cache.match(key);
  if (hit) return hit.json();

  const input = await loadSiteStatsInput({
    url: env.VITE_SUPABASE_URL,
    key: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY,
  });
  const payload = buildStatsPayload({ ...input, personal: personalFacts });

  context.waitUntil(cache.put(key, new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${STATS_TTL_SECONDS}`,
    },
  })));
  return payload;
}
