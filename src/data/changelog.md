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

## [v23.1.0] — 2026-10-16

### Added
- **The Logbook tour** (`src/components/Logbook/TourDialog.js`, `public/video/the-logbook.mp4`): A narrated, vertical film of the page in use at phone size — the route inking across the cover, the prologue's dots, the Atlas hover card and walked route, the sky filling, a fingerprint, a guessed year, letters paged through, a poem locked and shuffled, and an essay opening as its own page — each chapter titled and captioned on screen, so it plays with the sound off, over the Scriptorium's own music. "Watch the tour" on the cover (or a `?tour` link) opens it in a dialog with a chapter list that seeks, the narration as captions, and a download link; `preload="none"` keeps it off the page's weight until it plays.
- **Tour guard** (`src/components/Logbook/tour.test.js`): Fails the build if the video, poster, captions or chapter list is missing, the chapters stop following the page's order, or the web encode outgrows 6 MB.

### Changed
- **Dialog mechanics** (`src/components/Logbook/shared.js`, `src/components/Logbook/EntrySheet.js`): The focus trap, Escape, page scroll lock and focus return move into a `useModal` hook shared by the essay page and the tour.

## [v23.0.0] — 2026-10-16

### Changed
- **Wanderer's Logbook, redesigned** (`src/pages/Logbook.js`, `src/components/Logbook/`): The page is now bound as a field journal rather than a dashboard of tabs. A cover inks the wanderer's route across the chart in writing order, every essay landing as the line reaches it; a five-step scrollytelling prologue (prose in its own column, a sticky figure, one dot per essay gliding from a ledger to a timeline, two language lanes, the map and the exclamation marks) replaces the scrolly film and its duplicate controls; a contents page draws each chapter's thumbnail from the real data; six chapters follow, each with a numeral and a floating dock to move between them, then an index and a colophon. Set in Instrument Serif and Tiro Devanagari Marathi, on warm paper by day and indigo by night, with English as indigo circles and Marathi as saffron diamonds throughout.
- **Atlas** (`src/components/Logbook/AtlasLens.js`, `src/components/Logbook/ChartBase.js`): Each region is an island grown from its own essays' positions (blur, threshold, coastline, an offshore contour), named in italic map type. Search by title, tag or first line; keep one language; hover a territory to raise it or click to keep only it; a hover card reads an essay's first line; an opened essay stays marked with dashed lines to its three nearest neighbours; "Walk the route" draws the path in writing order with the month at its head.
- **Sky** (`src/components/Logbook/SkyLens.js`): An observatory beside the sky draws the constellation in focus large, every star labelled with its word, the line tracing itself in; "Watch the sky fill" lights the essays in writing order with the year on the sky; arrow keys move through the sky with one tab stop.
- **Fingerprint** (`src/components/Logbook/FingerprintLens.js`): A specimen takes one essay apart — the spiral large, its mix of full stops, commas, exclamation and question marks, its sentence rhythm, average and longest sentence, exclamations per 1,000 words — beside a cabinet of every spiral filed under its year (the old 103-card wall was 4,500 px tall). Sort by longest, loudest, most questions or calmest.
- **Phrases** (`src/components/Logbook/PhrasesLens.js`): Signature phrases as a ledger with a dot per year sized by use; words of the year set in proportional type; each year's loudness as a row of exclamation marks; Guess the year now deals a year first, so the busiest year is not the safe answer, and keeps a streak and says how far off a guess was.
- **Letters** (`src/components/Logbook/LettersLens.js`): Every then-and-now pair is an arc across the years above a single pair of postmarked letters with their closeness in meaning; step, shuffle or pick an arc (the old column of 22 pairs ran 5,800 px).
- **Found poems** (`src/components/Logbook/PoemMachine.js`): A framed paper card with drawn padlocks; a shuffle inks only the new lines in, one after another; the year stays with its line's last word.
- **Essay page** (`src/components/Logbook/EntrySheet.js`): Opening an essay slides in a page of its own (a bottom sheet on a phone) with its photo duotoned, opening line, words and reading time, fingerprint and rhythm, its place on a mini chart with its neighbours, and the pinned Ask chat. It is a dialog: focus moves in and stays, Esc closes, ← and → turn the page in writing order, and focus returns to what opened it.

