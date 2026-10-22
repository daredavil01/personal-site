// What a crawler actually sees.
//
// This layer had no test, and it is the only one that matters for an unfurl:
// scrapers do not run JS, so src/components/Template/PageMeta.js is parity
// insurance and this file is the product. The pieces it pins are the ones the
// share-image rework turns on — a row's own photo wins, a row without one
// takes its section's committed card, and og:image:width/height are declared
// only for cards, whose 1200x630 we actually know.
//
// HTMLRewriter is a workerd API, so it is stubbed: `wrangler pages dev` is the
// only way to run the real thing, and it needs a Cloudflare API token.
//
// A test file under functions/ is normally a mistake, since Pages turns every
// file there into a route. The leading underscore is what exempts this one —
// verified with `wrangler pages functions build`, whose output contains no
// reference to this file. Rename it and it ships.

// eslint-disable-next-line import/extensions
import { PAGE_META } from "../src/data/pageMeta";

const ORIGINAL = {
  HTMLRewriter: global.HTMLRewriter,
  fetch: global.fetch,
  Response: global.Response,
  Headers: global.Headers,
};

// Captures what each handler writes, which is the whole output of this module.
class FakeRewriter {
  constructor() {
    this.handlers = {};
  }

  on(selector, handler) {
    this.handlers[selector] = handler;
    return this;
  }

  transform() {
    let injected = "";
    let title = "";
    let root = null;
    this.handlers.head?.element({
      append: (html) => { injected += html; },
    });
    this.handlers.title?.element({
      setInnerContent: (text) => { title = text; },
    });
    this.handlers["#root"]?.element({
      setInnerContent: (html) => { root = html; },
    });
    const out = { injected, title, root, headers: new Map(), status: 200 };
    out.body = out;
    return out;
  }
}

// Just enough of the Fetch API for the status / header / redirect paths.
class FakeHeaders extends Map {
  constructor(init) {
    super(init instanceof Map ? init : []);
  }
}

class FakeResponse {
  constructor(body, init = {}) {
    Object.assign(this, body, { status: init.status, headers: init.headers });
  }

  static redirect(location, status) {
    const r = new FakeResponse({}, { status, headers: new FakeHeaders() });
    r.location = location;
    return r;
  }
}

const HTML_RESPONSE = () => ({ headers: { get: () => "text/html; charset=utf-8" } });

// `rows` maps a PostgREST path fragment to the array that query returns.
// `fail: true` makes every Supabase read throw, like an outage.
const run = async (pathname, rows = {}, origin = "https://sankettambare.in", { fail = false, method } = {}) => {
  global.HTMLRewriter = FakeRewriter;
  global.Response = FakeResponse;
  global.Headers = FakeHeaders;
  global.fetch = jest.fn(async (url) => {
    if (fail) throw new Error("supabase is down");
    const match = Object.keys(rows).find((key) => decodeURIComponent(String(url)).includes(key));
    return { ok: true, json: async () => (match ? rows[match] : []) };
  });
  // Imported lazily so each case gets the stubs in place first.
  // eslint-disable-next-line global-require
  const { onRequest } = require("./_middleware");
  return onRequest({
    request: { url: `${origin}${pathname}`, method },
    next: async () => HTML_RESPONSE(),
    env: {
      VITE_SUPABASE_URL: "https://db.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "anon",
    },
  });
};

const tag = (html, property) => {
  const m = html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"[^>]*>`));
  return m ? m[1] : null;
};

const jsonLd = (html) => {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
};

afterEach(() => {
  global.HTMLRewriter = ORIGINAL.HTMLRewriter;
  global.fetch = ORIGINAL.fetch;
  global.Response = ORIGINAL.Response;
  global.Headers = ORIGINAL.Headers;
  jest.resetModules();
});

