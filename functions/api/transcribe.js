// Cloudflare Pages Function — speech to text for the /ask composer.
// Endpoint: POST /api/transcribe.
//
// Whisper on Workers AI, inside the free allowance the embeddings already draw
// from. The transcript lands in the composer; the visitor edits it and presses
// send, or does not. Nothing here answers anything.
//
// Standing rules, decided before this shipped rather than after:
//
//   * The audio is never stored. It exists for the length of this request and
//     is written nowhere — not to Supabase, not to the conversation log, not to
//     a bucket. Only the words the visitor actually sends are logged, exactly as
//     a typed question is.
//   * Transcription has its own daily counter (0026, ask_quota's 'voice' kind).
//     A hot microphone must not be able to spend the day's answers.
//   * The body is capped before anything else runs. This is the first request on
//     this site with a real payload size, and the cap is the first gate for the
//     same reason the quota is an early one.
//
// Gate order, cheapest and most certain first:
//   size → feature switch → settings enabled → Turnstile → quota → model.

import { aiFeatureOn } from "../../src/data/askConfig";
import { hashIp, json, rpc, verifyTurnstile } from "../../src/lib/askServer";

// ~30 seconds of opus from MediaRecorder. A question is a sentence; anything
// past this is either a mistake or someone leaning on the button.
const MAX_BYTES = 1_500_000;

// Multilingual, and the fastest of the Whisper family in the catalogue — which
// matters because this is a request the visitor waits on.
const MODEL = "@cf/openai/whisper-large-v3-turbo";

const SETTINGS_TTL_SECONDS = 60;

async function loadSettings(context) {
  const { env, request } = context;
  const { origin } = new URL(request.url);
  const cache = caches.default;
  // The same cached row /api/ask reads, under the same key: one settings fetch
  // serves both endpoints for the minute it is warm.
  const key = new Request(`${origin}/__ask/settings`);
  const hit = await cache.match(key);
  if (hit) return hit.json();

  const res = await fetch(
    `${env.VITE_SUPABASE_URL}/rest/v1/ask_settings?id=eq.1&select=*&limit=1`,
    {
      headers: {
        apikey: env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    },
  );
  const rows = await res.json();
  const settings = rows?.[0] || null;
  if (settings) {
    context.waitUntil(cache.put(key, new Response(JSON.stringify(settings), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${SETTINGS_TTL_SECONDS}`,
      },
    })));
  }
  return settings;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.VITE_SUPABASE_URL) return json({ error: "not configured" }, 503);

  // Cheapest gate first, and before the body is read into memory.
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_BYTES) return json({ error: "too large" }, 413);

  const audio = new Uint8Array(await request.arrayBuffer());
  if (!audio.length) return json({ error: "empty" }, 400);
  // Content-Length is the client's claim; this is the fact.
  if (audio.length > MAX_BYTES) return json({ error: "too large" }, 413);

  const settings = await loadSettings(context);
  // An unreadable settings row switches this off rather than on — the same
  // bargain the switchboard makes everywhere else.
  if (!settings?.enabled) return json({ error: "disabled" }, 503);
  if (!aiFeatureOn(settings, "voice_input")) {
    return json({ error: "disabled", note: "Voice input is switched off." }, 503);
  }
  if (!env.AI) return json({ error: "unavailable" }, 503);

  if (settings.turnstile_required) {
    const token = request.headers.get("X-Turnstile-Token");
    const ok = await verifyTurnstile(env, token, request.headers.get("CF-Connecting-IP"));
    if (!ok) return json({ error: "verification failed", reason: "turnstile" }, 403);
  }

  // Fail closed, like /api/ask: an unreachable quota RPC refuses rather than
  // leaving an uncapped endpoint running.
  let quota;
  const ipHash = await hashIp(request, env);
  try {
    quota = await rpc(env, "ask_quota", { p_ip_hash: ipHash, p_kind: "voice" });
  } catch (_) {
    return json({ error: "unavailable" }, 503);
  }
  if (!quota?.allowed) {
    return json({
      error: "quota",
      reason: quota?.reason || "quota",
      note: "That is enough voice for today — the question box still works.",
    }, 429);
  }

  try {
    const out = await env.AI.run(MODEL, { audio: [...audio] });
    const text = String(out?.text || "").trim();
    return json({
      text,
      // Whisper's own detection, which is better evidence than the script the
      // visitor typed in: it catches romanised Marathi, which reads as English.
      language: out?.language || null,
      remaining: quota.remaining_ip,
    });
  } catch (_) {
    return json({ error: "unavailable" }, 503);
  }
}
