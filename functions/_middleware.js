// Route meta lives in the shared module (also consumed by src/layouts/Main.js
// for the client-side Helmet tags) so the two can never drift apart again.
// Pages Functions are bundled with esbuild, which resolves this relative
// import at deploy time; the module is dependency-free by design.
import {
  SITE_URL,
  PAGE_META,
  DEFAULT_META,
  OG_IMAGE,
  composeTitle,
  buildMicroblogMeta,
  buildTrekMeta,
  buildSportMeta,
  buildBookMeta,
  buildBlogMeta,
  buildProjectMeta,
  buildPresentationMeta,
  buildShareMeta,
  buildTagMeta,
} from "../src/data/pageMeta";
// Share-card URLs. An item's og:image is derived from its kind and id, so this
// layer needs no image columns and no extra requests — the photo is composited
// INTO the card by functions/api/og, not referenced raw.
import { ogCardUrl, ogMode, CARD_FALLBACKS } from "../src/lib/og/paths";

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

  // "/world" was the noindexed preview route during the atlas dark build. The
  // atlas now serves "/", so redirect permanently and let the search engines
  // collapse the two. (App.js also renders a client-side <Navigate>, which
  // covers in-app navigation that never reaches this worker.)
  if (pathname === "/world") {
    return Response.redirect(new URL("/", url).toString(), 301);
  }

  const response = await next();

  // Only rewrite HTML responses (definitive gate on the actual content type).
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  // Dynamic routes — resolve per-item OG meta.
  let dynamicMeta = null;
  // Which share card this route's og:image should point at, as { kind, id }.
  // Set alongside dynamicMeta so the image URL is derived once, below, instead
  // of in each of the nine branches.
  let cardRef = null;

  const mbMatch = pathname.match(/^\/micro-blog\/(\d+)$/);
  const trekMatch = pathname.match(/^\/treks\/(\d+)$/);
  const sportMatch = pathname.match(/^\/sports\/(\d+)$/);
  const bookMatch = pathname.match(/^\/books\/(\d+)$/);
  const projectMatch = pathname.match(/^\/projects\/(\d+)$/);
  const blogMatch = pathname.match(/^\/100-days-to-offload\/(\d+)$/);
  const presentationMatch = pathname.match(/^\/presentations\/(\d+)$/);
  const shareMatch = pathname.match(/^\/ask\/s\/([A-Za-z0-9]{8,64})$/);
  // `/tags/:name` carries a URI-encoded, deliberately UN-slugified name so
  // Devanagari survives (see tagPath in src/lib/api/tags.js). Until now this
  // route had no per-item meta at all and every tag page unfurled as /tags.
  const tagMatch = pathname.match(/^\/tags\/([^/]+)$/);

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const headers = {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: "application/json",
    };

    if (mbMatch) {
      try {
        const postRes = await fetch(
          `${supabaseUrl}/rest/v1/microblog?id=eq.${mbMatch[1]}&select=title,text,date&limit=1`,
          { headers },
        );
        const posts = await postRes.json();
        const post = posts?.[0];
        if (post) {
          cardRef = { kind: "microblog", id: mbMatch[1] };
          dynamicMeta = buildMicroblogMeta({
            title: post.title,
            text: post.text,
            date: post.date,
          });
        }
      } catch (_) {
        // Ignored
      }
    } else if (trekMatch) {
      try {
        const trekRes = await fetch(
          `${supabaseUrl}/rest/v1/treks?id=eq.${trekMatch[1]}&select=fort_name,trek_time,endurance_level,date&limit=1`,
          { headers },
        );
        const treks = await trekRes.json();
        const trek = treks?.[0];
        if (trek) {
          cardRef = { kind: "trek", id: trekMatch[1] };
          dynamicMeta = buildTrekMeta({
            fortName: trek.fort_name,
            enduranceLevel: trek.endurance_level,
            trekTime: trek.trek_time,
            date: trek.date,
          });
        }
      } catch (_) {
        // Ignored
      }
    } else if (sportMatch) {
      try {
        const sportRes = await fetch(
          `${supabaseUrl}/rest/v1/sports?id=eq.${sportMatch[1]}&select=title,date,description,place,distance,time&limit=1`,
          { headers },
        );
        const sports = await sportRes.json();
        const race = sports?.[0];
        if (race) {
          cardRef = { kind: "sport", id: sportMatch[1] };
          dynamicMeta = buildSportMeta({
            title: race.title,
            distance: race.distance,
            place: race.place,
            date: race.date,
            time: race.time,
            description: race.description,
          });
        }
      } catch (_) {
        // Ignored
      }
    } else if (bookMatch) {
      try {
        const bookRes = await fetch(
          `${supabaseUrl}/rest/v1/books?id=eq.${bookMatch[1]}&select=title,author,description&limit=1`,
          { headers },
        );
        const books = await bookRes.json();
        const book = books?.[0];
        if (book) {
          cardRef = { kind: "book", id: bookMatch[1] };
          dynamicMeta = buildBookMeta({
            title: book.title,
            author: book.author,
            description: book.description,
          });
        }
      } catch (_) {
        // Ignored
      }
    } else if (projectMatch) {
      try {
        const projectRes = await fetch(
          `${supabaseUrl}/rest/v1/projects?id=eq.${projectMatch[1]}&select=title,subtitle,description&limit=1`,
          { headers },
        );
        const projects = await projectRes.json();
        // A hidden project returns [] here — the anon key means RLS applies, so a
        // draft never leaks its title into a crawler's card.
        const project = projects?.[0];
        if (project) {
          // The cover / first screenshot is no longer resolved here: the share
          // card composites it itself (src/lib/og/model.js does the same
          // image || first-slide fallback the client's coverFor() does), so
          // this layer only needs text.
          cardRef = { kind: "project", id: projectMatch[1] };
          dynamicMeta = buildProjectMeta({
            title: project.title,
            subtitle: project.subtitle,
            description: project.description,
          });
        }
      } catch (_) {
        // Ignored
      }
    } else if (presentationMatch) {
      try {
        const deckRes = await fetch(
          `${supabaseUrl}/rest/v1/presentations?id=eq.${presentationMatch[1]}&select=title,description&limit=1`,
          { headers },
        );
        const decks = await deckRes.json();
        const deck = decks?.[0];
        if (deck) {
          cardRef = { kind: "presentation", id: presentationMatch[1] };
          dynamicMeta = buildPresentationMeta({ title: deck.title, description: deck.description });
        }
      } catch (_) {
        // Ignored
      }
    } else if (shareMatch) {
      try {
        // An RPC rather than a table select: ask_shares is owner-only, because
        // an anon select policy would let anyone list every shared conversation.
        // get_ask_share is token-gated and read-only, so an unfurl is not a view.
        const shareRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_ask_share`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ p_token: shareMatch[1] }),
        });
        const share = await shareRes.json();
        if (share?.title) {
          cardRef = { kind: "ask-share", id: shareMatch[1] };
          dynamicMeta = buildShareMeta({ title: share.title, summary: share.summary });
        }
      } catch (_) {
        // Ignored — a revoked or unknown token falls back to the default card.
      }
    } else if (blogMatch) {
      try {
        const blogRes = await fetch(
          `${supabaseUrl}/rest/v1/blogs?id=eq.${blogMatch[1]}&select=blog_title,blog_description&limit=1`,
          { headers },
        );
        const blogs = await blogRes.json();
        const blog = blogs?.[0];
        if (blog) {
          cardRef = { kind: "blog", id: blogMatch[1] };
          dynamicMeta = buildBlogMeta({
            title: blog.blog_title,
            description: blog.blog_description,
          });
        }
      } catch (_) {
        // Ignored
      }
    } else if (tagMatch) {
      try {
        // Names are stored lowercased (CLAUDE.md), and url.pathname arrives
        // percent-encoded, so decode before matching.
        const name = decodeURIComponent(tagMatch[1]).toLowerCase();
        const tagRes = await fetch(
          `${supabaseUrl}/rest/v1/tags?name=eq.${encodeURIComponent(name)}&select=id,name,display_name,description,category&limit=1`,
          { headers },
        );
        const tags = await tagRes.json();
        const tag = tags?.[0];
        if (tag) {
          // The card is keyed on the tag's numeric id, not its name: that keeps
          // the image path ASCII while the route keeps its Devanagari name.
          cardRef = { kind: "tag", id: tag.id };
          dynamicMeta = buildTagMeta({
            name: tag.name,
            displayName: tag.display_name,
            description: tag.description,
            category: tag.category,
          });
        }
      } catch (_) {
        // Ignored
      }
    }
  }

  // Fall back to parent page meta if dynamic fetching is unconfigured or failed.
  if (!dynamicMeta) {
    const staticChildParents = [
      [/^\/micro-blog\/\d+$/, "/micro-blog"],
      [/^\/treks\/\d+$/, "/treks"],
      [/^\/sports\/\d+$/, "/sports"],
      [/^\/books\/\d+$/, "/books"],
      [/^\/projects\/\d+$/, "/projects"],
      [/^\/presentations\/\d+$/, "/presentations"],
      [/^\/100-days-to-offload\/\d+$/, "/100-days-to-offload"],
      [/^\/tags\/[^/]+$/, "/tags"],
    ];
    const parentPath = staticChildParents.find(([rx]) => rx.test(pathname))?.[1];
    if (parentPath) {
      dynamicMeta = PAGE_META[parentPath] ?? null;
    }
  }

  const meta = dynamicMeta ?? PAGE_META[pathname] ?? DEFAULT_META;
  const fullTitle = composeTitle(meta.title);
  const canonicalUrl = `${SITE_URL}${pathname === "/" ? "" : pathname}`;

  // The share card. `meta.image` is always the committed fallback, so this only
  // ever upgrades it to the on-demand URL — and OG_MODE=static skips the
  // upgrade, which is the whole kill-switch. The static URL is emitted DIRECTLY
  // rather than relying on the endpoint's redirect, because several image
  // scrapers do not follow redirects.
  const mode = ogMode(env);
  const cardTarget = cardRef
    || (meta.ogSlug ? { kind: "page", id: meta.ogSlug } : null);
  const imageUrl = cardTarget
    ? ogCardUrl({
      kind: cardTarget.kind,
      id: cardTarget.id,
      // A fixed page falls back to its OWN card; an entity falls back to its
      // section's. CARD_FALLBACKS.page is "home", which is only correct when
      // the slug is unknown.
      fallbackSlug: cardTarget.kind === "page"
        ? cardTarget.id
        : (CARD_FALLBACKS[cardTarget.kind] || "home"),
      siteUrl: SITE_URL,
      mode,
    })
    : meta.image;
  const imageAlt = meta.imageAlt || meta.description;
  const ogType = meta.type || "website";

  // Must stay tag-for-tag identical to src/components/Template/PageMeta.js.
  // og:image:width/height stop platforms guessing at the crop; og:type was
  // hardcoded "website" for every route on the site, including articles.
  // og:site_name is deliberately absent: index.html carries it globally, and
  // emitting it here too puts two of them in every page's head.
  const tags = `
    <link rel="canonical" href="${escAttr(canonicalUrl)}">
    <meta name="description" content="${escAttr(meta.description)}">
    <meta property="og:type" content="${escAttr(ogType)}">
    <meta property="og:url" content="${escAttr(canonicalUrl)}">
    <meta property="og:title" content="${escAttr(fullTitle)}">
    <meta property="og:description" content="${escAttr(meta.description)}">
    <meta property="og:image" content="${escAttr(imageUrl)}">
    <meta property="og:image:width" content="${OG_IMAGE.width}">
    <meta property="og:image:height" content="${OG_IMAGE.height}">
    <meta property="og:image:alt" content="${escAttr(imageAlt)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escAttr(fullTitle)}">
    <meta name="twitter:description" content="${escAttr(meta.description)}">
    <meta name="twitter:image" content="${escAttr(imageUrl)}">
    <meta name="twitter:image:alt" content="${escAttr(imageAlt)}">`;

  return new HTMLRewriter()
    .on("title", new TitleRewriter(fullTitle))
    .on("head", new HeadInjector(tags))
    .transform(response);
}
