import { bareDistance, collectMonthRecords, isDuplicate } from "./nowAutofill";
import { parseChangelog, changelogHighlights, highlightLine } from "./changelogEntries";
import { serializeSections } from "../pages/admin/now/sectionSpecs";
import { todayIso, toIsoDate } from "./monthDigest";

describe("bareDistance", () => {
  it("strips the unit the Now card appends itself", () => {
    expect(bareDistance("21 Kms")).toBe("21");
    expect(bareDistance("42.2 Kms")).toBe("42.2");
    expect(bareDistance("")).toBe("");
    expect(bareDistance(undefined)).toBe("");
  });
});

describe("toIsoDate / todayIso", () => {
  it("uses local-time getters, not UTC", () => {
    // 23:30 IST on the 5th is still the 5th, though it is the 4th in UTC.
    expect(toIsoDate(new Date(2026, 4, 5, 23, 30))).toBe("2026-05-05");
  });

  it("todayIso matches the local calendar day", () => {
    const now = new Date();
    expect(todayIso()).toBe(toIsoDate(now));
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("collectMonthRecords", () => {
  const data = {
    blogs: [
      {
        blog_title: "May post", blog_date: "2026-05-04", blog_link: "https://x/1", blog_description: "d", blog_platform: "Substack",
      },
      { blog_title: "June post", blog_date: "2026-06-04", blog_link: "https://x/2" },
    ],
    sports: [
      {
        title: "May Half", date: "May 30, 2026", distance: "21 Kms", time: "2:20:00", place: "Pune",
      },
    ],
    treks: [
      {
        fort_name: "Sinhagad", date: "17-05-2026", trek_time: "2 Hrs", endurance_level: "Medium",
      },
    ],
    books: [],
  };

  it("buckets each source into its Now section for the given month", () => {
    const groups = collectMonthRecords(data, "2026-05", {});
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g]));

    expect(groups.map((g) => g.key).sort()).toEqual(["blogs", "sports", "treks"]);
    expect(byKey.blogs.section).toBe("blogs");
    expect(byKey.blogs.rows).toHaveLength(1);
    expect(byKey.blogs.rows[0].row).toMatchObject({ title: "May post", url: "https://x/1", platform: "Substack" });

    // Races land in `running` with an ISO date and a bare distance.
    expect(byKey.sports.section).toBe("running");
    expect(byKey.sports.rows[0].row).toMatchObject({
      event: "May Half", date: "2026-05-30", distance: "21", note: "Pune",
    });

    // Treks have no Now section, so they become events.
    expect(byKey.treks.section).toBe("events");
    expect(byKey.treks.rows[0].row).toMatchObject({
      name: "Sinhagad", date: "2026-05-17", description: "2 Hrs · Medium",
    });
  });

  it("drops records already present in the section", () => {
    const sections = { blogs: [{ title: "May post", url: "https://x/1" }] };
    const groups = collectMonthRecords(data, "2026-05", sections);
    expect(groups.map((g) => g.key)).not.toContain("blogs");
  });

  it("returns nothing for a month with no content", () => {
    expect(collectMonthRecords(data, "2026-01", {})).toEqual([]);
    expect(collectMonthRecords(data, null, {})).toEqual([]);
  });
});

describe("isDuplicate", () => {
  it("matches on url when both have one, else on title", () => {
    expect(isDuplicate([{ title: "A", url: "https://x" }], { title: "B", url: "https://x" }, "blogs")).toBe(true);
    expect(isDuplicate([{ title: "A" }], { title: "a" }, "blogs")).toBe(true);
    expect(isDuplicate([{ title: "A" }], { title: "B" }, "blogs")).toBe(false);
  });
});

describe("parseChangelog", () => {
  const md = `## [v2.1.0] — 2026-05-04

### Added

- **Month river strip** (\`src/components/MicroBlog/MonthRiver.js\`): One thin bar per month.
  Wrapped onto a second line.
- **Plain feature**: A short note.

### Fixed

- **Something broke** (\`a.js\`): It is fixed now.

---

## [v2.0.0] — 2026-04-30

### Added

- Prose bullet with no bold name at all.
`;

  const entries = parseChangelog(md);

  it("splits versions and derives a month key", () => {
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ version: "v2.1.0", date: "2026-05-04", monthKey: "2026-05" });
  });

  it("captures kind, name and wrapped body, dropping the path parenthetical", () => {
    expect(entries[0].changes).toHaveLength(3);
    expect(entries[0].changes[0]).toMatchObject({ kind: "Added", name: "Month river strip" });
    expect(entries[0].changes[0].body).toBe("One thin bar per month. Wrapped onto a second line.");
    expect(entries[0].changes[2].kind).toBe("Fixed");
  });

  it("tolerates bullets with no bold name", () => {
    expect(entries[1].changes[0]).toMatchObject({ name: "", body: "Prose bullet with no bold name at all." });
  });

  it("builds a name + first-sentence highlight line", () => {
    expect(highlightLine(entries[0].changes[0])).toBe("Month river strip — One thin bar per month.");
    expect(highlightLine(entries[1].changes[0])).toBe("Prose bullet with no bold name at all.");
  });

  it("lowercases a leading determiner but leaves proper nouns alone", () => {
    expect(highlightLine({ name: "Site dossier", body: "A complete reference. And more." }))
      .toBe("Site dossier — a complete reference.");
    expect(highlightLine({ name: "Six biomes", body: "Book Forest and Coast. And more." }))
      .toBe("Six biomes — Book Forest and Coast.");
  });

  it("cuts at a clause-breaking em dash and skips abbreviation dots", () => {
    expect(highlightLine({ name: "Expedition Trail", body: "The 100 Days challenge drawn as a journey — an illustrated SVG route." }))
      .toBe("Expedition Trail — the 100 Days challenge drawn as a journey");
    expect(highlightLine({ name: "Sizes", body: "A control sets the height, e.g. 280 px on Portrait. Then more." }))
      .toBe("Sizes — a control sets the height, e.g. 280 px on Portrait.");
  });

  it("filters highlights to one month", () => {
    const may = changelogHighlights(entries, "2026-05");
    expect(may).toHaveLength(3);
    expect(may.map((h) => h.kind)).toEqual(["Added", "Added", "Fixed"]);
    expect(changelogHighlights(entries, "2026-03")).toEqual([]);
    expect(changelogHighlights(entries, null)).toEqual([]);
  });
});

