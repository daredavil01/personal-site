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

## [v26.0.0] — 2026-11-04

### Changed
- **The Writing Ledger, redesigned** (`src/pages/WritingLedger.js`, `src/components/WritingLedger/`): the standalone `public/writing-ledger.html` is now a React route inside the site's header, sidebar and footer (or the atlas `writer` region), bound as an accountant's ledger: ruled paper with a red margin rule, a rolling odometer of every word written, reading-time / pages / novels / words-a-day equivalents, dot-leader account lines, and this month and this year as progress bars against last month and last year. Eight folios follow: a shelf of every post as a book spine, an ink calendar of every day since 2020, the long arc (running total with 25k milestones and the longest silence shaded, year tiles, every calendar month stacked by platform), recurring themes as a treemap plus a topic × year matrix, a weekday rose and length ruler, a record book of torn receipts, the newest posts with their covers, and the full searchable ledger with a topic filter fed by the treemap.
- **Routing** (`src/App.js`, `src/data/routeManifest.js`, `src/data/pageMeta.js`, `src/data/routes.js`): `/writing-ledger` is a manifest route with its own meta and the existing `writing-ledger` card, so it re-hosts its card on previews like every other page. The nav link is internal now. `STATIC_PAGES` (sitemap) and `STATIC_DESCRIPTIONS` (llms.txt) are empty.
- **Middleware** (`functions/_middleware.js`): the old `/writing-ledger.html` 301s to `/writing-ledger`; the static pass-through is gone.
- **Docs** (`docs/writing-ledger.md`, `docs/og-cards.md`, `CLAUDE.md`, `AGENTS.md`): the page, folio by folio, and the static-page exceptions removed.

### Added
- **Ledger model** (`src/lib/writingLedger.js`, `src/lib/writingLedger.test.js`): every derived number in one pure module — month series with gaps, milestones, monthly streaks, longest silence, busiest day, tags merged across spellings, a squarified treemap, a Monday-first year grid, reading equivalents.

---

## [v25.0.1] — 2026-11-03

### Fixed
- **Strava visibility detection** (`src/lib/stravaExport.js`, `scripts/strava-import.mjs`): the CSV's `Weather Visibility` column was read as the activity's visibility, marking rows with a weather reading as `everyone` and hiding the import's "No visibility column" notice. Only a `Visibility` or `Activity Visibility` header counts now.
- **Strava import dropped FIT session data** (`src/lib/stravaExport.js`, `scripts/strava-import.mjs`): with a CSV present, a FIT file gave only the route, splits and streams, so device, temperature, running form, strength sets and trail-run type were missing. `mergeFitSummary` now fills them in; the CSV wins where both have a value.
- **Training film on Windows** (`scripts/training-film/`): the scripts built the repo root from a URL pathname, which is not a valid path on Windows; they now use `fileURLToPath`. `CHROME_PATH` chooses the browser for capture and render.

### Changed
- **Strava docs** (`docs/strava.md`): a file's number is not the activity id, so a files-only import stores the wrong id; how to correct it.
