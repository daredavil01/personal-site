import fs from "fs";
import path from "path";
import {
  DAILY_COUNT, buildInsights, cleanPost, dailyPicks, hashtagsOf, languageOf, monthSeries,
  parsePost, runsOf, scopeOf, serialOf, signedTime, storyLines, summarise, yearTable,
} from "./microblogInsights";

describe("signedTime", () => {
  it("reads the signature in either script and any of its spellings", () => {
    expect(signedTime("Some words #25:09:2021::11:37:pm")).toEqual({ hour: 23, minute: 37 });
    expect(signedTime("काही #४:२:२०२०::१२:४९:am")).toEqual({ hour: 0, minute: 49 });
    expect(signedTime("diary #11_12_18 #1:36_am #Midnight")).toEqual({ hour: 1, minute: 36 });
    expect(signedTime("#16: 1:19::12:27:AM Sanket")).toEqual({ hour: 0, minute: 27 });
    expect(signedTime("#12:1:19: :10:09:AM")).toEqual({ hour: 10, minute: 9 });
    expect(signedTime("#11:7:2018::6:00am")).toEqual({ hour: 6, minute: 0 });
    expect(signedTime("noon #3: 2:2019::12:05pm")).toEqual({ hour: 12, minute: 5 });
  });

  it("ignores a time written in the prose", () => {
    expect(signedTime("my roommate wakes me up at 7:30am and asks")).toBeNull();
    expect(signedTime("no time here")).toBeNull();
  });
});

describe("serialOf and cleanPost", () => {
  it("reads the opening number, not a date or time", () => {
    expect(serialOf("#1114 … #TheModernDilemma")).toBe(1114);
    expect(serialOf("#७४६ #…😇")).toBe(746);
    expect(serialOf("#1:36_am")).toBeNull();
    expect(serialOf("Text first #12")).toBeNull();
  });

  it("strips the number, the signature, links and hashtag marks", () => {
    expect(cleanPost("#1182 It’s 2am #the_mysteries #08:01:2021::02:12:am https://x.y/z"))
      .toBe("It’s 2am the mysteries");
    expect(cleanPost("#९५३ जुन्या रूढींना #२६:१२:२०२०::२:१०:pm")).toBe("जुन्या रूढींना");
  });

  it("collects written hashtags but not the am/pm debris", () => {
    expect(hashtagsOf("#Morning_thoughts #1:36_am #life #me")).toEqual(["morning_thoughts", "life"]);
  });
});

describe("languageOf", () => {
  it("goes by share of letters", () => {
    expect(languageOf("मन तृप्त झाले, संतुष्ट झाले")).toBe("mr");
    expect(languageOf("It’s 2am in the morning, आणि")).toBe("en");
    expect(languageOf("🥭🏘️")).toBeNull();
  });
});

describe("runsOf", () => {
  it("finds the longest streak and the longest silence", () => {
    const r = runsOf(["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-03", "2020-01-10", "2020-01-11"]);
    expect(r.streak).toEqual({ days: 3, from: "2020-01-01", to: "2020-01-03" });
    expect(r.gap).toEqual({ days: 6, from: "2020-01-03", to: "2020-01-10" });
  });

  it("copes with one day and with none", () => {
    expect(runsOf(["2020-01-01"])).toEqual({ streak: { days: 1, from: "2020-01-01", to: "2020-01-01" }, gap: null });
    expect(runsOf([])).toEqual({ streak: null, gap: null });
  });
});

const row = (id, date, text, extra = {}) => ({
  id, date, text, post_type: "text", post_kind: "own", source: "tumblr", tag_names: [], ...extra,
});

describe("summarise", () => {
  it("counts the clock, languages, kinds and lengths", () => {
    const posts = [
      row(1, "2020-01-05", "#1 A thought about the quiet night sky and time #5:1:2020::11:30:pm", { tag_names: ["life"] }),
      row(2, "2020-01-05", "#2 रात्र शांत आहे आणि मन पण #5:1:2020::1:10:am", { tag_names: ["life", "marathi"] }),
      row(3, "2020-01-06", "Morning words only", { post_kind: "quote", post_type: "quote" }),
    ].map(parsePost);
    const s = summarise(posts);
    expect(s.posts).toBe(3);
    expect(s.days).toBe(2);
    expect(s.timed).toBe(2);
    expect(s.night).toBe(2);
    expect(s.hours[23]).toBe(1);
    expect(s.hours[1]).toBe(1);
    expect(s.langs).toEqual({ en: 2, mr: 1 });
    expect(s.kinds).toEqual({ own: 2, quote: 1 });
    expect(s.tags[0]).toEqual(["life", 2]);
    expect(s.busiestDay).toEqual({ date: "2020-01-05", posts: 2 });
    expect(s.lengths.reduce((a, b) => a + b, 0)).toBe(3);
  });
});