describe("fixed routes", () => {
  it("advertises the route's own committed card, sized", async () => {
    const { injected, title } = await run("/treks");
    expect(tag(injected, "og:image")).toBe("https://sankettambare.in/og/treks.png");
    expect(tag(injected, "og:image:width")).toBe("1200");
    expect(tag(injected, "og:image:height")).toBe("630");
    expect(tag(injected, "og:type")).toBe("website");
    expect(title).toBe("My Treks | Sanket Tambare");
  });

  // Regression: every fixed route once advertised /og/home.png.
  it("does not send every page to the home card", async () => {
    const seen = await Promise.all(
      ["/books", "/sports", "/stats", "/tags"].map(async (p) => tag((await run(p)).injected, "og:image")),
    );
    expect(seen).toEqual([
      "https://sankettambare.in/og/books.png",
      "https://sankettambare.in/og/sports.png",
      "https://sankettambare.in/og/stats.png",
      "https://sankettambare.in/og/tags.png",
    ]);
  });

  it("marks the identity routes as profiles", async () => {
    expect(tag((await run("/about")).injected, "og:type")).toBe("profile");
  });
});

describe("a detail route with a photo of its own", () => {
  it("unfurls as the photo, and does not claim it is 1200x630", async () => {
    const { injected } = await run("/treks/7", {
      "treks?id=eq.7": [{
        fort_name: "Ghangad",
        endurance_level: "Hard",
        trek_time: "3 Hrs",
        date: "17-02-2019",
        slide_images: [{ url: "/treks/ghangad.jpeg" }],
      }],
    });
    expect(tag(injected, "og:image"))
      .toBe("https://db.co/storage/v1/object/public/media/treks/ghangad.jpeg");
    // The photo is whatever shape it was shot in — asserting a size we do not
    // know is what makes every platform crop it wrong.
    expect(tag(injected, "og:image:width")).toBeNull();
    expect(tag(injected, "og:image:height")).toBeNull();
    expect(tag(injected, "og:type")).toBe("article");
    expect(tag(injected, "twitter:image"))
      .toBe("https://db.co/storage/v1/object/public/media/treks/ghangad.jpeg");
  });

  it("prefers a project's cover over its screenshots", async () => {
    const { injected } = await run("/projects/3", {
      "projects?id=eq.3": [{
        title: "E20",
        subtitle: "A data story",
        description: "d",
        image: "/projects/cover.jpeg",
        slide_images: [{ url: "/projects/shot.jpeg" }],
      }],
    });
    expect(tag(injected, "og:image"))
      .toBe("https://db.co/storage/v1/object/public/media/projects/cover.jpeg");
  });

  it("falls back to the screenshot when there is no cover", async () => {
    const { injected } = await run("/projects/3", {
      "projects?id=eq.3": [{
        title: "E20",
        subtitle: "s",
        description: "d",
        image: null,
        slide_images: [{ url: "/projects/shot.jpeg" }],
      }],
    });
    expect(tag(injected, "og:image"))
      .toBe("https://db.co/storage/v1/object/public/media/projects/shot.jpeg");
  });
});

describe("a detail route with no photo", () => {
  it("takes its section's card, sized", async () => {
    const { injected, title } = await run("/books/12", {
      "books?id=eq.12": [{ title: "Vyakti ani Valli", author: "P. L. Deshpande", description: "d" }],
    });
    expect(tag(injected, "og:image")).toBe("https://sankettambare.in/og/books.png");
    expect(tag(injected, "og:image:width")).toBe("1200");
    expect(title).toBe("Vyakti ani Valli by P. L. Deshpande | Sanket Tambare");
  });

  it("gives a photoless trek the treks card rather than nothing", async () => {
    const { injected } = await run("/treks/7", {
      "treks?id=eq.7": [{
        fort_name: "Ghangad",
        endurance_level: "Hard",
        trek_time: "3 Hrs",
        date: "17-02-2019",
        slide_images: [],
      }],
    });
    expect(tag(injected, "og:image")).toBe("https://sankettambare.in/og/treks.png");
  });

  it("gives a tag page the tags card and its own title", async () => {
    const { injected, title } = await run("/tags/%E0%A4%98%E0%A4%B0", {
      "tags?name=eq.": [{ name: "घर", display_name: "घर", description: null, category: "Mind & Life" }],
    });
    expect(tag(injected, "og:image")).toBe("https://sankettambare.in/og/tags.png");
    expect(title).toContain("घर");
  });
});

