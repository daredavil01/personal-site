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

## [v25.0.1] — 2026-11-03

### Fixed
- **Strava visibility detection** (`src/lib/stravaExport.js`, `scripts/strava-import.mjs`): the CSV's `Weather Visibility` column was read as the activity's visibility, marking rows with a weather reading as `everyone` and hiding the import's "No visibility column" notice. Only a `Visibility` or `Activity Visibility` header counts now.
- **Strava import dropped FIT session data** (`src/lib/stravaExport.js`, `scripts/strava-import.mjs`): with a CSV present, a FIT file gave only the route, splits and streams, so device, temperature, running form, strength sets and trail-run type were missing. `mergeFitSummary` now fills them in; the CSV wins where both have a value.
- **Training film on Windows** (`scripts/training-film/`): the scripts built the repo root from a URL pathname, which is not a valid path on Windows; they now use `fileURLToPath`. `CHROME_PATH` chooses the browser for capture and render.

### Changed
- **Strava docs** (`docs/strava.md`): a file's number is not the activity id, so a files-only import stores the wrong id; how to correct it.
