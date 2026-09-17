// Row → card model. One adapter per card kind; layouts read the model and never
// touch a raw row, so a column rename lands in exactly one place.
//
// These deliberately do NOT reuse `src/components/share/shareCardConfig.js`.
// That module adapts CLIENT rows (camelCase, already run through each api
// module's `fromRow`) into a portrait share-sheet card. The OG endpoint reads
// PostgREST rows directly (snake_case, `tag_names`, relative image paths) and
// builds a landscape card with different anatomy — stats and figures rather
// than a body paragraph. Bridging the two would mean a casing shim plus an
// anatomy shim on top of a module whose tests pin the other shape.

import { postArt } from "../generativeArt.js";
import { accentFor } from "./tokens.js";
import { storageUrl, firstSlideImage } from "./paths.js";

const clean = (value) => (value == null ? "" : String(value).replace(/\s+/g, " ").trim());

const truncate = (value, max) => {
  const str = clean(value);
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
};

const tagsOf = (row) => (Array.isArray(row?.tag_names) ? row.tag_names.filter(Boolean) : []);

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Compact a count for a stat tile: 1200 -> "1.2k". Cards have room for three
// characters, not six.
export const compact = (value) => {
  const n = num(value);
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

// A stat tile, or nothing. `/api/stats` can be unreachable, and the committed
// fallback cards are rendered with no payload at all — in both cases the card
// must omit the figure rather than assert a zero.
const stat = (value, label) => {
  if (value == null || value === "" || value === "—") return null;
  const n = Number(value);
  if (Number.isFinite(n)) return n > 0 ? { value: compact(n), label } : null;
  return { value: String(value), label };
};

// --- entity adapters --------------------------------------------------------

const book = (row) => ({
  kind: "book",
  eyebrow: "From the Library",
  title: clean(row.title),
  subtitle: row.author ? `by ${clean(row.author)}` : "",
  lede: truncate(row.description, 160),
  meta: [row.category, row.language, row.year && String(row.year)].filter(Boolean).map(clean),
  chips: tagsOf(row).slice(0, 3),
  path: `/books/${row.id}`,
});

const blog = (row) => ({
  kind: "blog",
  eyebrow: "100 Days To Offload",
  title: clean(row.blog_title),
  lede: truncate(row.blog_description, 170),
  meta: [row.blog_date, row.blog_platform, row.language].filter(Boolean).map(clean),
  // Every row carries the challenge tag; it is noise on the card.
  chips: tagsOf(row).filter((t) => t.toLowerCase() !== "100_days_to_offload").slice(0, 3),
  path: `/100-days-to-offload/${row.id}`,
});

const sport = (row, ctx) => ({
  kind: "sport",
  eyebrow: "Physical Endurance",
  title: clean(row.title),
  subtitle: clean(row.place),
  stats: [
    row.distance ? { value: clean(row.distance), label: "Distance" } : null,
    row.time ? { value: clean(row.time), label: "Finish" } : null,
    row.bib_number ? { value: `#${clean(row.bib_number)}`, label: "Bib" } : null,
  ].filter(Boolean),
  meta: [row.date].filter(Boolean).map(clean),
  photo: firstSlideImage(row.slide_images, ctx.supabaseUrl),
  path: `/sports/${row.id}`,
});

const trek = (row, ctx) => ({
  kind: "trek",
  eyebrow: "My Treks",
  title: clean(row.fort_name),
  subtitle: row.endurance_level ? `${clean(row.endurance_level)} endurance` : "",
  meta: [row.date, row.trek_time].filter(Boolean).map(clean),
  badge: clean(row.endurance_level),
  photo: firstSlideImage(row.slide_images, ctx.supabaseUrl),
  figure: { names: [clean(row.fort_name) || "ridge"] },
  path: `/treks/${row.id}`,
});

const project = (row, ctx) => ({
  kind: "project",
  eyebrow: "Projects",
  title: clean(row.title),
  subtitle: truncate(row.subtitle, 90),
  lede: truncate(row.description, 140),
  badge: clean(row.status),
  chips: (Array.isArray(row.tech_stack) ? row.tech_stack : []).slice(0, 4).map(clean),
  photo: storageUrl(row.image, ctx.supabaseUrl) || firstSlideImage(row.slide_images, ctx.supabaseUrl),
  path: `/projects/${row.id}`,
});

const presentation = (row) => ({
  kind: "presentation",
  eyebrow: "Presentations",
  title: clean(row.title),
  lede: truncate(row.description, 150),
  meta: [row.date].filter(Boolean).map(clean),
  chips: tagsOf(row).slice(0, 3),
  path: `/presentations/${row.id}`,
});

const microblog = (row, ctx) => {
  const body = clean(row.text || row.title);
  const tags = tagsOf(row);
  // The pinboard's own art, unchanged — same function, same seed, so a post's
  // card and its card on /micro-blog draw the same picture.
  const colorByName = ctx.tagColors instanceof Map ? ctx.tagColors : new Map(tags.map((t) => [t, null]));
  return {
    kind: "microblog",
    eyebrow: "Micro Blog",
    title: "",
    body: truncate(body, 260),
    quote: row.post_type === "quote",
    meta: [row.date, row.post_type].filter(Boolean).map(clean),
    chips: tags.slice(0, 3),
    photo: storageUrl(row.image_url, ctx.supabaseUrl),
    art: postArt({ id: row.id, tags }, colorByName),
    footerNote: row.source ? `via ${clean(row.source)}` : "",
    path: `/micro-blog/${row.id}`,
  };
};

const tag = (row) => {
  const counts = row.counts && typeof row.counts === "object" ? row.counts : {};
  const total = num(row.total) || Object.values(counts).reduce((sum, n) => sum + num(n), 0);
  return {
    kind: "tag",
    eyebrow: "Tag",
    // display_name preserves the author's casing and script; `name` is stored
    // lowercased for lookups and would read wrong on a card.
    title: `#${clean(row.display_name || row.name)}`,
    lede: truncate(row.description, 150),
    subtitle: clean(row.category),
    color: row.color || null,
    stats: Object.entries(counts)
      .filter(([, n]) => num(n) > 0)
      .sort((a, b) => num(b[1]) - num(a[1]))
      .slice(0, 3)
      .map(([label, n]) => ({ value: compact(n), label })),
    footerNote: total ? `${total} item${total === 1 ? "" : "s"}` : "",
    // `path` is display text in the card footer, never a link target, so it
    // carries the readable name. Percent-encoding it here printed
    // "/tags/%E0%A4%AE%E0%A4%B0..." across the bottom of every Marathi tag card.
    path: `/tags/${clean(row.display_name || row.name)}`,
  };
};

// A shared /ask conversation. Rendering on demand is what makes this card
// possible at all: a share is created by a reader and pasted into a chat
// seconds later, so nothing generated ahead of time could ever include it.
const askShare = (row) => ({
  kind: "ask-share",
  eyebrow: "Ask the Archive",
  title: truncate(row.title || row.question || "A conversation with the archive", 110),
  lede: truncate(row.summary || row.excerpt, 150),
  stats: [
    num(row.turn_count) ? { value: String(row.turn_count), label: "Turns" } : null,
    num(row.source_count) ? { value: String(row.source_count), label: "Sources" } : null,
  ].filter(Boolean),
  path: "/ask",
});

export const ENTITY_ADAPTERS = {
  book, blog, sport, trek, project, presentation, microblog, tag, "ask-share": askShare,
};

// --- fixed pages ------------------------------------------------------------

// Fixed-page cards read the `/api/stats` payload, which is already edge-cached
// for an hour. Never recompute a stat here: CLAUDE.md puts every site number in
// computeSiteStats, and a card that did its own arithmetic would drift from
// /stats.
export function pageModel(slug, payload, { siteUrl = "", portrait: portraitOverride = null } = {}) {
  const s = (payload && payload.stats) || {};
  const micro = (payload && payload.micro) || {};
  const tags = (payload && payload.tags) || [];

  // The three identity cards carry the portrait. `portraitOverride` lets
  // og:preview inline the real file as a data URI so the contact sheet shows
  // what ships; the endpoint just points at the site's own asset.
  const portrait = portraitOverride || (siteUrl ? `${siteUrl}/images/me.jpg` : null);
  const base = { kind: "page", slug, accent: accentFor(slug), path: slug === "home" ? "" : `/${slug}` };

  const pages = {
    home: {
      photo: portrait,
      eyebrow: "Sanket Tambare",
      title: "Engineer, marathoner, fort-trekker, writer",
      stats: [
        stat(s.booksCount, "Books"),
        stat(s.totalRaces, "Races"),
        stat(s.totalTreks, "Treks"),
      ].filter(Boolean),
      path: "",
    },
    about: {
      photo: portrait,
      eyebrow: "About",
      title: "A working life, written down",
      lede: "Full-stack developer, ultra-marathoner, fort-trekker and writer.",
    },
    ask: {
      eyebrow: "Ask the Archive",
      title: "Ask this site anything",
      lede: "A second brain over every book, race, trek, project and short post — answering with the pages it drew from.",
    },
    books: {
      eyebrow: "From the Library",
      title: "Books",
      stats: [
        stat(s.booksCount, "Read"),
        stat(s.booksMarathi, "Marathi"),
        stat(s.booksWithReviews, "Reviewed"),
      ].filter(Boolean),
      figure: { titles: (s.topBookTags || []).map((t) => t.name || t), genres: s.topGenres || [] },
    },
    challenges: {
      eyebrow: "Challenges",
      title: "Public commitments, counted",
      stats: [stat(s.offloadPercentage == null ? null : `${num(s.offloadPercentage)}%`, "100 Days")].filter(Boolean),
      figure: { pct: num(s.offloadPercentage) },
    },
    changelog: {
      eyebrow: "Changelog",
      title: "Every change, dated",
      lede: "A transparent record of what shipped, when, and why.",
    },
    contact: {
      eyebrow: "Contact",
      title: "Let's talk",
      lede: "Technology, endurance sport, or a collaboration worth the time.",
    },
    instagram: {
      eyebrow: "Instagram",
      title: "A visual archive",
      stats: [
        stat(s.instaPostCount, "Sets"),
        stat(s.totalPhotos, "Photos"),
      ].filter(Boolean),
    },
    "interactive-me": {
      eyebrow: "Interactive Me",
      title: "Every race and trek, on one thread",
      figure: { nodes: 9 },
    },
    "micro-blog": {
      eyebrow: "Micro Blog",
      title: "Short posts, years deep",
      stats: [
        stat(micro.total, "Posts"),
        stat(micro.longestStreak, "Best streak"),
        stat(micro.activeDays, "Active days"),
      ].filter(Boolean),
    },
    mindmap: {
      eyebrow: "Mind Map",
      title: "The whole archive, connected",
      figure: { spokes: 6 },
    },
    now: {
      eyebrow: "Now",
      title: "What I'm doing right now",
      lede: "Current projects, daily rituals, books in progress. Updated monthly.",
    },
    "100-days-to-offload": {
      eyebrow: "100 Days To Offload",
      title: "One hundred posts, one year",
      stats: [
        stat(s.offloadCount, "Published"),
        stat(s.offloadPercentage == null ? null : `${num(s.offloadPercentage)}%`, "Complete"),
      ].filter(Boolean),
      figure: { filled: num(s.offloadCount) },
    },
    presentations: {
      eyebrow: "Presentations",
      title: "Talks, built as decks",
      stats: [stat(s.presentationCount, "Decks")].filter(Boolean),
    },
    projects: {
      eyebrow: "Projects",
      title: "Things built and shipped",
      stats: [stat(s.projectCount, "Projects")].filter(Boolean),
      chips: (s.topSkills || []).slice(0, 3),
    },
    resume: {
      photo: portrait,
      eyebrow: "Resume",
      title: "Sanket Tambare",
      stats: [
        stat(s.orgCount, "Orgs"),
        stat(s.certCount, "Certs"),
        stat(s.degreeCount, "Degrees"),
      ].filter(Boolean),
      chips: (s.topSkills || []).slice(0, 4),
    },
    sports: {
      eyebrow: "Physical Endurance",
      title: "Every kilometre, logged",
      stats: [
        stat(s.bestTenKTime || "—", "10K PB"),
        stat(s.bestHmTime || "—", "Half PB"),
        stat(s.bestMarathonTime || "—", "Full PB"),
      ].filter(Boolean),
      meta: [
        s.totalRaces ? `${compact(s.totalRaces)} races` : null,
        s.totalKmRun ? `${compact(s.totalKmRun)} km` : null,
      ].filter(Boolean),
    },
    stats: {
      eyebrow: "Stats",
      title: "Metrics of Intent",
      stats: [
        stat(s.booksCount, "Books"),
        stat(s.totalKmRun, "Km run"),
        stat(s.totalTreks, "Treks"),
        stat(micro.total, "Posts"),
        stat(s.projectCount, "Projects"),
        stat(s.certCount, "Certs"),
      ].filter(Boolean),
      figure: {
        series: [s.booksPerYearSorted, s.racesPerYearSorted, s.blogMonthCounts, micro.perYear],
      },
    },
    tags: {
      eyebrow: "Tags",
      title: "The archive, by theme",
      stats: [
        stat(tags.length, "Tags"),
        stat(tags.reduce((sum, t) => sum + num(t.total), 0), "Links"),
      ].filter(Boolean),
      figure: { tags },
    },
    treks: {
      eyebrow: "My Treks",
      title: "Forts and ridgelines",
      stats: [
        stat(s.totalTreks, "Treks"),
        stat(s.hardTreks, "Hard"),
        stat(s.trekYearsActive == null ? null : `${compact(s.trekYearsActive)} yrs`, "Active"),
      ].filter(Boolean),
      figure: { names: [s.latestTrek || "ridge"] },
    },
    "writing-ledger": {
      eyebrow: "Writing Ledger",
      title: "Words, month by month",
      lede: "Every published word, counted and dated.",
    },
    notfound: {
      eyebrow: "404",
      title: "This trail goes nowhere",
      lede: "The page moved or never existed. Try asking the archive instead.",
      path: "/ask",
    },
    "ask-share": {
      eyebrow: "Ask the Archive",
      title: "A shared conversation",
      lede: "Someone asked this archive a question and passed the answer on.",
      path: "/ask",
    },
  };

  const page = pages[slug];
  if (!page) return null;
  return { ...base, ...page };
}

// Every fixed-page card slug. `src/data/routeManifest.test.js` asserts that each
// route with `og.strategy === "page"` names one of these, so a new page route
// cannot ship without a card.
export const PAGE_SLUGS = [
  "home", "about", "ask", "books", "challenges", "changelog", "contact", "instagram",
  "interactive-me", "micro-blog", "mindmap", "now", "100-days-to-offload", "presentations",
  "projects", "resume", "sports", "stats", "tags", "treks", "writing-ledger", "notfound",
  "ask-share",
];

// The one entry point. `kind` is "page" for a fixed route (with `id` as the
// slug) or an entity kind (with `id` as the row id).
export function ogModelFor(kind, row, ctx = {}) {
  if (kind === "page") return pageModel(row, ctx.stats, { siteUrl: ctx.siteUrl, portrait: ctx.portrait });
  const adapter = ENTITY_ADAPTERS[kind];
  if (!adapter || !row) return null;
  const model = adapter(row, ctx);
  return { accent: accentFor(kind), ...model };
}

export default ogModelFor;
