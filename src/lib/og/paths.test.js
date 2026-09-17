import fs from "fs";
import path from "path";

import {
  ogStaticUrl, isCardImage, cardUrlForOrigin, storageUrl, firstSlideImage, CARD_FALLBACKS,
} from "./paths.js";
import { PAGE_SLUGS } from "./model.js";

const SITE = "https://sankettambare.in";
const ROOT = path.resolve(__dirname, "..", "..", "..");

describe("ogStaticUrl", () => {
  it("builds the committed card path", () => {
    expect(ogStaticUrl("treks", SITE)).toBe(`${SITE}/og/treks.png`);
    expect(ogStaticUrl("treks")).toBe("/og/treks.png");
  });
});

describe("CARD_FALLBACKS", () => {
  // Every kind promises a file. A detail route whose section card was never
  // generated would unfurl as a 404 image, which no platform shows at all.
  it("names a generated card slug for every entity kind", () => {
    Object.entries(CARD_FALLBACKS).forEach(([kind, slug]) => {
      expect(PAGE_SLUGS).toContain(slug);
      const file = path.join(ROOT, "public", "og", `${slug}.png`);
      expect({ kind, exists: fs.existsSync(file) }).toEqual({ kind, exists: true });
    });
  });
});

describe("isCardImage", () => {
  // This is what decides whether og:image:width/height are DECLARED. Getting it
  // wrong in the false-positive direction tells every platform a portrait photo
  // is 1200x630 and makes them all crop it wrong.
  it("recognises our own cards", () => {
    expect(isCardImage(`${SITE}/og/treks.png`)).toBe(true);
    expect(isCardImage("/og/home.png")).toBe(true);
  });

  it("rejects a row's own photo", () => {
    expect(isCardImage("https://db.co/storage/v1/object/public/media/treks/a.jpg")).toBe(false);
    // A stored file could be called anything, including this.
    expect(isCardImage("https://db.co/storage/v1/object/public/media/og/a.jpg")).toBe(false);
    expect(isCardImage(`${SITE}/images/me.jpg`)).toBe(false);
    expect(isCardImage(null)).toBe(false);
    expect(isCardImage(undefined)).toBe(false);
  });
});

describe("cardUrlForOrigin", () => {
  const PREVIEW = "https://claude-branch.daredavil.pages.dev";

  it("moves a card onto the serving origin", () => {
    expect(cardUrlForOrigin(`${SITE}/og/books.png`, PREVIEW, SITE))
      .toBe(`${PREVIEW}/og/books.png`);
  });

  it("leaves a card alone on the real site", () => {
    expect(cardUrlForOrigin(`${SITE}/og/books.png`, SITE, SITE))
      .toBe(`${SITE}/og/books.png`);
  });

  // A row's photo lives on Supabase and is correct from any host; rewriting it
  // would point at a storage path that does not exist on the site.
  it("never touches anything that is not one of our cards", () => {
    const photo = "https://db.co/storage/v1/object/public/media/treks/a.jpeg";
    expect(cardUrlForOrigin(photo, PREVIEW, SITE)).toBe(photo);
    expect(cardUrlForOrigin(`${SITE}/images/me.jpg`, PREVIEW, SITE))
      .toBe(`${SITE}/images/me.jpg`);
  });

  it("is a no-op when the origin is unknown", () => {
    expect(cardUrlForOrigin(`${SITE}/og/books.png`, "", SITE)).toBe(`${SITE}/og/books.png`);
    expect(cardUrlForOrigin(`${SITE}/og/books.png`, undefined, SITE)).toBe(`${SITE}/og/books.png`);
  });
});

describe("every generated card is committed", () => {
  // `npm run og:fallbacks` writes exactly PAGE_SLUGS, and a missing file does
  // NOT 404: Cloudflare Pages answers an unknown path with the SPA shell, so a
  // card that was never generated unfurls as `200 text/html` and every platform
  // silently shows no image. routeManifest.test.js covers the slugs a route
  // names; this covers the rest (writing-ledger has no React route at all).
  it("has a PNG on disk for every slug the generator writes", () => {
    PAGE_SLUGS.forEach((slug) => {
      const file = path.join(ROOT, "public", "og", `${slug}.png`);
      expect({ slug, exists: fs.existsSync(file) }).toEqual({ slug, exists: true });
      expect(fs.statSync(file).size).toBeGreaterThan(5000);
    });
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

  // The detail pages call these with no supabaseUrl, because toStorageImages
  // has already absolutised a client row. That has to pass through untouched.
  it("passes a client row's absolute urls through with no base", () => {
    expect(firstSlideImage([{ url: "https://db.co/x/a.jpg" }])).toBe("https://db.co/x/a.jpg");
    expect(storageUrl("https://db.co/x/a.jpg")).toBe("https://db.co/x/a.jpg");
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
