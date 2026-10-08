// What the Blueprint draws: every feature of the site as a room on the plan
// (sheet A-01), and the slice each one cuts through the stack on the section
// (sheet A-02).
//
// Counts are never typed in here. Code facts (regions, quests, card slugs,
// the model ladder) are read from the modules that define them; content
// counts come from the /api/stats snapshot through `ctx`, and an `area` or
// spec line whose number is missing returns null and is left out — the same
// rule the share cards follow: no number beats a wrong one.

import { REGION_LIST } from "../../atlas/regions/registry";
import { QUESTS } from "../../atlas/gamification/quests";
import { ACHIEVEMENTS } from "../../atlas/gamification/achievements";
import { EGG_COUNT } from "../../atlas/gamification/easterEggs";
import {
  DEFAULT_ASK_SETTINGS, EMBEDDING_DIMS, EMBEDDING_MODEL, ENTITY_TYPES as ASK_TYPES,
} from "../../data/askConfig";
import { PAGE_SLUGS } from "../../lib/og/model";

export const fmt = (n) => (Number.isFinite(Number(n)) && Number(n) > 0
  ? Number(n).toLocaleString("en-IN")
  : null);

// `ctx` is { stats, micro, tags, releases } — any of them may be null while
// the snapshot loads or if it fails.
const s = (ctx) => (ctx && ctx.stats) || {};

// The section's floors, top to bottom.
export const LAYERS = [
  { id: "shell", level: "Roof", label: "Shells", note: "Atlas or Classic, resolved per visitor" },
  { id: "pages", level: "L3", label: "Pages", note: "Lazy-loaded React routes" },
  { id: "data", level: "L2", label: "Data layer", note: "ContentContext, src/lib/api, shared libs" },
  { id: "edge", level: "L1", label: "Edge", note: "Cloudflare Pages Functions" },
  { id: "db", level: "B1", label: "Foundation", note: "Supabase Postgres, RLS, Storage" },
  { id: "jobs", level: "B2", label: "Plant room", note: "Scripts, generators, the nightly job" },
];

// The eight collections in the Archives room, each an alcove on the plan.
export const COLLECTIONS = [
  { id: "books", label: "Books", path: "/books", count: (c) => s(c).booksCount },
  { id: "races", label: "Races", path: "/sports", count: (c) => s(c).totalRaces },
  { id: "treks", label: "Treks", path: "/treks", count: (c) => s(c).totalTreks },
  { id: "blogs", label: "100 Days", path: "/100-days-to-offload", count: (c) => s(c).offloadCount },
  { id: "micro", label: "Micro", path: "/micro-blog", count: (c) => c && c.micro && c.micro.total },
  { id: "projects", label: "Projects", path: "/projects", count: (c) => s(c).projectCount },
  { id: "decks", label: "Decks", path: "/presentations", count: (c) => s(c).presentationCount },
  { id: "photos", label: "Photo sets", path: "/instagram", count: (c) => s(c).instaPostCount },
];

const archiveRows = (ctx) => COLLECTIONS
  .map((col) => Number(col.count(ctx)) || 0)
  .reduce((a, b) => a + b, 0);

const tiers = DEFAULT_ASK_SETTINGS.tiers || [];

