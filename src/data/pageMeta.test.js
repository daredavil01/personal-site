import * as pageMetaModule from "./pageMeta";
import {
  buildMicroblogMeta,
  buildTrekMeta,
  buildSportMeta,
  buildBookMeta,
  buildBlogMeta,
  buildProjectMeta,
  SITE_URL,
} from "./pageMeta";

describe("buildMicroblogMeta", () => {
  it("derives a content title and description from the post text", () => {
    const meta = buildMicroblogMeta({ text: "A short thought worth sharing.", date: "2024-01-02" });
    expect(meta.title).toBe("A short thought worth sharing.");
    expect(meta.description).toBe("A short thought worth sharing.");
  });

  it("falls back to the title field when text is empty", () => {
    const meta = buildMicroblogMeta({ title: "Just a title", text: "", date: "2024-01-02" });
    expect(meta.title).toBe("Just a title");
  });

  it("collapses whitespace/newlines before deriving meta", () => {
    const meta = buildMicroblogMeta({ text: "line one\n\n  line two", date: "2024-01-02" });
    expect(meta.title).toBe("line one line two");
  });

  it("truncates the title at 70 chars with an ellipsis", () => {
    const long = "x".repeat(120);
    const meta = buildMicroblogMeta({ text: long, date: "2024-01-02" });
    expect(meta.title).toBe(`${"x".repeat(67)}…`);
    expect(meta.title).toHaveLength(68);
  });

  it("truncates the description at 160 chars with an ellipsis", () => {
    const long = "y".repeat(300);
    const meta = buildMicroblogMeta({ text: long, date: "2024-01-02" });
    expect(meta.description).toBe(`${"y".repeat(157)}…`);
  });

  it("falls back to a dated title and generic description for an empty (photo) post", () => {
    const meta = buildMicroblogMeta({ title: "", text: "", date: "2024-03-15" });
    expect(meta.title).toBe("Post · 2024-03-15");
    expect(meta.description).toBe("A micro-blog post.");
  });

  it("uses the provided card, else the section card", () => {
    expect(buildMicroblogMeta({ text: "hi", date: "2024-01-02", image: "https://x/y.png" }).image)
      .toBe("https://x/y.png");
    expect(buildMicroblogMeta({ text: "hi", date: "2024-01-02" }).image).toBe(`${SITE_URL}/og/micro-blog.png`);
  });
});

describe("buildTrekMeta", () => {
  it("builds a trek title/description and lowercases the endurance level", () => {
    const meta = buildTrekMeta({
      fortName: "Torna", enduranceLevel: "Hard", trekTime: "6 Hrs", date: "17-02-2019", image: "https://i/t.jpg",
    });
    expect(meta.title).toBe("Torna Trek");
    expect(meta.description).toBe("A hard endurance trek to Torna fort on 17-02-2019. Trek duration: 6 Hrs.");
    expect(meta.image).toBe("https://i/t.jpg");
  });

  it("defaults endurance to 'medium' and image to the section card", () => {
    const meta = buildTrekMeta({ fortName: "Tikona", trekTime: "2 Hrs", date: "01-01-2020" });
    expect(meta.description).toContain("A medium endurance trek");
    expect(meta.image).toBe(`${SITE_URL}/og/treks.png`);
  });
});

describe("buildSportMeta", () => {
  it("prefers the post's own description", () => {
    const meta = buildSportMeta({ title: "TMM", description: "A great run.", image: "https://i/s.jpg" });
    expect(meta.title).toBe("TMM");
    expect(meta.description).toBe("A great run.");
    expect(meta.image).toBe("https://i/s.jpg");
  });

  it("falls back to a generated race summary and the section card", () => {
    const meta = buildSportMeta({ title: "NDA 10K", distance: "10K", place: "NDA, Pune", date: "Feb 22, 2026", time: "00:48:12" });
    expect(meta.description).toBe("Participated in the 10K race at NDA, Pune on Feb 22, 2026. Finishing time: 00:48:12.");
    expect(meta.image).toBe(`${SITE_URL}/og/sports.png`);
  });
});

