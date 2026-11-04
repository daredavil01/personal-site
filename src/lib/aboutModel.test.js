import fs from "fs";
import path from "path";
import {
  parseAbout, splitSections, parsePrinciple, principlesWithEvidence, buildTimeline,
  timelineByYear, tierReport, wordCount, ABOUT_SECTIONS,
  parseUpdateLine, parseUpdates, addUpdate, removeUpdate, setSection, getSection, buildUpdates,
  hobbiesWithEvidence,
} from "./aboutModel";

const MD = fs.readFileSync(path.join(__dirname, "..", "data", "about.md"), "utf8");

describe("the committed about.md", () => {
  const model = parseAbout(MD);
  it("carries every section the page reads", () => {
    const keys = splitSections(MD).map((s) => s.key);
    ABOUT_SECTIONS.forEach((s) => expect(keys).toContain(s.key));
  });
  it("fits each reading tier in its time budget", () => {
    tierReport(model).forEach((r) => expect(r).toEqual(expect.objectContaining({ ok: true })));
  });
  it("gives every principle an evidence pattern that compiles", () => {
    expect(model.principles.length).toBeGreaterThan(0);
    model.principles.forEach((p) => {
      expect(p.pattern).toBeTruthy();
      expect(() => new RegExp(p.pattern, "i")).not.toThrow();
    });
  });
  it("has chapters and links", () => {
    expect(model.chapters.length).toBeGreaterThanOrEqual(3);
    model.podcasts.forEach((p) => expect(p.url).toMatch(/^https?:\/\//));
  });
});

it("parses a principle line", () => {
  expect(parsePrinciple("**Ship fast.** Then iterate. [evidence: days|week]")).toEqual({
    title: "Ship fast", body: "Then iterate.", pattern: "days|week",
  });
});

it("counts words in Marathi too", () => {
  expect(wordCount("मी पुण्यात राहतो and run")).toBe(5);
});

it("matches principles to visible projects only", () => {
  const out = principlesWithEvidence([{ title: "a", pattern: "marathi" }], [
    { id: 1, title: "One", highlights: ["Marathi and English"], visible: true },
    { id: 2, title: "Two", highlights: ["Marathi"], visible: false },
  ]);
  expect(out[0].count).toBe(1);
  expect(out[0].projects).toEqual([{ id: 1, title: "One" }]);
});

it("builds a timeline of firsts", () => {
  const events = buildTimeline({
    degrees: [{ degree: "B.Tech", school: "RIT", year: 2021 }],
    positions: [{ company: "Emtec", position: "Software Engineer", daterange: "January 2021 - February 2024" }],
    sports: [
      { id: 2, title: "Big", distance: "50 Kms", date: "March 1, 2025" },
      { id: 1, title: "Small", distance: "10 Kms", date: "January 5, 2022" },
      { id: 3, title: "Full", distance: "42 Kms", date: "January 18, 2026" },
    ],
    treks: [{ id: 9, fort_name: "Rajgad", endurance_level: "Hard", date: "17-02-2019" }],
    projects: [{ id: 5, title: "P", featured: true, date: "2026-10-01" }, { id: 6, title: "Q", date: "2026-10-01" }],
  });
  expect(events.map((e) => e.title)).toEqual([
    "First fort", "First hard trek", "Software Engineer, Emtec", "B.Tech", "First race", "First ultra", "First full marathon", "P",
  ]);
  expect(timelineByYear(events).map((r) => r.year)).toEqual([2019, 2021, 2022, 2025, 2026]);
});

describe("updates", () => {
  it("parses a note line", () => {
    expect(parseUpdateLine("2026-10-30 — Passed it. #career (https://x.y/z)")).toEqual({
      date: "2026-10-30", text: "Passed it.", kind: "career", url: "https://x.y/z", source: "note",
    });
    expect(parseUpdateLine("no date here")).toBeNull();
  });
  it("adds and removes lines without touching other sections", () => {
    const md = "# 10 seconds\n\nHi.\n\n# Facts\n\n- one\n";
    const once = addUpdate(md, { date: "2026-11-01", text: "First" });
    expect(splitSections(once).map((s) => s.key)).toEqual(["10-seconds", "updates", "facts"]);
    const twice = addUpdate(once, { date: "2026-11-02", text: "Second", career: true });
    expect(parseUpdates(twice).map((u) => u.text)).toEqual(["Second", "First"]);
    expect(parseUpdates(twice)[0].kind).toBe("career");
    const { md: less, removed } = removeUpdate(twice, "first");
    expect(removed).toBe(1);
    expect(parseUpdates(less).map((u) => u.text)).toEqual(["Second"]);
    expect(getSection(less, "Facts")).toBe("- one");
    expect(() => addUpdate(md, { date: "Nov 1", text: "x" })).toThrow();
  });
  it("replaces a section body", () => {
    const md = "# A\n\nold\n\n# B\n\nkeep\n";
    expect(setSection(md, "A", "new")).toBe("# A\n\nnew\n\n# B\n\nkeep\n");
    expect(setSection(md, "C", "added")).toBe("# A\n\nold\n\n# B\n\nkeep\n\n# C\n\nadded\n");
  });
  it("merges notes with what the tables say, newest first", () => {
    const out = buildUpdates({
      notes: [{ date: "2026-10-30", text: "Note", kind: "life", source: "note" }],
      certifications: [{ name: "Cert", issuedDate: "30-10-2026" }, { name: "Yearless", issuedDate: "2024" }],
      projects: [{ id: 1, title: "P", date: "2026-11-02" }, { id: 2, title: "Hidden", date: "2026-11-03", visible: false }],
      sports: [{ id: 3, title: "Race", date: "January 18, 2026", distance: "42 Kms" }],
    });
    expect(out.map((u) => u.text)).toEqual(["Shipped P", "Note", "Certified: Cert", "Ran Race"]);
    expect(buildUpdates({ notes: [{ date: "2026-01-01", text: "n", kind: "life", source: "note" }], sports: [{ id: 1, title: "R", date: "May 1, 2026" }] }, { career: true })).toEqual([]);
  });
});

it("caps a kind in the log", () => {
  const projects = [1, 2, 3].map((i) => ({ id: i, title: `P${i}`, date: `2026-10-0${i}` }));
  const out = buildUpdates({ projects, certifications: [{ name: "C", issuedDate: "Sep 2026" }] }, { perKind: { build: 1 } });
  expect(out.map((u) => u.text)).toEqual(["Shipped P3", "Certified: C"]);
});

it("gives each hobby the site's evidence for it, and never a zero", () => {
  expect(hobbiesWithEvidence(["Reading", "Writing", "Vibe coding", "Chess"], {
    booksCount: 52, offloadCount: 0, projectCount: 25,
  })).toEqual([
    {
      name: "Reading", count: 52, unit: "books", detail: "in English and Marathi", to: "/books",
    },
    { name: "Writing" },
    {
      name: "Vibe coding", count: 25, unit: "projects", detail: "shipped", to: "/projects",
    },
    { name: "Chess" },
  ]);
  expect(parseAbout(MD).hobbies).toEqual(["Reading", "Writing", "Vibe coding"]);
});
