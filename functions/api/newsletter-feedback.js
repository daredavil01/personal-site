// Cloudflare Pages Function — reader feedback on a newsletter issue.
// Endpoint: POST /api/newsletter-feedback
//
// Same shape as /api/share, for the same reason: the daily cap is per visitor,
// and a cap only means something if the caller cannot choose the identity it is
// counted under. Postgres cannot see the client IP through PostgREST, so the
// hash is taken here and newsletter_feedback_add is granted to the service role
// alone (0032). Reading the counts is not proxied — the page calls the
// newsletter_feedback_summary RPC directly, which never returns a reply.

import {
  hashIp, json, restHeaders, rpc, verifyTurnstile,
} from "../../src/lib/askServer";

const KINDS = new Set(["reaction", "poll", "rating", "reply"]);

// Turnstile follows the /ask switch: one place to turn bot checks on.
async function turnstileRequired(env) {
  try {
    const res = await fetch(
      `${env.VITE_SUPABASE_URL}/rest/v1/ask_settings?id=eq.1&select=turnstile_required&limit=1`,
      { headers: restHeaders(env) },
    );
    const rows = await res.json();
    return !!rows?.[0]?.turnstile_required;
  } catch (_) {
    return false;
  }
}

const text = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.VITE_SUPABASE_URL) return json({ error: "not configured" }, 503);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "not configured", note: "Feedback is not set up on this deployment." }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ error: "bad request" }, 400);
  }

  const issueId = Number(payload?.issueId);
  const kind = String(payload?.kind || "");
  if (!Number.isInteger(issueId) || issueId <= 0 || !KINDS.has(kind)) {
    return json({ error: "bad request" }, 400);
  }

  const ip = request.headers.get("CF-Connecting-IP");
  if (await turnstileRequired(env)) {
    const ok = await verifyTurnstile(env, payload?.turnstileToken, ip);
    if (!ok) {
      return json({ error: "verification failed", note: "Could not confirm this browser is not a bot." }, 403);
    }
  }

  try {
    const summary = await rpc(env, "newsletter_feedback_add", {
      p_issue: issueId,
      p_kind: kind,
      p_section: text(payload?.section, 32),
      p_value: text(payload?.value, 16),
      p_message: text(payload?.message, 1000),
      p_name: text(payload?.name, 80),
      p_ip_hash: await hashIp(request, env),
    }, { serviceRole: true });
    return json({ summary });
  } catch (err) {
    if (/53400|quota/i.test(err.detail || "")) {
      return json({ error: "quota", note: "That's plenty of feedback for one day — thank you!" }, 429);
    }
    if (/22023/.test(err.detail || "")) return json({ error: "bad request" }, 400);
    return json({ error: "unavailable" }, 503);
  }
}