// A small archive across three years, enough for every chapter to have data.
const archive = () => {
  const rows = [];
  let id = 1;
  ["2018", "2019", "2020"].forEach((y, yi) => {
    for (let i = 0; i < 20 + yi * 10; i += 1) {
      const day = String((i % 27) + 1).padStart(2, "0");
      const mon = String((i % 12) + 1).padStart(2, "0");
      const mr = i % 3 === 0;
      const text = mr
        ? `#${id} आज पुन्हा एकदा शांत मन आणि विचार यांची गोष्ट लिहिली आहे #${day}:${mon}:${y}::11:${String(i % 60).padStart(2, "0")}:pm`
        : `#${id} Another beautiful night of quiet thinking about social media and time again #${day}:${mon}:${y}::10:15:pm`;
      rows.push(row(id, `${y}-${mon}-${day}`, text, { tag_names: i % 2 ? ["life"] : ["self-reflection", "social media"] }));
      id += 1;
    }
  });
  return rows;
};

describe("buildInsights", () => {
  const doc = buildInsights(archive(), { generatedAt: "2026-11-04T00:00:00Z" });

  it("summarises the archive and each year", () => {
    expect(doc.years).toEqual(["2018", "2019", "2020"]);
    expect(doc.all.posts).toBe(90);
    expect(doc.perYear["2020"].posts).toBe(40);
    expect(Object.values(doc.days).reduce((a, b) => a + b, 0)).toBe(90);
    expect(doc.serial).toEqual({ count: 90, max: 90 });
    expect(doc.sky.points.length).toBe(doc.all.timed * 2);
  });

  it("reads back through the selectors", () => {
    expect(scopeOf(doc, "2019").posts).toBe(30);
    expect(scopeOf(doc, "").posts).toBe(90);
    expect(scopeOf(doc, "1999").posts).toBe(90);
    expect(monthSeries(doc, "2018")).toHaveLength(12);
    expect(monthSeries(doc, "").reduce((a, m) => a + m.count, 0)).toBe(90);
    expect(yearTable(doc).map((r) => r.posts)).toEqual([20, 30, 40]);
  });

  it("writes the story's sentences from the numbers", () => {
    const lines = storyLines(doc);
    expect(lines.clock).toMatch(/^100% of the timed posts/);
    expect(lines.years).toBe("2020 was the loudest year, with 40 posts. 2018 was the quietest, with 20.");
    expect(lines.language).toMatch(/^Marathi was \d+% of the posts in 2018/);
  });

  it("drops a typo'd running number from the series", () => {
    const rows = archive();
    rows[5].text = `#${9999} a typo`;
    expect(buildInsights(rows).serial.max).toBe(90);
  });
});

describe("dailyPicks", () => {
  const pool = [];
  for (let i = 1; i <= 200; i += 1) pool.push([i, 2018 + (i % 9), i % 4 === 0 ? 1 : 0, 30 + (i % 50)]);

  it("is the same all day and changes the next", () => {
    const a = dailyPicks(pool, "2026-11-04");
    expect(dailyPicks(pool, "2026-11-04")).toEqual(a);
    expect(dailyPicks(pool, "2026-11-05")).not.toEqual(a);
    expect(a).toHaveLength(DAILY_COUNT);
    expect(new Set(a).size).toBe(DAILY_COUNT);
  });

  it("spans every year and both languages", () => {
    const picked = dailyPicks(pool, "2026-11-04").map((id) => pool.find((r) => r[0] === id));
    expect(new Set(picked.map((r) => r[1])).size).toBe(9);
    expect(picked.filter((r) => r[2] === 1).length).toBeGreaterThanOrEqual(3);
    expect(picked.filter((r) => r[2] === 0).length).toBeGreaterThanOrEqual(3);
  });

  it("copes with a pool smaller than ten", () => {
    expect(dailyPicks(pool.slice(0, 4), "2026-11-04")).toHaveLength(4);
    expect(dailyPicks([], "2026-11-04")).toEqual([]);
  });
});

describe("the committed file", () => {
  const file = path.join(__dirname, "../../public/data/microblog-insights.json");
  const text = fs.readFileSync(file, "utf8");
  const doc = JSON.parse(text);

  it("stays inside its budget", () => {
    expect(Buffer.byteLength(text)).toBeLessThan(120 * 1024);
  });

  it("has every year, a pool to pick from and quotes kept short", () => {
    expect(doc.years.length).toBeGreaterThan(0);
    doc.years.forEach((y) => expect(doc.perYear[y].posts).toBeGreaterThan(0));
    expect(doc.pool.length).toBeGreaterThanOrEqual(DAILY_COUNT);
    doc.moments.forEach((m) => expect(m.quote.split(/\s+/).length).toBeLessThanOrEqual(33));
  });
});
