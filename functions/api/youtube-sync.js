// Cloudflare Pages Function — POST /api/youtube-sync.
//
// Copies the channel's public uploads into the `videos` table (0035). Owner
// only, checked the way every owner surface here is: is_owner() called with the
// caller's own access token. YOUTUBE_API_KEY is a Cloudflare secret, which is
// why this is an endpoint and not a browser call. The key must not be
// restricted by HTTP referrer (a server request has none) — restrict it to the
// YouTube Data API instead.
//
// The browser drives the loop, one small step per request, because Workers Free
// allows 10 ms of CPU and 50 subrequests per request:
//
//   { step: "uploads", page?, playlist?, recheck? }
//       One page (25) of the uploads playlist → videos.list → upsert. Returns
//       `next` until the last page, and `channel` (incl. the uploads playlist
//       id) so later pages skip the channel lookup. ≤ 31 subrequests.
//   { step: "playlists", channel }
//       Every playlist's members → set_video_playlists(), which replaces each
//       row's `playlists`. Stops at the subrequest budget and says so.
//   { step: "one", url }
//       One video by link (an upload the sync missed, or an unlisted one made
//       public later).
//
// The upsert carries only the columns YouTube owns (src/lib/youtube.js
// toVideoRow); kind_override, visible and tags are the site's and never sent.
// Nothing is deleted: the admin page lists rows a full run did not see.
//
// Quota: every call here costs 1 unit of the key's 10,000 a day.

import { json, restHeaders, rpc } from "../../src/lib/askServer";
import {
  YOUTUBE_CHANNEL, isPublishedVideo, isShortCandidate, parseIsoDuration, shortsProbe,
  toVideoRow, videoIdFromUrl,
} from "../../src/lib/youtube";

const API = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 25;
// Headroom under the 50-subrequest cap for the owner check, the reads and the write.
const PLAYLIST_FETCH_BUDGET = 40;

/** The caller's bearer token, which is a Supabase session token or nothing. */
function bearer(request) {
  const match = /^Bearer\s+(.+)$/i.exec((request.headers.get("Authorization") || "").trim());
  return match ? match[1] : null;
}

async function isOwner(env, request) {
  const token = bearer(request);
  if (!token) return { ok: false };
  try {
    return { ok: (await rpc(env, "is_owner", {}, { token })) === true };
  } catch (_) {
    // An unreachable database is not the same answer as "you are not the owner".
    return { ok: false, unavailable: true };
  }
}

/** One Data API GET. A YouTube error (quota, a blocked key) keeps its own message. */
async function yt(env, path, params) {
  const qs = new URLSearchParams({ ...params, key: env.YOUTUBE_API_KEY });
  const res = await fetch(`${API}/${path}?${qs}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason || "";
    const err = new Error(body?.error?.message || `YouTube ${path} ${res.status}`);
    err.status = res.status;
    err.reason = reason;
    throw err;
  }
  return body;
}

async function lookupChannel(env) {
  const body = await yt(env, "channels", {
    part: "snippet,contentDetails,statistics",
    forHandle: YOUTUBE_CHANNEL.handle,
  });
  const item = body.items?.[0];
  if (!item) throw Object.assign(new Error(`No channel found for ${YOUTUBE_CHANNEL.handle}`), { status: 404 });
  return {
    id: item.id,
    title: item.snippet?.title || "",
    uploads: item.contentDetails?.relatedPlaylists?.uploads,
    subscribers: item.statistics?.hiddenSubscriberCount ? null : Number(item.statistics?.subscriberCount ?? NaN),
    videoCount: Number(item.statistics?.videoCount ?? NaN),
  };
}

/** The rows already stored for these ids: youtube_id → { kind, source }. */
async function existingRows(env, ids) {
  if (!ids.length) return new Map();
  const list = ids.map((id) => `"${id}"`).join(",");
  const res = await fetch(
    `${env.VITE_SUPABASE_URL}/rest/v1/videos?select=youtube_id,kind,source&youtube_id=in.(${list})`,
    { headers: restHeaders(env, { serviceRole: true }) },
  );
  if (!res.ok) throw new Error(`videos read ${res.status}`);
  return new Map((await res.json()).map((r) => [r.youtube_id, r]));
}

async function upsert(env, rows) {
  if (!rows.length) return;
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/videos?on_conflict=youtube_id`, {
    method: "POST",
    headers: {
      ...restHeaders(env, { serviceRole: true }),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`videos write ${res.status} ${detail.slice(0, 200)}`);
  }
}

/**
 * Short or video for one upload: a candidate by duration, confirmed at
 * /shorts/<id>. `by` says what decided it, for the page's tally.
 */
async function detectKind(id, seconds) {
  if (!isShortCandidate(seconds)) return { kind: "video", by: "video" };
  let verdict = null;
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, { method: "HEAD", redirect: "manual" });
    verdict = shortsProbe(res.status, res.headers.get("location"));
  } catch (_) {
    verdict = null;
  }
  // No verdict (blocked, a consent page): the duration decides.
  return verdict ? { kind: verdict, by: verdict } : { kind: "short", by: "unknown" };
}