describe("buildBookMeta", () => {
  it("titles as '<title> by <author>' and prefers the description", () => {
    const meta = buildBookMeta({ title: "Atomic Habits", author: "James Clear", description: "On habits." });
    expect(meta.title).toBe("Atomic Habits by James Clear");
    expect(meta.description).toBe("On habits.");
    expect(meta.image).toBe(`${SITE_URL}/og/books.png`);
  });

  it("falls back to a library blurb when no description", () => {
    const meta = buildBookMeta({ title: "Sapiens", author: "Yuval Noah Harari" });
    expect(meta.description).toContain("Read Sapiens by Yuval Noah Harari");
  });
});

describe("buildBlogMeta", () => {
  it("uses the blog title and description", () => {
    const meta = buildBlogMeta({ title: "Day 3", description: "Some thoughts." });
    expect(meta.title).toBe("Day 3");
    expect(meta.description).toBe("Some thoughts.");
  });

  it("falls back to a challenge blurb", () => {
    const meta = buildBlogMeta({ title: "Day 4" });
    expect(meta.description).toBe("A blog post from the 100 Days to Offload challenge: Day 4.");
  });
});

describe("buildProjectMeta", () => {
  it("prefers description, then subtitle, then a generic blurb", () => {
    expect(buildProjectMeta({ title: "P", description: "D", subtitle: "S" }).description).toBe("D");
    expect(buildProjectMeta({ title: "P", subtitle: "S" }).description).toBe("S");
    expect(buildProjectMeta({ title: "P" }).description).toBe("Detailed view of the project: P.");
  });

  it("uses the provided card, else the section card", () => {
    expect(buildProjectMeta({ title: "P", image: "https://i/p.png" }).image).toBe("https://i/p.png");
    expect(buildProjectMeta({ title: "P" }).image).toBe(`${SITE_URL}/og/projects.png`);
  });
});

describe("share-card metadata contract", () => {
  const BUILDERS = [
    ["buildMicroblogMeta", { text: "a post", date: "2024-01-02" }, "article"],
    ["buildTrekMeta", { fortName: "Rajgad", trekTime: "4 Hrs", date: "01-01-2020" }, "article"],
    ["buildSportMeta", { title: "TMM", distance: "42 Kms", place: "Mumbai", date: "x", time: "4:00" }, "article"],
    ["buildBookMeta", { title: "B", author: "A" }, "article"],
    ["buildBlogMeta", { title: "Post" }, "article"],
    ["buildProjectMeta", { title: "P" }, "article"],
    ["buildShareMeta", { title: "Q?" }, "article"],
    ["buildPresentationMeta", { title: "Deck" }, "article"],
    ["buildTagMeta", { name: "मराठी", displayName: "मराठी" }, "website"],
  ];

  it.each(BUILDERS)("%s returns a complete meta object", (name, input, type) => {
    const meta = pageMetaModule[name](input);
    expect(meta.title).toBeTruthy();
    expect(meta.description).toBeTruthy();
    expect(meta.image).toMatch(/^https:\/\/[^/]+\/og\/[a-z0-9-]+\.png$/);
    expect(meta.imageAlt).toBeTruthy();
    // og:type was hardcoded "website" for every route before this change.
    expect(meta.type).toBe(type);
  });

  it("gives buildShareMeta a real image (it had no image param at all)", () => {
    expect(pageMetaModule.buildShareMeta({ title: "Q" }).image).toBe(`${SITE_URL}/og/ask-share.png`);
    expect(pageMetaModule.buildShareMeta({ title: "Q", image: "https://x/y.png" }).image).toBe("https://x/y.png");
  });

  it("keeps a Marathi tag name unslugified and uses its display name", () => {
    const meta = pageMetaModule.buildTagMeta({ name: "मराठी", displayName: "मराठी" });
    expect(meta.title).toBe("#मराठी");
    expect(meta.imageAlt).toContain("मराठी");
  });

  it("declares 1200x630, the ratio every platform crops to", () => {
    expect(pageMetaModule.OG_IMAGE).toEqual({ width: 1200, height: 630 });
  });

  it("gives every PAGE_META entry an image, alt, slug and type", () => {
    Object.entries(pageMetaModule.PAGE_META).forEach(([route, meta]) => {
      expect(meta.image).toMatch(/\/og\/[a-z0-9-]+\.png$/);
      expect(meta.imageAlt).toBeTruthy();
      expect(meta.ogSlug).toBeTruthy();
      expect(["website", "profile", "article"]).toContain(meta.type);
      expect(route.startsWith("/")).toBe(true);
    });
  });
});
