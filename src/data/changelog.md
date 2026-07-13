---
---
# Changelog

All notable changes to this project are documented here.
Versioning follows the semver-style rules in CLAUDE.md: major for new pages/refactors/redesigns,
minor for features and content additions (at most one minor version per calendar week),
patch for fixes and tweaks.

---

## [v11.2.0] — 2026-07-13

### Added

- **Full share-image editor** (`src/components/share/ShareImageModal.js`, `src/components/share/ShareCard.js`): The "Share as image" popup grew from three backgrounds into a full editor, for every content type (micro-blog, 100-days blogs, books, treks, races, instagram). Seventeen themes in five families — Core (Light / Dark / Abstract), Editorial (Sepia / Ivory / Charcoal / Midnight), Gradient (Sunset / Ocean / Forest / Aurora), Texture (Notebook / Terminal / Blueprint / Newsprint) and Signature (Letterpress / Neon) — picked from a grouped swatch grid that previews each card background. New Square (1:1) and Story (9:16) shapes join Portrait and Auto. Text controls let you restyle the body as plain text, a serif quote, or a bold headline, switch the font (sans / serif / mono), size (Auto/S/M/L) and alignment; the Terminal theme defaults to mono and Letterpress to serif for Marathi quote posts. Toggles control inclusion of the timestamp, tags, and the handwritten signature on the exported card.
- **Footer on atlas pages** (`src/atlas/regions/RegionShell.js`): Atlas-mode region pages now end with the same classic footer (copyright + Mail / GitHub / LinkedIn / Instagram) as the classic shell, so every content page closes the same way in both modes. The full-screen map hub stays footer-free.

### Changed

- **Admin dashboard sheds atlas chrome** (`src/App.js`, `src/pages/admin/Dashboard.js`, `src/components/Template/FloatingToggle.js`): In atlas mode the world HUD (compass menu, return-to-map portal, passport, sound and day/night buttons) no longer mounts over `/admin`, and the admin's floating corner control now shows only the light/dark theme toggle — the "Enter the Atlas" button is gone there. `FloatingToggle` gained a `showAtlasSwitch` prop for this.
- **Share-model timestamps** (`src/components/share/shareCardConfig.js`): Date meta rows are now flagged `isDate`, which powers the editor's timestamp toggle across all content types.

---

## [v11.1.0] — 2026-07-11

### Added

- **Map zoom controls** (`src/atlas/map/MapControls.js`, `src/atlas/map/worldMap.css`): An on-screen zoom-in / zoom-out / reset cluster at the bottom-left of the map hub, so touch users and wheel-less pointer users get the affordances the wheel/pinch gestures assume. Reset flies the camera back to the resting view (the same target as the Escape key) — the escape hatch when a pinch strands the view. Fades out during a fly-in.
- **"Enter the Atlas" button** (`src/components/Template/FloatingToggle.js`): A floating action button in the classic shell that switches back to the Wanderer's Atlas — the mirror of the passport's "Switch to Classic". Previously classic view was a one-way trip: there was no in-app way back into the atlas once you left it. Setting the stored view outranks the reduced-motion default, so it works even for a visitor who was auto-routed to classic.
- **Stats placard on the map hub** (`src/atlas/map/StatsWidget.js`, `src/atlas/map/WorldMap.js`): A floating "Life in Numbers" card hangs in the sky above the Book Forest, showing headline counts (books · treks · races · micro-posts) from the hand-maintained `atlasStats.js`. Clicking or activating it jumps straight to the `/stats` page. It's a real `role="link"` element with keyboard (Enter/Space) and screen-reader support, lifts on hover/focus like the region plaques, and inherits the reader biome's accent so it reads as part of the world.

### Changed

- **Map hub fits every region on mobile** (`src/atlas/map/WorldMap.js`, `src/atlas/map/mapRegions.js`): The hub now rests on the whole map on every viewport instead of zooming ~1.6× onto the hometown on phones. Small screens switch the SVG from fill-and-crop (`slice`) to fit (`xMidYMid meet`), so all six worlds sit in one window — centered vertically, with sky filling evenly above and below; wider screens keep the immersive full-bleed slice. Removes the now-unused `HOME_VIEW`.
- **Instant orbit arrival, no cold-load API** (`src/atlas/intro/OrbitStage.js`, `src/data/atlasStats.js`): The atlas arrival (orbit) stage no longer waits on Supabase before it can paint. The teaser counts (races · treks · books · micro-posts) now read from hand-maintained numbers in the new `atlasStats.js`, and the arrival globe shows the six worlds as static markers built from the `DOMAINS` constant. This drops five list fetches plus a microblog COUNT query from the very first screen a visitor sees — the slow first paint on mobile networks. Live, per-item content still loads the moment the visitor enters the world.

---

## [v11.0.0] — 2026-07-10

**The Wanderer's Atlas.** The site is now an explorable illustrated world. You
arrive in orbit above a globe, dive through the clouds, and land on a hand-drawn
2.5D map whose six regions are the six things this site is about. Every page is
a place inside one of them. The old editorial layout is still here — one click
away, and automatic if you ask for reduced motion — but it is no longer the
front door.

Built as sixteen phases on a single branch behind an `ATLAS_LIVE` flag and a
hidden `/world` preview route; this entry is the whole story, landing at once.

### Added

- **The atlas homepage** (`src/atlas/AtlasHome.js`, `src/atlas/intro/`): an orbit → dive → map state machine. `OrbitStage` reuses the existing homepage globe through a new `mode="orbit"`, and `DiveSequence` + `CloudBloom` play a ~3.5s GSAP plunge through a whiteout into the map. The intro is skippable, remembered (`introSeen`), replayable from the passport, and reduced to a quiet fade under `prefers-reduced-motion`.
- **The map hub** (`src/atlas/map/`): a layered SVG world — sky, far backdrop, mid biomes, near props, easter eggs, labels — with pan/zoom/pinch, keyboard-navigable region hotspots with an offscreen screen-reader mirror, a pointer-parallax rig (`parallax.js`), and a fly-in that hands off to the router.
- **Six biomes as code** (`src/atlas/map/art/`): Book Forest, Coast, Ridge, Scriptorium, Workshop and Hometown Square, drawn as flat-vector SVG-in-JSX against a per-file size budget. Each has idle life (drifting clouds, turning gears, waves) and a night state — lit windows, stars, fireflies — driven entirely by CSS custom properties.
- **Region interiors** (`src/atlas/regions/`): `RegionShell` renders each content page inside its biome — themed header band, breadcrumb, parchment column, region accent tokens — from a single truth table (`registry.js`) that also feeds the compass menu. Page content is untouched between shells.
- **The world HUD** (`src/atlas/hud/`): compass menu (every page, grouped by region), passport, sound toggle, day/night sun-moon, and a return portal, mounted once outside the router so it survives navigation.
- **Gamification** (`src/atlas/gamification/`): a pure `questEngine` over Explorer/Collector quests, achievements, and five hidden easter eggs — two of them night-only. Progress lands as passport stamps with confetti and a reward toaster. Everything is local: no accounts, no server.
- **Persistent world state** (`src/atlas/world/`): an `atlas.v1` localStorage schema behind a reducer + debounced writer, with a pure, tested migration that seeds your passport from the old `globe-visited-worlds` key — so anyone who explored the globe already has stamps.
- **Day/night** (`src/atlas/theme/`): `--atlas-*` design tokens under `.atlas-root[data-time]`, coupled one-way to the existing `ThemeContext`, and set automatically from the visitor's local hour (19:00–06:00 → night) on first visit.
- **Ambient audio** (`src/atlas/audio/`, `public/audio/`): a hand-rolled ~150-line WebAudio manager — no library — that loads nothing until you turn sound on, then cross-fades a per-region bed. The seven loops and the SFX sprite are procedurally synthesised by `scripts/generate-atlas-audio.mjs` (filtered noise + sine partials), so the repo owns its audio outright. Off by default.
- **A guide** (`src/atlas/guide/`): a flat-vector mini Sanket who pops in with one line at a time — a welcome, a nudge toward the passport, a hint that sound exists. Each beat is acknowledged once, forever. Replaces the react-joyride tour.
- **Two-shell plumbing** (`src/atlas/PageShell.js`, `src/atlas/useViewMode.js`, `src/config/featureFlags.js`, `src/components/Template/PageMeta.js`): one route table, two shells. View mode resolves synchronously — `?view=` param, then stored choice, then reduced-motion, then the flag — so the first paint is never wrong. `PageMeta` is shared, so page metadata cannot fork between shells.
- **`src/styles/classic.css`**: bare-element defaults for the classic shell, scoped to `.classic-root` and wrapped in `:where()` so a utility class always wins. The counterpart to the `.atlas-root` reset.
- **Flip tests** (`src/__tests__/AppAtlas.test.js`): assert that `/` serves the map, that the classic nav is absent, and that `/world` redirects.

### Changed

- **`/` is the atlas** (`src/App.js`, `src/config/featureFlags.js`): `ATLAS_LIVE` is now `true`, and a new `HomeRoute` picks the world map or the editorial homepage per shell. Classic remains reachable via `?view=classic`, the passport's "Switch to Classic" kill switch, and `prefers-reduced-motion`.
- **`/world` redirects to `/`** (`src/App.js`, `functions/_middleware.js`): the preview route now 301s at the edge and `<Navigate>`s in-app; its `X-Robots-Tag: noindex` is gone, and the atlas homepage is indexed as `/`.
- **`GlobeRenderer`** (`src/components/Index/GlobeRenderer.js`): gained an `orbit` mode (chrome hidden, auto-rotating, imperative `plunge()` handle). three.js stays exactly as lazy as before — the atlas intro shares the homepage's chunk.
- **`usePanZoom` and `confetti` promoted** (`src/hooks/usePanZoom.js`, `src/atlas/lib/confetti.js`): moved out of MindMap/globe into shared homes, with re-export shims at the old paths.
- **Body base styles** (`src/tailwind.css`): the `body` rule finally applies — the legacy stylesheet loaded after Tailwind and had been silently winning — and now tracks the theme instead of pinning a near-black background.
- **`docs/architecture.md`**: styling section rewritten now that Tailwind is the only system.