/**
 * videos.list items → rows. An existing row keeps its kind unless `recheck`, so
 * a routine sync probes only new uploads. Sequential on purpose: a page of 25
 * parallel probes is the kind of burst YouTube answers with a block page.
 */
async function toRows(items, existing, { recheck, source }) {
  const tally = { short: 0, video: 0, unknown: 0 };
  const now = new Date().toISOString();
  const rows = [];
  // Indexed rather than for…of: airbnb bans the iterator protocol.
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const stored = existing.get(item.id);
    let { kind } = stored || {};
    if (!stored || recheck) {
      // eslint-disable-next-line no-await-in-loop
      const detected = await detectKind(item.id, parseIsoDuration(item.contentDetails?.duration));
      kind = detected.kind;
      tally[detected.by] += 1;
    }
    rows.push(toVideoRow(item, {
      kind,
      source: source === "manual" ? stored?.source || "manual" : "sync",
      now,
    }));
  }
  return { rows, tally };
}

async function stepUploads(env, body) {
  const channel = body.playlist ? null : await lookupChannel(env);
  const playlist = body.playlist || channel?.uploads;
  if (!playlist) throw Object.assign(new Error("The channel has no uploads playlist."), { status: 404 });

  const page = await yt(env, "playlistItems", {
    part: "contentDetails",
    playlistId: playlist,
    maxResults: String(PAGE_SIZE),
    ...(body.page ? { pageToken: String(body.page) } : {}),
  });
  const ids = (page.items || []).map((i) => i.contentDetails?.videoId).filter(Boolean);
  const details = ids.length
    ? await yt(env, "videos", { part: "snippet,contentDetails,statistics,status", id: ids.join(",") })
    : { items: [] };
  const published = (details.items || []).filter(isPublishedVideo);
  const existing = await existingRows(env, published.map((i) => i.id));
  const { rows, tally } = await toRows(published, existing, { recheck: !!body.recheck, source: "sync" });
  await upsert(env, rows);

  return {
    channel: channel ? { ...channel, uploads: playlist } : null,
    playlist,
    next: page.nextPageToken || null,
    total: page.pageInfo?.totalResults ?? null,
    seen: rows.map((r) => r.youtube_id),
    added: rows.filter((r) => !existing.has(r.youtube_id)).length,
    updated: rows.filter((r) => existing.has(r.youtube_id)).length,
    skipped: ids.length - rows.length,
    probes: tally,
  };
}

