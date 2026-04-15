# Changelog

All notable changes to this project are documented here, grouped by release period.
This project does not use semantic versioning; entries are grouped by date and feature area.

---

## [v5.2.0] — 2026-04-15

### Added
- **Floating AI Chat Widget** (`src/components/Chat/ChatWidget.js`): New fixed-position chat panel powered by Claude API that answers visitor questions about Sanket using full portfolio context (books, races, treks, blog posts, resume, projects). Streams responses via SSE using `fetch` + `ReadableStream`. Renders into `document.body` via React Portal to avoid stacking context issues. Supports dark/light mode via Tailwind `dark:` variants and Enter-to-send keyboard shortcut.
- **Cloudflare Pages Function** (`functions/api/chat.js`): POST handler that proxies requests to Claude API with streaming enabled. Validates body size (32 KB max) and message count (20 max), injects the site-context system prompt, and passes the SSE stream body directly to the client.
- **Context Build Script** (`scripts/build-context.mjs`): Node 18+ ES module script that dynamically imports all data files and reads `about.md` and `now.md`, then writes a consolidated system prompt to `functions/lib/site-context.js` for use by the Pages Function.
- **`prebuild` / `prestart` npm scripts** (`package.json`): `node scripts/build-context.mjs` is wired to both lifecycle hooks to ensure the generated context file exists before build and local dev.

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

_This changelog is maintained manually. For the full commit history, run `git log --oneline`._
