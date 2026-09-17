// GET /api/og/<kind>/<id>.png — renders one share card on demand.
//
// WHY /api/og AND NOT /og:
//   Pages Functions take precedence over the SPA fallback (see
//   functions/api/ask.js), so a function mounted at a page's path would shadow
//   the page. The `.png` suffix additionally makes functions/_middleware.js
//   skip this route via its "last path segment contains a dot" early return, so
//   no HTML rewriting is attempted on an image response.
//
// THE CPU BET:
//   Workers Free allows 10ms CPU per request. A satori layout pass plus a
//   1200x630 resvg rasterisation measures ~430ms median locally, so on Free
//   this can return 1102 / exceededCpu. `wrangler pages dev` does NOT enforce
//   the limit, so local success proves nothing. Two things keep that
//   survivable:
//     1. Every response is cached at the edge, so only the first request per
//        card per colo can burn the budget.
//     2. OG_MODE=static in the Pages environment turns rendering off entirely
//        and serves the committed public/og/*.png instead — one variable, no
//        deploy. See docs/og-cards.md.
//
// FAILURE POLICY: never return an error to a crawler. Anything unexpected
// redirects to the section's committed fallback card, because a 500 means the
// link unfurls with no image at all.

import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

// A bundled module import is the ONLY legal way to get this wasm: Workers'
// WebAssembly.instantiate() accepts pre-compiled modules only, so fetching the
// bytes at runtime is impossible. Fonts are exempt — they are just bytes.
import resvgWasm from "./resvg.wasm";

import { CARD, LAYOUT_VERSION } from "../../../src/lib/og/tokens";
import { FONT_FACES, FONT_DIR, loadFonts } from "../../../src/lib/og/fonts";
import { parseCardPath, ogStaticUrl, ogMode, OG_MODE_STATIC } from "../../../src/lib/og/paths";
import { OG_CARDS } from "../../../src/lib/og/registry";
import { ogModelFor, PAGE_SLUGS } from "../../../src/lib/og/model";
import { getStatsPayload } from "../../../src/lib/statsEndpoint";

// A rendered card is immutable for a day. Content edits show up on the next
// expiry; a platform that has already scraped the page keeps its own copy for
// far longer than that regardless, so a shorter TTL would buy nothing.
const CACHE_SECONDS = 86400;

let wasmReady = null;

// initWasm throws if called twice in one isolate, so the promise is the guard.
function ensureWasm() {
  if (!wasmReady) {
    wasmReady = initWasm(resvgWasm).catch((err) => {
      wasmReady = null;
      throw err;
    });
  }
  return wasmReady;
}

const redirectTo = (url) => new Response(null, {
  status: 302,
  headers: { Location: url, "Cache-Control": "public, max-age=300" },
});

// The committed card to fall back to. A page falls back to ITS OWN card when
// the slug is a real one — `OG_CARDS.page.fallbackSlug` is "home", which is
// only the right answer for a slug we do not recognise.
function fallbackUrl(kind, origin, id) {
  if (kind === "page" && PAGE_SLUGS.includes(id)) {
    return ogStaticUrl(id, origin);
  }
  const spec = OG_CARDS[kind];
  const slug = (spec && spec.fallbackSlug) || "home";
  return ogStaticUrl(slug, origin);
}

// PostgREST with the ANON key, exactly as functions/_middleware.js does it, so
// RLS applies and a draft project or a hidden row can never reach a card.
function restHeaders(env) {
  const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" };
}

