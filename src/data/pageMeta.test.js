import {
  buildMicroblogMeta,
  buildTrekMeta,
  buildSportMeta,
  buildBookMeta,
  buildBlogMeta,
  buildProjectMeta,
  DEFAULT_IMAGE,
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

  it("uses the provided image, else the site default", () => {
    expect(buildMicroblogMeta({ text: "hi", date: "2024-01-02", image: "https://x/y.png" }).image)
      .toBe("https://x/y.png");
    expect(buildMicroblogMeta({ text: "hi", date: "2024-01-02" }).image).toBe(DEFAULT_IMAGE);
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

  it("defaults endurance to 'medium' and image to the site default", () => {
    const meta = buildTrekMeta({ fortName: "Tikona", trekTime: "2 Hrs", date: "01-01-2020" });
    expect(meta.description).toContain("A medium endurance trek");
    expect(meta.image).toBe(DEFAULT_IMAGE);
  });
});

describe("buildSportMeta", () => {
  it("prefers the post's own description", () => {
    const meta = buildSportMeta({ title: "TMM", description: "A great run.", image: "https://i/s.jpg" });
    expect(meta.title).toBe("TMM");
    expect(meta.description).toBe("A great run.");
    expect(meta.image).toBe("https://i/s.jpg");
  });

  it("falls back to a generated race summary and the default image", () => {
    const meta = buildSportMeta({ title: "NDA 10K", distance: "10K", place: "NDA, Pune", date: "Feb 22, 2026", time: "00:48:12" });
    expect(meta.description).toBe("Participated in the 10K race at NDA, Pune on Feb 22, 2026. Finishing time: 00:48:12.");
    expect(meta.image).toBe(DEFAULT_IMAGE);
  });
});

describe("buildBookMeta", () => {
  it("titles as '<title> by <author>' and prefers the description", () => {
    const meta = buildBookMeta({ title: "Atomic Habits", author: "James Clear", description: "On habits." });
    expect(meta.title).toBe("Atomic Habits by James Clear");
    expect(meta.description).toBe("On habits.");
    expect(meta.image).toBe(DEFAULT_IMAGE);
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

  it("uses the provided image, else the site default", () => {
    expect(buildProjectMeta({ title: "P", image: "https://i/p.png" }).image).toBe("https://i/p.png");
    expect(buildProjectMeta({ title: "P" }).image).toBe(DEFAULT_IMAGE);
  });
});
