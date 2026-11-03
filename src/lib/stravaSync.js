// The Strava → Supabase sync, shared by the owner-only endpoint
// (functions/api/strava-sync.js) and the import script (scripts/strava-import.mjs).
//
// Everything talks HTTP through the global fetch with the service-role key, so
// the Worker and Node run the same code. Each function is one small step,
// because Workers Free allows 50 subrequests and 10 ms of CPU per request: the
// browser (or the script) drives the loop.
//
// `env` needs VITE_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
// STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, and — only until strava_auth has a
// row — STRAVA_REFRESH_TOKEN.

import {
  STRAVA_API, STRAVA_TOKEN_URL, rateLimitFromHeaders, toDetailRow, toGearRow,
  toPrivateRow, toSummaryRow,
  // Explicit extension: scripts/strava-import.mjs imports this under Node.
  // eslint-disable-next-line import/extensions
} from "./strava.js";

export const LIST_PAGE_SIZE = 200;
/** Detail fetches per step: under the Worker's 50-subrequest cap with room for the rest. */
export const DETAIL_BATCH = 25;
/** Activities this recent get their detail re-read on every sync (edited titles, notes). */
export const RECENT_DETAIL_DAYS = 3;

const base = (env) => env.VITE_SUPABASE_URL || env.SUPABASE_URL;

function headers(env, extra = {}) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extra,
  };
}

async function rest(env, path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${base(env)}/rest/v1/${path}`, {
    method,
    headers: headers(env, prefer ? { Prefer: prefer } : {}),
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw Object.assign(new Error(`${method} ${path.split("?")[0]} ${res.status} ${detail.slice(0, 200)}`), {
      status: 502,
    });
  }
  if (res.status === 204 || method !== "GET") return null;
  return res.json();
}

export async function upsert(env, table, rows, onConflict) {
  if (!rows.length) return;
  await rest(env, `${table}?on_conflict=${onConflict}`, {
    method: "POST",
    body: rows,
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

async function saveToken(env, token) {
  // A refresh response carries no athlete or scope: leave those columns as they are.
  const row = {
    id: 1,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(Number(token.expires_at) * 1000).toISOString(),
  };
  if (token.athlete?.id) row.athlete_id = token.athlete.id;
  if (token.scope) row.scope = token.scope;
  await upsert(env, "strava_auth", [row], "id");
}

/** Exchanges a code (first consent) or a refresh token for a fresh token pair. */
export async function exchangeToken(env, params) {
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) {
    throw Object.assign(new Error("STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET are not set."), { status: 503 });
  }
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      ...params,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw Object.assign(new Error(`Strava token exchange failed (${res.status}): ${body.message || "no token"}`), {
      status: 502,
    });
  }
  return body;
}

/** Stores the first token pair after the one-time OAuth consent. */
export async function storeInitialToken(env, token) {
  await saveToken(env, token);
}

/**
 * A valid access token: the stored one while it has five minutes left, else a
 * refresh — whose new refresh token is written back, because Strava rotates it.
 */
export async function getAccessToken(env) {
  const rows = await rest(env, "strava_auth?select=*&id=eq.1");
  const row = rows?.[0];
  if (row?.access_token && row.expires_at && Date.parse(row.expires_at) - Date.now() > 5 * 60 * 1000) {
    return row.access_token;
  }
  const refresh = row?.refresh_token || env.STRAVA_REFRESH_TOKEN;
  if (!refresh) {
    throw Object.assign(new Error(
      "No Strava token yet. Run `node scripts/strava-auth.mjs` once, or set STRAVA_REFRESH_TOKEN.",
    ), { status: 503 });
  }
  const token = await exchangeToken(env, { grant_type: "refresh_token", refresh_token: refresh });
  await saveToken(env, token);
  return token.access_token;
}

// ---------------------------------------------------------------------------
// Strava reads
// ---------------------------------------------------------------------------

export async function stravaGet(token, path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${STRAVA_API}${path}${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const limits = rateLimitFromHeaders(res.headers);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Strava ${path} ${res.status}: ${body.message || ""}`.trim());
    err.status = res.status === 429 ? 429 : 502;
    err.limits = limits;
    throw err;
  }
  return { body, limits };
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

/**
 * One page of GET /athlete/activities → summary + private rows. `after` (epoch
 * seconds) narrows an incremental run. `next` is the following page, or null
 * after the last.
 */
export async function syncListPage(env, { page = 1, after = null, perPage = LIST_PAGE_SIZE, token } = {}) {
  const access = token || await getAccessToken(env);
  const params = { per_page: String(perPage), page: String(page) };
  if (after) params.after = String(after);
  const { body, limits } = await stravaGet(access, "/athlete/activities", params);
  const items = Array.isArray(body) ? body : [];
  const now = new Date().toISOString();
  await upsert(env, "strava_activities", items.map((a) => toSummaryRow(a, { now })), "id");
  await upsert(env, "strava_activity_private", items.map((a) => toPrivateRow(a)), "activity_id");
  return {
    page,
    count: items.length,
    ids: items.map((a) => Number(a.id)),
    next: items.length === perPage ? page + 1 : null,
    limits,
  };
}