describe("a newsletter issue", () => {
  it("unfurls as its own pre-rendered card, sized, with the month's numbers", async () => {
    const card = "https://db.co/storage/v1/object/public/media/og/newsletter-2026-09.png";
    const { injected, title } = await run("/newsletter/2026-09", {
      "now_months?slug=eq.2026-09": [{
        slug: "2026-09",
        headline: "Rain, ridges and a PB",
        sections: { running: [{ event: "Pune Half", distance: "21" }] },
        card_url: card,
      }],
    });
    expect(tag(injected, "og:image")).toBe(card);
    // Our own card, so its 1200x630 is known and declared.
    expect(tag(injected, "og:image:width")).toBe("1200");
    expect(tag(injected, "og:description")).toContain("21 km raced");
    expect(title).toBe("Rain, ridges and a PB — September 2026 | Sanket Tambare");
  });

  it("falls back to the /newsletter card for an unknown or draft month", async () => {
    const { injected } = await run("/newsletter/2031-01");
    expect(tag(injected, "og:image")).toBe("https://sankettambare.in/og/newsletter.png");
  });
});

describe("when the row cannot be read", () => {
  it("degrades to the section's card and the section's copy, still a 200", async () => {
    const { injected, status } = await run("/books/999", {}, undefined, { fail: true });
    expect(tag(injected, "og:image")).toBe("https://sankettambare.in/og/books.png");
    // Asserted against PAGE_META rather than a literal: the invariant is that
    // an unreadable row inherits its parent page, not any particular wording.
    expect(tag(injected, "og:description")).toBe(PAGE_META["/books"].description);
    // An outage must never tell a search engine the page is gone.
    expect(status).toBe(200);
    expect(tag(injected, "robots")).toBeNull();
  });
});

describe("on a Pages preview deployment", () => {
  const PREVIEW = "https://claude-branch.daredavil.pages.dev";

  // The bug this pins: og:image was hard-coded to SITE_URL, so a preview
  // advertised production's card — a path that does not exist there until the
  // branch ships, and which the SPA answers with `200 text/html`. Scrapers
  // fetched an HTML page where an image should be and showed nothing, so a
  // preview could never be used to check its own cards.
  it("advertises the card on the origin actually serving the page", async () => {
    const { injected } = await run("/micro-blog", {}, PREVIEW);
    expect(tag(injected, "og:image")).toBe(`${PREVIEW}/og/micro-blog.png`);
    expect(tag(injected, "twitter:image")).toBe(`${PREVIEW}/og/micro-blog.png`);
  });

  // A preview must never claim to be the canonical home of a page.
  it("keeps canonical and og:url on the real site", async () => {
    const { injected } = await run("/micro-blog", {}, PREVIEW);
    expect(tag(injected, "og:url")).toBe("https://sankettambare.in/micro-blog");
    expect(injected).toContain('<link rel="canonical" href="https://sankettambare.in/micro-blog"');
  });

  it("leaves a row's own photo alone, since it is host-independent", async () => {
    const { injected } = await run("/treks/7", {
      "treks?id=eq.7": [{
        fort_name: "Ghangad",
        endurance_level: "Hard",
        trek_time: "3 Hrs",
        date: "17-02-2019",
        slide_images: [{ url: "/treks/ghangad.jpeg" }],
      }],
    }, PREVIEW);
    expect(tag(injected, "og:image"))
      .toBe("https://db.co/storage/v1/object/public/media/treks/ghangad.jpeg");
  });
});

describe("tags that belong to index.html", () => {
  // Both were emitted here once, which put two of each in every page's head.
  it("never emits og:site_name", async () => {
    const { injected } = await run("/books");
    expect(injected).not.toContain("og:site_name");
  });
});

