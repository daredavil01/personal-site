import { ogModelFor, pageModel, PAGE_SLUGS, compact } from "./model.js";
import { ENTITY_FIXTURES, STATS_FIXTURE } from "./fixtures.js";
import { OG_CARDS } from "./registry.js";

describe("compact", () => {
  it("keeps a stat tile to three characters", () => {
    expect(compact(53)).toBe("53");
    expect(compact(1200)).toBe("1.2k");
    expect(compact(14300)).toBe("14k");
    expect(compact(0)).toBe("0");
    expect(compact(undefined)).toBe("0");
  });
});

describe("pageModel", () => {
  it("builds a model for every declared page slug", () => {
    PAGE_SLUGS.forEach((slug) => {
      const model = pageModel(slug, STATS_FIXTURE);
      expect(model).not.toBeNull();
      expect(model.kind).toBe("page");
      expect(model.title).toBeTruthy();
      expect(model.eyebrow).toBeTruthy();
      expect(model.accent).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("returns null for an unknown slug so the endpoint can 404", () => {
    expect(pageModel("not-a-page", STATS_FIXTURE)).toBeNull();
  });

  // /api/stats can be unreachable. A card must then omit the figure rather
  // than assert a zero — "0 BOOKS" is a confident lie, and it is also what the
  // committed fallback cards would have shipped.
  it("omits stats entirely when there is no payload", () => {
    PAGE_SLUGS.forEach((slug) => {
      const model = pageModel(slug, null);
      expect(model.stats || []).toEqual([]);
      expect(model.meta || []).toEqual([]);
    });
  });

  it("renders real figures when the payload is present", () => {
    const books = pageModel("books", STATS_FIXTURE);
    expect(books.stats).toEqual([
      { value: "118", label: "Read" },
      { value: "41", label: "Marathi" },
      { value: "23", label: "Reviewed" },
    ]);
  });

  it("shows six numbers on /stats and three elsewhere", () => {
    expect(pageModel("stats", STATS_FIXTURE).stats).toHaveLength(6);
    expect(pageModel("home", STATS_FIXTURE).stats).toHaveLength(3);
  });

  it("carries the portrait only on the identity cards", () => {
    const withPortrait = ["home", "about", "resume"];
    PAGE_SLUGS.forEach((slug) => {
      const model = pageModel(slug, STATS_FIXTURE, { siteUrl: "https://s.in" });
      if (withPortrait.includes(slug)) {
        expect(model.photo).toBe("https://s.in/images/me.jpg");
      } else {
        expect(model.photo).toBeFalsy();
      }
    });
  });
});

describe("entity models", () => {
  it("builds a model for every registered entity kind", () => {
    Object.keys(ENTITY_FIXTURES).forEach((kind) => {
      const model = ogModelFor(kind, ENTITY_FIXTURES[kind], { supabaseUrl: "https://db.co" });
      expect(model).not.toBeNull();
      expect(model.kind).toBe(kind);
      expect(model.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(model.path.startsWith("/")).toBe(true);
    });
  });

  it("covers every kind the registry declares", () => {
    const registryKinds = Object.keys(OG_CARDS).filter((k) => k !== "page");
    expect(Object.keys(ENTITY_FIXTURES).sort()).toEqual(registryKinds.sort());
  });

  it("returns null for an unknown kind or a missing row", () => {
    expect(ogModelFor("nope", {}, {})).toBeNull();
    expect(ogModelFor("book", null, {})).toBeNull();
  });

  it("drops the challenge tag from a 100-days card", () => {
    const model = ogModelFor("blog", ENTITY_FIXTURES.blog, {});
    expect(model.chips).not.toContain("100_days_to_offload");
    expect(model.chips).toContain("habits");
  });

  it("uses a tag's display name, not its lowercased lookup name", () => {
    const model = ogModelFor("tag", { ...ENTITY_FIXTURES.tag, name: "मराठी", display_name: "मराठी" }, {});
    expect(model.title).toBe("#मराठी");
    // `path` is footer display text, so it must be readable, not percent-encoded.
    expect(model.path).toBe("/tags/मराठी");
  });

  it("ranks a tag's per-type counts and caps them at three", () => {
    const model = ogModelFor("tag", ENTITY_FIXTURES.tag, {});
    expect(model.stats.map((s) => s.label)).toEqual(["book", "microblog", "blog"]);
    expect(model.footerNote).toBe("65 items");
  });

  it("resolves a relative photo path through storage", () => {
    const model = ogModelFor("trek", {
      ...ENTITY_FIXTURES.trek, slide_images: [{ url: "/treks/a.jpg" }],
    }, { supabaseUrl: "https://db.co" });
    expect(model.photo).toBe("https://db.co/storage/v1/object/public/media/treks/a.jpg");
  });

  it("leaves photo null when a row has none, so the layout degrades", () => {
    const model = ogModelFor("trek", ENTITY_FIXTURES.trek, { supabaseUrl: "https://db.co" });
    expect(model.photo).toBeNull();
  });

  it("gives a micro-blog post the same seeded art the pinboard draws", () => {
    const model = ogModelFor("microblog", ENTITY_FIXTURES.microblog, {});
    expect(model.art.shapes.length).toBeGreaterThan(0);
    const again = ogModelFor("microblog", ENTITY_FIXTURES.microblog, {});
    expect(again.art.shapes).toEqual(model.art.shapes);
  });

  it("marks a quote post so the layout can set it as a quote", () => {
    expect(ogModelFor("microblog", { ...ENTITY_FIXTURES.microblog, post_type: "quote" }, {}).quote).toBe(true);
    expect(ogModelFor("microblog", ENTITY_FIXTURES.microblog, {}).quote).toBe(false);
  });

  it("truncates a long body rather than letting it overflow the card", () => {
    const model = ogModelFor("microblog", { ...ENTITY_FIXTURES.microblog, text: "z".repeat(600) }, {});
    expect(model.body.length).toBeLessThanOrEqual(260);
    expect(model.body.endsWith("…")).toBe(true);
  });
});
