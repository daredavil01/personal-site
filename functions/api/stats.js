// Cloudflare Pages Function — GET /api/stats.
//
// Every number on /stats, computed at most once an hour per edge location and
// cached (src/lib/statsEndpoint.js). The /stats page renders from it, and the
// nightly /ask indexer embeds from it, so the chatbot and the page always quote
// the same figures.

import { getStatsPayload, STATS_TTL_SECONDS } from "../../src/lib/statsEndpoint";

const json = (body, status, cacheControl) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": cacheControl },
});

export async function onRequestGet(context) {
  if (!context.env.VITE_SUPABASE_URL) {
    return json({ error: "not configured" }, 503, "no-store");
  }
  try {
    const payload = await getStatsPayload(context);
    // A browser may keep it only for what is left of the edge copy's hour.
    const ageSeconds = Math.round((Date.now() - Date.parse(payload.generatedAt)) / 1000);
    const maxAge = Math.max(0, STATS_TTL_SECONDS - Math.max(0, ageSeconds));
    return json(payload, 200, `public, max-age=${maxAge}`);
  } catch (err) {
    return json({ error: "stats unavailable", detail: String(err?.message || err) }, 502, "no-store");
  }
}
