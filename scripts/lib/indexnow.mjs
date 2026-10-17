// IndexNow (https://www.indexnow.org): tell Bing, Yandex, Seznam and Naver the
// moment a URL changes, instead of waiting for their next crawl. Bing's index
// is what ChatGPT search, Copilot and DuckDuckGo answer from, so this is the
// fastest route from an /admin edit to an AI answer.
//
// The key is public by design — it is served at /indexnow-key.txt, and that
// file existing on this host is what proves the submission is ours.

export const ENDPOINT = "https://api.indexnow.org/indexnow";
export const KEY_PATH = "/indexnow-key.txt";
// The protocol's limit per request.
export const MAX_URLS = 10000;

/** <url> entries out of a sitemap: [{ loc, lastmod }]. */
export function parseSitemap(xml) {
  const blocks = String(xml).match(/<url>[\s\S]*?<\/url>/g) || [];
  return blocks.map((block) => ({
    loc: (block.match(/<loc>([^<]+)<\/loc>/) || [])[1]?.trim() || null,
    lastmod: (block.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1]?.trim() || null,
  })).filter((u) => u.loc);
}

/** A single micro-post (`/micro-blog/:id`). The `/micro-blog` page itself is kept. */
export const isMicroPost = (loc) => /^\/micro-blog\/./.test(new URL(loc).pathname);

/**
 * The URLs worth submitting: everything with `all`, else what changed in the
 * last `days` days. An entry with no lastmod is only sent with `all` — there
 * is no telling whether it changed. Micro-post permalinks are never sent:
 * 1,600+ of them would spend the batch on the thinnest pages; crawlers still
 * find them through the sitemap.
 */
export function changedSince(entries, { days = 3, all = false, now = new Date() } = {}) {
  const pages = entries.filter((e) => !isMicroPost(e.loc));
  if (all) return pages.map((e) => e.loc);
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return pages
    .filter((e) => e.lastmod && new Date(e.lastmod).getTime() >= cutoff)
    .map((e) => e.loc);
}

/** Request bodies of at most MAX_URLS each. */
export function payloads(urls, { site, key }) {
  const { host } = new URL(site);
  const out = [];
  for (let i = 0; i < urls.length; i += MAX_URLS) {
    out.push({ host, key, keyLocation: `${site}${KEY_PATH}`, urlList: urls.slice(i, i + MAX_URLS) });
  }
  return out;
}
