// Route meta lives in the shared module (also consumed by src/layouts/Main.js
// for the client-side Helmet tags) so the two can never drift apart again.
// Pages Functions are bundled with esbuild, which resolves this relative
// import at deploy time; the module is dependency-free by design.
import {
  BASE_URL,
  PAGE_META,
  DEFAULT_META,
  DEFAULT_IMAGE,
  composeTitle,
} from "../src/data/pageMeta";

function escAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Updates the text content of the existing <title> element.
class TitleRewriter {
  constructor(title) {
    this.title = title;
  }

  element(element) {
    element.setInnerContent(this.title);
  }
}

// Appends all per-page meta/link tags at the end of <head>.
// index.html no longer carries static OG/Twitter/canonical tags (they were
// removed to prevent first-match conflicts with Helmet's client-side tags),
// so HTMLRewriter must INSERT rather than update.
class HeadInjector {
  constructor(html) {
    this.html = html;
    this.done = false;
  }

  element(element) {
    if (!this.done) {
      element.append(this.html, { html: true });
      this.done = true;
    }
  }
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  // Skip static asset requests (anything with a file extension).
  // Do not use the Accept header as a gate — scrapers commonly send
  // Accept: */* which does not contain "text/html" and would cause the
  // middleware to bail before injecting any metadata.
  const lastSegment = pathname.split("/").pop();
  if (lastSegment.includes(".")) {
    return next();
  }

  const response = await next();

  // Only rewrite HTML responses (definitive gate on the actual content type).
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  // Dynamic routes — resolve per-item OG meta.
  let dynamicMeta = null;

  // Static-data child routes: map to parent page meta (data is JS-bundled, not queryable at edge).
  const staticChildParents = [
    [/^\/treks\/\d+$/, "/treks"],
    [/^\/sports\/\d+$/, "/sports"],
    [/^\/books\/\d+$/, "/books"],
    [/^\/projects\/\d+$/, "/projects"],
    [/^\/100-days-to-offload\/\d+$/, "/100-days-to-offload"],
  ];
  const parentPath = staticChildParents.find(([rx]) => rx.test(pathname))?.[1];
  if (parentPath) dynamicMeta = PAGE_META[parentPath] ?? null;

  // Supabase-backed route: /micro-blog/:id — fetch live post for per-post OG tags.
  const mbMatch = pathname.match(/^\/micro-blog\/(\d+)$/);
  if (mbMatch && env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    try {
      const postRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/microblog?id=eq.${mbMatch[1]}&select=title,text,date,post_type&limit=1`,
        {
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
            Accept: "application/json",
          },
        },
      );
      const posts = await postRes.json();
      const post = posts?.[0];
      if (post) {
        const raw = (post.text || post.title || "").replace(/\s+/g, " ").trim();
        const snippet = raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
        dynamicMeta = {
          title: `Post · ${post.date}`,
          description: snippet || "A micro-blog post.",
          image: DEFAULT_IMAGE,
        };
      }
    } catch (_) {
      // fall through to static meta
    }
  }

  const meta = dynamicMeta ?? PAGE_META[pathname] ?? DEFAULT_META;
  const fullTitle = composeTitle(meta.title);
  const canonicalUrl = `${BASE_URL}${pathname === "/" ? "" : pathname}`;

  const tags = `
    <link rel="canonical" href="${escAttr(canonicalUrl)}">
    <meta name="description" content="${escAttr(meta.description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escAttr(canonicalUrl)}">
    <meta property="og:title" content="${escAttr(fullTitle)}">
    <meta property="og:description" content="${escAttr(meta.description)}">
    <meta property="og:image" content="${escAttr(meta.image)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escAttr(fullTitle)}">
    <meta name="twitter:description" content="${escAttr(meta.description)}">
    <meta name="twitter:image" content="${escAttr(meta.image)}">`;

  return new HTMLRewriter()
    .on("title", new TitleRewriter(fullTitle))
    .on("head", new HeadInjector(tags))
    .transform(response);
}