### Added
- **Index** (`src/components/Logbook/EntryIndex.js`): Every entry as a ledger grouped by year — search titles, tags and first lines in either script, filter by language, order by newest, oldest or longest.
- **Logbook geometry** (`src/components/Logbook/model.js`, `model.test.js`): Prologue layouts, spirals, phyllotaxis, arcs, year ticks, search and the game's year-first draw as pure, tested functions.

### Fixed
- **Sentence fragments in the game and poems** (`src/lib/logbook.js`): A line could start on a digit — "६.५० वाजता…" split at its decimal point left "५० वाजता…" — so `startsLikeSentence` now requires a letter or an opening quote, at build time and again on the page for the committed file.
- **Unreadable map on a phone**: Every figure now draws at its real pixel width instead of scaling a 1,000-px drawing down, so region names and labels stay legible at 390 px.

## [v22.0.1] — 2026-10-16

### Fixed
- **Nightly essay wipe** (`scripts/blog-word-counts.mjs`, `scripts/ask-sources/writing.mjs`, `scripts/lib/registry.mjs`): Substack answers GitHub runners with a 403 challenge on the archive API, post bodies and the RSS feed alike, so the nightly text cache held only the 29 WordPress bodies — and `ask:index` deleted the 509 Substack body chunks every night that a local run had embedded. The cache now lists the posts it lacks in `missing`; the `writing` source then sits the run out with `keep: true`, which protects its chunks without failing the job.
- **Logbook on an incomplete cache** (`scripts/build-logbook.mjs`): `npm run logbook` keeps the last `logbook.json` instead of committing a map without the Substack essays.
- **Hidden Substack outage** (`scripts/blog-word-counts.mjs`, `.github/workflows/ask-refresh.yml`): The unreachable-Substack warning, and the count of posts without text, now go into the run's summary page as well as an annotation.

## [v22.0.0] — 2026-10-16

### Added
- **Wanderer's Logbook** (`src/pages/Logbook.js`, `src/components/Logbook/`): A new page at `/logbook` in the Scriptorium that reads every essay — English and Marathi, Substack and WordPress — as data. A scrolly intro moves one dot per essay from a timeline (the 2026 surge) to language lanes, to a map of meaning, to how loud each essay is; six lenses follow: Atlas (essays placed by their embeddings, regions named by tags, a walkable trail in writing order), Sky (each opening sentence drawn as a constellation, after Rougeux), Fingerprint (each essay's punctuation as a spiral plus its sentence rhythm, after Posavec and Between the Words), Phrases (signature phrases by year, words of the year, exclamations per 1,000 words, a "Guess the year" game), Letters (an old passage beside the recent one closest in meaning, across languages), and a Found-poem machine with lockable lines, shareable `?poem=` links and PNG export. Selecting any essay opens a drawer with its nearest neighbours and an Ask chat pinned to it.
- **Logbook data build** (`scripts/build-logbook.mjs`, `src/lib/logbook.js`): `npm run logbook` turns the post-text cache and the `/ask` embeddings into `public/data/logbook.json` with no model calls — UMAP layout (`umap-js`, build-time only), k-means regions, phrases, sentence picks and then-and-now pairs. Single-sentence excerpts only; `src/lib/logbook.test.js` holds the committed file to a 30-word excerpt limit and a 200 KB budget.
- **Logbook share card** (`src/lib/og/layouts/figures.js`, `public/og/logbook.png`): The newest essay's opening line drawn as a constellation, with essays, words and languages.

### Changed
- **Upkeep** (`scripts/refresh.mjs`, `.github/workflows/ask-refresh.yml`): `logbook` runs after `ask` in `npm run refresh`, and the nightly job rebuilds and commits `logbook.json` alongside the ledger when either changed.
- **Navigation and regions** (`src/data/routes.js`, `src/atlas/regions/registry.js`, `src/atlas/map/mapRegions.js`): The Logbook joins the Writing menu and the Scriptorium region.

### Fixed
- **Ask focus ids** (`src/lib/askRetrieval.js`): A `writing` essay's id is a 15-digit `syntheticId`, but focus targets were capped at 12 digits, so a chat pinned to one of the 43 essays without a `blogs` row silently lost its focus. The cap is now 15.
