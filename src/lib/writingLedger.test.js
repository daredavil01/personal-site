import fs from "fs";
import path from "path";
import {
  busiestDay, currentMonthStreak, languageOf, ledgerModel, longestMonthStreak, longestSilence,
  milestones, monthSeries, normalisePosts, tagKey, topics, treemap, yearGrid,
} from "./writingLedger";

const P = (date, words, extra = {}) => ({ title: `Post ${date}`, date, words, ...extra });

describe("writingLedger", () => {
  const posts = normalisePosts([
    P("2024-03-02", 500, { tags: ["Data Privacy", "100_days_to_offload"] }),
    P("2024-01-10", 1000, { tags: ["data_privacy", "running"] }),
    P("2024-01-10", 200, { tags: ["running"] }),
    P("2024-06-30", 0),
    { title: "no date", words: 99 },
  ]);

  it("keeps dated posts only, oldest first", () => {
    expect(posts.map((p) => p.date)).toEqual(["2024-01-10", "2024-01-10", "2024-03-02", "2024-06-30"]);
  });

  it("merges tag spellings and drops the challenge container", () => {
    expect(tagKey("Data_Privacy")).toBe("data privacy");
    const t = topics(posts);
    expect(t.map((x) => x.key)).toEqual(["data privacy", "running"]);
    expect(t[0]).toMatchObject({ posts: 2, words: 1500 });
  });

  it("fills empty months and keeps a running total", () => {
    const s = monthSeries(posts, "2024-07");
    expect(s.map((m) => m.month)).toEqual(["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06", "2024-07"]);
    expect(s[1]).toMatchObject({ posts: 0, words: 0, cumulative: 1200 });
    expect(s[6].cumulative).toBe(1700);
    expect(longestMonthStreak(s)).toMatchObject({ length: 1 });
    expect(currentMonthStreak(s)).toBe(1);
  });

  it("finds milestones, silences and the busiest day", () => {
    expect(milestones(monthSeries(posts), 1000).map((m) => m.month)).toEqual(["2024-01"]);
    expect(longestSilence(posts).days).toBe(120);
    expect(busiestDay(posts).posts).toHaveLength(2);
  });

  it("detects Marathi from a Devanagari title", () => {
    expect(languageOf({ title: "भटकंती" })).toBe("Marathi");
    expect(languageOf({ title: "Hello" })).toBe("English");
    expect(languageOf({ title: "भटकंती", language: "English" })).toBe("English");
  });

  it("lays a treemap that fills its box", () => {
    const r = treemap([{ value: 6 }, { value: 3 }, { value: 1 }], 100, 50);
    const area = r.reduce((s, n) => s + n.w * n.h, 0);
    expect(area).toBeCloseTo(5000, 5);
    r.forEach((n) => {
      expect(n.x).toBeGreaterThanOrEqual(-1e-9);
      expect(n.x + n.w).toBeLessThanOrEqual(100 + 1e-9);
      expect(n.y + n.h).toBeLessThanOrEqual(50 + 1e-9);
    });
  });

  it("grids a year Monday-first", () => {
    const g = yearGrid("2024", posts);
    expect(g.cells).toHaveLength(366);
    expect(g.cells[0]).toMatchObject({ date: "2024-01-01", row: 0, col: 0 }); // a Monday
    expect(g.posts).toBe(4);
  });

  it("models the committed ledger", () => {
    const file = path.join(__dirname, "..", "..", "public", "data", "writing-ledger.json");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const m = ledgerModel(data, new Date("2026-11-04T00:00:00Z"));
    expect(m.words).toBe(data.posts.reduce((s, p) => s + (p.words || 0), 0));
    expect(m.posts).toHaveLength(data.posts.filter((p) => p.date).length);
    expect(m.series[m.series.length - 1].cumulative).toBe(m.words);
    expect(m.topics.length).toBeGreaterThan(5);
  });
});
