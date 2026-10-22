// Every HTML response passes through here. It does four things, and does them
// for every visitor alike (no user-agent sniffing — bots and people get the
// same document):
//
//   1. Redirects the duplicates: "/about/" and "/About" are 301s to "/about".
//   2. Answers with the right status: a path no route claims, or a detail row
//      that does not exist, is a 404 — the SPA shell used to answer 200 to
//      everything, so every typo was an indexable page.
//   3. Writes the head: title, canonical, description, Open Graph, Twitter,
//      robots, and a JSON-LD @graph (src/lib/seo/structuredData.js).
//   4. Fills #root with the page as plain HTML (src/lib/seo/fallbackHtml.js),
//      because crawlers that do not run JavaScript — GPTBot, ClaudeBot,
//      PerplexityBot and most others — otherwise see an empty <div>.
//
// Route meta lives in the shared module (also consumed by the client-side
// Helmet tags) so the two can never drift apart. Everything imported here is
// dependency-free; esbuild bundles it at deploy time. Workers Free allows 10 ms
// of CPU per request: this is string work over one or two small JSON payloads,
// and the waiting on Supabase is wall time, which does not count.
import {
  SITE_URL,
  SITE_NAME,
  PAGE_META,
  DEFAULT_META,
  OG_IMAGE,
  composeTitle,
  buildShareMeta,
} from "../src/data/pageMeta";
import { IDENTITY, LOCATION_LABEL } from "../src/data/identity";
// Share-card URLs. A fixed route's og:image is its committed card (carried on
// the meta entry); a detail route's is the ROW'S OWN photo when it has one,
// which the entity views resolve out of a PostgREST row.
import { isCardImage, cardUrlForOrigin } from "../src/lib/og/paths";
import { matchRoute } from "../src/lib/seo/routeMatch";
import { rest, restConfig } from "../src/lib/seo/rest";
import {
  KINDS, DETAIL_KINDS, SECTION_KINDS, detailQuery, listQuery, viewOf,
} from "../src/lib/seo/entities";
import { isNeverIndexed } from "../src/lib/seo/indexing";
import { pageGraph } from "../src/lib/seo/structuredData";
import { renderFallback, homeFallback } from "../src/lib/seo/fallbackHtml";
import { escHtml, jsonLdScript, tagHref } from "../src/lib/seo/text";

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
// index.html carries no static OG/Twitter/canonical tags (they once caused
// first-match conflicts with Helmet's client-side tags), so HTMLRewriter must
// INSERT rather than update.
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

// Replaces the empty <div id="root"> contents with the crawler fallback.
class RootFiller {
  constructor(html) {
    this.html = html;
  }

  element(element) {
    element.setInnerContent(this.html, { html: true });
  }
}

const isRead = (request) => ["GET", "HEAD"].includes(request.method || "GET");

// The pages that say who Sanket is carry the bio outright.
const PROFILE_PATHS = new Set(["/about", "/resume", "/contact"]);

const profileExtras = () => ({
  body: [IDENTITY.bio],
  facts: [
    ["Work", `${IDENTITY.jobTitle} at ${IDENTITY.worksFor}`],
    ["Based in", LOCATION_LABEL],
    ["Education", IDENTITY.alumniOf.map((s) => `${s.name} — ${s.detail}`).join("; ")],
  ],
});

const notFound = (meta) => ({
  meta: meta || DEFAULT_META,
  status: 404,
  noindex: true,
  fallback: renderFallback({
    heading: "Page not found",
    lede: "There is nothing at this address. Everything on the site is linked from the home page.",
    items: [{ href: "/", text: `${SITE_NAME} — home` }],
  }),
  graph: null,
});

