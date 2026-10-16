import fs from "fs";
import path from "path";
import {
  MAX_EXCERPT_WORDS, cleanText, isMarathi, openingOf, pairLetters, phrases, pickLines,
  punctuationOf, splitSentences, wordsOf,
} from "./logbook";

describe("cleanText", () => {
  it("drops Substack calls to action, caption debris and signatures", () => {
    const text = [
      "A real paragraph about attention.",
      "Thanks for reading The Wanderer's Technical Anecdotes! Subscribe for free to receive new posts and support my work.",
      "Leave a comment",
      "Share",
      "oplus_33",
      "https://linktr.ee/daredavil",
      "~संकेत तांबारे",
      "#३१:५:२०१९::३:५६:pm",
      "Mail me at someone@example.com today, or see https://example.com now.",
    ].join("\n\n");
    expect(cleanText(text)).toBe("A real paragraph about attention.\nMail me at  today, or see  now.");
  });

  it("keeps an authored sign-off", () => {
    expect(cleanText("That’s it for now, thanks for reading!")).toBe("That’s it for now, thanks for reading!");
  });
});

describe("isMarathi", () => {
  it("goes by share of letters, not a single match", () => {
    expect(isMarathi("सातपुड्यात भटकताना, मला सापडलेलो मी")).toBe(true);
    expect(isMarathi("Travelogue वगैरे वगैरे… खरंतर हे प्रवासवर्णन आग्रहाने मराठी लिहावे")).toBe(true);
    expect(isMarathi("An English essay that quotes one word: भटकंती, and moves on with its argument.")).toBe(false);
  });
});

describe("splitSentences", () => {
  it("splits on runs of terminators, ellipses and the danda", () => {
    expect(splitSentences("Wow!!! Is it? Yes… हा गड आहे। पुढे चला")).toEqual(["Wow!!!", "Is it?", "Yes…", "हा गड आहे।", "पुढे चला"]);
  });

  it("treats a line break as a boundary and keeps closing quotes", () => {
    expect(splitSentences("He said “go.” Then left\nA heading")).toEqual(["He said “go.”", "Then left", "A heading"]);
  });

  it("counts Devanagari words with their vowel signs", () => {
    expect(wordsOf("किल्ले जीवधन: एक थरारक अनुभव!")).toEqual(["किल्ले", "जीवधन", "एक", "थरारक", "अनुभव"]);
  });
});

describe("punctuationOf", () => {
  it("keeps marks in order, not apostrophes inside words", () => {
    expect(punctuationOf("Let's go, now! Really? (yes)… done.")).toBe(",!?()….");
    expect(punctuationOf("a, b, c, d", 2)).toBe(",,");
  });
});

describe("phrases", () => {
  const post = (s, year = "2026") => ({ lang: "en", year, sentences: [s] });

  it("needs a phrase in several posts and never edges on glue words", () => {
    const posts = [
      post("As usual, let's get started with the big picture."),
      post("As usual, the big picture matters.", "2025"),
      post("As usual, a big picture of the day."),
    ];
    const got = phrases(posts, "en").map((p) => p.p);
    expect(got).toContain("as usual");
    expect(got).toContain("big picture");
    expect(got.some((p) => /^(the|of|a) | (the|of|a)$/.test(p))).toBe(false);
    expect(phrases(posts, "en").find((p) => p.p === "as usual").years).toEqual({ 2026: 2, 2025: 1 });
  });

  it("drops a phrase that only appears inside a longer kept one", () => {
    const posts = [1, 2, 3].map(() => post("worth the efforts indeed"));
    const got = phrases(posts, "en").map((p) => p.p);
    expect(got).toContain("worth the efforts indeed");
    expect(got).not.toContain("worth the efforts");
  });
});

describe("excerpts", () => {
  it("clips an opening to the excerpt limit", () => {
    const long = Array.from({ length: 50 }, (_, i) => `w${i}`).join(" ");
    const got = openingOf(["Hi.", long]);
    expect(got.split(/\s+/).length).toBeLessThanOrEqual(MAX_EXCERPT_WORDS);
    expect(got.endsWith("…")).toBe(true);
  });

  it("picks lines of 5–18 words with stable ids", () => {
    const s = ["Too short.", "This one is long enough to keep around.", "in ; so, a fragment that starts mid-thought.", "So is this sentence about running far."];
    const a = pickLines("u", s);
    expect(a.map((l) => l.s)).toEqual([s[1], s[3]]);
    expect(pickLines("u", s)[0].id).toBe(a[0].id);
  });
});

describe("pairLetters", () => {
  const chunk = (postId, date, vec, text) => ({ postId, date, lang: "en", vec, text });

  it("pairs close chunks far apart in time, each post once", () => {
    const chunks = [
      chunk("old", "2020-01-01", [1, 0], "Social media shapes attention in ways we never chose to notice."),
      chunk("new", "2026-01-01", [0.95, 0.1], "Attention is the thing social media takes from us every single day."),
      chunk("new2", "2026-02-01", [0.94, 0.1], "Another essay on attention and social media and what it costs us."),
      chunk("soon", "2020-03-01", [1, 0], "Too close in time to the first one to count as a letter."),
    ];
    const got = pairLetters(chunks);
    expect(got).toHaveLength(2);
    expect(new Set(got.flatMap((l) => [l.then.post, l.now.post])).size).toBe(4);
    got.forEach((l) => expect(l.sim).toBeGreaterThan(0.9));
  });
});

// The committed file is what ships: hold it to the excerpt rule and the budget.
describe("public/data/logbook.json", () => {
  const file = path.join(__dirname, "../../public/data/logbook.json");
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  const words = (s) => s.split(/\s+/).filter(Boolean).length;

  it("stays under 200 KB", () => {
    expect(raw.length).toBeLessThan(200 * 1024);
  });

  it("never ships more than one short sentence of prose at a time", () => {
    const excerpts = [
      ...data.posts.map((p) => p.opening),
      ...data.lines.map((l) => l.s),
      ...data.letters.flatMap((l) => [l.then.s, l.now.s]),
    ];
    excerpts.forEach((s) => expect(words(s)).toBeLessThanOrEqual(MAX_EXCERPT_WORDS));
    data.posts.forEach((p) => expect(p).not.toHaveProperty("text"));
  });

  it("only references posts it contains", () => {
    const ids = new Set(data.posts.map((p) => p.id));
    data.lines.forEach((l) => expect(ids.has(l.post)).toBe(true));
    data.letters.forEach((l) => expect(ids.has(l.then.post) && ids.has(l.now.post)).toBe(true));
    data.posts.forEach((p) => (p.near || []).forEach((n) => expect(ids.has(n)).toBe(true)));
  });
});