### Removed

- **The HTML5UP theme** (`src/static/css/`, 28 files, ~3,960 lines of SCSS, and the `sass` devDependency): every class it defined was dead once the page waves finished migrating content to Tailwind, and its `!important` element globals only fought them. The entry stylesheet drops from **164.17 KB to 102.24 KB raw (25.90 → 15.85 KB gzipped)**.
- **react-joyride** and its tour system (`TourContext.js`, `TourGuide.js`, `TourMount.js`, `tourSteps.js`), plus the 28 now-inert `data-tour` attributes it left across 19 components. Dropping it (~40 KB) roughly paid for GSAP (~30 KB), which is confined to lazy atlas chunks. The entry bundle ends at **149.66 KB gzipped**, within the 5 KB budget set at the start.
- The `#wrapper`/`#main` ID styling hooks, the admin checkbox's inline-style workaround, and the `!important` marks in the `.atlas-root` reset — all of them scaffolding against the deleted stylesheet.

### Fixed

- **`rounded-full` was not round** (`tailwind.config.js`): it had been overridden to `0.75rem`. That looks correct only on elements short enough for the browser to clamp the radius to half their height — dots and progress bars — and had quietly squared off every avatar, icon button and tag pill on the site. Restored to `9999px`.
- **Markdown headings on `/changelog`**: the legacy `h1–h6 { text-transform: uppercase }` global was overriding the prose styles, shouting every version heading. Removed with the stylesheet.
- **Region header art** (`src/atlas/map/art/biomeLife.css`): headers reuse the biome components but never loaded the map's stylesheet, so their halos and light beams rendered at full daytime opacity regardless of the hour. The day/night switches now live in a stylesheet the art itself imports.

---

## [v10.4.0] — 2026-07-06

### Added
- **"My World" interactive 3D globe on homepage** (`src/components/Index/GlobeShowcase.js`, `src/components/Index/GlobeRenderer.js`, `src/components/Index/globe/`, `src/data/homeFeatures.js`): A new homepage section renders an abstract WebGL globe (react-globe.gl/three.js) with six themed "worlds" — Marathons, Treks, Writer, Reader, Creator, Person — each anchoring a spiral of clickable content pins (races, treks, blog posts, books, projects, site features), procedural hexagon terrain, a radar ring, and a cross-fading background artwork. Clicking a pin opens a rich detail card (extended MindMapDetailPanel with a new `feature` type). The globe and its three.js dependency are code-split via React.lazy and only mount once the section scrolls into view.
- **Globe exploration features** (`src/components/Index/GlobeRenderer.js`, `src/components/Index/globe/`): Always-visible domain legend chips with item counts (click to fly), an active-domain glass info card with a "View all" link, constellation arcs linking the active domain's pins, an auto-play mode that drifts world-to-world, a "Replay my journey" mode that rotates the globe through all six worlds in turn — round-robin, a few stops per world — with a comet arc and section-labelled captions, a dark-mode twinkling starfield, a gamified "worlds explored" tracker with a one-time confetti celebration, a first-visit "drag to explore" coach mark, and shareable deep links (`/?world=treks`).
- **Get Started site tour with per-page walkthroughs** (`src/components/Template/TourGuide.js`, `src/components/Template/TourMount.js`, `src/context/TourContext.js`, `src/data/tourSteps.js`, `src/components/Template/FloatingToggle.js`): A guided walkthrough (react-joyride, lazy-loaded only when started) launched from a new floating "Get Started" button above the dark-mode toggle. Each page has its own content-aware tour keyed by route — the homepage walks the whole menu bar (opening the "More" dropdown to reveal its items) plus the globe/stats/explore highlights, while every other page spotlights its own content (e.g. the Sports view tabs, the 100-Days progress map, the Micro Blog search). Steps whose targets aren't visible at the current breakpoint are filtered out, so desktop-nav vs. mobile-hamburger steps swap automatically. First-time visitors get a dismissible "take the tour?" prompt bubble.

### Changed
- **Homepage feature list hoisted** (`src/data/homeFeatures.js`, `src/pages/Index.js`): The 12-entry feature-grid array moved out of Index.js into a shared data module so both the feature grid and the new globe pins consume the same source of truth.
- **Globe scroll rotation refined** (`src/components/Index/GlobeRenderer.js`): Page scroll still drifts the globe between worlds, but gentler, and it pauses while dragging, while a detail card is open, when the section is off-screen, and under `prefers-reduced-motion`.
- **Globe accessibility & mobile** (`src/components/Index/GlobeRenderer.js`): Pins are keyboard-focusable (Enter/Space opens details), pin labels declutter to hover/zoom reveal, controls are always visible on touch devices, and all animated extras respect `prefers-reduced-motion`.
- **Globe image assets compressed** (`public/images/globe/`): Background artwork and globe textures converted from 0.6–1.2MB PNGs to ≤235KB JPEGs; six unused per-domain texture PNGs (~6.7MB), the unused earth day/night textures, and the obsolete `src/data/geo/placeCoordinates.js` lookup were removed.

## [v10.3.0] — 2026-07-02

### Added

- **Substack RSS Pages Function** (`functions/rss-feed.js`): New Cloudflare Pages Function that fetches the "The Wanderer's Technical Anecdotes" Substack feed server-side (Substack blocks CORS), parses the `<item>` blocks with a dependency-free regex parser, edge-caches the result for 30 minutes, and serves it as same-origin JSON at `/rss-feed`.
- **Latest Writing feed** (`src/components/Index/LatestPosts.js`): Homepage section that renders the live Substack feed in a scroll region, revealing 10 posts at a time as the reader scrolls (IntersectionObserver on a sentinel). Fails silently if the feed is unavailable.
- **Monthly Digest dashboard** (`src/components/Index/MonthlyDigest.js`): Auto-aggregating homepage dashboard that groups blogs, micro-posts, treks, marathons, and books by their content month, with a dropdown month picker (only months that have content), KPI count-tiles, and a capped list per type (~6 items, "View all →" to the section page). Sections are laid out in fixed rows — Blogs + Micro Posts, then Treks + Marathons, then Books. Items link to their internal detail routes. (Books have no month-precise date, so they bucket by `created_at`.)
- **Month/date helpers** (`src/lib/monthDigest.js`): Dependency-free `parseContentDate`/`monthKey`/`monthLabel`/`monthRange`/`itemMonthKey` that reconcile the three content date formats (blogs `YYYY-MM-DD`, treks `DD-MM-YYYY`, sports `Month DD, YYYY`) plus microblog ISO dates, falling back to `created_at`.
- **Microblog month queries** (`src/lib/api/microblog.js`): `getMicroblogMonths()` (distinct content months for the dropdown) and `getMicroblogByMonth()` (capped, counted month slice via the `date` index).

### Changed

- **Homepage** (`src/pages/Index.js`): Added the "Latest Writing" and "Monthly Digest" sections above "Explore".
- **Blogs/treks/sports read-mappers** (`src/lib/api/{blogs,treks,sports}.js`): Expose `created_at` from each row (read-only) so the digest's date fallback can use it.
- **Latest Writing feed default** (`src/components/Index/LatestPosts.js`, `src/pages/Index.js`): The RSS feed now shows 5 Substack posts initially (and reveals 5 more per scroll) instead of 10.
- **Project docs** (`CLAUDE.md`): Rewrote the stale content-pipeline instructions — the markdown/`cms:sync` CMS flow was removed, so the docs now describe Supabase as the single source of truth (admin dashboard, `src/lib/api/*`, `media` storage bucket) and note the new homepage RSS/digest sections.

---

## [v10.2.4] — 2026-06-30

### Fixed

- **"Is current month" toggle in the Now · Months admin editor** (`src/pages/admin/FormField.js`): The boolean checkbox was invisible and felt un-editable. The vendored HTML5UP form stylesheet (`src/static/css/components/_form.scss`) applies a global `input[type="checkbox"] { appearance: none; opacity: 0; float: left; }` rule (the skel pattern that hides the real box and draws a fake one via a paired `<label>`), and that attribute selector outranks the Tailwind utility classes on the admin checkbox. Restored native rendering with inline styles (which win over the no-`!important` legacy rule) so the toggle is visible and clickable again.

---

## [v10.2.3] — 2026-06-17

### Fixed

- **Share-as-image hero crop** (`src/components/share/ShareCard.js`): The included photo was forced into a full-width, fixed-height box with `object-cover`, cropping portrait/landscape images. The image now keeps the fixed height but takes a dynamic width from its natural aspect ratio and is centered, so the whole photo is shown un-cropped.

---

## [v10.2.2] — 2026-06-16

### Fixed

- **Dynamic metadata for individual micro-blog posts** (`functions/_middleware.js`, `src/pages/MicroBlogPost.js`): Per-post social/SEO metadata was effectively generic — the OG/page **title** was a bare date stamp (`Post · <date>`) instead of the post's content, the share **image** was always the site logo, and on any Supabase fetch miss a post fell back to the site-wide default meta (every other dynamic route degrades to its section listing). Posts now derive a content-based title, use the post's own `image_url` for `og:image` when present, and fall back to the **Micro Blog** section meta.
- **Crawler/client metadata drift on every detail route** (`functions/_middleware.js`, `src/pages/{TrekPost,SportPost,BookPost,BlogPost,ProjectPost}.js`): The Cloudflare middleware (what crawlers/social cards see) and the client-side react-helmet tags derived their `og:title` / `og:description` independently, with different wording — and the client pages didn't pass a per-item `og:image` at all, so the share image fell back to the section default while the crawler used the item's photo. Treks, sports, books, 100-Days blogs, and projects now all build their meta through one shared per-type helper used by both layers, so crawler and client tags are identical and the item image is used on both.

### Added

