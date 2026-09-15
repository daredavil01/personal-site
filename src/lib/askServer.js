// Server-side helpers shared by the /ask Pages Functions.
//
// In src/ for the usual reason: Pages routes every file under functions/, so a
// helper placed there would become a public endpoint. Dependency-free by
// contract — esbuild bundles it into each worker.

/** JSON response with no caching. Answers and quota errors are never reusable. */
export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function restHeaders(env, { serviceRole = false } = {}) {
  const key = (serviceRole && env.SUPABASE_SERVICE_ROLE_KEY)
    || env.VITE_SUPABASE_ANON_KEY
    || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function rpc(env, name, args, options) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: restHeaders(env, options),
    body: JSON.stringify(args || {}),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`${name} ${res.status}`);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  return res.json();
}

/**
 * A stable per-visitor id for counting, which is not the visitor's address.
 * Salted and truncated: enough to count against a daily cap, not enough to work
 * back to an IP.
 */
export async function hashIp(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const data = new TextEncoder().encode(`${ip}:${env.ASK_IP_SALT || "ask"}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET_KEY) return true; // not configured yet — do not lock people out
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET_KEY);
  body.append("response", token || "");
  if (ip) body.append("remoteip", ip);
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    const out = await res.json();
    return !!out.success;
  } catch (_) {
    return false;
  }
}