describe("the page body crawlers read", () => {
  // GPTBot, ClaudeBot and PerplexityBot do not run JavaScript; without this,
  // every URL reached them as an empty <div id="root">.
  it("fills #root with the row as plain HTML", async () => {
    const { root } = await run("/books/12", {
      "books?id=eq.12": [{
        id: 12,
        title: "Vyakti ani Valli",
        author: "P. L. Deshpande",
        language: "Marathi",
        description: "Sketches of people.",
        year: 2024,
        rating: 5,
        tag_names: ["humour"],
      }],
    });
    expect(root).toContain("<h1>Vyakti ani Valli by P. L. Deshpande</h1>");
    expect(root).toContain("<p>Sketches of people.</p>");
    expect(root).toContain('<main lang="mr">');
    expect(root).toContain('href="/tags/humour"');
    expect(root).toContain('href="/books"');
  });

  it("lists a section's rows as real links", async () => {
    const { root } = await run("/treks", {
      "treks?select=": [{ id: 7, fort_name: "Ghangad", endurance_level: "Hard", date: "17-02-2019" }],
    });
    expect(root).toContain('<a href="/treks/7">Ghangad Trek</a>');
  });

  it("gives the home page the bio and the name as its heading", async () => {
    const { root, title } = await run("/");
    expect(root).toContain("<h1>Sanket Tambare</h1>");
    expect(root).toContain("Bridgenext");
    expect(title).toBe("Sanket Tambare — Software Engineer, Ultramarathoner & Writer");
  });

  it("escapes row text", async () => {
    const { root } = await run("/micro-blog/5", {
      "microblog?id=eq.5": [{ id: 5, title: "", text: "<img src=x onerror=alert(1)>", date: "2014-01-01" }],
    });
    expect(root).not.toContain("<img src=x");
    expect(root).toContain("&lt;img src=x");
  });

  it("leaves the admin dashboard alone", async () => {
    const { root } = await run("/admin/books");
    expect(root).toBeNull();
  });
});

describe("structured data", () => {
  it("names the same Person on every page", async () => {
    const graph = jsonLd((await run("/stats")).injected)["@graph"];
    const person = graph.find((n) => n["@type"] === "Person");
    expect(person["@id"]).toBe("https://sankettambare.in/#person");
    expect(person.worksFor.name).toBe("Bridgenext");
    expect(person.sameAs).toContain("https://github.com/daredavil01");
  });

  it("makes the home and about pages a ProfilePage about that Person", async () => {
    const graph = jsonLd((await run("/about")).injected)["@graph"];
    const page = graph.find((n) => n["@type"] === "ProfilePage");
    expect(page.mainEntity).toEqual({ "@id": "https://sankettambare.in/#person" });
  });

  it("describes a book as a Book reviewed by the Person", async () => {
    const graph = jsonLd((await run("/books/12", {
      "books?id=eq.12": [{ id: 12, title: "Sapiens", author: "Yuval Noah Harari", language: "English", description: "d", year: 2023, rating: 4 }],
    })).injected)["@graph"];
    const book = graph.find((n) => n["@type"] === "Book");
    expect(book.author.name).toBe("Yuval Noah Harari");
    expect(book.review.author).toEqual({ "@id": "https://sankettambare.in/#person" });
    expect(book.review.reviewRating.ratingValue).toBe(4);
    const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList");
    expect(crumbs.itemListElement.map((c) => c.item)).toEqual([
      "https://sankettambare.in",
      "https://sankettambare.in/books",
      "https://sankettambare.in/books/12",
    ]);
  });

  it("cannot be closed early by a row containing </script>", async () => {
    const { injected } = await run("/micro-blog/5", {
      "microblog?id=eq.5": [{ id: 5, title: "", text: "a </script><script>alert(1)</script>", date: "2014-01-01" }],
    });
    const body = injected.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    expect(body).not.toContain("</script>");
    expect(JSON.parse(body)["@graph"].find((n) => n["@type"] === "SocialMediaPosting").articleBody)
      .toContain("</script>");
  });

  it("marks head tags for Helmet to replace, so the rendered DOM has one of each", async () => {
    const { injected } = await run("/about");
    expect(injected).toMatch(/<link rel="canonical" href="[^"]+" data-rh="true">/);
    expect(injected).toMatch(/<meta name="description" content="[^"]+" data-rh="true">/);
  });
});

