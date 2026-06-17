import { toShareModel, hasImage, SITE_DOMAIN } from "./shareCardConfig";

describe("toShareModel", () => {
  it("maps a book to the normalized model", () => {
    const model = toShareModel("book", {
      id: 7,
      title: "Deep Work",
      author: "Cal Newport",
      category: "Productivity",
      language: "English",
      description: "Focus.",
      year: 2016,
      tags: ["Focus"],
    });
    expect(model.kind).toBe("book");
    expect(model.title).toBe("Deep Work");
    expect(model.subtitle).toBe("Cal Newport");
    expect(model.imageUrl).toBeNull();
    expect(model.footerUrl).toBe(`${SITE_DOMAIN}/books/7`);
    expect(model.metaRows.map((r) => r.label)).toEqual(["Productivity", "English", "2016"]);
  });

  it("appends the translator to a book subtitle", () => {
    const model = toShareModel("book", {
      id: 1, title: "T", author: "A", translator: "X",
    });
    expect(model.subtitle).toBe("A · tr. X");
  });

  it("drops the challenge tag from a blog regardless of case", () => {
    const model = toShareModel("blog", {
      id: 2,
      blog_title: "Day 1",
      blog_description: "d",
      blog_tags: ["100_Days_to_Offload", "100_days_to_offload", "Life"],
      blog_date: "2026-01-01",
      blog_platform: "Substack",
      language: "English",
    });
    expect(model.tags).toEqual(["Life"]);
  });

  it("uses the first slide image for instagram, sport, and trek", () => {
    const slideImages = [{ url: "/x.jpg" }, { url: "/y.jpg" }];
    expect(toShareModel("instagram", { id: 3, slideImages }).imageUrl).toBe("/x.jpg");
    expect(toShareModel("sport", { id: 4, slideImages }).imageUrl).toBe("/x.jpg");
    expect(toShareModel("trek", { id: 5, slideImages }).imageUrl).toBe("/x.jpg");
  });

  it("renders microblog quotes without a title", () => {
    const model = toShareModel("microblog", {
      id: 6, postType: "quote", text: "Be water", source: "tumblr", tags: [],
    });
    expect(model.title).toBe("");
    expect(model.quote).toBe(true);
    expect(model.body).toBe("Be water");
  });

  it("returns null for an unknown kind or a missing item", () => {
    expect(toShareModel("nope", { id: 1 })).toBeNull();
    expect(toShareModel("book", null)).toBeNull();
  });
});

describe("hasImage", () => {
  it("is true only when the model resolves an image", () => {
    expect(hasImage("instagram", { id: 1, slideImages: [{ url: "/a.jpg" }] })).toBe(true);
    expect(hasImage("book", { id: 1, title: "T" })).toBe(false);
  });
});
