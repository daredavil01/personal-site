// Row → card model.
//
// Only fixed-page cards are modelled here, because only fixed pages have a
// generated card. A detail route unfurls with the row's OWN photo when it has
// one and its section's committed card when it does not, which is resolved in
// `functions/_middleware.js` — no layout, no render, nothing to model.
//
// (Nine per-entity layouts lived here until the on-demand renderer was removed;
// they are in git history at 005f844 if per-entity cards are ever pre-rendered
// under Node instead.)

import { accentFor } from "./tokens.js";

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

// A stat tile, or nothing. The generator renders offline when the stats
// snapshot is unreachable, and a card that asserted "0 books" would be worse
// than one with no number at all — so a tile with no real value is dropped.
const stat = (value, label) => {
  if (value == null || value === "" || value === "—") return null;
  const n = Number(value);
  if (Number.isFinite(n)) return n > 0 ? { value: compact(n), label } : null;
  return { value: String(value), label };
};

// --- fixed pages ------------------------------------------------------------

// Fixed-page cards read the `/api/stats` payload — the same snapshot the /stats
// page renders, fetched by the generator at build time. Never recompute a stat
// here: CLAUDE.md puts every site number in computeSiteStats, and a card that
// did its own arithmetic would drift from the page it summarises.
export function pageModel(slug, payload, {
  siteUrl = "", portrait: portraitOverride = null, photos = {}, ledger = null,
} = {}) {
  const s = (payload && payload.stats) || {};
  const micro = (payload && payload.micro) || {};
  const tags = (payload && payload.tags) || [];
  // public/data/writing-ledger.json, the same file the ledger page fetches.
  const months = (ledger && Array.isArray(ledger.byMonth) ? ledger.byMonth : []).slice(-12);
  const ledgerTotals = (ledger && ledger.totals) || {};

  // The three identity cards carry the portrait. The generator passes it as an
  // inlined data URI, since satori has to read the pixels to composite them —
  // `siteUrl` is only the fallback for a caller that can fetch over HTTP.
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
      // topBookTags is [[name, count], ...]. Reading `.name` off a pair yields
      // the pair itself, which still hashed to a stable spine — but by accident.
      figure: {
        titles: (s.topBookTags || []).map((t) => (Array.isArray(t) ? t[0] : (t && t.name) || t)),
        genres: s.topGenres || [],
      },
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
      // The card for a photo gallery has to show photos; `photos` is empty when
      // the generator ran without Supabase, and then the grid is simply absent.
      photos: photos.instagram || [],
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
      photos: photos.projects || [],
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
      stats: [
        stat(ledgerTotals.words, "Words"),
        stat(ledgerTotals.posts, "Posts"),
        stat(ledgerTotals.averageWords, "Avg words"),
      ].filter(Boolean),
      // Real months. This card drew a hardcoded five-bar series until now,
      // which is the one thing a card about counting words must not do.
      figure: { months: months.map((m) => m.words) },
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

// Every fixed-page card slug, and so every file `npm run og:fallbacks` writes.
// `src/data/routeManifest.test.js` asserts each route with `og.strategy ===
// "page"` names one of these AND that the PNG exists, so a new page route
// cannot ship without a card.
export const PAGE_SLUGS = [
  "home", "about", "ask", "books", "challenges", "changelog", "contact", "instagram",
  "interactive-me", "micro-blog", "mindmap", "now", "100-days-to-offload", "presentations",
  "projects", "resume", "sports", "stats", "tags", "treks", "writing-ledger", "notfound",
  "ask-share",
];

export default pageModel;
