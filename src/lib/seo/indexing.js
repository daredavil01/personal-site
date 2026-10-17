// Which pages search engines are asked to index, decided once.
//
// The middleware (robots meta + X-Robots-Tag) and /sitemap.xml both read these,
// so a page is never listed in the sitemap while telling the crawler not to
// index it — a contradiction Search Console reports as an error.
//
// Import-free: the Worker bundles it.

// A micro-post earns a place in the index only if it has words. About 59% of
// the Tumblr archive is photo posts whose images never made it across
// (image_url is blank), and 1,000 near-empty pages would drag down how a
// search engine rates the whole site.
export const isIndexableMicroblog = (row) => String(row?.text ?? "").trim().length > 0;

// Path prefixes that are never indexed, whatever the manifest says. /admin is
// authenticated; /ask/s/* are reader-made snapshots — unlisted, user-generated
// and near-duplicates of each other.
const NEVER_INDEX = [/^\/admin(?:\/|$)/, /^\/ask\/s\//];

export const isNeverIndexed = (pathname) => NEVER_INDEX.some((rx) => rx.test(pathname));