- **Shared per-type meta helpers** (`src/data/pageMeta.js`): Pure, import-free `buildMicroblogMeta`, `buildTrekMeta`, `buildSportMeta`, `buildBookMeta`, `buildBlogMeta`, and `buildProjectMeta` — each returns a bare `{ title, description, image }` and is consumed by BOTH the client detail page and the esbuild-bundled Cloudflare middleware so the two can never drift. Covered by `src/data/pageMeta.test.js`. (Instagram has no per-post detail route, so no per-post metadata applies there.)

---

## [v10.2.1] — 2026-06-15

### Fixed

- **Sidebar/content overlap at desktop widths on every page** (`src/static/css/layout/_wrapper.scss`, `src/layouts/Main.js`): The vendored HTML5UP `#wrapper` rule styled the layout container by **ID** (`display: flex; flex-direction: row-reverse`) and forced `display: block` at the skel `large` breakpoint (`≤1280px`), which outranks the Tailwind layout utilities on the same element. Between `lg` (1024px) and 1280px the sidebar (profile / about / résumé) and the main content collapsed into an overlapping block stack. Removed the legacy layout declarations and set `lg:flex-row-reverse` on the wrapper in `Main.js` so Tailwind owns the layout — the sidebar keeps its original right-hand column position across all desktop widths, without the overlap.

---

## [v10.2.0] — 2026-06-17

### Changed

- **Home page layout** (`src/pages/Index.js`): Reordered the page so the **Life in Numbers** stats band and a new **In 1 Minute** intro now sit directly under the hero, with the section-navigation cards moved below them under a new **Explore** header.
- **Life in Numbers** (`src/components/Index/LifeStats.js`): Expanded from 4 to 6 stat cards — added **Projects Built** and **Micro Posts** (live Supabase count) alongside Books, On Foot, Treks, and Posts. Cards use the compact single-row strip styling from the About page — 3-up on mobile, all six in one line on tablet/desktop.
- **Micro Blog post actions** (`src/components/MicroBlog/PostModal.js`, `src/pages/MicroBlogPost.js`): Added the new **Export as image** action alongside the existing Share/Copy/Permalink controls. Extracted the duplicated `typeColors`/`sourceLabels` maps from `PostModal.js`, `MicroBlogPost.js`, and `PostCard.js` into a shared `src/components/MicroBlog/constants.js`.
- **Unified micro-blog image export** (`src/components/MicroBlog/ExportImageButton.js`): Now delegates to the shared `ShareImageButton` (`kind="microblog"`) instead of its own bespoke template, so micro-blog exports share one code path with every other content type and gain the customization popup, the three backgrounds, and native share.
- **"Share as image" across content** (`src/components/Sports/MarathonDetailsModal.js`, `src/components/Treks/TrekDetailsModal.js`, `src/components/Books/DigitalLibrary.js`, `src/pages/OneHundredDays.js`, `src/components/Instagram/Post.js`): Added an **Image** action alongside the existing Share/Copy/Permalink controls (inline on each Instagram post, which has no modal). The same **Image** action also sits in the header of the standalone detail pages (`src/pages/{BookPost,BlogPost,SportPost,TrekPost}.js`) next to their Share control, so an item can be exported straight from its permalink.
- **Admin multi-tag input** (`src/pages/admin/FormField.js`): Replaced the comma-separated `type: "tags"` text box with a chip editor — type and press Enter or comma to add, ×/Backspace to remove, with case-insensitive dedupe. The value stays a `string[]`, so books, 100-Days blogs, Instagram, micro-blog, and résumé skills all benefit unchanged.

### Added

- **`OneMinuteIntro`** (`src/components/common/OneMinuteIntro.js`): Shared "In 1 Minute" intro blurb, now rendered on both the home page and the About page (`src/components/About/AboutDocument.js`) so the two never drift.
- **`getMicroblogCount()`** (`src/lib/api/microblog.js`): Lightweight head-only Supabase count of micro-blog posts, used by the home-page stats band.
- **`ExportImageButton`** (`src/components/MicroBlog/ExportImageButton.js`): Exports a single micro-blog post as a branded PNG card (via `html-to-image`). Renders an off-screen, fixed light-theme template — site branding, date, type badge, full post text (with quote styling), tags, source, and a permalink watermark — then downloads it as `microblog-<id>.png`. Available from both the list-view modal and the single-post page.
- **Shared "Share as image" module** (`src/components/share/`): A reusable exporter that turns any content item — micro-blog, book, 100-Days blog, Instagram post, marathon, or trek — into a branded PNG via `html-to-image`. `ShareImageButton` opens a customization popup (`ShareImageModal`) with a live preview offering **Light / Dark / Abstract** backgrounds, **Portrait (1080×1350)** or **Auto-height**, an optional hero image, and **Download** or native **Share**. One presentational `ShareCard` renders every type through per-type adapters in `shareCardConfig.js`; the card carries theme-aware brand marks — logo and signature variants in `public/images/brand/` chosen to match each background — and hides any that are missing. The logo PNGs are downscaled to 500 px (~75 KB, from ~600 KB) so they stay light when `html-to-image` embeds them into each export.

---

## [v10.1.2] — 2026-06-14

### Added
- **`sitemap.xml`** (`public/sitemap.xml`): Static XML sitemap covering all 17 public routes with priorities and change frequencies, served at the site root for search engine discovery.
- **`agents.md`** (`public/agents.md`): AI-agent discovery file (llms.txt-style) with rich context about Sanket Tambare — professional background, site sections, social links, tech stack, and content inventory.
- **`llms.txt`** (`public/llms.txt`): Standard llms.txt file following the llmstxt.org spec — H1 title, blockquote summary, and markdown link sections covering About, Content, Meta, and an optional pointer to agents.md for extended context.

### Changed
- **`robots.txt`** (`public/robots.txt`): Added `Disallow: /admin/`, explicit AI-crawler Allow blocks (GPTBot, Claude-Web, CCBot, anthropic-ai, PerplexityBot), and a `Sitemap:` directive pointing to the new sitemap.xml.

---

## [v10.1.1] — 2026-06-13

### Changed

- **Admin Dashboard** (`src/pages/admin/Dashboard.js`): Active tab is now synced to the URL via `?tab=<key>` query param using `useSearchParams`. Deep-linking to a specific tab (e.g. `/admin?tab=__microblog`) now works correctly, and the browser back/forward buttons navigate between tabs.

### Added

- **Share, Copy, and Permalink in detail modals** (`src/components/Treks/TrekDetailsModal.js`, `src/components/Sports/MarathonDetailsModal.js`, `src/components/Books/DigitalLibrary.js`, `src/pages/OneHundredDays.js`, `src/components/MicroBlog/PostModal.js`): Every detail modal footer now has three actions — **Share** (Web Share API on mobile, clipboard fallback on desktop), **Copy** (always clipboard), and **Permalink ↗** (opens the dedicated detail page). All show a 2-second confirmation on success.

---

## [v10.1.0] — 2026-06-13

### Added

- **Micro Blog tabs** (`src/pages/MicroBlog.js`): Split the page into a **Posts** tab (existing search/filter UI) and a **Stats** tab showing total post count, date range, unique tag count, post-type breakdown (text/quote/photo) with percentage bars, source breakdown, and top 15 tags ranked by post count.
- **Sort controls** (`src/pages/MicroBlog.js`, `src/lib/api/microblog.js`): Added **Newest / Oldest / Shuffle** sort options to the Posts tab. Date sorts are server-side (Postgres `ORDER BY date`); Shuffle does a client-side Fisher-Yates randomisation — clicking Shuffle again re-shuffles without a new network request.
- **`getMicroblogStats()`** (`src/lib/api/microblog.js`): New API function that fires 8 parallel Supabase queries to build the Stats panel data.
- **Micro Blog post permalinks** (`src/pages/MicroBlogPost.js`, `src/App.js`): Added `/micro-blog/:id` as a dedicated page for individual posts — full text, all tags, source info, and a back link to the archive.
- **Per-post OG meta** (`functions/_middleware.js`): The Cloudflare Pages middleware now detects `/micro-blog/:id`, fetches the post from Supabase REST at the edge (using `SUPABASE_URL` + `SUPABASE_ANON_KEY` env vars set in the CF Pages dashboard), and injects per-post title and description into OG/Twitter meta tags for correct social-share previews.
- **Permalink links** (`src/components/MicroBlog/PostCard.js`, `src/components/MicroBlog/PostModal.js`): Each post card now shows a subtle ↗ permalink; the detail modal shows a "Permalink ↗" link in the footer.
- **Detail pages for all content types** (`src/pages/TrekPost.js`, `SportPost.js`, `BookPost.js`, `ProjectPost.js`, `BlogPost.js`): Added individual permalink pages for treks (`/treks/:id`), races (`/sports/:id`), books (`/books/:id`), projects (`/projects/:id`), and 100-days posts (`/100-days-to-offload/:id`). Each page has a share button (Web Share API / clipboard fallback), full item details, and a back link. Permalink ↗ links added to all corresponding card/list components.
- **Share button** (`src/pages/MicroBlogPost.js`, and all new detail pages): Share button in the top-right of every detail page — uses `navigator.share()` on mobile, falls back to clipboard copy with "Copied!" confirmation.
- **Content Tags section** (`src/pages/Stats.js`): New full-width bento card on the Stats page showing all book tags, all 100-days blog tags, and top-40 microblog tags — each with post counts, loaded from their respective data sources.

---

## [v10.0.0] — 2026-06-13

### Added

