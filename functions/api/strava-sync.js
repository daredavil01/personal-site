// Cloudflare Pages Function — POST /api/strava-sync.
//
// Copies Strava activities into strava_activities (0038), for the "Sync now"
// button at /admin/training/sync. Owner only, checked the way every owner
// surface here is: is_owner() called with the caller's own access token.
// STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET and SUPABASE_SERVICE_ROLE_KEY are
// Cloudflare secrets; the rotating refresh token lives in strava_auth.
//
// The browser drives the loop, one small step per request, because Workers Free
// allows 10 ms of CPU and 50 subrequests per request:
//
//   { step: "list", page?, after? }   one page (200) of /athlete/activities
//   { step: "detail", ids? }          up to 25 GET /activities/{id}; with no
//                                     ids, the next pending batch
//   { step: "athlete" }               totals, zones and gear
//   { step: "status" }                pending count, no Strava call
//
// All of the work is src/lib/stravaSync.js, shared with scripts/strava-import.mjs.

import { json, rpc } from "../../src/lib/askServer";
import {
  DETAIL_BATCH, countPendingDetails, latestStartEpoch, syncAthlete, syncDetails, syncListPage,
} from "../../src/lib/stravaSync";

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
    return { ok: false, unavailable: true };
  }
}

const STEPS = {
  list: async (env, body) => {
    let after = Number(body.after) || null;
    // "since latest" lets the button do a quick catch-up without knowing the table.
    if (body.after === "latest") {
      const latest = await latestStartEpoch(env);
      after = latest ? latest - 7 * 86400 : null;
    }
    return syncListPage(env, { page: Math.max(1, Number(body.page) || 1), after });
  },
  detail: async (env, body) => {
    const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite) : null;
    const res = await syncDetails(env, { ids, limit: DETAIL_BATCH });
    return { ...res, pending: await countPendingDetails(env).catch(() => null) };
  },
  athlete: (env) => syncAthlete(env),
  status: async (env) => ({ pending: await countPendingDetails(env) }),
};

export async function onRequestPost(context) {
  const { request, env } = context;

  const owner = await isOwner(env, request);
  if (!owner.ok) {
    return owner.unavailable
      ? json({ error: "unavailable", note: "Could not check who is calling." }, 503)
      : json({ error: "forbidden" }, 403);
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
  if (body.step !== "status" && (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET)) {
    return json({ error: "not_configured", note: "STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET are not set on this deployment." }, 503);
  }

  try {
    return json(await step(env, body));
  } catch (err) {
    let status = err.status || 502;
    if (status === 401 || status === 403) status = 502; // a 403 here only ever means "not the owner"
    return json({
      error: status === 429 ? "rate_limit" : "failed",
      note: String(err.message || err),
      limits: err.limits || null,
    }, status);
  }
}
