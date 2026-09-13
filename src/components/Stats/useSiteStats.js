import { useEffect, useState } from "react";
import { buildStatsPayload, STATS_VERSION } from "../../lib/siteStats";
import { loadSiteStatsInput } from "../../lib/siteStatsInput";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../../lib/supabaseClient";
import personalFacts from "../../data/stats/personalFacts";

// The /stats page's one data source: GET /api/stats, a snapshot the edge
// computes at most once an hour. Both layouts share it, so switching between
// Almanac and Classic costs nothing.
//
// If the endpoint is unavailable — plain `npm run dev` without `npm run dev:ask`,
// or a deployment that predates it — the identical payload is computed here
// from Supabase with the same shared code, so the page never goes blank.

const MAX_AGE_MS = 60 * 60 * 1000;
let snapshot = null; // { promise, at } shared across mounts in this tab

async function loadSnapshot() {
  try {
    const res = await fetch("/api/stats", { headers: { Accept: "application/json" } });
    if (res.ok) {
      const payload = await res.json();
      if (payload?.version === STATS_VERSION) return payload;
    }
  } catch (_) {
    // Fall back to computing it in the browser.
  }
  const input = await loadSiteStatsInput({ url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY });
  return buildStatsPayload({ ...input, personal: personalFacts });
}

function getSnapshot() {
  if (!snapshot || Date.now() - snapshot.at > MAX_AGE_MS) {
    const promise = loadSnapshot();
    snapshot = { promise, at: Date.now() };
    // A failed load must not be cached for the next visit to the page.
    promise.catch(() => { snapshot = null; });
  }
  return snapshot.promise;
}

export default function useSiteStats() {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    getSnapshot()
      .then((data) => { if (alive) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (alive) setState({ data: null, loading: false, error }); });
    return () => { alive = false; };
  }, []);

  return state;
}