// What one request should look like: meta, status, robots, body and JSON-LD.
async function resolvePage(pathname, match, env, origin) {
  const opts = { cacheOrigin: origin };
  const supabaseUrl = restConfig(env)?.url || "";

  if (!match) return notFound(DEFAULT_META);
  const { entry, params } = match;

  // Authenticated, noindexed, and nothing in it a crawler should read.
  if (entry.path === "/admin/*") {
    return { meta: PAGE_META[pathname] ?? DEFAULT_META, status: 200, noindex: true, fallback: null, graph: null };
  }

  // A shared /ask conversation. An RPC rather than a table select: ask_shares
  // is owner-only, because an anon select policy would let anyone list every
  // shared conversation. get_ask_share is token-gated and read-only, so an
  // unfurl is not a view. Never cached: a revoked share must stop unfurling.
  if (entry.path === "/ask/s/:token") {
    if (!/^[A-Za-z0-9]{8,64}$/.test(params.token)) return notFound();
    const res = await rest(env, "rpc/get_ask_share", { body: { p_token: params.token }, ttl: 0 });
    const share = res.ok ? res.rows : null;
    if (res.ok && !share?.title) return notFound();
    const meta = share ? buildShareMeta({ title: share.title, summary: share.summary }) : DEFAULT_META;
    return {
      meta,
      status: 200,
      noindex: true,
      fallback: share
        ? renderFallback({ heading: share.title, lede: share.summary, parent: { href: "/ask", label: PAGE_META["/ask"].title } })
        : null,
      graph: null,
    };
  }

  // A detail page: one row, read with the anon key so RLS applies — a hidden
  // project or a draft issue is a 404 here exactly as it is in the app.
  const kind = DETAIL_KINDS[entry.path];
  if (kind) {
    const k = KINDS[kind];
    const parentMeta = PAGE_META[k.section];
    const rawKey = Object.values(params)[0];
    const key = k.normaliseKey ? k.normaliseKey(rawKey) : rawKey;
    if (!key || !k.keyPattern.test(key)) return notFound(parentMeta);

    const res = await rest(env, detailQuery(kind, key), opts);
    // Unreadable (unconfigured, or Supabase down): degrade to the section's
    // meta with a 200, as before. Only a definite "no such row" is a 404.
    if (!res.ok) {
      return {
        meta: parentMeta,
        status: 200,
        noindex: false,
        fallback: renderFallback({ heading: parentMeta.title, lede: parentMeta.description, parent: { href: k.section, label: parentMeta.title } }),
        graph: null,
      };
    }
    const row = Array.isArray(res.rows) ? res.rows[0] : null;
    if (!row) return notFound(parentMeta);

    let related = null;
    if (k.related) {
      const q = k.related(key);
      const rel = await rest(env, q.path, { ...opts, body: q.body });
      related = rel.ok ? rel.rows : null;
    }
    const view = viewOf(kind, row, { supabaseUrl, related });
    return {
      meta: view.meta,
      status: 200,
      noindex: view.indexable === false,
      fallback: renderFallback({
        heading: view.title,
        lede: view.subtitle,
        facts: view.facts,
        body: view.body,
        bodyHtml: view.bodyHtml,
        bullets: view.bullets,
        outbound: view.outbound,
        items: view.items,
        tags: view.tags,
        lang: view.lang,
        image: view.image,
        parent: { href: k.section, label: parentMeta.title },
      }),
      graph: pageGraph({ path: pathname, meta: view.meta, view, items: view.items, section: k.section }),
    };
  }

  // A fixed route.
  const meta = PAGE_META[entry.path] ?? DEFAULT_META;
  const noindex = !entry.indexable || isNeverIndexed(pathname);
  if (entry.path === "/") {
    return { meta, status: 200, noindex, fallback: homeFallback(), graph: pageGraph({ path: "/", meta }) };
  }

  // A section page lists its rows, so a crawler can reach every detail page by
  // following links — the app's own listings open most items in a modal.
  let items = null;
  const sectionKind = SECTION_KINDS[entry.path];
  if (sectionKind) {
    const q = listQuery(sectionKind);
    const res = await rest(env, q.path, { ...opts, body: q.body });
    if (res.ok && Array.isArray(res.rows)) {
      items = res.rows.map(KINDS[sectionKind].listItem).filter(Boolean);
    }
  }

  return {
    meta,
    status: 200,
    noindex,
    fallback: renderFallback({
      heading: meta.title || SITE_NAME,
      lede: meta.description,
      items,
      ...(PROFILE_PATHS.has(entry.path) ? profileExtras() : {}),
    }),
    graph: pageGraph({ path: pathname, meta, items }),
  };
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Skip static asset requests (anything with a file extension).
  // Do not use the Accept header as a gate — scrapers commonly send
  // Accept: */* which does not contain "text/html" and would cause the
  // middleware to bail before injecting any metadata.
  const lastSegment = url.pathname.split("/").pop();
  if (lastSegment.includes(".")) {
    return next();
  }

  // "/world" was the noindexed preview route during the atlas dark build. The
  // atlas now serves "/", so redirect permanently and let the search engines
  // collapse the two. (App.js also renders a client-side <Navigate>, which
  // covers in-app navigation that never reaches this worker.)
  if (url.pathname === "/world") {
    return Response.redirect(new URL("/", url).toString(), 301);
  }

  // One spelling per page. A trailing slash or a capital used to serve the same
  // page under a second URL; now it is a permanent redirect to the canonical
  // one, query string kept. Reads only — a 301 would turn a POST into a GET.
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const match = matchRoute(pathname);
  if (isRead(request) && !url.pathname.startsWith("/api/")) {
    let target = match && match.entry.path !== "/admin/*" ? match.canonicalPath : pathname;
    // Tag names are stored lowercased and every internal link lowercases them
    // (tagPath), so "/tags/Running" is a second URL for "/tags/running".
    if (match?.entry.path === "/tags/:name") {
      const key = KINDS.tag.normaliseKey(match.params.name);
      if (key) target = tagHref(key);
    }
    if (target !== url.pathname) {
      // Pinned to our origin: "//evil.com/" strips to "//evil.com", which
      // new URL() would read as a protocol-relative link to another host.
      return Response.redirect(`${url.origin}${target}${url.search}`, 301);
    }
  }

  const response = await next();

  // Only rewrite HTML responses (definitive gate on the actual content type).
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const page = await resolvePage(pathname, match, env, url.origin);
  const { meta } = page;
  const fullTitle = meta.fullTitle || composeTitle(meta.title);
  const canonicalUrl = `${SITE_URL}${pathname === "/" ? "" : pathname}`;

  // The share image, already resolved: a fixed route's PAGE_META entry carries
  // its committed card, and each builder fell back to its section's card when
  // the row had no photo. There is nothing to render and nothing to fetch.
  //
  // It is re-hosted onto the origin serving this request, so a Pages preview
  // advertises its OWN cards rather than production's — see cardUrlForOrigin.
  const imageUrl = cardUrlForOrigin(meta.image, url.origin, SITE_URL);
  const imageAlt = meta.imageAlt || meta.description;
  const ogType = meta.type || "website";

  // Dimensions are declared only for our own 1200x630 cards. A row's photo is
  // whatever shape it was shot in, and asserting 1200x630 over a 900px-tall
  // portrait makes every platform crop it wrong; undeclared, they measure it.
  const sized = isCardImage(imageUrl);

  // Must stay tag-for-tag identical to src/components/Template/PageMeta.js.
  // og:site_name is deliberately absent: index.html carries it globally, and
  // emitting it here too puts two of them in every page's head.
  //
  // `data-rh="true"` is react-helmet-async's marker for tags it owns. With it,
  // Helmet REPLACES these on mount instead of adding a second set beside them,
  // so the DOM Google renders holds one canonical and one description. The
  // robots tag and the JSON-LD carry no marker on purpose: Helmet would remove
  // them on mount, and both must hold for the URL as it was served.
  const rh = 'data-rh="true"';
  const tags = `
    <link rel="canonical" href="${escHtml(canonicalUrl)}" ${rh}>
    <meta name="description" content="${escHtml(meta.description)}" ${rh}>${page.noindex ? `
    <meta name="robots" content="noindex">` : ""}
    <meta property="og:type" content="${escHtml(ogType)}" ${rh}>
    <meta property="og:url" content="${escHtml(canonicalUrl)}" ${rh}>
    <meta property="og:title" content="${escHtml(fullTitle)}" ${rh}>
    <meta property="og:description" content="${escHtml(meta.description)}" ${rh}>
    <meta property="og:image" content="${escHtml(imageUrl)}" ${rh}>${sized ? `
    <meta property="og:image:width" content="${OG_IMAGE.width}" ${rh}>
    <meta property="og:image:height" content="${OG_IMAGE.height}" ${rh}>` : ""}
    <meta property="og:image:alt" content="${escHtml(imageAlt)}" ${rh}>
    <meta name="twitter:card" content="summary_large_image" ${rh}>
    <meta name="twitter:title" content="${escHtml(fullTitle)}" ${rh}>
    <meta name="twitter:description" content="${escHtml(meta.description)}" ${rh}>
    <meta name="twitter:image" content="${escHtml(imageUrl)}" ${rh}>
    <meta name="twitter:image:alt" content="${escHtml(imageAlt)}" ${rh}>${page.graph ? `
    ${jsonLdScript(page.graph)}` : ""}`;

  let rewriter = new HTMLRewriter()
    .on("title", new TitleRewriter(fullTitle))
    .on("head", new HeadInjector(tags));
  if (page.fallback) rewriter = rewriter.on("#root", new RootFiller(page.fallback));
  const out = rewriter.transform(response);

  if (page.status === 200 && !page.noindex) return out;
  const headers = new Headers(out.headers);
  if (page.noindex) headers.set("X-Robots-Tag", "noindex");
  return new Response(out.body, { status: page.status, headers });
}