// `plan` is the room's rectangle on a 960×600 plan; `door` is where its door
// sits (`h` on a horizontal wall, `v` on a vertical one); `furniture` names
// the glyph SitePlan draws inside it.
export const FEATURES = [
  {
    id: "atlas",
    no: "101",
    name: "The Atlas",
    path: "/?view=atlas",
    pathLabel: "Enter the Atlas",
    plan: { x: 0, y: 0, w: 260, h: 190 },
    door: { x: 100, y: 190, dir: "h" },
    furniture: "compass",
    area: () => `${REGION_LIST.length} regions`,
    blurb: "An illustrated world map in front of the same content. Each region is one of the things the site is about, and every page is a place inside one of them.",
    specs: [
      () => `${REGION_LIST.length} regions. Picking one flies the camera in before the page opens.`,
      () => `${QUESTS.length} quests, ${ACHIEVEMENTS.length} achievements and ${EGG_COUNT} hidden easter eggs, stamped into a passport.`,
      "Day and night follow the visitor's clock. Sound is opt-in WebAudio whose ambient loops crossfade between regions.",
      "One persisted world document, atlas.v1, holds every stamp, quest and preference.",
    ],
    layers: {
      shell: "RegionShell, the HUD and the passport",
      pages: "AtlasHome: orbit, dive, then the map",
      data: "WorldContext: one atlas.v1 document",
      jobs: "generate-atlas-audio.mjs synthesised the loops",
    },
  },
  {
    id: "ask",
    no: "102",
    name: "Ask the Archive",
    path: "/ask",
    pathLabel: "Ask a question",
    plan: { x: 260, y: 0, w: 260, h: 190 },
    door: { x: 300, y: 190, dir: "h" },
    furniture: "table",
    area: () => `${Object.keys(ASK_TYPES).length} types indexed`,
    blurb: "Plain-language questions over the whole archive, answered with links to the pages each answer came from.",
    specs: [
      "Hybrid search: Postgres keyword ranking and pgvector similarity, fused by reciprocal rank.",
      () => `Embeddings from ${EMBEDDING_MODEL} (${EMBEDDING_DIMS} dimensions), rebuilt incrementally: unchanged text is never re-embedded.`,
      () => `A ladder of ${tiers.length} models that falls back to search-only. Its order is rows in ask_settings, not code.`,
      "An answer may only link to URLs the archive supplied, and a conversation can be shared read-only.",
    ],
    layers: {
      shell: "AskLauncher on every page, AskChat",
      pages: "Ask.js, AskShare.js (/ask/s/<token>)",
      data: "askRetrieval.js re-ranks, askFormat.js sanitises",
      edge: "functions/api/ask.js streams SSE",
      db: "hybrid_search(), site_facts(), content_chunks",
      jobs: "npm run ask:index, nightly, by content hash",
    },
  },
  {
    id: "newsletter",
    no: "103",
    name: "Newsletter",
    path: "/newsletter",
    pathLabel: "Read an issue",
    plan: { x: 520, y: 0, w: 220, h: 190 },
    door: { x: 680, y: 190, dir: "h" },
    furniture: "desk",
    area: () => "1 issue / month",
    blurb: "A monthly issue assembled from the month's races, treks, books and posts, around a letter written by hand.",
    specs: [
      "An issue is a now_months row. There is no issues table.",
      "Two layouts from one model: a letter in the Atlas, a magazine in Classic.",
      "npm run newsletter:draft merges the month, renders its card and writes a brief. Only a person presses Publish.",
      "Reactions, a poll and private replies go through a Turnstile-checked edge function.",
    ],
    layers: {
      shell: "IssueLetter (Atlas) or IssueMagazine",
      pages: "Newsletter.js, NewsletterIssue.js",
      data: "newsletterIssue.js: every number an issue shows",
      edge: "api/newsletter-feedback.js, IP hashed",
      db: "now_months rows, newsletter_feedback",
      jobs: "npm run newsletter:draft",
    },
  },
  {
    id: "admin",
    no: "104",
    name: "Admin",
    path: null,
    plan: { x: 740, y: 0, w: 220, h: 190 },
    door: { x: 780, y: 190, dir: "h", locked: true },
    furniture: "office",
    area: () => "owner only",
    blurb: "The content desk. Every table on the site is edited here, under the owner's signed-in session.",
    specs: [
      "Forms are generated from one schema (resources.js), and the public site reads rows through the same mappers.",
      "Photos are resized and compressed in the browser before they reach Storage.",
      "Row-level security is the real lock: anyone may read, only is_owner() may write.",
      "Also here: the tag manager, changelog sync, newsletter publishing, /ask settings and graded conversations.",
    ],
    layers: {
      shell: "No shell: the Atlas HUD stays out",
      pages: "src/pages/admin/, schema-driven forms",
      data: "api/_crud.js createResource",
      edge: "api/ask-eval.js, owner-verified",
      db: "RLS: public read, is_owner() write",
    },
  },
  {
    id: "archives",
    no: "105",
    name: "Archives",
    path: "/books",
    pathLabel: "Open the library",
    plan: { x: 0, y: 190, w: 520, h: 210 },
    door: { x: 340, y: 400, dir: "h" },
    furniture: "alcoves",
    area: (ctx) => (archiveRows(ctx) ? `${fmt(archiveRows(ctx))} rows` : null),
    blurb: "Eight collections, one table each. Every row has its own permalink, share card and a strip of related reading.",
    specs: [
      "Each list is fetched once per visit and cached in ContentContext.",
      (ctx) => (fmt(ctx && ctx.micro && ctx.micro.total)
        ? `The micro-blog (${fmt(ctx.micro.total)} posts) is too big for that, so it is searched and paged in Postgres.`
        : "The micro-blog is too big for that, so it is searched and paged in Postgres."),
      "A detail page unfurls with the row's own photo, or the section's card when it has none.",
      "\"More like this\" comes from the same embeddings as /ask, with no model call when a page is read.",
    ],
    layers: {
      shell: "PageShell: identical content, either shell",
      pages: "8 list pages + 7 detail routes",
      data: "ContentContext: each list fetched once",
      edge: "_middleware.js: per-row meta",
      db: "one table each; micro-blog via tsvector",
      jobs: "blogs:wordcount feeds the Writing Ledger",
    },
  },
  {
    id: "tags",
    no: "106",
    name: "Tags",
    path: "/tags",
    pathLabel: "Browse by theme",
    plan: { x: 520, y: 190, w: 220, h: 210 },
    door: { x: 520, y: 260, dir: "v" },
    furniture: "loom",
    area: (ctx) => (fmt(ctx && ctx.tags && ctx.tags.length) ? `${fmt(ctx.tags.length)} tags` : null),
    blurb: "One vocabulary across every collection: a tag is a row of its own, linked to books, posts, races and treks alike.",
    specs: [
      "tags holds each tag's name, colour and category. tag_associations links it to a row of any type.",
      "set_entity_tags() replaces a row's tags in one step. Names are stored lowercase.",
      "Marathi names survive in links because they are URI-encoded, never slugified.",
      "Rename, recolour and merge duplicates at /admin/tags.",
    ],
    layers: {
      pages: "TagsHub.js, TagDetail.js",
      data: "_crud.js reads tag_names, writes set_entity_tags",
      edge: "_middleware.js: meta for /tags/:name",
      db: "tags, tag_associations, tags_with_counts()",
    },
  },
  {
    id: "stats",
    no: "107",
    name: "Stats",
    path: "/stats",
    pathLabel: "See the almanac",
    plan: { x: 740, y: 190, w: 220, h: 210 },
    door: { x: 740, y: 300, dir: "v" },
    furniture: "chart",
    area: (ctx) => (fmt(s(ctx).totalKmRun) ? `${fmt(s(ctx).totalKmRun)} km run` : null),
    blurb: "Every number on the site, computed in one place and served as an hourly snapshot.",
    specs: [
      "computeSiteStats is the only implementation. /stats, /ask, the share cards and this page read the same payload.",
      "GET /api/stats is cached at the edge for an hour, and computed in the browser if the endpoint is unreachable.",
      "Two layouts over the same numbers: the Almanac and Classic.",
    ],
    layers: {
      pages: "Stats.js: Almanac and Classic",
      data: "siteStats.js computeSiteStats",
      edge: "api/stats.js: one snapshot an hour",
      db: "read with the public key, through RLS",
      jobs: "og:fallbacks bakes the same numbers in",
    },
  },
  {
    id: "cards",
    no: "108",
    name: "Share cards",
    path: null,
    sheet: "a-04",
    pathLabel: "Try the unfurl bench",
    plan: { x: 0, y: 400, w: 240, h: 200 },
    door: { x: 240, y: 480, dir: "v" },
    furniture: "card",
    area: () => `${PAGE_SLUGS.length} cards`,
    blurb: "Every route unfurls with a real 1200×630 image, and any item can be exported as a designed picture.",
    specs: [
      () => `${PAGE_SLUGS.length} page cards, drawn by satori and resvg at build time and committed. Nothing renders when a link is shared.`,
      "A detail page advertises the row's own photo when it has one.",
      "One import-free module, pageMeta.js, feeds both the browser's tags and the edge's, so the two cannot drift.",
      "A share-image editor turns a book, race, trek, post or answer into a portrait, square or story image.",
    ],
    layers: {
      shell: "PageMeta.js writes tags with Helmet",
      pages: "ShareImageModal on every item",
      data: "pageMeta.js, shared with the edge",
      edge: "_middleware.js: HTMLRewriter injects tags",
      db: "a row's own photo, from Storage",
      jobs: "npm run og:fallbacks: committed PNGs",
    },
  },
  {
    id: "home",
    no: "109",
    name: "Foyer",
    path: "/",
    pathLabel: "Go to the front door",
    plan: { x: 240, y: 400, w: 280, h: 200 },
    door: null,
    furniture: "rug",
    area: () => "main entrance",
    blurb: "The front door: who this is, what is new, and a way into every room.",
    specs: [
      "Life Stats tiles count up as they scroll into view.",
      "Latest Posts reads the Substack feed through an edge proxy cached for 30 minutes.",
      "The Monthly Digest reconciles four date formats into one month-by-month roll-up.",
      "In the Atlas shell this same address is the world map.",
    ],
    layers: {
      shell: "Classic: the hub. Atlas: the map",
      pages: "Index.js, AtlasHome.js",
      data: "monthDigest.js: four date formats",
      edge: "rss-feed.js: Substack, cached 30 min",
      db: "content tables via ContentContext",
    },
  },
  {
    id: "changelog",
    no: "110",
    name: "Changelog",
    path: "/changelog",
    pathLabel: "Read the history",
    plan: { x: 520, y: 400, w: 220, h: 200 },
    door: { x: 520, y: 480, dir: "v" },
    furniture: "stairs",
    area: (ctx) => (fmt(ctx && ctx.releases) ? `${fmt(ctx.releases)} releases` : null),
    blurb: "Every release, dated and explained, and the commits behind each one.",
    specs: [
      "Versions are rows in Postgres. A markdown buffer only stages an entry in the same commit as its code.",
      "Each major version gets a written chapter summary; the engineering detail folds away under each release.",
      "The commit graph is read from a local clone with git log --numstat. No GitHub API.",
    ],
    layers: {
      pages: "Changelog.js, ChangelogGraph.js",
      data: "changelogParse.js, repoGraph.js",
      db: "changelog, changelog_majors, repo_commits",
      jobs: "npm run changelog, npm run repo:sync",
    },
  },
  {
    id: "play",
    no: "111",
    name: "Play",
    path: "/mindmap",
    pathLabel: "Open the mind map",
    plan: { x: 740, y: 400, w: 220, h: 200 },
    door: { x: 740, y: 480, dir: "v" },
    furniture: "game",
    area: () => "2 exhibits",
    blurb: "Two toys over the same data: a radial mind map and a zig-zag photo timeline.",
    specs: [
      "The Mind Map bursts each category into its items, with pan, pinch and wheel zoom.",
      "Interactive Me threads every race and trek on curved connectors, and can scroll itself.",
    ],
    layers: {
      pages: "MindMap.js, InteractiveMe.js",
      data: "usePanZoom, ContentContext lists",
      db: "books, sports, treks, projects, blogs",
    },
  },
];

export const featureById = (id) => FEATURES.find((f) => f.id === id) || null;

// Resolves a spec line or area, which may be a string or a function of ctx.
export const resolve = (value, ctx) => (typeof value === "function" ? value(ctx) : value);
