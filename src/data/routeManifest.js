// Every route the app serves, declared once.
//
// `src/App.js` is runtime truth; this file is declarative truth; and
// `src/data/routeManifest.test.js` asserts the two agree by SET EQUALITY, so a
// route cannot be added — or removed — without this list being updated. That
// test is the thing that makes "every route has a share card" enforceable
// rather than aspirational.
//
// Why a separate list rather than generating docs/routes.md straight from
// App.js: `npm run docs:build` needs live Supabase credentials for its row
// counts, so it cannot run in CI. That is exactly how docs/routes.md drifted
// out of date. A Jest test needs no network.
//
// Fields:
//   path       — as written in App.js
//   component  — as written in App.js
//   meta       — for a parameterised route, the `build*Meta` export in
//                src/data/pageMeta.js that produces its tags
//   og.strategy
//     "page"   — a generated card, committed to public/og/<og.slug>.png
//     "entity" — the row's own photo when it has one, else the section card
//                that CARD_FALLBACKS maps `og.kind` to
//     "none"   — deliberately no card; must also be `indexable: false`
//   indexable  — whether the route should carry real, indexable meta
//
// Import-free, like src/data/pageMeta.js, so the esbuild-bundled Worker can
// read it without dragging anything in.

export const ROUTE_MANIFEST = [
  { path: "/", component: "HomeRoute", og: { strategy: "page", slug: "home" }, indexable: true },
  { path: "/about", component: "About", og: { strategy: "page", slug: "about" }, indexable: true },
  { path: "/ask", component: "Ask", og: { strategy: "page", slug: "ask" }, indexable: true },
  {
    path: "/ask/s/:token",
    component: "AskShare",
    meta: "buildShareMeta",
    og: { strategy: "entity", kind: "ask-share" },
    indexable: true,
  },
  { path: "/projects", component: "Projects", og: { strategy: "page", slug: "projects" }, indexable: true },
  { path: "/stats", component: "Stats", og: { strategy: "page", slug: "stats" }, indexable: true },
  { path: "/contact", component: "Contact", og: { strategy: "page", slug: "contact" }, indexable: true },
  { path: "/resume", component: "Resume", og: { strategy: "page", slug: "resume" }, indexable: true },
  { path: "/instagram", component: "Instagram", og: { strategy: "page", slug: "instagram" }, indexable: true },
  { path: "/sports", component: "SportsPage", og: { strategy: "page", slug: "sports" }, indexable: true },
  { path: "/now", component: "Now", og: { strategy: "page", slug: "now" }, indexable: true },
  { path: "/books", component: "Books", og: { strategy: "page", slug: "books" }, indexable: true },
  { path: "/challenges", component: "Challenges", og: { strategy: "page", slug: "challenges" }, indexable: true },
  {
    path: "/100-days-to-offload",
    component: "OneHundredDays",
    og: { strategy: "page", slug: "100-days-to-offload" },
    indexable: true,
  },
  { path: "/micro-blog", component: "MicroBlog", og: { strategy: "page", slug: "micro-blog" }, indexable: true },
  {
    path: "/micro-blog/:id",
    component: "MicroBlogPost",
    meta: "buildMicroblogMeta",
    og: { strategy: "entity", kind: "microblog" },
    indexable: true,
  },
  {
    path: "/treks/:id",
    component: "TrekPost",
    meta: "buildTrekMeta",
    og: { strategy: "entity", kind: "trek" },
    indexable: true,
  },
  {
    path: "/sports/:id",
    component: "SportPost",
    meta: "buildSportMeta",
    og: { strategy: "entity", kind: "sport" },
    indexable: true,
  },
  {
    path: "/books/:id",
    component: "BookPost",
    meta: "buildBookMeta",
    og: { strategy: "entity", kind: "book" },
    indexable: true,
  },
  {
    path: "/projects/:id",
    component: "ProjectPost",
    meta: "buildProjectMeta",
    og: { strategy: "entity", kind: "project" },
    indexable: true,
  },
  {
    path: "/presentations",
    component: "Presentations",
    og: { strategy: "page", slug: "presentations" },
    indexable: true,
  },
  {
    path: "/presentations/:id",
    component: "PresentationPost",
    meta: "buildPresentationMeta",
    og: { strategy: "entity", kind: "presentation" },
    indexable: true,
  },
  {
    path: "/100-days-to-offload/:id",
    component: "BlogPost",
    meta: "buildBlogMeta",
    og: { strategy: "entity", kind: "blog" },
    indexable: true,
  },
  { path: "/changelog", component: "Changelog", og: { strategy: "page", slug: "changelog" }, indexable: true },
  { path: "/treks", component: "TreksPage", og: { strategy: "page", slug: "treks" }, indexable: true },
  {
    path: "/interactive-me",
    component: "InteractiveMePage",
    og: { strategy: "page", slug: "interactive-me" },
    indexable: true,
  },
  { path: "/mindmap", component: "MindMap", og: { strategy: "page", slug: "mindmap" }, indexable: true },
  { path: "/tags", component: "TagsHub", og: { strategy: "page", slug: "tags" }, indexable: true },
  {
    path: "/tags/:name",
    component: "TagDetail",
    meta: "buildTagMeta",
    og: { strategy: "entity", kind: "tag" },
    indexable: true,
  },

  // --- deliberately excluded -------------------------------------------------
  // The admin dashboard is authenticated and noindex; a share card would be
  // meaningless and mildly leaky.
  { path: "/admin/*", component: "AdminApp", og: { strategy: "none" }, indexable: false },
  // A 301 to `/` at the edge, so it never renders and never unfurls.
  { path: "/world", component: "Navigate", og: { strategy: "none" }, indexable: false },
  // Not indexable, but it still gets a card: people do share dead links, and
  // it should look like this site rather than like nothing.
  { path: "*", component: "NotFound", og: { strategy: "page", slug: "notfound" }, indexable: false },
];

// Paths that are allowed to have no card at all. Listing one here is an
// explicit, reviewable act; omitting a route from the manifest is not.
export const OG_EXEMPT_PATHS = ["/admin/*", "/world"];

export const manifestFor = (path) => ROUTE_MANIFEST.find((entry) => entry.path === path) || null;

export default ROUTE_MANIFEST;
