// The homepage's Now strip: what happened most recently, one card per kind.
//
// Pure, so it is tested without a browser. Each card is omitted when its data
// is missing — a kind with nothing to say says nothing, never a placeholder.
// Inputs are the shapes the content layer already returns: RSS items from
// functions/rss-feed.js, and the rows of src/lib/api/{sports,treks,books,now}.js.

import { parseRaceDate } from "./raceLog";
import { parseTrekDay, trekTitle } from "./trekLog";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Date → "12 Nov 2026"; "" for an invalid date. Locale-free so it is stable. */
export const shortDate = (d) => (
  d instanceof Date && !Number.isNaN(d.getTime())
    ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    : ""
);

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

function essayCard(posts) {
  const post = (posts ?? []).find((p) => clean(p?.title) && p?.link);
  if (!post) return null;
  return {
    kind: "essay",
    eyebrow: "Latest essay",
    title: clean(post.title),
    meta: shortDate(new Date(post.pubDate)),
    href: post.link,
    external: true,
  };
}

function outdoorsCard(sports, treks) {
  const races = (sports ?? [])
    .map((r) => ({ row: r, kind: "race", date: parseRaceDate(r?.date) }))
    .filter((x) => x.date && clean(x.row.title));
  const climbs = (treks ?? [])
    .map((t) => ({ row: t, kind: "trek", date: parseTrekDay(t?.date) }))
    .filter((x) => x.date && trekTitle(x.row));
  const latest = [...races, ...climbs].sort((a, b) => b.date - a.date)[0];
  if (!latest) return null;

  if (latest.kind === "race") {
    const { row } = latest;
    const detail = [clean(row.distance), row.time ? `in ${clean(row.time)}` : ""].filter(Boolean).join(" ");
    return {
      kind: "race",
      eyebrow: "Latest race",
      title: clean(row.title),
      meta: [detail, shortDate(latest.date)].filter(Boolean).join(" · "),
      href: `/sports/${row.id}`,
      external: false,
    };
  }
  const { row } = latest;
  return {
    kind: "trek",
    eyebrow: "Latest trek",
    title: trekTitle(row),
    meta: [row.endurance_level ? `${clean(row.endurance_level)} climb` : "", shortDate(latest.date)]
      .filter(Boolean).join(" · "),
    href: `/treks/${row.id}`,
    external: false,
  };
}

function bookCard(books) {
  const list = (books ?? []).filter((b) => clean(b?.title));
  const reading = list.find((b) => b.status === "reading");
  const finished = list
    .filter((b) => (b.status ?? "read") === "read")
    .sort((a, b) => String(b.date_finished ?? "").localeCompare(String(a.date_finished ?? "")))[0];
  const book = reading ?? finished;
  if (!book) return null;
  return {
    kind: "book",
    eyebrow: reading ? "Reading now" : "Just finished",
    title: clean(book.title),
    meta: clean(book.author),
    href: `/books/${book.id}`,
    external: false,
  };
}

function letterCard(months) {
  const list = months ?? [];
  const published = list
    .filter((m) => m?.publishedAt && m.slug)
    .sort((a, b) => String(b.slug).localeCompare(String(a.slug)))[0];
  if (published) {
    return {
      kind: "letter",
      eyebrow: "Newsletter",
      title: clean(published.headline) || `${published.month} ${published.year}`,
      meta: `${published.month} ${published.year} issue`,
      href: `/newsletter/${published.slug}`,
      external: false,
    };
  }
  const current = list.find((m) => m?.isCurrent);
  if (!current) return null;
  return {
    kind: "letter",
    eyebrow: "This month",
    title: clean(current.headline) || `${current.month} ${current.year}`,
    meta: "What I'm doing now",
    href: "/now",
    external: false,
  };
}

/** Up to four cards, in a fixed order: writing, outdoors, reading, the letter. */
export function nowCards({
  posts, sports, treks, books, months,
} = {}) {
  return [
    essayCard(posts),
    outdoorsCard(sports, treks),
    bookCard(books),
    letterCard(months),
  ].filter(Boolean);
}

export default nowCards;
