// String helpers shared by everything that writes HTML, XML or JSON-LD for
// crawlers (functions/_middleware.js and the Pages Functions behind
// /sitemap.xml, /feed.xml and /llms*.txt). Import-free so esbuild can bundle
// it into the Worker without dragging anything in.

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Safe for element text AND attribute values, so one helper covers both.
export const escHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ENTITIES[c]);

// XML needs the same five; aliased so call sites say what they are writing.
export const escXml = escHtml;

// A <script type="application/ld+json"> body. JSON.stringify does not escape
// "<", so a row whose text contains "</script>" would close the tag early and
// spill into the page; "\u003c" is the same character to a JSON parser.
export const jsonLdScript = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

// Whitespace collapsed, then cut at a word boundary with an ellipsis.
export function clip(value, max) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!max || text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

// Paragraphs out of a text column: blank lines separate them, single newlines
// are kept as spaces. Empty input gives an empty list, never [""].
export const paragraphs = (value) => String(value ?? "")
  .split(/\n\s*\n/)
  .map((p) => p.replace(/\s+/g, " ").trim())
  .filter(Boolean);

// Same URL shape as tagPath in src/lib/api/tags.js (which cannot be imported
// here: it pulls in the supabase-js client). URI-encoded, never slugified, so
// Marathi names survive. src/lib/seo/seo.test.js holds the two together.
export const tagHref = (name) => `/tags/${encodeURIComponent(String(name).toLowerCase())}`;

// Only http(s) links are ever written out as hrefs.
export const safeUrl = (url) => (/^https?:\/\//i.test(String(url || "")) ? String(url) : null);

// Alt text for a photo that came with words: the words, clipped. A photo with
// none gets the fallback, never "" — an empty alt tells image search nothing,
// and these are the site's own photographs, not decoration.
export const photoAlt = (text, fallback) => clip(text, 125) || fallback;