async function fetchRow(kind, id, env) {
  const spec = OG_CARDS[kind];
  if (!spec || !env.VITE_SUPABASE_URL) return null;
  const base = env.VITE_SUPABASE_URL;

  // A shared /ask conversation: owner-only RLS, reachable only through the
  // token-gated SECURITY DEFINER rpc (supabase/migrations/0021).
  if (spec.rpc) {
    const res = await fetch(`${base}/rest/v1/rpc/${spec.rpc}`, {
      method: "POST",
      headers: { ...restHeaders(env), "Content-Type": "application/json" },
      body: JSON.stringify(spec.rpcArg ? { [spec.rpcArg]: id } : {}),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return data || null;
    // `tags_with_counts()` takes no argument and returns every tag, so the row
    // is picked out by id here.
    if (spec.rpcPickById) {
      return data.find((row) => String(row.id) === String(id)) || null;
    }
    return data[0] || null;
  }

  if (!spec.table) return null;

  // Tags are looked up by name; everything else by numeric id.
  const column = spec.lookup === "name" ? "name" : "id";
  const value = spec.lookup === "name" ? String(id).toLowerCase() : id;
  const query = `${column}=eq.${encodeURIComponent(value)}&select=${spec.select}&limit=1`;
  const res = await fetch(`${base}/rest/v1/${spec.table}?${query}`, { headers: restHeaders(env) });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

// Fonts come from the site's own static assets and are memoised per isolate.
// 254KB of WOFF is not free to parse, so the memo matters as much as the
// response cache.
function fontReader(origin, env) {
  return async (file) => {
    const url = `${origin}${FONT_DIR}/${file}`;
    const res = env.ASSETS && env.ASSETS.fetch
      ? await env.ASSETS.fetch(new Request(url))
      : await fetch(url);
    if (!res.ok) throw new Error(`font ${file}: ${res.status}`);
    return res.arrayBuffer();
  };
}

// Fetches an image and inlines it as a data URI.
//
// Two reasons not to let satori fetch it itself:
//   1. satori THROWS when an image cannot be loaded or sized, which would take
//      down the whole card over one slow photo. Here a failure just means the
//      card renders without it, and every photo layout is built to survive
//      that (PhotoPanel keeps its tinted ground).
//   2. satori applies SSRF protection that blocks loopback addresses, so a
//      same-origin asset is unfetchable under `wrangler pages dev`. Inlining
//      makes local behaviour match production.
async function inlineImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { Accept: "image/*" } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return `data:${type};base64,${btoa(binary)}`;
  } catch (_) {
    return null;
  }
}

export async function onRequestGet(context) {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);
  const { origin } = url;

  // `[[path]]` catches everything under /api/og; params.path is the segments.
  const raw = Array.isArray(context.params && context.params.path)
    ? context.params.path.join("/")
    : String((context.params && context.params.path) || "");
  const parsed = parseCardPath(raw);

  if (!parsed || !OG_CARDS[parsed.kind]) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=3600" } });
  }
  const { kind, id } = parsed;

  // The kill-switch. Checked before anything expensive happens.
  if (ogMode(env) === OG_MODE_STATIC) {
    return redirectTo(fallbackUrl(kind, origin, id));
  }

  if (kind === "page" && !PAGE_SLUGS.includes(id)) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=3600" } });
  }

  // LAYOUT_VERSION is in the cache key, so bumping it in tokens.js is what
  // makes every already-cached card re-render.
  const cacheKey = new Request(`${origin}/__og/v${LAYOUT_VERSION}/${kind}/${encodeURIComponent(id)}.png`, {
    method: "GET",
  });
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    let model;
    if (kind === "page") {
      // /api/stats is already edge-cached for an hour, so a fixed-page card
      // costs a cached subrequest rather than a stats recomputation. Never
      // recompute a stat here — CLAUDE.md keeps them all in computeSiteStats.
      let stats = null;
      try {
        stats = await getStatsPayload(context);
      } catch (_) {
        stats = null;
      }
      model = ogModelFor("page", id, { stats, siteUrl: origin });
    } else {
      const row = await fetchRow(kind, id, env);
      if (!row) return redirectTo(fallbackUrl(kind, origin, id));
      model = ogModelFor(kind, row, { supabaseUrl: env.VITE_SUPABASE_URL });
    }

    if (!model) return redirectTo(fallbackUrl(kind, origin, id));

    // Resolve the photo before layout so a missing one degrades the card
    // instead of failing it.
    if (model.photo) {
      model = { ...model, photo: await inlineImage(model.photo) };
    }

    const spec = OG_CARDS[kind];
    const element = spec.layout(model);
    if (!element) return redirectTo(fallbackUrl(kind, origin, id));

    const [fonts] = await Promise.all([loadFonts(fontReader(origin, env)), ensureWasm()]);
    const svg = await satori(element, { width: CARD.width, height: CARD.height, fonts });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: CARD.width } }).render().asPng();

    const response = new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, immutable`,
        "Content-Length": String(png.length),
        // Handy when reading dashboard logs: says which layout produced this.
        "X-OG-Card": `${kind}/${id}@v${LAYOUT_VERSION}`,
      },
    });
    waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    // A crawler gets one shot. A redirect to the section card is always better
    // than a 500, which unfurls as no image at all — so the failure is
    // deliberately invisible to the outside world.
    //
    // Which makes it invisible to you too. Set OG_DEBUG=1 in the Pages
    // environment (or .dev.vars locally) to get the actual error back as text
    // instead of a redirect.
    const detail = (err && (err.stack || err.message)) || String(err);
    console.error("og render failed", kind, id, detail);
    if (env.OG_DEBUG === "1") {
      return new Response(`og render failed: ${kind}/${id}\n\n${detail}`, {
        status: 500,
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      });
    }
    return redirectTo(fallbackUrl(kind, origin, id));
  }
}

export const onRequest = onRequestGet;

export { FONT_FACES };
