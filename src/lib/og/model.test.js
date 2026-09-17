import { pageModel, PAGE_SLUGS, compact } from "./model.js";
import { STATS_FIXTURE } from "./fixtures.js";

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

  it("returns null for an unknown slug rather than an empty card", () => {
    expect(pageModel("not-a-page", STATS_FIXTURE)).toBeNull();
  });

  // The stats snapshot can be unreachable when the cards are generated. A card
  // must then omit the figure rather than assert a zero: "0 BOOKS" is a
  // confident lie, and it would be committed as one.
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