describe("status codes", () => {
  it("answers a path no route claims with a 404 and noindex", async () => {
    const res = await run("/this-does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(tag(res.injected, "robots")).toBe("noindex");
  });

  it("answers a row that does not exist with a 404", async () => {
    const res = await run("/books/99999");
    expect(res.status).toBe(404);
    // Still unfurls as the section rather than as nothing.
    expect(tag(res.injected, "og:image")).toBe("https://sankettambare.in/og/books.png");
  });

  it("answers a malformed id with a 404 without asking the database", async () => {
    const res = await run("/treks/not-a-number");
    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("answers an unknown or draft newsletter month with a 404", async () => {
    expect((await run("/newsletter/2031-01")).status).toBe(404);
  });

  it("serves a real page as a plain 200", async () => {
    const res = await run("/treks");
    expect(res.status).toBe(200);
    expect(tag(res.injected, "robots")).toBeNull();
  });
});

describe("noindex", () => {
  it("keeps the admin dashboard out of the index", async () => {
    const res = await run("/admin");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("keeps shared /ask conversations out of the index, but still unfurls them", async () => {
    const res = await run("/ask/s/abcdefgh12", {
      "rpc/get_ask_share": { title: "Which forts has Sanket climbed?", summary: "s" },
    });
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(res.title).toBe("Which forts has Sanket climbed? | Sanket Tambare");
  });

  it("noindexes a photo micro-post with no words, and indexes one with text", async () => {
    const photo = await run("/micro-blog/9", {
      "microblog?id=eq.9": [{ id: 9, title: "", text: "", date: "2015-03-01", post_type: "photo" }],
    });
    expect(tag(photo.injected, "robots")).toBe("noindex");
    const words = await run("/micro-blog/10", {
      "microblog?id=eq.10": [{ id: 10, title: "", text: "Rain on the fort.", date: "2015-03-01" }],
    });
    expect(tag(words.injected, "robots")).toBeNull();
  });
});

describe("one URL per page", () => {
  it("redirects a trailing slash, keeping the query", async () => {
    const res = await run("/about/?ref=x");
    expect(res.status).toBe(301);
    expect(res.location).toBe("https://sankettambare.in/about?ref=x");
  });

  it("redirects a mis-cased route to its real spelling", async () => {
    const res = await run("/About");
    expect(res.status).toBe(301);
    expect(res.location).toBe("https://sankettambare.in/about");
  });

  it("fixes the case of a route's fixed part but never of an ordinary parameter", async () => {
    const res = await run("/Ask/s/AbCdEfGh12");
    expect(res.location).toBe("https://sankettambare.in/ask/s/AbCdEfGh12");
  });

  it("lowercases a tag name, the way every internal tag link spells it", async () => {
    const res = await run("/Tags/Running");
    expect(res.location).toBe("https://sankettambare.in/tags/running");
  });

  it("leaves a Marathi tag alone — it has no case", async () => {
    const res = await run("/tags/%E0%A4%98%E0%A4%B0", {
      "tags?name=eq.": [{ name: "घर", display_name: "घर" }],
    });
    expect(res.status).toBe(200);
  });

  it("never redirects to another host from a protocol-relative path", async () => {
    const res = await run("//evil.example/");
    if (res.status === 301) expect(res.location.startsWith("https://sankettambare.in/")).toBe(true);
  });

  it("never redirects a POST", async () => {
    const res = await run("/about/", {}, undefined, { method: "POST" });
    expect(res.status).not.toBe(301);
  });
});

describe("dotted paths", () => {
  // Pages serves the SPA shell for a missing file; an agent probing a
  // discovery file must get a 404, not a 200 page that looks like it exists.
  it("404s a missing file that came back as the HTML shell", async () => {
    expect((await run("/.well-known/mcp.json")).status).toBe(404);
    expect((await run("/humans.txt")).status).toBe(404);
  });

  it("passes a real .html page through", async () => {
    expect((await run("/writing-ledger.html")).status).not.toBe(404);
  });
});

it("serves the static Writing Ledger untouched at its extensionless URL", async () => {
  expect((await run("/writing-ledger")).status).not.toBe(404);
});
