// URL construction for share cards, and the one switch that turns on-demand
// rendering off.
//
// Cards render at request time (`functions/api/og/[[path]].js`). That is a bet:
// Workers Free allows 10ms CPU per request and a satori + resvg pass is
// ~100-400ms, so it may return 1102 / exceededCpu in production. `wrangler
// pages dev` does NOT enforce the limit, so local success proves nothing.
//
// OG_MODE is the retreat. Set it to "static" in the Pages environment and every
// og:image reverts to a committed `public/og/*.png` with no rendering at all —
// one variable, no deploy. Both layers honour it:
//   - `functions/_middleware.js` emits the static URL directly, so a crawler
//     never sees a redirect (several image scrapers do not follow them)
//   - the endpoint 302s to the static card as a second line of defence
export const OG_MODE_DYNAMIC = "dynamic";
export const OG_MODE_STATIC = "static";

export const ogMode = (env) => (
  env && env.OG_MODE === OG_MODE_STATIC ? OG_MODE_STATIC : OG_MODE_DYNAMIC
);

// The committed fallback card for a section. Also what an unresolvable detail
// route falls back to, so a bad id degrades to "the books card" not the logo.
export const ogStaticUrl = (slug, siteUrl = "") => `${siteUrl}/og/${slug}.png`;

// The on-demand endpoint. `/api/og/...`, not `/og/...`: Pages Functions take
// precedence over the SPA fallback (see functions/api/ask.js), and the `.png`
// suffix also makes `_middleware.js` skip it via its "last segment contains a
// dot" early return, so no HTML rewriting is attempted on an image response.
export const ogRenderUrl = (kind, id, siteUrl = "") => (
  `${siteUrl}/api/og/${kind}/${encodeURIComponent(String(id))}.png`
);

// Which committed section card each entity kind falls back to.
//
// Duplicated from `fallbackSlug` in src/lib/og/registry.js on purpose:
// functions/_middleware.js runs on EVERY html request and importing the
// registry would pull the whole layout tree into that bundle. Both are checked
// against each other by src/lib/og/paths.test.js.
export const CARD_FALLBACKS = {
  page: "home",
  book: "books",
  blog: "100-days-to-offload",
  sport: "sports",
  trek: "treks",
  project: "projects",
  presentation: "presentations",
  microblog: "micro-blog",
  tag: "tags",
  "ask-share": "ask-share",
};

// Resolves a stored image path to a public URL. Rows hold RELATIVE paths for
// anything uploaded through /admin (see toStorageUrl in src/lib/supabaseClient.js,
// which does the same job on the client but cannot be reused here because it
// imports the supabase-js client). Absolute URLs pass through untouched.
export function storageUrl(value, supabaseUrl) {
  if (!value) return null;
  const path = String(value);
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${supabaseUrl}/storage/v1/object/public/media${clean}`;
}

// First usable image out of a `slide_images` column, which holds either bare
// URL strings or `{ url }` objects depending on when the row was written.
export function firstSlideImage(slideImages, supabaseUrl) {
  if (!Array.isArray(slideImages)) return null;
  const found = slideImages.find((entry) => (typeof entry === "string" ? entry : entry && entry.url));
  if (!found) return null;
  return storageUrl(typeof found === "string" ? found : found.url, supabaseUrl);
}

// The og:image for one card.
//
// `fallbackSlug` is required rather than defaulted: every caller knows which
// section it is in, and a silent default would send a broken lookup to a
// generic card instead of the right one.
export function ogCardUrl({ kind, id, fallbackSlug, siteUrl = "", mode = OG_MODE_DYNAMIC }) {
  if (mode === OG_MODE_STATIC || id == null || id === "") {
    return ogStaticUrl(fallbackSlug, siteUrl);
  }
  return ogRenderUrl(kind, id, siteUrl);
}

// Parses the endpoint's own path: "book/12.png" -> { kind: "book", id: "12" }.
// Returns null for anything that is not exactly <kind>/<id>.png, so the
// endpoint can 404 rather than guess.
export function parseCardPath(pathname) {
  const match = String(pathname || "")
    .replace(/^\/+/, "")
    .match(/^([a-z0-9-]+)\/(.+)\.png$/i);
  if (!match) return null;
  const id = decodeURIComponent(match[2]);
  if (!id || id.includes("/")) return null;
  return { kind: match[1].toLowerCase(), id };
}

export default ogCardUrl;
