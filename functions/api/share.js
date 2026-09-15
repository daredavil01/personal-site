// Cloudflare Pages Function — creating a shared /ask conversation.
// Endpoint: POST /api/share (Pages uses file-based routing).
//
// Why this exists at all, rather than the browser calling Supabase directly:
// the daily cap is per visitor, and a cap is only meaningful if the caller
// cannot choose the identity it is counted under. Postgres cannot see the client
// IP through PostgREST, so the hash has to be taken at the edge — here — and
// create_ask_share is granted to the service role alone.
//
// Reading a share is NOT proxied here. That goes straight to the token-gated
// get_ask_share RPC from the browser, like every other read in src/lib/api.

import { DEFAULT_ASK_SETTINGS } from "../../src/data/askConfig";
import { buildShareSnapshot, SHARE_REFUSALS } from "../../src/lib/askShareSnapshot";
import { hashIp, json, restHeaders, rpc, verifyTurnstile } from "../../src/lib/askServer";

async function loadSettings(env) {
  try {
    const res = await fetch(
      `${env.VITE_SUPABASE_URL}/rest/v1/ask_settings?id=eq.1&select=*&limit=1`,
      { headers: restHeaders(env) },
    );
    if (!res.ok) throw new Error(`ask_settings ${res.status}`);
    const rows = await res.json();
    return { ...DEFAULT_ASK_SETTINGS, ...(rows?.[0] || {}) };
  } catch (_) {
    return DEFAULT_ASK_SETTINGS;
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.VITE_SUPABASE_URL) return json({ error: "not configured" }, 503);
  // Said plainly rather than failing as a generic error: without the service
  // role key this endpoint cannot write, and no amount of retrying will help.
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({
      error: "not configured",
      note: "Sharing is not set up on this deployment.",
    }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ error: "bad request" }, 400);
  }

  const settings = await loadSettings(env);
  if (!settings.enabled) {
    return json({ error: "disabled", note: settings.disabled_note }, 503);
  }

  const ip = request.headers.get("CF-Connecting-IP");
  if (settings.turnstile_required) {
    const ok = await verifyTurnstile(env, payload?.turnstileToken, ip);
    if (!ok) {
      return json({
        error: "verification failed",
        reason: "turnstile",
        note: "Could not confirm this browser is not a bot.",
      }, 403);
    }
  }

  const built = buildShareSnapshot(payload?.turns, {
    types: payload?.types,
    refusalNote: settings.refusal_note,
  });
  if (!built.ok) {
    return json({
      error: built.reason,
      note: SHARE_REFUSALS[built.reason] || "This conversation cannot be shared.",
    }, 400);
  }

  const s = built.snapshot;
  let token;
  try {
    token = await rpc(env, "create_ask_share", {
      p_thread: s.thread,
      p_linkable: s.linkable,
      p_title: s.title,
      p_summary: s.summary,
      p_plain_text: s.plainText,
      p_types: s.types,
      p_has_downvote: s.hasDownvote,
      p_has_refusal: s.hasRefusal,
      p_no_sources: s.noSources,
      p_ip_hash: await hashIp(request, env),
      p_user_agent: request.headers.get("User-Agent"),
    }, { serviceRole: true });
  } catch (err) {
    // 53400 is the cap; anything else is ours, not the visitor's.
    if (/53400|quota/i.test(err.detail || "")) {
      return json({
        error: "quota",
        note: "You have shared enough conversations for today — try again tomorrow.",
      }, 429);
    }
    return json({ error: "unavailable" }, 503);
  }

  const { origin } = new URL(request.url);
  return json({ token, url: `${origin}/ask/s/${token}` });
}
