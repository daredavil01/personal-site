// The /stats snapshot for Node scripts (the /ask indexer and build-docs).
//
// Reads the same hourly-cached JSON the live /stats page renders
// (GET /api/stats). If the site is unreachable, or still runs a deployment
// without the endpoint, it computes the identical payload locally from
// Supabase with the same shared code — so a run never fails on it.

import { buildStatsPayload, STATS_VERSION } from "../../src/lib/siteStats.js";
import { loadSiteStatsInput } from "../../src/lib/siteStatsInput.js";
import personalFacts from "../../src/data/stats/personalFacts.js";

export const STATS_URL = process.env.ASK_STATS_URL || "https://sankettambare.in/api/stats";

let memo = null;

export async function getStatsPayload() {
  if (memo) return memo;
  try {
    const res = await fetch(STATS_URL, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const payload = await res.json();
      if (payload?.version === STATS_VERSION) {
        memo = { payload, from: STATS_URL };
        return memo;
      }
    }
  } catch (_) {
    // Fall through to computing it here.
  }
  const input = await loadSiteStatsInput({
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  });
  memo = { payload: buildStatsPayload({ ...input, personal: personalFacts }), from: "computed locally" };
  return memo;
}
