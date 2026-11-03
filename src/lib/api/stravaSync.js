// Client side of functions/api/strava-sync.js — the "Sync now" button at
// /admin/training/sync. The Strava secrets and the rotating token never reach
// the browser; this hands the endpoint the session token, which it checks with
// is_owner().
//
// The loop lives here: one step per request keeps each call inside Workers
// Free's 10 ms CPU and 50-subrequest limits.

import { supabase } from "../supabaseClient";

const MAX_LIST_PAGES = 100; // 20,000 activities — a runaway guard
const MAX_DETAIL_STEPS = 40; // 1,000 details, Strava's whole daily budget

async function call(payload) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Signed out — sign in again to sync.");
  const res = await fetch("/api/strava-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body.note || body.error || `strava-sync ${res.status}`), {
      code: body.error, limits: body.limits,
    });
  }
  return body;
}

export const stravaStatus = () => call({ step: "status" });

/**
 * `full`: every page of the list (catches renamed / re-typed old activities).
 * Otherwise only activities since a week before the newest stored one.
 * Then athlete + gear, then details until none are pending or the budget ends.
 */
export async function syncStrava({ full = false, details = true, onProgress = () => {} } = {}) {
  const summary = {
    listed: 0, pages: 0, details: 0, pending: null, athlete: null, stopped: null, limits: null,
  };
  let page = 1;
  while (page && summary.pages < MAX_LIST_PAGES) {
    onProgress({ phase: "list", ...summary });
    // eslint-disable-next-line no-await-in-loop
    const res = await call({ step: "list", page, after: full ? null : "latest" });
    summary.listed += res.count;
    summary.pages += 1;
    summary.limits = res.limits || summary.limits;
    page = res.next;
  }
  onProgress({ phase: "athlete", ...summary });
  summary.athlete = await call({ step: "athlete" });

  if (details) {
    for (let i = 0; i < MAX_DETAIL_STEPS; i += 1) {
      onProgress({ phase: "detail", ...summary });
      let res;
      try {
        // eslint-disable-next-line no-await-in-loop
        res = await call({ step: "detail" });
      } catch (err) {
        if (err.code === "rate_limit") {
          summary.stopped = "rate_limit";
          summary.limits = err.limits || summary.limits;
          break;
        }
        throw err;
      }
      summary.details += res.fetched;
      summary.pending = res.pending;
      summary.limits = res.limits || summary.limits;
      if (res.stopped) {
        summary.stopped = res.stopped;
        break;
      }
      if (!res.fetched || !res.pending) break;
    }
  }
  onProgress({ phase: "done", ...summary });
  return summary;
}
