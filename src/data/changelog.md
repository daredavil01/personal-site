# Changelog

All notable changes to this project are documented here, grouped by release period.
This project does not use semantic versioning; entries are grouped by date and feature area.

---

## [v5.1.0] — 2026-04-04

### Added
- **Treks Page** (`/treks`): New page documenting Maharashtra fort and mountain trek history with two views — *Statistics* and *Default View*.
- **TreksStatistics Component**: Highlights total treks, years active, difficulty distribution (Easy/Medium/Hard), yearly breakdown bar chart, and an interactive animated trek timeline.
- **TreksDefault Component**: Card grid of all treks with filters by difficulty, year, and blog presence, plus sort controls by date or trek duration.
- **TrekDetailsModal Component**: Click-through modal with a photo slider and blog post link for each trek entry.
- **TreksTimeline Component**: Animated vertical timeline — nodes stagger in on page load, clicking a node expands trek details inline (duration, photo count, blog link) with smooth transition.
- **Stats Page — Trek Log Card**: New full-width bento card surfacing key trek metrics: total treks, hard treks, blog posts written, years active, and latest trek name.
- **Treks Route**: Added `/treks` to `routes.js` and `App.js` with lazy loading.

### Fixed
- **Layout Overflow** (`Main.js`): Added `min-w-0` to the `<main>` flex item, preventing `flex-grow` content from overflowing into the sidebar when headings use large font sizes.
- **`treks.js` Data File**: Added missing `const { PUBLIC_URL }`, `const` declaration, and `export default treks`.
- **Difficulty Normalization** (`treks.js`): Standardized `endurance_level` to three values — `Easy`, `Medium`, `Hard` (removed `High` variant on Katraj To Sinhgad entry).

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