- **Micro Blog page** (`src/pages/MicroBlog.js`, `src/components/MicroBlog/`): New `/micro-blog` page — a searchable, paginated archive of short posts imported from Tumblr (1,600+ posts). Server-side full-text search (Postgres `tsvector`), tag/source/type filters, load-more pagination, and a detail modal. Added to the main nav (`src/data/routes.js`) and per-route meta (`src/data/pageMeta.js`).
- **`microblog` table** (`supabase/migrations/0002_microblog.sql`): New Supabase table with a generated `search_tsv` full-text index (GIN), tags/date indexes, RLS (public read / owner write), and a `microblog_tag_facets()` RPC for the filter UI. Carries a `source` column so Instagram can be added later.
- **Tumblr importer** (`scripts/import-tumblr-microblog.mjs`, `npm run microblog:import`): Re-runnable script that cleans the Tumblr export (`knowledge_base/tumblr_posts.json`) and upserts on `(source, source_id)` — idempotent and non-destructive to admin-authored posts.
- **Micro Blog data API** (`src/lib/api/microblog.js`): `searchMicroblog()` (server-side full-text search + tag/source/type filters + pagination), `getMicroblogTagFacets()`, and CRUD via the shared `createResource` factory.
- **Admin Micro Blog manager** (`src/pages/admin/MicroblogManager.js`, `src/pages/admin/Dashboard.js`): New admin tab with a server-side searched/paginated list and a create/edit/delete form for adding posts manually.
- **Shareable filters** (`src/pages/MicroBlog.js`): The search query, tags, source, and type filters are mirrored into the URL query string (`?q=&tags=&source=&type=`) and initialise from it, so filtered views are bookmarkable and survive a reload.

---

## [v9.1.6] — 2026-06-13

### Fixed

- **SideBar** (`src/components/Template/SideBar.js`): Profile photo was broken on the deployed site because `const { PUBLIC_URL } = process.env` is not replaced by Vite's `define` (only the literal `process.env.PUBLIC_URL` token is). Replaced with a plain `/images/me.jpg` root-relative path.

---

## [v9.1.5] — 2026-06-13

### Added

- **Admin dark mode toggle** (`src/pages/admin/Dashboard.js`): Added `FloatingToggle` to the admin dashboard so the dark/light mode toggle is available on `/admin` pages, consistent with the rest of the site.

---

## [v9.1.4] — 2026-06-13

### Changed

- **Sports admin form** (`src/pages/admin/resources.js`, `src/pages/admin/FormField.js`): Date field now uses a native date picker (`input[type="date"]`) with automatic conversion between the stored `"Month DD, YYYY"` format and the browser's `YYYY-MM-DD` input format. Distance field replaced with a select dropdown (10 Kms, 21 Kms, 35 Kms, 42 Kms, 50 Kms) plus an "Other" option that reveals a free-text input for custom values.

---

## [v9.1.3] — 2026-06-13

### Added

- **Wrangler config** (`wrangler.toml`): Added Cloudflare Pages wrangler config with `[vars]` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Service role key stays out of the file and must be set as a secret via `wrangler pages secret put`.

---

## [v9.1.2] — 2026-06-13

### Changed

- **Docs** (`docs/`): Removed 6 obsolete documents (`cms-data-flow.md`, `cms-github-oauth-setup.md`, `customization.md`, `improvement-plan.md`, `supabase-migration-plan.md`, `features.md`). Rewrote `architecture.md`, `deployment.md`, and `setup_guide.md` to reflect the current Supabase-backed stack. Kept `contributing.md` unchanged.

---

## [v9.1.1] — 2026-06-13

### Changed

- **Static image assets** (`public/images/`): Deleted `sports/`, `treks/`, `insta_posts/`, `projects/`, and `nirman_story/` subdirectories (205 files). All images are now served from Supabase Storage via `toStorageUrl`; the local copies were redundant. Kept `favicon/`, `me.jpg`, `logo.png`, and `logo.svg` which are still referenced in static code.

---

## [v9.1.0] — 2026-06-13

### Added

- **Supabase Storage URL helper** (`src/lib/supabaseClient.js`): `toStorageUrl(path)` and `toStorageImages(slideImages)` convert relative `/images/…` paths stored in the DB to full Supabase Storage public URLs at read time. Paths that already begin with `http` are returned unchanged, keeping admin-uploaded images and legacy paths coexistent.
- **Bulk image upload script** (`scripts/upload-images-to-supabase.mjs`, `npm run images:upload`): Walks `public/images/` (skipping `favicon/`) and uploads all 205 images to the `media` Storage bucket, preserving the existing subfolder structure. Re-runnable via upsert.

### Changed

- **Image API mappers** (`src/lib/api/sports.js`, `treks.js`, `instagram.js`, `projects.js`): `fromRow` now applies `toStorageImages` / `toStorageUrl` so every image served by these APIs resolves to the Supabase Storage CDN URL automatically.
- **Interactive Me tab synced to URL query param** (`src/pages/InteractiveMe.js`): Active tab (Sports / Treks) is now reflected in `?tab=sports` / `?tab=treks`. Navigating directly to either URL pre-selects the correct tab; the Share button copies the full URL so recipients land on the same view. Invalid or missing `tab` param defaults to Sports.
- **CMS pipeline removed** (`public/cms/`, `src/cms-content/`, `src/data/{books,sports,treks,projects,instagram,100DaysToOffload}.js`, `src/data/resume/`, `scripts/sync-cms-to-data.js`, `scripts/seed-cms-content.js`): Decap CMS config, all canonical markdown, and generated JS data files deleted now that Supabase is the source of truth. Removed `prebuild`/`cms:sync`/`cms:seed`/`cms:server` npm scripts, the CI data-drift check, and `scripts` from the ESLint pattern (remaining scripts are `.mjs`).
- **Aggregation pages fully migrated to Supabase** (`src/pages/Stats.js`, `src/pages/MindMap.js`, `src/components/About/AboutDocument.js`, `src/components/Index/LifeStats.js`, `src/components/InteractiveMe/InteractiveMeTimeline.js`): Removed all remaining static `src/data/*.js` imports from these consumers; switched to `useBooks`/`useSports`/`useTreks`/`useBlogs`/`useProjects`/`useInstagram`/`useResume` hooks. Stats shows a full-page loading state until all 6 collections resolve; About, LifeStats, and InteractiveMe degrade gracefully (zeros/empty) while loading. MindMap `categories` array moved inside component as a `useMemo`. All `useMemo` dep arrays updated to include the data variables.

---

## [v9.0.0] — 2026-06-13

### Added

- **Supabase backend integration** (`supabase/migrations/0001_initial_schema.sql`, `src/lib/supabaseClient.js`, `src/lib/api/*`): Postgres schema for all dynamic content (books, sports, treks, projects, blogs, instagram, resume sub-collections, now months + meta) with `updated_at` triggers, Row-Level Security (public read, owner-only writes via `is_owner()`), and a public `media` storage bucket. Added `@supabase/supabase-js` and a per-entity data-access layer that maps DB rows to existing component shapes.
- **Content provider + live data hooks** (`src/context/ContentContext.js`, `src/hooks/useCollection.js`): Lazy, cached per-collection fetching exposed via `useBooks`/`useSports`/`useTreks`/`useProjects`/`useBlogs`/`useInstagram`/`useResume`/`useNowMeta`/`useNowMonths`; shared loading/error/empty UI in `src/components/common/AsyncStates.js`.
- **Admin editor** (`src/pages/admin/*`, route `/admin`): Email+password login (Supabase Auth), session guard, and a schema-driven CRUD dashboard for every content type with image upload to Supabase Storage and a dedicated Now-meta editor.
- **One-time import script** (`scripts/import-to-supabase.mjs`, `npm run data:import`): Seeds the canonical `src/cms-content/**` markdown into Supabase using the service-role key (run locally once).

### Changed

- **Public content pages now fetch live from Supabase** (`src/pages/{Books,Projects,Resume,Now,OneHundredDays,Sports,Treks}.js`, `src/components/{Instagram/Posts,Sports/*,Treks/*}.js`): Switched from static `src/data/*.js` imports to the content hooks, with loading/error states and corrected `useMemo` dependencies. Aggregation/visualization pages (Stats, About, Index, MindMap, InteractiveMe) still read the static data files and will migrate in a follow-up before those files are removed.

### Notes

- Requires provisioning a Supabase project and setting `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`). Without them the public pages render a graceful error state and `/admin` shows a configuration notice. See [docs/supabase-migration-plan.md](../../docs/supabase-migration-plan.md) for setup steps.

---

## [v8.0.1] — 2026-06-13

### Added

- **Supabase migration plan** (`docs/supabase-migration-plan.md`): Design document for moving dynamic content (books, sports, treks, projects, 100-days blogs, instagram, resume, now-page) from the static markdown pipeline to a Supabase/Postgres backend with a custom in-app `/admin` editor. Recommends a single repository, live runtime fetch via `@supabase/supabase-js` with Row-Level Security, email+password auth, and a phased migration with verification steps. Planning only — no app code or dependencies changed.

---

## [v8.0.0] — 2026-06-13

### Changed

- **Build system: Create React App → Vite** (`vite.config.js`, `package.json`, `index.html`): `react-scripts` (EOL, unmaintained) replaced with Vite 6. `index.html` moved to the project root with `%PUBLIC_URL%` placeholders resolved; `process.env.PUBLIC_URL` shimmed via `define` so the generated data files keep working unmodified; an esbuild loader shim lets JSX stay in `.js` files; build output remains `build/` so the Cloudflare Pages config is untouched. Production build now completes in ~4s and `npm audit` drops from 67 findings to 19 (0 critical).
- **Now page data loading** (`src/utils/parseNowCms.js`): webpack's `require.context` replaced with Vite's `import.meta.glob` for the month/meta markdown files; jest maps the module to a stub (`parseNowCms.jest-stub.js`) since the CJS test runtime cannot evaluate `import.meta`.
- **Changelog page** (`src/pages/Changelog.js`): markdown fetched via Vite's `?url` import suffix.
- **Tooling** (`package.json`, `jest.config.js`, `.eslintrc`): `jest` and `jest-environment-jsdom` became explicit devDependencies (previously transitive via react-scripts); `import/no-unresolved` taught to ignore Vite's `?url` suffix.

---

## [v7.1.0] — 2026-06-13

### Added

- **Race stats util** (`src/utils/raceStats.js`): Personal-best selection and race-time parsing/formatting extracted from the Stats page into pure, unit-tested helpers (11 jest tests).
- **Shared page meta module** (`src/data/pageMeta.js`): Single source of truth for per-route title, description, and OG image — consumed by both the client layout (Helmet) and the Cloudflare crawler middleware. Adds previously missing `/interactive-me` and `/mindmap` entries.

