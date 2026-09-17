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
};

// Captures what HeadInjector appends, which is the whole output of this module.
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
    this.handlers.head?.element({
      append: (html) => { injected += html; },
    });
    this.handlers.title?.element({
      setInnerContent: (text) => { title = text; },
    });
    return { injected, title };
  }
}

const HTML_RESPONSE = () => ({ headers: { get: () => "text/html; charset=utf-8" } });

// `rows` maps a PostgREST path fragment to the array that query returns.
const run = async (pathname, rows = {}) => {
  global.HTMLRewriter = FakeRewriter;
  global.fetch = jest.fn(async (url) => {
    const match = Object.keys(rows).find((key) => String(url).includes(key));
    return { ok: true, json: async () => (match ? rows[match] : []) };
  });
  // Imported lazily so each case gets the stubs in place first.
  // eslint-disable-next-line global-require
  const { onRequest } = require("./_middleware");
  return onRequest({
    request: { url: `https://sankettambare.in${pathname}` },
    next: async () => HTML_RESPONSE(),
    env: {
      VITE_SUPABASE_URL: "https://db.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "anon",
    },
  });
};

const tag = (html, property) => {
  const m = html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)">`));
  return m ? m[1] : null;
};

afterEach(() => {
  global.HTMLRewriter = ORIGINAL.HTMLRewriter;
  global.fetch = ORIGINAL.fetch;
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

describe("when the row cannot be read", () => {
  it("degrades to the section's card and the section's copy", async () => {
    const { injected } = await run("/books/999");
    expect(tag(injected, "og:image")).toBe("https://sankettambare.in/og/books.png");
    // Asserted against PAGE_META rather than a literal: the invariant is that
    // an unreadable row inherits its parent page, not any particular wording.
    expect(tag(injected, "og:description")).toBe(PAGE_META["/books"].description);
  });
});

describe("tags that belong to index.html", () => {
  // Both were emitted here once, which put two of each in every page's head.
  it("never emits og:site_name", async () => {
    const { injected } = await run("/books");
    expect(injected).not.toContain("og:site_name");
  });
});
