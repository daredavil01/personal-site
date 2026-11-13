import { nowCards, shortDate } from "./homeNow";

const posts = [
  { title: "  On  slow mornings ", link: "https://x.substack.com/p/slow", pubDate: "Tue, 11 Nov 2026 12:00:00 GMT" },
  { title: "Older", link: "https://x.substack.com/p/old", pubDate: "Mon, 03 Nov 2026 12:00:00 GMT" },
];
const sports = [
  { id: 4, title: "Pune Half", date: "February 22, 2026", distance: "21 Kms", time: "2:01:33" },
  { id: 9, title: "Tata Mumbai", date: "January 18, 2026", distance: "42 Kms", time: "4:40:00" },
];
const treks = [
  { id: 30, fort_name: "Rajgad", date: "17-02-2019", endurance_level: "Hard" },
  { id: 31, fort_name: "Torna_Fort", date: "01-03-2026", endurance_level: "Medium" },
];
const books = [
  { id: 1, title: "Old", author: "A", status: "read", date_finished: "2025-01-01" },
  { id: 2, title: "Newest read", author: "B", status: "read", date_finished: "2026-10-02" },
  { id: 3, title: "", author: "Nobody", status: "reading" },
];
const months = [
  { month: "November", year: 2026, slug: "2026-11", isCurrent: true, publishedAt: null, headline: "" },
  { month: "October", year: 2026, slug: "2026-10", publishedAt: "2026-11-02", headline: "Rain, then roads" },
  { month: "September", year: 2026, slug: "2026-09", publishedAt: "2026-10-01", headline: "Older" },
];

describe("nowCards", () => {
  it("draws one card per kind in a fixed order", () => {
    const cards = nowCards({
      posts, sports, treks, books, months,
    });
    expect(cards.map((c) => c.kind)).toEqual(["essay", "trek", "book", "letter"]);
  });

  it("takes the newest essay, cleaned, as an external link", () => {
    const [essay] = nowCards({ posts });
    expect(essay).toMatchObject({ title: "On slow mornings", href: "https://x.substack.com/p/slow", external: true });
    expect(essay.meta).toBe("11 Nov 2026");
  });

  it("picks whichever of race and trek is newer", () => {
    const [trek] = nowCards({ sports, treks });
    expect(trek).toMatchObject({ kind: "trek", title: "Torna Fort", href: "/treks/31" });
    expect(trek.meta).toBe("Medium climb · 1 Mar 2026");

    const [race] = nowCards({ sports, treks: treks.slice(0, 1) });
    expect(race).toMatchObject({ kind: "race", title: "Pune Half", href: "/sports/4" });
    expect(race.meta).toBe("21 Kms in 2:01:33 · 22 Feb 2026");
  });

  it("prefers a book being read, skips untitled rows, else the newest finished", () => {
    const [finished] = nowCards({ books });
    expect(finished).toMatchObject({ eyebrow: "Just finished", title: "Newest read", href: "/books/2" });

    const [reading] = nowCards({ books: [...books, { id: 7, title: "Current", author: "C", status: "reading" }] });
    expect(reading).toMatchObject({ eyebrow: "Reading now", title: "Current" });
  });

  it("links the newest published issue, else the current month on /now", () => {
    const [issue] = nowCards({ months });
    expect(issue).toMatchObject({ title: "Rain, then roads", href: "/newsletter/2026-10" });

    const [now] = nowCards({ months: months.slice(0, 1) });
    expect(now).toMatchObject({ href: "/now", title: "November 2026" });
  });

  it("omits every kind it has no data for", () => {
    expect(nowCards()).toEqual([]);
    expect(nowCards({ posts: [{ title: "" }], sports: [{ title: "x", date: "soon" }] })).toEqual([]);
  });
});

describe("shortDate", () => {
  it("is empty for an invalid date", () => {
    expect(shortDate(new Date("nope"))).toBe("");
    expect(shortDate(null)).toBe("");
  });
});