describe("serializeSections", () => {
  it("drops blank rows and empty sections so MonthSection hides the cards", () => {
    const out = serializeSections({
      blogs: [{ title: "Kept", url: "" }, { title: "  ", url: "https://x" }],
      running: [],
      website: ["  ", "A real update", ""],
      misc: [""],
    });
    expect(out).toEqual({ blogs: [{ title: "Kept" }], website: ["A real update"] });
  });

  it("omits stats entirely when nothing is filled in", () => {
    expect(serializeSections({ stats: { strava: { activities: "" }, custom: [] } })).toEqual({});
    // `approximate` alone is not a number to show.
    expect(serializeSections({ stats: { substack: { approximate: true } } })).toEqual({});
  });

  it("coerces stat numbers and keeps custom groups", () => {
    const out = serializeSections({
      stats: {
        strava: { activities: "43", km: "147", approximate: true },
        custom: [
          {
            label: "Reading",
            tiles: [{ label: "Books", value: "3", unit: "" }, { label: "Pages", value: "840", unit: "pp" }],
          },
          { label: "Empty", tiles: [{ label: "", value: "" }] },
        ],
      },
    });
    expect(out.stats.strava).toEqual({ activities: 43, km: 147, approximate: true });
    expect(out.stats.custom).toEqual([{
      label: "Reading",
      tiles: [{ label: "Books", value: 3 }, { label: "Pages", value: 840, unit: "pp" }],
    }]);
  });
});
