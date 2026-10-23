// Client side of functions/api/youtube-sync.js — the "Sync now" button at
// /admin/videos/sync. YOUTUBE_API_KEY is a Cloudflare secret, so the Data API is
// called from the endpoint; this hands it the session token, which it checks
// with is_owner() before spending a unit of quota.
//
// The loop lives here, not in the endpoint: one page per request keeps each
// call inside Workers Free's 10 ms CPU and 50-subrequest limits.

import { supabase } from "../supabaseClient";

// A runaway guard, not a limit anyone should meet: 200 pages is 5,000 uploads.
const MAX_PAGES = 200;

async function call(payload) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Signed out — sign in again to sync.");

  const res = await fetch("/api/youtube-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.note || body.error || `youtube-sync ${res.status}`);
  return body;
}

/**
 * The whole channel: every page of uploads, then the playlists. `onProgress`
 * gets a running summary after each request, so the page can draw a bar.
 * `recheck` re-detects Short/Video for videos already stored.
 */
export async function syncChannel({ recheck = false, onProgress = () => {} } = {}) {
  const summary = {
    channel: null,
    total: null,
    pages: 0,
    added: 0,
    updated: 0,
    skipped: 0,
    seen: [],
    probes: { short: 0, video: 0, unknown: 0 },
    playlists: null,
  };
  let page = null;
  let playlist = null;
  do {
    // eslint-disable-next-line no-await-in-loop
    const res = await call({ step: "uploads", page, playlist, recheck });
    if (res.channel) summary.channel = res.channel;
    playlist = res.playlist;
    summary.total = res.total ?? summary.total;
    summary.pages += 1;
    summary.added += res.added;
    summary.updated += res.updated;
    summary.skipped += res.skipped;
    summary.seen.push(...res.seen);
    Object.keys(summary.probes).forEach((k) => { summary.probes[k] += res.probes?.[k] || 0; });
    page = res.next;
    onProgress({ ...summary, phase: "uploads" });
  } while (page && summary.pages < MAX_PAGES);

  onProgress({ ...summary, phase: "playlists" });
  summary.playlists = await call({ step: "playlists", channel: summary.channel?.id });
  onProgress({ ...summary, phase: "done" });
  return summary;
}

/** One video by link. Returns { video, added }. */
export const addVideo = (url, { recheck = false } = {}) => call({ step: "one", url, recheck });
