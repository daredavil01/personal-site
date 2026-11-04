---
---
# Changelog

Staging buffer only — the published version history lives in the `changelog`
table and is read by /changelog and /ask. Append a new version's entry below,
in the format CLAUDE.md mandates, then run `npm run changelog` to upsert it
and empty this file again.

Versioning follows the semver-style rules in CLAUDE.md: major for new
pages/refactors/redesigns, minor for features and content additions (at most one
minor version per calendar week), patch for fixes and tweaks.

---

## [v29.0.2] — 2026-11-04

### Fixed
- **Race and trek photos are no longer cropped** (`src/components/common/PhotoViewer.js`): the quick-look sheets on /sports and /treks and the `/sports/:id` and `/treks/:id` pages drew 600 px (300 px on phones) slides inside a fixed 4:3 / square box, cutting most photos off. A new viewer reads each photo's natural width and height when it loads and sizes its frame to that aspect ratio, capped at a share of the screen height (55% in the sheets, 62% on the pages) and narrowed to keep the ratio when a tall photo hits the cap. It adds arrows, swipe, ←/→ keys, a counter, thumbnails and a "Full size" link, and pre-loads the neighbouring photos so the frame resizes before they show.
- **Card photos shown whole** (`src/components/common/CardPhoto.js`): race and trek cards contain the photo over a blurred copy of itself instead of cropping it with `object-cover`.

## [v29.0.1] — 2026-11-04

### Fixed
- **Race and trek card photos** (`src/components/Sports/RaceList.js`, `src/components/Treks/TrekList.js`): the cards put the whole `{url, caption}` image object into `<img src>`, so every photo on the Races and Log tabs rendered as a broken image. They now use its `url`; `src/components/common/logCards.test.js` holds both cards to it.

## [v29.0.0] — 2026-11-04

### Changed
- **/sports redesigned as a race log** (`src/pages/Sports.js`, `src/components/Sports/`): three tabs (Overview, Races, Records) over one year/distance filter. Overview draws the personal-best progression per distance (every finish, faster at the top, with the best-so-far staircase), a race calendar (every race as a dot in its month), "same race, different year" for events run more than once, and derived facts: days since the last race, fastest pace, PBs broken, typical and longest gap, racing season, longest race, busiest year, home course. Races is cards or a sortable table with pace and the gap to the PB on every row; Records has one card per distance with its PB ladder, how long it has stood and how far it came, plus what the half PB predicts elsewhere by Riegel's formula, labelled as an estimate.
- **/treks redesigned as a summit register** (`src/pages/Treks.js`, `src/components/Treks/`): Overview and Log tabs over year, season (Sahyadri monsoon / winter / summer) and difficulty filters. Every trek is a peak on a ridgeline (height is hours on the trail, colour is difficulty, a flag marks a place reached for the first time); then the trekking year with the monsoon shaded, difficulty by year, return visits ("Katraj To Sinhgad" and "Sinhagad" are one place), and derived facts. Log is photo cards or a sortable table.
- **/presentations redesigned as a deck shelf** (`src/pages/Presentations.js`): the newest deck up front, a gallery with live previews or a light list with no iframes, length filter, a sort by slide count, collapsible topic chips, "Surprise me", and a Stats tab with cadence per month, length mix, top topics and derived facts. Slide counts are read from each description ("A 12-slide deck", "Thirty-nine illustrated slides"); decks that state none are left out of totals and the page says how many were counted.
- **Tabs no longer use `?view=`** on /sports and /treks, which belongs to `useViewMode`; they use `?tab=`, every filter is URL state merged into the query string, and the old `?view=statistics|interactive|default` links still land on a tab.

### Added
- **Derived-stat modules** (`src/lib/raceLog.js`, `src/lib/trekLog.js`, `src/lib/deckStats.js`, tested): every number the three pages show, computed once; a value with no data is null and omitted, never 0. `filterDecks` (`src/lib/deckFilters.js`) gains `length` and a `slides` sort.
- **LogKit** (`src/components/common/LogKit.js`): shared URL state, keyboard-navigable tabs, filter chips with counts, a search box focused with "/", glanceable KPI tiles, insight cards, a 12-month strip, ranked bars, "Share view" (copies the link with filters) and an empty state with a "Clear filters" way out. The filter bar sticks under the site header on desktop.

### Removed
- The old Sports and Treks tab components (`SportsDefault`, `SportsInteractive`, `SportsStatistics`, `TopSummaryCards`, `Sports/utils.js`, `TreksDefault`, `TreksStatistics`, `TreksTimeline`).

## [v28.1.0] — 2026-11-04

### Added
- **Blueprint rooms for five pages** (`src/components/Blueprint/features.js`): Training (112), About (113), Resume (114), Writing Ledger (115) and Micro-blog (116) are rooms on sheet A-01, each with its specification and the slice it cuts through the stack on A-02. Code facts are read from the modules that define them (`ABOUT_SECTIONS`, `POSITION_GROUPS`, `MOODS`, `DAILY_COUNT`, the ledger's reading constants, the training `VARIABLES`); Training's and the Micro-blog's floor areas come from the stats snapshot and are omitted when missing.
- **Plan furniture** (`src/components/Blueprint/SitePlan.js`): a running track, a stopwatch, an A4 sheet, an open ledger and a constellation.

### Changed
- **Site plan** (`src/components/Blueprint/SitePlan.js`, `features.js`): the plan grows a fourth row (960×800, exported as `PLAN`); the Foyer moves down to it so the main entrance stays in the outer wall, and Training takes its old place under the Archives. The test now holds the rooms to `PLAN` and the entrance to the Foyer.
- **Section floor list** (`src/components/Blueprint/SectionRiser.js`): rows tighten when a floor holds many rooms, so all sixteen stay on the sheet.
- **Docs**: `docs/routes.md` regenerated (it was missing `/writing-ledger`); `docs/SITE_DOSSIER.md` describes the redesigned `/micro-blog` and adds `/writing-ledger`, `/training` and `/blueprint`; `docs/architecture.md` points to the generated route map instead of a stale hand-copied one; `docs/site-tour.md` is marked retired; CLAUDE.md's Blueprint section covers the plan size and the film.

