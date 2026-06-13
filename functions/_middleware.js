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

  const mbMatch = pathname.match(/^\/micro-blog\/(\d+)$/);
  const trekMatch = pathname.match(/^\/treks\/(\d+)$/);
  const sportMatch = pathname.match(/^\/sports\/(\d+)$/);
  const bookMatch = pathname.match(/^\/books\/(\d+)$/);
  const projectMatch = pathname.match(/^\/projects\/(\d+)$/);
  const blogMatch = pathname.match(/^\/100-days-to-offload\/(\d+)$/);

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
          `${supabaseUrl}/rest/v1/microblog?id=eq.${mbMatch[1]}&select=title,text,date,post_type&limit=1`,
          { headers },
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
        // Ignored
      }
    } else if (trekMatch) {
      try {
        const trekRes = await fetch(
          `${supabaseUrl}/rest/v1/treks?id=eq.${trekMatch[1]}&select=fort_name,trek_time,endurance_level,date,slide_images&limit=1`,
          { headers },
        );
        const treks = await trekRes.json();
        const trek = treks?.[0];
        if (trek) {
          let imageUrl = DEFAULT_IMAGE;
          if (trek.slide_images && trek.slide_images.length > 0) {
            const firstImg = trek.slide_images[0].url || trek.slide_images[0];
            if (typeof firstImg === "string") {
              imageUrl = firstImg.startsWith("http")
                ? firstImg
                : `${supabaseUrl}/storage/v1/object/public/media${firstImg}`;
            }
          }
          dynamicMeta = {
            title: `${trek.fort_name} Trek`,
            description: `A ${trek.endurance_level?.toLowerCase() || "medium"} endurance trek to ${trek.fort_name} fort on ${trek.date}. Trek duration: ${trek.trek_time}.`,
            image: imageUrl,
          };
        }
      } catch (_) {
        // Ignored
      }
    } else if (sportMatch) {
      try {
        const sportRes = await fetch(
          `${supabaseUrl}/rest/v1/sports?id=eq.${sportMatch[1]}&select=title,date,description,place,distance,time,slide_images&limit=1`,
          { headers },
        );
        const sports = await sportRes.json();
        const race = sports?.[0];
        if (race) {
          let imageUrl = DEFAULT_IMAGE;
          if (race.slide_images && race.slide_images.length > 0) {
            const firstImg = race.slide_images[0].url || race.slide_images[0];
            if (typeof firstImg === "string") {
              imageUrl = firstImg.startsWith("http")
                ? firstImg
                : `${supabaseUrl}/storage/v1/object/public/media${firstImg}`;
            }
          }
          dynamicMeta = {
            title: race.title,
            description: race.description || `Participated in the ${race.distance} race at ${race.place} on ${race.date}. Finishing time: ${race.time}.`,
            image: imageUrl,
          };
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
          dynamicMeta = {
            title: `${book.title} by ${book.author}`,
            description: book.description || `Read ${book.title} by ${book.author} — a review and analysis from Sanket Tambare's personal library.`,
            image: DEFAULT_IMAGE,
          };
        }
      } catch (_) {
        // Ignored
      }
    } else if (projectMatch) {
      try {
        const projectRes = await fetch(
          `${supabaseUrl}/rest/v1/projects?id=eq.${projectMatch[1]}&select=title,subtitle,description,image&limit=1`,
          { headers },
        );
        const projects = await projectRes.json();
        const project = projects?.[0];
        if (project) {
          let imageUrl = DEFAULT_IMAGE;
          if (project.image) {
            imageUrl = project.image.startsWith("http")
              ? project.image
              : `${supabaseUrl}/storage/v1/object/public/media${project.image}`;
          }
          dynamicMeta = {
            title: project.title,
            description: project.description || project.subtitle || `Detailed view of the project: ${project.title}.`,
            image: imageUrl,
          };
        }
      } catch (_) {
        // Ignored
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
          dynamicMeta = {
            title: blog.blog_title,
            description: blog.blog_description || `A blog post from the 100 Days to Offload challenge: ${blog.blog_title}.`,
            image: DEFAULT_IMAGE,
          };
        }
      } catch (_) {
        // Ignored
      }
    }
  }

  // Fall back to parent page meta if dynamic fetching is unconfigured or failed.
  if (!dynamicMeta) {
    const staticChildParents = [
      [/^\/treks\/\d+$/, "/treks"],
      [/^\/sports\/\d+$/, "/sports"],
      [/^\/books\/\d+$/, "/books"],
      [/^\/projects\/\d+$/, "/projects"],
      [/^\/100-days-to-offload\/\d+$/, "/100-days-to-offload"],
    ];
    const parentPath = staticChildParents.find(([rx]) => rx.test(pathname))?.[1];
    if (parentPath) {
      dynamicMeta = PAGE_META[parentPath] ?? null;
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
