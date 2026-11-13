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

## [v34.1.0] — 2026-11-13

### Added
- **Start reading** (`src/components/WritingLedger/Cover.js`, `featuredEssays` in `src/lib/writingLedger.js`): the Writing Ledger opens on three essays — the newest, the newest in the other language and the longest — above the word counter, with one line on how to read the page. Tested.
- **The ink calendar on a phone** (`src/components/WritingLedger/InkCalendar.js`, `recentGrid` in `src/lib/writingLedger.js`): under 560 px it draws the last three months at a readable size instead of seven years of 6-pixel dots, with "Show every year" to get the rest. Tested.
- **One instruction line per page** (`src/pages/Books.js`, `Sports.js`, `Projects.js`, the Ledger and About covers): a sentence at the end of each lead says what to tap, the pattern `/treks` already used. The Projects lead also loses its gallery-speak.

### Changed
- **Filters fold away** (`src/components/Books/ShelfControls.js`, `src/pages/Treks.js`, `src/components/Projects/ProjectFilters.js`): the Books chip rows, the Treks year/season/level rows and the Projects tech-and-tag cloud sit behind one "Filters" button (with a count) at every width, so the content comes before the controls. Search stays out; a link that arrives with a filter set opens them. `scripts/books-film/capture.mjs` opens the panel before it taps.
- **The Books film follows the shelf** (`src/pages/Books.js`): the first spine moves from 1,538 px to about 1,000 px down a 1440-wide page, and from 2,319 to about 1,300 on a phone.
- **About opens on the reading** (`src/components/About/AboutPage.js`, `about.css`): the hero is the name and one line on how the page works, then the 10-second line and the one-minute gist; the depth picker ("How long have you got?") and the film follow the gist. The default depth is still one minute and `?read=` is unchanged.
- **"This month" waits for a post** (`src/components/WritingLedger/Cover.js`): the Ledger no longer shows an empty bar at 0% in a month with nothing written yet.

## [v34.0.0] — 2026-11-13

### Added
- **Homepage hero** (`src/components/Index/HomeHero.js`): the name, then two lines read from `src/data/identity.js` (a new `ROLE_LINE` and `tagline`), a question box that opens `/ask` with the question already asked, three starter chips from the same pool `/ask` samples, and one "Start here" link to `/about`. Replaces "The Digital Hub" and the "digital garden" line, which said nothing specific.
- **Now strip** (`src/components/Index/NowStrip.js`, `src/lib/homeNow.js`): the newest essay, race or trek, book (being read, else just finished) and newsletter issue, above the fold. A pure, tested model; a kind with no data is left out, and the strip draws nothing when all are empty.
- **Four doors** (`src/components/Index/HomeDoors.js`, `HOME_DOORS` in `src/data/homeFeatures.js`): Writing, Running & Treks, Work and About & life, each one nav group with its links read from `src/data/routes.js` and live counts from the stats snapshot (omitted, never zeroed). They replace the fifteen-card Explore grid; the old list still feeds the globe's pins.
- **Shared feed hook** (`src/components/Index/useLatestPosts.js`): the Now strip and Latest Writing share one `/rss-feed` request.

### Changed
- **Homepage order** (`src/pages/Index.js`): hero → Now strip → doors → Latest Writing → stats tiles → globe → trailer → Monthly Digest → a newsletter line → contact. The globe, trailer and tiles follow the content instead of standing in front of it; "In 1 Minute" is gone (the hero links to it). Latest Writing hides its heading when the feed is empty.
- **Navigation regrouped** (`src/data/routes.js`): About · Ask · Writing · Running & Treks (Races, Training, Treks) · Work · Life (Now, Newsletter, Books, Instagram, Videos). Interactive Me, Mind Map, Blueprint, Films, Stats and both Changelog pages move to a footer group, "How this site works"; Contact stays in the footer. No route was added or removed. The footer grid is six columns (`Footer.js`).
- **Sidebar only on `/` and `/about`** (`src/layouts/Main.js`, `src/components/Template/SideBar.js`): every other page gets the full width. Its bio is now `IDENTITY.bio` instead of a hard-coded paragraph naming the old company form.
- **Crawler fallback for `/`** (`src/lib/seo/fallbackHtml.js`): the same order as the page — the identity lines, the bio and facts, then the links under one heading per nav group — instead of one flat list of 27.
- **`/ask?q=` for returning readers** (`src/components/Ask/useAskConversation.js`): a question arriving by link is added to a saved thread instead of being silently ignored.
- **Blueprint Foyer** (`src/components/Blueprint/features.js`, `ShellResolver.js`), **CLAUDE.md / AGENTS.md** "Homepage Sections": describe the new front door and the sidebar rule. The trailer and the page films still show the old homepage; re-render them with the next content refresh.

## [v33.1.2] — 2026-11-13

### Fixed
- **Blank homepage without WebGL** (`src/components/common/ErrorBoundary.js`, `src/lib/webgl.js`, `src/components/Index/GlobeShowcase.js`, `src/atlas/intro/OrbitStage.js`, `src/atlas/AtlasHome.js`): when the browser has no WebGL (locked-down browsers, remote desktops, blocklisted GPUs) `THREE.WebGLRenderer` threw inside the globe, nothing caught it, and React unmounted the whole site — `#root` was empty in both shells. The globe now checks for WebGL first and draws a static panel when there is none; an error boundary catches a throw anyway. The atlas skips its orbit straight to the map without WebGL, and its title and buttons survive a globe that fails.
- **Route error boundary** (`src/App.js`): a page that throws now shows "Something broke on this page" inside the normal shell, with Reload and Go home, instead of a white screen; moving to another route clears it.
- **Untitled book rows** (`src/pages/Books.js`): rows with no title are left off the shelf instead of drawn as empty books.

### Changed
- **Readable navigation** (`src/components/Template/Navigation.js`, `Hamburger.js`, `Footer.js`, `SideBar.js`, `FloatingToggle.js`): nav links go from 10 px at 0.25em tracking to 13 px at 0.12em with a 44 px tap height; drawer links, footer headings and links, sidebar buttons and the shell's other controls go to 12–14 px. The desktop bar now starts at `lg` (1024 px) because the larger labels no longer fit at `md`; the drawer covers everything narrower.
- **Shared controls** (`src/components/common/LogKit.js`, `PhotoViewer.js`, `src/pages/Index.js`): "Clear filters", "Full size" and the homepage call-to-action links go from 10 px to 12 px. Section eyebrows and figure labels stay small on purpose.

### Added
- **Globe fallback tests** (`src/__tests__/components/GlobeFallback.test.js`): the homepage and the atlas arrival render with a globe that throws and with no WebGL at all; `ErrorBoundary` recovers when its reset key changes.