async function stepPlaylists(env, body) {
  const channelId = String(body.channel || "") || (await lookupChannel(env)).id;
  let fetches = 0;
  const playlists = [];
  let token = null;
  do {
    // eslint-disable-next-line no-await-in-loop
    const res = await yt(env, "playlists", {
      part: "snippet", channelId, maxResults: "50", ...(token ? { pageToken: token } : {}),
    });
    fetches += 1;
    (res.items || []).forEach((p) => playlists.push({ id: p.id, title: (p.snippet?.title || "").trim() }));
    token = res.nextPageToken || null;
  } while (token && fetches < 2);

  const map = {};
  let truncated = false;
  const named = playlists.filter((p) => p.title);
  for (let n = 0; n < named.length && !truncated; n += 1) {
    const list = named[n];
    let pageToken = null;
    do {
      if (fetches >= PLAYLIST_FETCH_BUDGET) {
        truncated = true;
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      const res = await yt(env, "playlistItems", {
        part: "contentDetails", playlistId: list.id, maxResults: "50", ...(pageToken ? { pageToken } : {}),
      });
      fetches += 1;
      (res.items || []).forEach((i) => {
        const id = i.contentDetails?.videoId;
        if (!id) return;
        map[id] = map[id] || [];
        if (!map[id].includes(list.title)) map[id].push(list.title);
      });
      pageToken = res.nextPageToken || null;
    } while (pageToken);
  }

  // A truncated read would empty the playlists of every video it never reached.
  const updated = truncated
    ? 0
    : await rpc(env, "set_video_playlists", { p_map: map }, { serviceRole: true });
  return {
    playlists: playlists.map((p) => p.title).filter(Boolean),
    entries: Object.keys(map).length,
    updated,
    truncated,
  };
}

async function stepOne(env, body) {
  const id = videoIdFromUrl(body.url);
  if (!id) throw Object.assign(new Error("That is not a YouTube video link."), { status: 400 });
  const details = await yt(env, "videos", { part: "snippet,contentDetails,statistics,status", id });
  const item = (details.items || []).find((i) => i.id === id);
  if (!item) throw Object.assign(new Error("YouTube has no video with that id."), { status: 404 });
  if (!isPublishedVideo(item)) {
    throw Object.assign(new Error("That video is not public (private, unlisted, live or upcoming)."), { status: 422 });
  }
  const existing = await existingRows(env, [id]);
  const { rows } = await toRows([item], existing, { recheck: !!body.recheck, source: "manual" });
  await upsert(env, rows);
  const row = rows[0];
  return {
    video: { youtube_id: row.youtube_id, title: row.title, kind: row.kind, date: row.date },
    added: !existing.has(id),
  };
}

const STEPS = { uploads: stepUploads, playlists: stepPlaylists, one: stepOne };

export async function onRequestPost(context) {
  const { request, env } = context;

  const owner = await isOwner(env, request);
  if (!owner.ok) {
    return owner.unavailable
      ? json({ error: "unavailable", note: "Could not check who is calling." }, 503)
      : json({ error: "forbidden" }, 403);
  }
  if (!env.YOUTUBE_API_KEY) {
    return json({ error: "not_configured", note: "YOUTUBE_API_KEY is not set on this deployment." }, 503);
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "not_configured", note: "SUPABASE_SERVICE_ROLE_KEY is not set on this deployment." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: "bad_request", note: "Expected a JSON body." }, 400);
  }
  const step = STEPS[body?.step];
  if (!step) return json({ error: "bad_request", note: `Unknown step ${body?.step || ""}`.trim() }, 400);

  try {
    return json(await step(env, body));
  } catch (err) {
    const quota = err.reason === "quotaExceeded" || err.reason === "dailyLimitExceeded";
    // A YouTube refusal (a blocked key, a bad request) is upstream's, not the
    // caller's: 502 with YouTube's own message, so a 403 here only ever means
    // "not the owner".
    let status = 502;
    if (quota) status = 429;
    else if (!err.reason && err.status >= 400 && err.status < 500) status = err.status;
    return json({ error: quota ? "quota" : "failed", note: String(err.message || err) }, status);
  }
}
