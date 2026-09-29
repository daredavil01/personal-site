import {
  issueModel, issueStats, issueDays, issueRefs, issueQuestions, issueToHtml, monthGrid, noteToHtml, slugLabel,
} from "./newsletterIssue";

const row = {
  id: 12,
  slug: "2026-09",
  headline: "Rain, ridges and a PB",
  note: "Dear reader,\n\nIt rained **every** weekend. [Read more](https://x.test/a?b=1&c=2)",
  poll: { q: "Which fort next?", options: ["Rajgad", "Torna"] },
  publishedAt: "2026-10-01T00:00:00Z",
  sections: {
    running: [{ event: "Pune Half", date: "2026-09-14", distance: "21", ref: { type: "sport", id: 5 } }],
    events: [
      { name: "Rajgad", date: "2026-09-06", ref: { type: "trek", id: 9 } },
      { name: "Office offsite", date: "2026-09-20" },
    ],
    books: [{ title: "Kosla", author: "Nemade", ref: { type: "book", id: 3 } }],
    micro: [
      { text: "A long thought ".repeat(20), date: "2026-09-06", ref: { type: "microblog", id: 70 } },
      { text: "Short one.", date: "2026-09-07", ref: { type: "microblog", id: 71 } },
    ],
    misc: ["<b>escaped</b>"],
    stats: { strava: { km: 120 } },
  },
};

describe("issueModel", () => {
  it("orders sections for reading and skips empty ones", () => {
    const m = issueModel(row);
    expect(m.sections.map((s) => s.key)).toEqual(["running", "events", "books", "micro", "misc"]);
    expect(m.label).toBe("September 2026");
    expect(m.isDraft).toBe(false);
    expect(m.poll.options).toHaveLength(2);
    expect(m.quote.text).toBe("Short one.");
    expect(m.extraStats).toEqual({ strava: { km: 120 } });
  });

  it("marks a row with no publish date as a draft and names it anyway", () => {
    const m = issueModel({ ...row, publishedAt: null, headline: "" });
    expect(m.isDraft).toBe(true);
    expect(m.headline).toBe("September 2026, in one letter");
  });

  it("drops a poll with no options", () => {
    expect(issueModel({ ...row, poll: { q: "Q?", options: [] } }).poll).toBeNull();
  });
});

describe("issueStats", () => {
  it("returns at most three numbers and omits zeroes", () => {
    expect(issueStats(row.sections)).toEqual([
      { value: "21", label: "km raced" },
      { value: "1", label: "trek" },
      { value: "1", label: "book" },
    ]);
    expect(issueStats({ misc: ["x"] })).toEqual([]);
  });

  it("counts races when no distance was recorded", () => {
    expect(issueStats({ running: [{ event: "A" }, { event: "B" }] })[0]).toEqual({ value: "2", label: "races" });
  });

  it("counts only events that came from a trek", () => {
    expect(issueStats({ events: [{ name: "Offsite" }] })).toEqual([]);
  });
});

describe("issueDays / monthGrid", () => {
  it("maps days of this month to the sections active on them", () => {
    const days = issueDays("2026-09", row.sections);
    expect(days[6].sort()).toEqual(["events", "micro"]);
    expect(days[14]).toEqual(["running"]);
    expect(issueDays("2026-08", row.sections)).toEqual({});
  });

  it("knows the shape of the month", () => {
    expect(monthGrid("2026-09")).toEqual({ daysInMonth: 30, firstWeekday: 2 });
    expect(monthGrid("2024-02").daysInMonth).toBe(29);
  });
});

describe("issueRefs / issueQuestions", () => {
  it("lists archive refs races-first, deduped and capped", () => {
    expect(issueRefs(row.sections)).toEqual([
      { type: "sport", id: 5 }, { type: "trek", id: 9 }, { type: "book", id: 3 },
      { type: "microblog", id: 70 }, { type: "microblog", id: 71 },
    ]);
    expect(issueRefs(row.sections, 2)).toHaveLength(2);
  });

  it("asks only about things the issue contains", () => {
    expect(issueQuestions(row)).toEqual([
      "How did the Pune Half go?",
      "Tell me about the Rajgad trek.",
      "Which books did Sanket read in September 2026?",
    ]);
    expect(issueQuestions({ slug: "2026-01", sections: {} })).toEqual(["What happened in January 2026?"]);
  });
});

describe("Substack HTML", () => {
  it("escapes content and keeps only http links", () => {
    const html = issueToHtml(row, "https://site.test");
    expect(html).toContain("<h1>Rain, ridges and a PB</h1>");
    expect(html).toContain("&lt;b&gt;escaped&lt;/b&gt;");
    expect(html).not.toContain("<b>escaped</b>");
    expect(html).toContain('href="https://site.test/newsletter/2026-09"');
    expect(html).toContain("21 km raced");
  });

  it("renders the note's paragraphs, bold and links", () => {
    expect(noteToHtml(row.note)).toBe(
      '<p>Dear reader,</p>\n<p>It rained <strong>every</strong> weekend. <a href="https://x.test/a?b=1&amp;c=2">Read more</a></p>',
    );
    expect(noteToHtml("[x](javascript:alert(1))")).toBe("<p>[x](javascript:alert(1))</p>");
  });

  it("labels slugs", () => {
    expect(slugLabel("2026-12")).toBe("December 2026");
    expect(slugLabel("")).toBe("");
  });
});
