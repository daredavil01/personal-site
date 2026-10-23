// HTML → text, shared by `npm run blogs:wordcount` (scripts/blog-word-counts.mjs),
// the Substack RSS proxy (functions/rss-feed.js) and the Social kit.
//
// Regex, not a DOM parser: the Worker has no DOMParser, and these bodies are
// Substack's and WordPress's own well-formed HTML. Dependency-free by contract.

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  middot: "·",
  bull: "•",
  deg: "°",
};

export function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(
      /&([a-z]+);/gi,
      (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m,
    );
}

/** Count words in an HTML body: drop script/style, strip tags, split on whitespace. */
export function countHtmlWords(html) {
  if (!html) return 0;
  const text = decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
  const words = text.replace(/\s+/g, " ").trim();
  return words ? words.split(" ").length : 0;
}

/**
 * HTML body → plain text, keeping paragraph breaks (a blank line between
 * blocks) so callers can split on them. Word counts still come from
 * countHtmlWords, so this never moves a ledger number.
 */
export function htmlToText(html) {
  if (!html) return "";
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(
        /<\/(p|h[1-6]|li|blockquote|figcaption|pre)>|<br\s*\/?>/gi,
        "\n\n",
      )
      .replace(/<[^>]+>/g, " "),
  )
    .split(/\n{2,}/)
    .map((para) => para.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Normalise a post URL for cross-source matching. */
export function normaliseUrl(url) {
  if (!url) return null;
  const bare = url.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
  // Substack posts are identified by their /p/<slug> segment; the host varies
  // between the custom domain and the *.substack.com one.
  if (bare.includes("/p/")) return `substack:${bare.split("/p/").pop()}`;
  return bare.replace(/^https?:\/\//, "");
}
