import { createClient } from "@supabase/supabase-js";

// Vite exposes variables prefixed with VITE_ on import.meta.env.
// The publishable key is safe to ship to the browser — Row-Level Security
// (see supabase/migrations) guards writes; public reads are intentionally open.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set — "
      + "content fetches will fail. Copy .env.example to .env and fill them in.",
  );
}

// Fall back to a syntactically valid placeholder when unconfigured: createClient
// throws on an empty URL, which would crash the whole app at import time. With a
// placeholder the app still boots; real requests fail and surface as error states.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder-key",
);

// ---------------------------------------------------------------------------
// Storage URL helpers
// ---------------------------------------------------------------------------
// Public base for the `media` bucket. Relative image paths stored in the DB
// (e.g. /images/sports/foo.jpg) are prefixed with this so they are served
// from Supabase Storage instead of the Cloudflare Pages static bundle.
// Paths that already start with "http" are returned as-is (admin uploads
// already store full URLs, keeping both formats coexistent).
const STORAGE_BASE = supabaseUrl
  ? `${supabaseUrl}/storage/v1/object/public/media`
  : "";

export function toStorageUrl(path) {
  if (!path) return path;
  if (path.startsWith("http")) return path;
  return STORAGE_BASE + path;
}

// Convenience: map over a slideImages array [{url, caption}] and resolve each url.
export function toStorageImages(slideImages) {
  return (slideImages ?? []).map((img) => ({ ...img, url: toStorageUrl(img.url) }));
}
