// Answer formatting rules for /ask, shared by the Pages Function
// (functions/api/ask.js) and the chat UI (src/components/Ask/).
//
// Lives in src/ for the same reason as askTiers.js: Pages routes every file
// under functions/. Dependency-free by contract — esbuild bundles it into the
// worker and Vite into the page.
//
// The one rule that matters: an answer may only link to, or show, a URL that
// appeared in a retrieved item. The microblog is a Tumblr import full of
// reblogged third-party text, so a link the model "found" is as likely to be an
// injected instruction as a hallucination. Either way it never renders.

export const SITE_ORIGIN = "https://sankettambare.in";
export const MAX_MEDIA = 4;

const IMAGE_RE = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?\s*\)/g;
const LINK_RE = /(^|[^!])\[([^\]]+)\]\(\s*<?([^)\s>]+)>?\s*\)/g;
const BARE_RE = /(^|[\s(])(https?:\/\/[^\s)<>\]]+)/g;
const CITE_RE = /\[(\d{1,2})\]/g;

/** Site URLs compare as paths, so /books/3 and https://sankettambare.in/books/3 match. */
export function normaliseUrl(url) {
  if (!url) return "";
  const s = String(url).trim();
  if (s.startsWith(SITE_ORIGIN)) return s.slice(SITE_ORIGIN.length) || "/";
  return s;
}

export const isExternal = (url) => /^https?:\/\//i.test(normaliseUrl(url));

export function linkDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_) {
    return "";
  }
}

export function allowedUrls(sources) {
  const set = new Set();
  (sources || []).forEach((s) => {
    if (s?.url) set.add(normaliseUrl(s.url));
    if (s?.image) set.add(normaliseUrl(s.image));
  });
  return set;
}

/** Drops every link and image whose URL is not in `sources`; keeps link text. */
export function sanitiseAnswer(text, sources) {
  const ok = allowedUrls(sources);
  const allowed = (url) => ok.has(normaliseUrl(url));
  return String(text || "")
    .replace(IMAGE_RE, (m, alt, url) => (allowed(url) ? `![${alt}](${normaliseUrl(url)})` : ""))
    .replace(LINK_RE, (m, pre, label, url) => (
      allowed(url) ? `${pre}[${label}](${normaliseUrl(url)})` : `${pre}${label}`
    ))
    .replace(BARE_RE, (m, pre, raw) => {
      // Sentence punctuation is not part of the URL.
      const url = raw.replace(/[.,;:!?]+$/, "");
      const tail = raw.slice(url.length);
      return allowed(url) ? `${pre}${url}${tail}` : `${pre}${tail}`;
    })
    // Removing a link can strand the spaces around it.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "");
}

export const hasInlineImage = (text) => new RegExp(IMAGE_RE.source).test(String(text || ""));

export function stripMarkdownImages(text) {
  return String(text || "")
    .replace(new RegExp(IMAGE_RE.source, "g"), "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Pictures worth showing under an answer: images the model placed inline, then
 * the images of the sources it cited, deduped and capped.
 */
export function collectMedia(answer, sources) {
  const list = sources || [];
  const out = [];
  const seen = new Set();
  const push = (url, alt, href) => {
    const key = normaliseUrl(url);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ url: key, alt: alt || "", href: href || null });
  };
  const text = String(answer || "");

  const images = new RegExp(IMAGE_RE.source, "g");
  let m = images.exec(text);
  while (m) {
    const url = m[2];
    const owner = list.find((s) => normaliseUrl(s.image) === normaliseUrl(url));
    if (owner) push(url, m[1] || owner.title, owner.url);
    m = images.exec(text);
  }

  const cites = new RegExp(CITE_RE.source, "g");
  m = cites.exec(text);
  while (m) {
    const source = list[Number(m[1]) - 1];
    if (source?.image) push(source.image, source.title, source.url);
    m = cites.exec(text);
  }
  return out.slice(0, MAX_MEDIA);
}
