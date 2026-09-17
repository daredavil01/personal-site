import {
  ogCardUrl, ogStaticUrl, ogRenderUrl, ogMode, parseCardPath, storageUrl, firstSlideImage,
  CARD_FALLBACKS, OG_MODE_STATIC, OG_MODE_DYNAMIC,
} from "./paths.js";
import { OG_CARDS } from "./registry.js";

const SITE = "https://sankettambare.in";

describe("ogCardUrl", () => {
  it("points at the on-demand endpoint by default", () => {
    expect(ogCardUrl({ kind: "book", id: 12, fallbackSlug: "books", siteUrl: SITE }))
      .toBe(`${SITE}/api/og/book/12.png`);
  });

  // The kill-switch for the Workers Free 10ms CPU limit: one env var and every
  // og:image reverts to a committed file, with no rendering at all.
  it("reverts to the committed card when OG_MODE=static", () => {
    expect(ogCardUrl({
      kind: "book", id: 12, fallbackSlug: "books", siteUrl: SITE, mode: OG_MODE_STATIC,
    })).toBe(`${SITE}/og/books.png`);
  });

  it("falls back when there is no id, rather than building a broken url", () => {
    expect(ogCardUrl({ kind: "book", id: null, fallbackSlug: "books", siteUrl: SITE }))
      .toBe(`${SITE}/og/books.png`);
    expect(ogCardUrl({ kind: "book", id: "", fallbackSlug: "books", siteUrl: SITE }))
      .toBe(`${SITE}/og/books.png`);
  });

  it("encodes the id so a non-ASCII value cannot break the path", () => {
    expect(ogRenderUrl("tag", "मराठी", SITE)).toBe(`${SITE}/api/og/tag/%E0%A4%AE%E0%A4%B0%E0%A4%BE%E0%A4%A0%E0%A5%80.png`);
  });
});

describe("ogMode", () => {
  it("only accepts the exact static value, defaulting to dynamic", () => {
    expect(ogMode({ OG_MODE: "static" })).toBe(OG_MODE_STATIC);
    expect(ogMode({ OG_MODE: "dynamic" })).toBe(OG_MODE_DYNAMIC);
    expect(ogMode({ OG_MODE: "" })).toBe(OG_MODE_DYNAMIC);
    expect(ogMode({})).toBe(OG_MODE_DYNAMIC);
    expect(ogMode(undefined)).toBe(OG_MODE_DYNAMIC);
  });
});

describe("parseCardPath", () => {
  it("splits <kind>/<id>.png", () => {
    expect(parseCardPath("book/12.png")).toEqual({ kind: "book", id: "12" });
    expect(parseCardPath("/page/books.png")).toEqual({ kind: "page", id: "books" });
    expect(parseCardPath("ask-share/a1b2c3d4.png")).toEqual({ kind: "ask-share", id: "a1b2c3d4" });
  });

  it("decodes a percent-encoded id", () => {
    expect(parseCardPath("tag/%E0%A4%98%E0%A4%B0.png")).toEqual({ kind: "tag", id: "घर" });
  });

  // The endpoint 404s on anything it cannot parse rather than guessing, so
  // these must come back null.
  it("rejects anything that is not exactly one kind and one id", () => {
    expect(parseCardPath("book/12")).toBeNull();
    expect(parseCardPath("book.png")).toBeNull();
    expect(parseCardPath("a/b/c.png")).toBeNull();
    expect(parseCardPath("")).toBeNull();
    expect(parseCardPath(null)).toBeNull();
  });

  it("does not let a traversal attempt through", () => {
    expect(parseCardPath("book/%2F..%2Fetc.png")).toBeNull();
  });
});

describe("CARD_FALLBACKS", () => {
  // It is duplicated from the registry so functions/_middleware.js need not
  // import the layout tree on every html request. This is the check that keeps
  // the copy honest.
  it("agrees with every registry fallbackSlug", () => {
    Object.entries(OG_CARDS).forEach(([kind, spec]) => {
      expect(CARD_FALLBACKS[kind]).toBe(spec.fallbackSlug);
    });
  });

  it("covers every registered kind", () => {
    expect(Object.keys(CARD_FALLBACKS).sort()).toEqual(Object.keys(OG_CARDS).sort());
  });
});

describe("storage urls", () => {
  it("prefixes a relative path and passes an absolute one through", () => {
    expect(storageUrl("/treks/a.jpg", "https://db.co"))
      .toBe("https://db.co/storage/v1/object/public/media/treks/a.jpg");
    expect(storageUrl("treks/a.jpg", "https://db.co"))
      .toBe("https://db.co/storage/v1/object/public/media/treks/a.jpg");
    expect(storageUrl("https://cdn.io/a.jpg", "https://db.co")).toBe("https://cdn.io/a.jpg");
    expect(storageUrl(null, "https://db.co")).toBeNull();
  });

  it("reads both slide_images shapes", () => {
    expect(firstSlideImage([{ url: "/a.jpg" }], "https://db.co"))
      .toBe("https://db.co/storage/v1/object/public/media/a.jpg");
    expect(firstSlideImage(["/b.jpg"], "https://db.co"))
      .toBe("https://db.co/storage/v1/object/public/media/b.jpg");
    expect(firstSlideImage([null, { url: "/c.jpg" }], "https://db.co"))
      .toBe("https://db.co/storage/v1/object/public/media/c.jpg");
    expect(firstSlideImage([], "https://db.co")).toBeNull();
    expect(firstSlideImage(null, "https://db.co")).toBeNull();
  });
});

describe("ogStaticUrl", () => {
  it("builds the committed card path", () => {
    expect(ogStaticUrl("treks", SITE)).toBe(`${SITE}/og/treks.png`);
    expect(ogStaticUrl("treks")).toBe("/og/treks.png");
  });
});

describe("page cards fall back to themselves", () => {
  // Regression: the middleware passed CARD_FALLBACKS.page ("home") as the
  // fallback for every fixed route, so under OG_MODE=static /treks advertised
  // /og/home.png instead of /og/treks.png. A page's fallback is its own card.
  it("uses the page's own slug, not the generic home card", () => {
    expect(ogCardUrl({
      kind: "page", id: "treks", fallbackSlug: "treks", siteUrl: SITE, mode: OG_MODE_STATIC,
    })).toBe(`${SITE}/og/treks.png`);
  });

  it("still routes to the endpoint in dynamic mode", () => {
    expect(ogCardUrl({ kind: "page", id: "treks", fallbackSlug: "treks", siteUrl: SITE }))
      .toBe(`${SITE}/api/og/page/treks.png`);
  });
});
