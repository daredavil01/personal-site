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

## [v30.0.0] — 2026-11-04

### Added
- **Films page** (`src/pages/Films.js`, `/films`): every feature film on the site in one place — the seven 30-second page films and the trailer, Blueprint, Logbook, Projects, Training and Videos films — with a main player, the chosen film's story, page, length, shape, sound, captions and how it was made, and its chapters as buttons that jump the film. `?film=` is shareable; every page film links to it. Listed in the nav under Play, with its own share card (`filmStrip` in `src/lib/og/layouts/figures.js`, `public/og/films.png`).
- **Film catalogue** (`src/data/featureFilms.js`, `src/pages/films.test.js`): one row per film; the test reads each MP4's header so the length the page prints is the file's own.

### Changed
- **Page films rebuilt with Remotion** (`scripts/page-films/`): one script (`script.js`) now drives picture, captions and sound — variable scene lengths that follow the content, a different slide-in per scene and per card, burned-in word-by-word captions (and the same chunks as `.vtt`), chapter files, and a sound effect synthesised on every cue (panned whooshes, rising counter ticks, key clicks, shutters, stamps, a countdown, a riser and chime) over each film's score. The frame-seeking `film.html` renderer is gone.

## [v29.1.0] — 2026-11-04

### Added
- **Page films** (`scripts/page-films/`, `src/components/common/PageFilm.js`): a 30-second vertical film for each of /about, /resume, /writing-ledger, /micro-blog, /presentations, /sports and /treks, embedded under each page's header with its storyline beside it. One page (`film.html`) draws any moment of any of the seven; `npm run page:films` renders them frame by frame from the live tables (through `raceLog`, `trekLog`, `resumeModel`, `aboutModel`, `/api/stats` and the committed Ledger / Micro-blog JSON), scores each with its own synthesised music, and `-- --publish` writes the committed web copies, posters and captions to `public/video/page-films/`. Storylines in `docs/page-films.md`.
- **Film registry and guard** (`src/data/pageFilms.js`, `src/components/common/pageFilms.test.js`): slug, poster, storyline and alt text per film; the build fails if a file is missing, a video passes 4 MB or a poster 300 KB.

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