### Changed

- **Meta tags** (`src/layouts/Main.js`, `functions/_middleware.js`, `src/pages/*`): Helmet and the crawler middleware now read the same `PAGE_META` by pathname; pages no longer pass duplicated title/description props, and drifted copies (About, Resume, 100 Days) were reconciled.
- **Image loading** (`src/components/Instagram/ImageSlider.js` and gallery/timeline components): Slider slides are real `<img>` elements with `object-fit: contain` instead of CSS `background-image`, so the browser can lazy-load and async-decode them; Sports/Treks cards, Interactive Me timeline, and Projects gallery images now use `loading="lazy"` + `decoding="async"`.
- **ESLint** (`.eslintrc`): Re-enabled `no-trailing-spaces`, `react/self-closing-comp`, `no-nested-ternary`, `react/no-unused-prop-types`, and `react/jsx-no-useless-fragment`; fixed all remaining violations so lint stays clean.
- **About Page** (`src/components/About/AboutDocument.js`, `src/pages/About.js`): Replaced static markdown render with a structured three-section layout — "In 1 Minute" (bio + animated stat grid), "More Details" (six activity pillar cards with concise data-driven chips), and "Connect with me" (social links). Stats computed dynamically from data files.
- **About Page** (`src/components/About/AboutDocument.js`): Enriched bio and pillar chips with researched details — Substack newsletter name (*The Wanderer's Technical Anecdotes*), *Dare Write's* podcast, Chronicles of Wandering Mind series, education (B.Tech CS RIT Sangli 2021, Tech & Policy Takshashila 2024), and design tools.
- **Now Page** (`src/pages/Now.js`, `src/components/Now/NowDocument.js`, `src/components/Now/MonthSection.js`): Complete redesign — an interactive month-timeline pill switcher replaces the long scroll of stacked month cards; each month renders as a bento grid of section cards; daily rituals restyled as compact icon cards.
- **100 Days To Offload Page** (`src/pages/OneHundredDays.js`): Interactive redesign — animated progress ring with pace tracking (target vs. ahead/behind), clickable calendar heatmap that opens posts, posts-per-month bar chart that filters the list, search plus tag/platform filter chips, and a responsive post-card grid. Removed the decorative SVG logo.

---

## [v7.0.0] — 2026-06-12

### Added

- **CI drift gate** (`.github/workflows/node.js.yml`): CI now runs `cms:sync` and fails if `src/data/*.js` disagrees with the CMS markdown, making `src/cms-content/` the enforced single source of truth.
- **Prebuild sync** (`package.json`): `npm run build` regenerates `src/data/*.js` from markdown via a `prebuild` hook, so deploys always reflect CMS content.
- **Improvement Plan** (`docs/improvement-plan.md`): Full repository audit, owner decisions, and milestone-based task plan with statuses.

### Changed

- **Content pipeline**: Removed the `/admin` panel (pages, editors, hooks, layouts) and the deprecated `src/data/now-data.js`; Decap CMS at `/cms/` is now the only editing UI and markdown the only content source.
- **Images** (`public/images/`): Compressed the entire library from 114MB to 37MB with a 300KB-per-file hard cap; converted PNG photos to JPEG and updated all references.
- **Docs**: README, CLAUDE.md, and architecture/data-flow docs aligned with the markdown-first pipeline; changelog header now states the semver rules; `package.json` version and Node engine requirement brought up to date.

### Fixed

- **CI** (`.github/workflows/node.js.yml`): Workflow targeted the retired `ubuntu-20.04` runner, so no run had completed since March; now runs on `ubuntu-latest` with actions v4 and npm caching.
- **Test suite** (`src/__tests__/App.test.js`, `jest.setup.js`, `jest.config.js`): All 7 tests failed after dark mode shipped — renders now wrap in `ThemeProvider`, jsdom gets `matchMedia`/`IntersectionObserver` stubs, and jest-dom matchers are registered.
- **Lint** (`package.json`): `eslint **/*.js` only matched ~5 files; the script now lints `src`, `scripts`, and `functions` entirely.
- **Content drift**: 12 blog posts, 4 books, and 1 trek that existed only in `src/data/*.js` were backfilled into `src/cms-content/`, so syncing no longer deletes them.
- **Broken images**: 53 `.heic` files (invisible in Chrome/Firefox/Edge) converted to JPEG with all references updated, restoring the Instagram gallery and the first Sports slideshow.

---

## [v6.6.0] — 2026-06-11

### Added

- **Mind Map Page** (`src/pages/MindMap.js`, `src/components/MindMap/`): New `/mindmap` route with an interactive radial SVG mindmap. A central "Me" bubble has five category branches (Books, Marathons, Treks, Projects, Blogs); clicking a category animates a zoom into it and fans out all of its items in collision-free concentric rings with staggered entrance animations; clicking any item opens a detail panel reusing the existing modal pattern. The canvas supports drag-to-pan, scroll-wheel and pinch zoom (`usePanZoom.js`), hover effects, native tooltips, a category legend, and zoom/reset controls. Built with pure React + SVG (no external graph library). Added to navbar dropdown (`src/data/routes.js`).
- **Sports Page URL params** (`src/pages/Sports.js`): Active tab is now synced to a `?view=` URL query parameter (`statistics`, `interactive`, `default`). Navigating directly to a URL with a `?view=` param opens the correct tab on load; switching tabs updates the URL in place via `replaceState`. The Share button automatically copies the param-inclusive URL.
- **100 Days to Offload entries** (`src/data/100DaysToOffload.js`): Added 6 new posts (ids 31–36) from June 2026 — Bharat Ek Khoj Konkan (Marathi, WordPress), Maintaining rhythm in the chaos, Life: An Odyssey of Purpose, What's with all this exploration?, Chronicles of Wandering Mind S2-E02, and Digital Nomad's hustling trails.
- **Homepage feature cards** (`src/pages/Index.js`): Added a Mind Map card to the homepage features grid, linking to `/mindmap` with a description of the interactive radial visualisation.

---

## [v6.5.0] — 2026-05-31

### Added

- **Interactive Me Page** (`src/pages/InteractiveMe.js`, `src/components/InteractiveMe/`): New `/interactive-me` page with image-first vertical timeline. Images from Sports and Treks data are shuffled on mount, displayed as alternating left/right cards connected by SVG bezier curves, and the page auto-scrolls (pauses on hover). Includes SPORTS and TREKS sub-tabs. Added to navbar "More" dropdown (`src/data/routes.js`) and homepage feature grid (`src/pages/Index.js`).

---

## [v6.4.6] — 2026-05-31

### Fixed

- **SportsDefault, SportsInteractive, TreksDefault** (`src/components/Sports/`, `src/components/Treks/`): Removed default `grayscale` filter from card images so photos display in full colour.

---

## [v6.4.5] — 2026-05-31

### Changed

- **Now Page Data** (`src/data/now-data.js`): Filled in May 2026 blogs (6 entries) and books (3 entries) for the current month section.

---

## [v6.4.4] — 2026-04-26

### Changed

- **CI workflow** (`.github/workflows/node.js.yml`): Updated build step from `npm run predeploy` to `npm run build`; renamed step label from "Build and Statically Render" to "Build".
- **docs/deployment.md**: Full rewrite to document Cloudflare Pages deployment (build command, output dir, dashboard settings, env vars). Removed outdated GitHub Pages / `gh-pages` instructions.
- **docs/architecture.md**: Major rewrite to reflect current codebase — updated directory structure (added `hooks/`, `context/`, `utils/`, `cms-content/`), all 16 routes, CMS data flow, and known data inconsistencies table.
- **docs/features.md**: Full rewrite covering all current pages (Treks, Books, Admin CMS, Changelog, dark mode, etc.) and accurate technical notes.
- **CLAUDE.md**: Updated Treks Page instructions to use `slideImages` field name (was `photos`).

### Removed

- **GitHub Pages workflow** (`.github/workflows/github-pages.yml`): Deleted — site is on Cloudflare Pages; this workflow was deploying to a `gh-pages` branch that is no longer used.
- **`predeploy` / `deploy` scripts** (`package.json`): Removed — both scripts depend on `gh-pages` and `react-snap`, neither of which applies to Cloudflare Pages.
- **`gh-pages`** (`package.json` dependency): Removed unused GitHub Pages deploy package.
- **`react-snap`** (`package.json` devDependency): Removed — pre-rendering step only used in the now-deleted `predeploy` script.
- **`react-ga`** (`package.json` dependency): Removed — Google Analytics package with zero imports anywhere in `src/`.
- **`react-burger-menu`** (`package.json` dependency): Removed — replaced by a custom hamburger drawer component; package was never imported.
- **`yaml`** (`package.json` dependency): Removed — no imports found across `src/`.
- **`src/components/Sports/SportsV2.js`**: Deleted dead component — replaced by the tabbed Sports interface (SportsStatistics + SportsInteractive + SportsDefault).
- **`src/components/Sports/SportV2.js`**: Deleted dead component — only referenced by the deleted SportsV2.js.
- **`src/components/Challenges/Dashboard.js`**: Deleted dead component — built but never imported by `Challenges.js`.
- **`src/data/now.md`**: Deleted orphaned file — the original flat-markdown Now page, superseded by the Decap CMS approach in v6.4.0; had zero imports anywhere.
- **`photos` field** (`src/data/treks.js` and Treks components): Renamed to `slideImages` to match the field name used in Sports and Instagram. Updated `TreksDefault.js`, `TrekDetailsModal.js`, `TreksTimeline.js`, and `TreksEditor.js`.

---

## [v6.4.3] — 2026-04-26

### Fixed

- **parseNowCms** (`src/utils/parseNowCms.js`): Updated `parseFrontMatter` regex from `/^---\n/` to `/^---\r?\n/` so it matches Windows-style CRLF line endings; previously returned `{}` on Windows, causing `nowMeta.dailyRituals` to be undefined.
- **Now** (`src/pages/Now.js`): Guarded Daily Rituals section with `nowMeta?.dailyRituals?.length > 0` to prevent crash if meta parse fails or `dailyRituals` is absent.

---

## [v6.4.2] — 2026-04-26

### Fixed

- **Now CMS data** (`src/cms-content/now/months/2026-April.md`): Fixed invalid YAML — list items missing 2-space indent before `-`, sub-properties mis-indented causing parse failure, and URLs wrapped in `< >` angle brackets. Also quoted values with colons to prevent parse errors.
- **Now CMS data** (`src/cms-content/now/months/2026-May.md`): Fixed wrong `month: April` value and missing closing `---`, both of which caused YAML parse errors that silently broke the entire Now page data load.

---

## [v6.4.1] — 2026-04-26

### Fixed

- **Changelog** (`src/pages/Changelog.js`): Collapsed multi-line arrow function in `.then()` chain to satisfy `implicit-arrow-linebreak` and `function-paren-newline` ESLint rules that blocked the production build.
- **parseNowCms** (`src/utils/parseNowCms.js`): Replaced `for...of` loop with `Array.reduce` to satisfy `no-restricted-syntax` rule; added `global-require` disable comment on the webpack `require()` call inside `loadNowMeta`.

---

## [v6.4.0] — 2026-04-26

### Added

- **parseNowCms** (`src/utils/parseNowCms.js`): New utility that reads `src/cms-content/now/meta.md` and all `src/cms-content/now/months/*.md` files directly, parses YAML front matter via the `yaml` package, re-nests flat CMS section fields under the `sections` key that components expect, and sorts months (current first, then newest-first). This makes the CMS files the single source of truth for the Now page — no sync step needed.

### Changed

- **Now page** (`src/pages/Now.js`): Replaced synchronous `import { nowData, nowMeta } from 'now-data'` with async loading via `parseNowCms`. Now uses `useState`/`useEffect` to fetch and parse CMS markdown files at runtime. Daily Rituals section renders conditionally after meta loads.

### Deprecated

- **`now-data.js`** (`src/data/now-data.js`): No longer imported by any page. Retained as a fallback reference until CMS-driven page is verified; safe to delete afterwards.
- **`now.md`** (`src/data/now.md`): Archival file, never imported. Safe to delete.

---

## [v6.3.4] — 2026-04-26

### Added

- **Decap CMS — Changelog** (`public/cms/config.yml`): Added `changelog` files collection pointing to `src/data/changelog.md` with a `markdown` body widget, making the changelog editable through the CMS editor.
- **`changelog.md`** (`src/data/changelog.md`): Added empty YAML front matter (`---\n---`) so Decap CMS's parser can identify the body field; without it the editor rendered empty.
- **`cms:server` script** (`package.json`): Added `npx netlify-cms-proxy-server` script; run it alongside `npm run dev` so Decap CMS reads real seeded data from `src/cms-content/` instead of starting empty.

### Fixed

- **Decap CMS backend** (`public/cms/config.yml`): Switched default local backend from `test-repo` (in-memory, always empty) to `proxy` (`http://localhost:8081/api/v1`) so all seeded collections are visible in the editor. `test-repo` is retained as a commented fallback.
- **Changelog page** (`src/pages/Changelog.js`): Strips front matter (`/^---[\s\S]*?---\s*\n/`) before passing text to `<Markdown>` so the added front matter block does not appear in the rendered page.

---

## [v6.3.3] — 2026-04-26

### Fixed

- **Changelog page** (`src/pages/Changelog.js`): Replaced incorrect `NowDocument` usage (which expects a `months` array) with a direct `markdown-to-jsx` render inside a `prose` article wrapper — the same pattern used by `AboutDocument`. Markdown was loading correctly but rendering nothing due to the component mismatch.

---

## [v6.3.2] — 2026-04-25

### Added

- **CMS seed script** (`scripts/seed-cms-content.js`): One-time script (`npm run cms:seed`) that converts all existing `src/data/*.js` files into Decap CMS markdown files under `src/cms-content/`. Seeds all 12 CMS collections — Now Meta, Now Months, Books, 100 Days, Sports, Treks, Projects, Instagram, and all four Resume sub-collections. Populates CMS editors with existing data so records are visible immediately.

---

## [v6.3.1] — 2026-04-25

### Fixed

- **Decap CMS backend config** (`public/cms/config.yml`): Uncommented `auth_endpoint: auth` (required for Sveltia CMS Auth Cloudflare Worker to handle the OAuth redirect) and removed `squash_merges: true` which requires `publish_mode: editorial_workflow` — without it Decap CMS v3 throws an initialization error that prevents the CMS page from loading.

## [v6.3.0] — 2026-04-25

### Added

- **NowEditor** (`src/components/Admin/Editors/NowEditor.js`): Full admin editor for the Now page with all 9 section types (Blogs, Running, Books, Events, Projects, Website Updates, Stats, Certificates, Misc). Includes a "Page Meta" tab for editing introStory, dailyRituals, categoryLabels, and inspiredBy. Enforced monthly rotation via "Rotate Month →" button — promotes the previous current month to archive and prepends a new blank current month. Custom export panel generates the full `now-data.js` with both named exports.
- **Image upload — Sports** (`src/components/Admin/Editors/SportsEditor.js`): File picker with live thumbnail preview on each slide. Auto-suggests a filename following the `initials_YYYY_N.jpeg` naming convention and provides a download button that saves the file with the correct name. Auto-fills the image path field on selection.
- **Image upload — Treks** (`src/components/Admin/Editors/TreksEditor.js`): Same image upload capability for trek photos following the `fort_name_N.jpg` convention.
- **Decap CMS — Now Meta** (`public/cms/config.yml`): New `now_meta` collection (single-file) for editing Now page metadata.
- **Decap CMS — Now Months** (`public/cms/config.yml`): New `now_months` collection (one file per month) covering all 9 section types as nested lists.
- **Decap CMS — Sports, Treks** (`public/cms/config.yml`): New collections with native `image` widget for slideImages/photos — uploads go directly to `public/images/sports/` and `public/images/treks/`.
- **Decap CMS — Projects, Instagram, Resume** (`public/cms/config.yml`): Added collections for all remaining data types (Projects, Instagram, Resume Positions, Degrees, Skills, Certifications).
- **GitHub backend instructions** (`public/cms/config.yml`): Detailed step-by-step comments for switching from `test-repo` to the GitHub backend with Netlify OAuth proxy, including OAuth App setup and commit message templates.
- **CMS sync — all collections** (`scripts/sync-cms-to-data.js`): Extended sync script to handle all 12 data sources. Now page sync re-nests section fields under `sections`, sorts months newest-first, and enforces a single `isCurrent: true` entry. Sports and Treks use the custom JS serializer to preserve `PUBLIC_URL` template literals for image paths.

### Changed

- **Admin Dashboard** (`src/components/Admin/AdminDashboard.js`): Added "Now Page" card (cyan) showing the count of monthly entries with draft indicator.
- **Admin Nav** (`src/components/Admin/AdminNav.js`): Added `now → 'Now Page'` label.
- **Admin page** (`src/pages/Admin.js`): Registered `NowEditor` under the `now` key with lazy loading.

---

## [v6.2.0] — 2026-04-22

### Added

- **now-data.js** (`src/data/now-data.js`): Structured JS data file replacing `now.md` as the source of truth. Exports `nowMeta` (page metadata, daily rituals, intro story) and `nowData` (typed array of monthly entries Oct 2025–Apr 2026 with section keys: blogs, running, books, events, projects, stats, website, certificates, misc).
- **MonthSection** (`src/components/Now/MonthSection.js`): Per-month card that renders all available section types in a consistent order with a divider between them.
- **NowSectionHeader** (`src/components/Now/NowSectionHeader.js`): Shared label pill with icon, reused by all section components.
- **Section components** (`src/components/Now/`): NowBlogsSection (platform badges, WIP indicator), NowRunningSection (distance/time stat badges), NowBooksSection (review link), NowEventsSection (left-border card), NowProjectsSection (2-col grid with arrow link), NowStatsSection (Strava 4-col + Substack 2-col stat tiles with approximate prefix), NowWebsiteSection, NowCertificatesSection, NowMiscSection.

### Changed

- **NowDocument** (`src/components/Now/NowDocument.js`): Rewritten to accept `months` prop array; splits current vs archived months with an "Archives" label divider; renders `<MonthSection>` per entry.
- **Now page** (`src/pages/Now.js`): Removed async markdown fetch (`useState`, `useEffect`, `now.md` import). Now imports synchronously from `now-data.js`. Daily Rituals driven from `nowMeta.dailyRituals`. Hero `lastUpdated` derived from the current month entry instead of `new Date()`.

### Deprecated

- `src/data/now.md`: Content migrated to `now-data.js`. File retained for reference but no longer imported or rendered.

---

## [v6.1.0] — 2026-04-21

### Added

- **Skip-to-content link** (`src/layouts/Main.js`): Visible-on-focus skip link added as first focusable element for keyboard users.
- **Global focus ring** (`src/tailwind.css`): `*:focus-visible` rule applies a 2px `secondary`-coloured outline site-wide so keyboard navigation is always visible.
- **Mobile contact section** (`src/components/Template/Hamburger.js`): Social icon links and Resume PDF download button added to the bottom of the mobile drawer, closing the gap left by the desktop-only sidebar.

### Changed

- **Navigation** (`src/components/Template/Navigation.js`): Desktop dropdowns now respond to keyboard focus (`onFocus`/`onBlur`) and close on `Escape`; `aria-haspopup` + `aria-expanded` added to the More button. Inactive link contrast bumped from `stone-400` to `stone-500`.
- **Footer** (`src/components/Template/Footer.js`): Hover colour changed from `orange-700` to `secondary` to match design system; body text contrast raised from `stone-500` to `stone-600` in light mode.
- **Sports page** (`src/pages/Sports.js`): Active tab colour unified to `text-secondary` across all three tabs; share button changed from `indigo-500` to `stone-900/stone-100` to match primary button style.
- **DigitalLibrary** (`src/components/Books/DigitalLibrary.js`): Search input debounced at 300 ms to prevent lag with large lists; book grid `gap-y-16` reduced to `gap-y-8`.
- **LifeStats** (`src/components/Index/LifeStats.js`): Counters show `—` placeholder before the IntersectionObserver fires instead of "0", preventing a false empty-state appearance.
- **ProjectGallery** (`src/components/Projects/ProjectGallery.js`): Broken images now render a `broken_image` icon placeholder via `ImageWithFallback` component instead of silently hiding.
- **TopSummaryCards** (`src/components/Sports/TopSummaryCards.js`): Replaced blue/purple/green card colours with red/secondary/amber to reduce accent-colour sprawl.
- **SportsStatistics** (`src/components/Sports/SportsStatistics.js`): Sub-summary cards unified to amber/red/secondary/stone; distance bar, personal records, pace, and city count highlights all consolidated to `secondary` and `red-400`.

### Changed

- **SportsDefault** (`src/components/Sports/SportsDefault.js`): Redesigned DEFAULT VIEW cards to image-first. Cards now lead with the first `slideImages` entry in a 16:9 container with grayscale-to-color hover transition and overlay. Distance and BIB promoted to image corner badges; footer retains title, date, place, and finish time.
- **TreksDefault** (`src/components/Treks/TreksDefault.js`): Redesigned DEFAULT VIEW cards to image-first. Cards lead with the first `photos` entry in a 4:3 container with same hover effect. Difficulty and photo count promoted to image corner badges; footer retains fort name, date, trek time, and blog link. Placeholder shown for entries with no images.
- **SportsInteractive** (`src/components/Sports/SportsInteractive.js`): Redesigned INTERACTIVE VIEW cards to image-first. Cards now lead with the first `slideImages` entry using the same grayscale hover pattern. BIB badge overlaid on image; footer retains title, date, and place/time/distance stats row.

---

## [v6.0.0] — 2026-04-17

### Added

- **Admin Panel** (`src/pages/Admin.js`): New password-protected `/admin` page providing a full CMS interface for managing all site data locally. Authentication uses SHA-256 password hashing via the browser's SubtleCrypto API with credentials stored in `localStorage`.
- **AdminLayout + AdminNav** (`src/layouts/AdminLayout.js`, `src/components/Admin/AdminNav.js`): Standalone admin shell with top navigation bar, section breadcrumb, and logout button — separate from the site's `Main.js` layout.
- **AuthGate** (`src/components/Admin/AuthGate.js`): Password gate component rendered before the admin panel; hashes input and compares against a hardcoded SHA-256 constant.
- **AdminDashboard** (`src/components/Admin/AdminDashboard.js`): Overview grid showing entry counts for all 10 data types with draft indicators and quick-navigate cards.
- **Data Editors** (`src/components/Admin/Editors/`): CRUD editors for all data types — Books, Sports, Treks, Projects, 100 Days To Offload, Instagram, Resume Positions, Degrees, Skills, and Certifications. Each editor loads from static data, persists drafts to `localStorage`, and exports valid JS via a copy-to-clipboard panel.
- **Shared Admin UI Primitives** (`src/components/Admin/`): `FormField`, `TextInput`, `TagsInput` (pill-based), `ArrayItemEditor` (for nested arrays like `slideImages`), and `ExportPanel` (expandable code block with clipboard export).
- **IntegrationsPanel** (`src/components/Admin/IntegrationsPanel.js`): CMS provider selection UI with cards for Decap CMS (recommended, free), Contentful (external), Sanity (external), and Custom API (DIY). Each card includes a collapsible setup guide and status indicator.
- **Decap CMS** (`public/cms/index.html`, `public/cms/config.yml`): Free, open-source Git-based CMS available at `/cms/`. Uses `test-repo` backend by default (no OAuth needed locally). Configured for Books and 100 Days To Offload collections.
- **CMS Sync Script** (`scripts/sync-cms-to-data.js`): Node.js script that reads Decap CMS markdown frontmatter from `src/cms-content/` and writes back to `src/data/*.js`. Run via `npm run cms:sync`.
- **Hooks** (`src/hooks/useDraftStore.js`, `src/hooks/useExportGenerator.js`, `src/hooks/useCMSStatus.js`): Shared hooks for draft persistence, JS export generation, and CMS provider status checking.
- **jsSerialize utility** (`src/components/Admin/utils/jsSerialize.js`): Custom serializer that correctly outputs `${process.env.PUBLIC_URL}/images/...` template literals for image URL fields in sports, treks, and instagram data exports.

---

## [v5.1.8] — 2026-04-15

### Fixed

- **Cloudflare middleware** (`functions/_middleware.js`): Removed the `Accept: text/html` request-header guard that caused the middleware to skip injection for every scraper or tool that sends `Accept: */*` (including opengraph.xyz). The response `Content-Type` check is the correct and sufficient gate; the request Accept header is unreliable for this purpose. Replaced the Accept guard with a file-extension check that skips static asset requests (`*.js`, `*.css`, `*.png`, etc.) before calling `next()`.

---

## [v5.1.7] — 2026-04-15

### Fixed

- **Cloudflare middleware** (`functions/_middleware.js`): Rewrote `HTMLRewriter` strategy from updating existing elements to appending tags into `<head>`. The previous commit removed all static OG/Twitter/canonical tags from `index.html` to prevent first-match conflicts — but the middleware was selecting those same elements to mutate them. With nothing to select, every route served identical bare metadata. The new approach uses a `HeadInjector` handler that appends the full per-route tag block to `<head>` and a `TitleRewriter` that updates the existing `<title>` element. Unknown paths now fall back to a generic `DEFAULT_META` rather than returning no metadata.

---

## [v5.1.6] — 2026-04-15

### Fixed

- **Static HTML shell** (`public/index.html`): Removed all Helmet-managed meta tags (`description`, `og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `twitter:*`, `canonical`) from the static shell. The OG spec uses first-match semantics — having hardcoded homepage values appear before Helmet's `data-rh="true"` tags meant every non-root route (e.g. `/now`, `/sports`) served the wrong social metadata to any parser. Helmet now exclusively owns these tags; only `og:site_name` (static, same for all pages) and the initial `<title>` fallback remain.

---

## [v5.1.5] — 2026-04-15

### Fixed

- **App root** (`src/App.js`): Moved `HelmetProvider` from inside `Main` to the app root so all pages share a single Helmet context — previously each page mount created an isolated provider, which could cause stale/default metadata to linger between route transitions.
- **Main layout** (`src/layouts/Main.js`): Added missing `<link rel="canonical">` tag to the Helmet block; `canonicalUrl` was already computed and used for `og:url` but was never emitted as a canonical link element, leaving search engines without a per-page canonical signal.
- **404 page** (`src/pages/NotFound.js`): Rewrote to use the `Main` layout — previously it rendered a bare `<div>` with its own isolated `HelmetProvider`, missing site navigation, OG tags, Twitter cards, and a canonical link.

---

## [v5.1.4] — 2026-04-05

### Added

- **Logo PNG** (`public/images/logo.png`): Rasterised 400×400 PNG exported from the illustrated SVG via cairosvg — used as the OG/Twitter card image for broad social crawler compatibility.

### Changed

- **Main layout** (`src/layouts/Main.js`): Default OG image updated from `logo.svg` to `logo.png`.
- **Static OG tags** (`public/index.html`): Fallback `og:image` and `twitter:image` updated to `logo.png`.

---

## [v5.1.3] — 2026-04-05

### Changed

- **Main layout** (`src/layouts/Main.js`): Added optional `image` prop for per-page OG/Twitter card image. Defaults to the illustrated logo SVG (`/images/logo.svg`); homepage, About, and Resume override to `me.jpg` as they are person-centric pages.
- **Static OG tags** (`public/index.html`): Updated `og:image` and `twitter:image` fallback from `me.jpg` to the illustrated logo SVG.

---

## [v5.1.2] — 2026-04-05

### Changed

- **Logo SVG** (`public/images/logo.svg`): Replaced the plain "ST" monogram with a full illustrated SVG logo — dark gradient background, open book, pen/quill with ink drop, film strip, running shoe, flowing wave ribbon, and teal curly braces, matching the personal-site visual identity.
- **Logo component** (`src/components/Template/Logo.js`): Switched from inline SVG to an `<img>` element referencing the illustrated `logo.svg`, so the nav mark stays in sync with the standalone logo file.

---

## [v5.1.1] — 2026-04-05

### Changed

- **CLAUDE.md**: Added update instructions for Now, Books, Sports, and Treks pages including data schemas, question prompts, image naming conventions, and image compression guidelines.
- **CLAUDE.md** (versioning rules): Replaced patch/minor/major tiers with major-or-minor only; introduced weekly minor version cap — at most one minor bump per week, with same-week changes appended to the existing entry. Patch tier restored for bug fixes; patch versions exempt from the weekly cap.

---

## [v5.1.0] — 2026-04-05

### Added

- **Treks Page** (`/treks`): New page documenting Maharashtra fort and mountain trek history with two views — *Statistics* and *Default View*.
- **TreksStatistics Component**: Highlights total treks, years active, difficulty distribution (Easy/Medium/Hard), yearly breakdown bar chart, and an interactive animated trek timeline.
- **TreksDefault Component**: Card grid of all treks with filters by difficulty, year, and blog presence, plus sort controls by date or trek duration.
- **TrekDetailsModal Component**: Click-through modal with a photo slider and blog post link for each trek entry.
- **TreksTimeline Component**: Animated vertical timeline — nodes stagger in on page load, clicking a node expands trek details inline (duration, photo count, blog link) with smooth transition.
- **Stats Page — Trek Log Card**: New full-width bento card surfacing key trek metrics: total treks, hard treks, blog posts written, years active, and latest trek name.
- **Treks Route**: Added `/treks` to `routes.js` and `App.js` with lazy loading.
- **Open Graph & Twitter Card metadata** (`public/index.html`, `src/layouts/Main.js`): Added static OG and Twitter Card meta tags to `index.html` so social crawlers (which don't execute JS) generate rich link previews on LinkedIn, Slack, Twitter/X, iMessage, and WhatsApp. Also added dynamic tags via `react-helmet-async` in `Main.js` so per-page titles and descriptions are reflected in previews.
- **CLAUDE.md** (`CLAUDE.md`): Added Claude Code instruction file documenting project stack, key file locations, and a mandatory changelog update rule with format guidance.
- **Logo component** (`src/components/Template/Logo.js`): New SVG monogram mark — a rust-red square (`#b22200`) with white "ST" initials in Noto Serif 900. Used in the navigation bar alongside the site name.
- **Static logo SVG** (`public/images/logo.svg`): Standalone 200×200 SVG version of the logo using system serif font fallback, for future use in favicons or social assets.
- **LifeStats component** (`src/components/Index/LifeStats.js`): New "Life in Numbers" section on the homepage showing animated count-up stats for Books Read, Km on Foot, Treks Done, and Blog Posts. Each card links to the relevant page and animates on scroll into view.
- **Homepage LifeStats section** (`src/pages/Index.js`): Inserted the LifeStats component between the feature card grid and the CTA section.

### Changed

- **Per-page OG metadata** (all `src/pages/*.js`): Enhanced `title` and `description` props on every page to accurately reflect page content. These feed into Open Graph and Twitter Card tags for better link preview quality on social platforms.
- **Resume page title** (`src/pages/Resume.js`): Renamed from "Technical Skills" to "Resume" to reflect the full page scope (experience, education, certifications, skills).
- **Dynamic `og:url`** (`src/layouts/Main.js`): Added `useLocation` hook to inject the current page path as `og:url`, so each page gets its own canonical URL in link previews.
- **Navigation brand link** (`src/components/Template/Navigation.js`): Updated to show the Logo mark before the "Sanket Tambare" text, with hover effect applied to both as a group.

### Fixed

- **Layout Overflow** (`Main.js`): Added `min-w-0` to the `<main>` flex item, preventing `flex-grow` content from overflowing into the sidebar when headings use large font sizes.
- **`treks.js` Data File**: Added missing `const { PUBLIC_URL }`, `const` declaration, and `export default treks`.
- **Difficulty Normalization** (`treks.js`): Standardized `endurance_level` to three values — `Easy`, `Medium`, `Hard` (removed `High` variant on Katraj To Sinhgad entry).
- **LifeStats ESLint errors** (`src/components/Index/LifeStats.js`): Replaced `Math.pow` with `**` operator, fixed `consistent-return` in `useEffect`, and corrected JSX prop/bracket formatting.

### Added (2026-04-05)

- **100 Days to Offload — Entry #19** (`src/data/100DaysToOffload.js`): Added new blog post "Sadagi in the Digital World" — exploring oneness in the entangled digital world, published on Substack.
- **Cloudflare Pages middleware** (`functions/_middleware.js`): Edge function that rewrites OG/Twitter meta tags and `<title>` per page path for all HTML requests. Fixes the issue where social link previews (Slack, iMessage, Twitter/X, WhatsApp) always showed the generic homepage metadata because crawlers don't execute JavaScript. Maps all 14 routes to their correct title, description, and image before the HTML is delivered.

---

## [v5.0.0] — 2026-03-28 🚀 Major Release

### Added

- **Changelog Page** (`/changelog`): New website page that renders this `CHANGELOG.md` file with a hero section, version quick-nav badges, and full markdown rendering. Added to the "More" dropdown in the nav bar.
- **Sports Page — Tabbed Interface**: Restructured the Sports page with three distinct tabs — *Statistics*, *Interactive View*, and *Default View* — inspired by the run-folio reference design.
- **SportsStatistics Component**: New component showing total races, total distance, average pace/race, distance distribution, personal records, city/year breakdowns, and yearly progress bars.
- **SportsInteractive Component**: Groups races by distance category with BIB number prominently displayed; races sorted by fastest time.
- **SportsDefault Component**: Chronological grid of all races with full filter & sort controls (by Year, City, Distance) and a toggle for ascending/descending order.
- **MarathonDetailsModal Component**: Reusable modal displaying race description, image slider, and a link to the official timing certificate, triggered on card click.
- **Share Button**: Clicking the Share button on the Sports page copies the current URL to clipboard and shows a "Copied!" confirmation.
- **Stats Page Enhancements**: Added five new bento grid cards:
  - *Reading Intelligence* — English vs Marathi book split, books with reviews count, and top interest tag cloud.
  - *Books Per Year* — bar chart of reading velocity from 2019–2026.
  - *Blog Intelligence* — English/Marathi post split with top writing topics derived from 100DaysToOffload tags.
  - *Education & Projects* — clickable education timeline (degrees) and project count with quick links.
- **Sports Data (sports.js)**: Added explicit `bibNumber` field to all 19 race entries (IDs 1–19).
- **Dynamic Distance Grouping**: Both `SportsStatistics` and `SportsInteractive` now derive unique distances dynamically from the data (no hardcoded list), supporting future distances automatically.
- **Dark Mode Fixes**: Added missing `dark:` Tailwind variants across `SportsStatistics`, `SportsDefault`, `SportsInteractive`, `TopSummaryCards`, and `MarathonDetailsModal`.

### Changed

- `Sports.js` — Replaced the legacy marathon log with the new tabbed layout managed via `activeTab` state.
- `SportsDefault.js` — Fully rewritten with filter dropdowns, multi-key sort, asc/desc toggle, results count label, and empty-state UI.
- `SportsInteractive.js` — Races within each distance group now sort by fastest time ascending (best first).

### Fixed

- **Mobile Hamburger Menu** — Rewrote `Hamburger.js` to use `ReactDOM.createPortal`, rendering the drawer and backdrop directly into `document.body`. This escapes the header's `backdrop-filter` CSS containing block which was capping the drawer height to ~70px instead of the full viewport.
- **SideBar Mobile Overlay** — `SideBar.js` now uses `hidden md:flex` so it is hidden on mobile/tablet viewports, preventing it from covering content on the Sports page and other content-heavy pages.
- **SideBar Reactivity** — Replaced raw `window.location.pathname` with `useLocation()` hook for proper React Router reactivity on route changes.

---

## [v4.0.0] — 2026-03 (Major Redesign)

### Added

- Complete visual redesign of the website — new typography system, dark mode improvements, and design coherency across pages.
- Dark mode toggle repositioned and refined.
- New **Challenges** page tab.
- Revamped **Now** page with timeline-style content.
- **100 Days to Offload** challenge tracking system with blog data (`100DaysToOffload.js`).
- Added books reading data for 2025–2026 batch (IDs ≥ 36, including *टाटायन*, *एका तेलियाने*).
- Added blog entries (posts 15–18) for March 2026 including Marathi blog posts.

### Changed

- Stats page updated with new metrics: certifications, Instagram stats, skills arsenal, physical endurance PBs.
- Removed videos data from the Instagram/gallery section.

---

## [v3.5.0] — 2025-11 (Feature Release)

### Added

- **SportV2 Component**: New individual race card component with image slider support (`SportV2.js`, `SportsV2.js`).
- **DarkModeToggle Component**: Standalone toggle component for switching between light and dark themes.
- **Personal Statistics Data** (`stats/personal.js`): Structured personal info for the Stats page.
- **Books Page** with `BookModal` and `FeaturedBook` components, comprehensive styling with category filters.
- **Project Documentation**: Added `docs/` folder with architecture and setup notes.
- New certifications added: Bridgenext role, updated Emtec Inc. entries.
- New skills added: Snowflake, Tableau, Kafka, DORA metrics, SnowSQL, Gemini API, Cursor.

### Changed

- Updated resume positions (`positions.js`) with Bridgenext role.
- Refined About page content and layout.

---

## [v3.0.0] — 2025-08 (Polish & Improvements)

### Added

- AI Workshop entry added to the experience / activities section.
- Additional now page details.

### Changed

- Dark mode toggle position updated on the webpage.
- Styling improvements across multiple components.
- Updated README with current project state.

---

## [v2.5.0] — 2025-05 (Responsiveness & Interactions)

### Fixed

- Fixed responsiveness issues across multiple pages.
- Fixed responsive images rendering on mobile viewports.

### Added

- New interactive features and micro-animations built with Cursor AI assistance.

---

## [v2.0.0] — 2025-03 (Sports Page Launch)

### Added

- **Sports Page** (`/sports`): First version of the physical endurance log.
- Marathon data added for 2023–2024 race events (IDs 1–12).
- CI/CD pipeline fix for GitHub Pages deployment.

---

## [v1.5.0] — 2024-08 (Strava & Media)

### Added

- Strava activity embeds on the sports/activity section.
- Lint fixes and code cleanup.

---

## [v1.2.0] — 2024-05 (Instagram & Videos)

### Added

- **Instagram Page** (`/instagram`): Grid display of curated Instagram posts with `instagram.js` data source.
- **Videos Page**: Initial version with embedded video content.
- Updated About tab with revised personal summary.

### Changed

- Major code refactor for cleaner component structure.

---

## [v1.0.0] — 2023-03 (Personal Fork & Initial Setup)

### Added

- Forked from [mldangelo/personal-site](https://github.com/mldangelo/personal-site) template.
- Personalised all data: name, resume positions, degrees, certifications, contact links.
- Stats page initial version with basic metrics.
- Custom routing and navigation tailored to personal content.
- Added education entry: B.Tech Computer Science, RIT Sangali (2021).
- PR-01 and PR-02 feature branches merged: code refactoring, education update.
- GitHub Actions workflow for GitHub Pages deployment (`jekyll-gh-pages.yml`).

### Changed

- Replaced template placeholder content with real resume data.
- Refactored component structure for maintainability.

---

*This changelog is maintained manually. For the full commit history, run `git log --oneline`.*