/** Ids that still need their detail: never fetched, or recent enough to have been edited. */
export async function pendingDetailIds(env, { limit = DETAIL_BATCH, recentDays = RECENT_DETAIL_DAYS } = {}) {
  const since = new Date(Date.now() - recentDays * 86400000).toISOString();
  const recentCut = new Date(Date.now() - 6 * 3600000).toISOString();
  // Recent rows are re-read at most every six hours, or a busy day would loop.
  const filter = `or=(detail_synced_at.is.null,and(start_date.gte.${since},detail_synced_at.lt.${recentCut}))`;
  const rows = await rest(env, `strava_activities?select=id&${filter}&order=start_date.desc&limit=${limit}`);
  return (rows || []).map((r) => Number(r.id));
}

export async function countPendingDetails(env) {
  const res = await fetch(`${base(env)}/rest/v1/strava_activities?select=id&detail_synced_at=is.null`, {
    method: "HEAD",
    headers: headers(env, { Prefer: "count=exact", Range: "0-0" }),
  });
  const range = res.headers.get("content-range") || "";
  const total = Number(range.split("/")[1]);
  return Number.isFinite(total) ? total : null;
}

/**
 * GET /activities/{id} for each id (or the next pending batch) → detail rows.
 * Stops early, keeping what it has, when Strava says the budget is spent.
 */
export async function syncDetails(env, { ids = null, limit = DETAIL_BATCH, token } = {}) {
  const access = token || await getAccessToken(env);
  const todo = (ids && ids.length ? ids : await pendingDetailIds(env, { limit })).slice(0, limit);
  const now = new Date().toISOString();
  const rows = [];
  const privateRows = [];
  let limits = null;
  let stopped = null;
  for (let i = 0; i < todo.length; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await stravaGet(access, `/activities/${todo[i]}`, { include_all_efforts: "false" });
      limits = res.limits || limits;
      rows.push(toDetailRow(res.body, { now }));
      privateRows.push(toPrivateRow(res.body, { detail: true }));
      if (limits && (limits.left15 <= 1 || limits.leftDay <= 1)) {
        stopped = "rate_limit";
        break;
      }
    } catch (err) {
      if (err.status === 429) {
        limits = err.limits || limits;
        stopped = "rate_limit";
        break;
      }
      // A deleted activity 404s: mark it read so it is not retried forever.
      if (/ 404/.test(err.message)) {
        rows.push(null);
        // eslint-disable-next-line no-await-in-loop
        await rest(env, `strava_activities?id=eq.${todo[i]}`, {
          method: "PATCH", body: { detail_synced_at: now }, prefer: "return=minimal",
        });
      } else {
        throw err;
      }
    }
  }
  const done = rows.filter(Boolean);
  await upsert(env, "strava_activities", done, "id");
  await upsert(env, "strava_activity_private", privateRows, "activity_id");
  return { fetched: done.length, ids: done.map((r) => r.id), stopped, limits };
}

/** /athlete, its stats and zones, and every shoe and bike → strava_athlete + strava_gear. */
export async function syncAthlete(env, { token } = {}) {
  const access = token || await getAccessToken(env);
  const { body: athlete } = await stravaGet(access, "/athlete");
  const { body: stats } = await stravaGet(access, `/athletes/${athlete.id}/stats`);
  let zones = null;
  try {
    ({ body: zones } = await stravaGet(access, "/athlete/zones"));
  } catch (_) {
    zones = null; // needs profile:read_all; the rest still syncs without it
  }
  const now = new Date().toISOString();
  const gear = [
    ...(athlete.shoes || []).map((g) => ({ g, kind: "shoe" })),
    ...(athlete.bikes || []).map((g) => ({ g, kind: "bike" })),
  ];
  const gearRows = [];
  for (let i = 0; i < gear.length; i += 1) {
    const { g, kind } = gear[i];
    let full = g;
    try {
      // eslint-disable-next-line no-await-in-loop
      full = { ...g, ...(await stravaGet(access, `/gear/${g.id}`)).body };
    } catch (_) {
      full = g;
    }
    gearRows.push(toGearRow(full, kind, { now }));
  }
  await upsert(env, "strava_athlete", [{ id: 1, athlete_id: athlete.id, stats, zones, synced_at: now }], "id");
  await upsert(env, "strava_gear", gearRows, "id");
  return { athleteId: athlete.id, gear: gearRows.length, zones: !!zones };
}

/** Epoch seconds of the newest stored activity, for an incremental list. */
export async function latestStartEpoch(env) {
  const rows = await rest(env, "strava_activities?select=start_date&order=start_date.desc&limit=1");
  const iso = rows?.[0]?.start_date;
  return iso ? Math.floor(Date.parse(iso) / 1000) : null;
}
