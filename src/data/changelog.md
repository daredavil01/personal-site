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

## [v25.0.0] — 2026-11-03

### Added
- **/training — every Strava activity** (`src/pages/Training.js`, `src/pages/TrainingPost.js`, `src/components/Training/`): a new page with four views over one URL-state filter (search, sport, year, tags, races only, sort): a paged log, a year calendar with streaks, stats & best efforts (totals per sport and year, the fastest 1K–marathon per year, gear mileage) and every route drawn as a line. `/training/:id` shows the numbers, splits, laps, best efforts, the route and every other exported field under "More from Strava", with "View on Strava" and "Powered by Strava".
- **Strava export import** (`supabase/migrations/0038_training.sql`, `0039_training_from_export.sql`, `scripts/strava-import.mjs`, `src/lib/stravaExport.js`): Strava's API needs a paid subscription since June 2026, so `npm run strava:import` reads the free bulk export instead — `activities.csv` (repeated headers handled, unmapped columns kept in `extra`), each activity's `.fit.gz` / `.gpx` / `.tcx` (splits, laps, best efforts and PR ranks computed from the track; `fit-file-parser` as a devDependency), `shoes.csv` / `bikes.csv` (mileage summed). No photos. Idempotent upsert on Strava's id; re-run per export.
- **Link races** (`src/pages/admin/TrainingRaces.js`, `src/components/Training/RaceActivity.js`): `/admin/training/races` suggests same-day, same-distance `/sports` races to link; a linked race page shows the activity's pace, heart rate and per-km splits. `/admin/training` edits visibility, the race link and tags (`noCreate` resources hide "New").
- **Training everywhere else**: `/now` and newsletter issues compute the "Strava" stat group from the month's activities unless one was typed (`stravaMonthStats`, `mergeMonthRecords`); `/stats` gains `activityCount` / `activityKm` / `activityHours` / `activityDays` (`STATS_VERSION` 2); `/tags` lists tagged activities; `/ask` gets one chunk per month (`scripts/ask-sources/training.mjs`, off with `ASK_SKIP_TRAINING=1`); the Blueprint's Archives room gains a Training alcove; `npm run refresh` gains a `strava` step that skips when there is no export.
- **Training share card** (`public/og/training.png`, `src/lib/og/layouts/figures.js`): the last 26 weeks as a day grid beside the activity, distance and time counts; a detail page uses the same card, since activities carry no photo. Crawlers get the activity's facts from `src/lib/seo/entities.js` (`activity` kind).

### Changed
- **Privacy by table, not by column**: raw GPS, start/end points, the private note and athlete weight are in owner-only `strava_activity_private`, because the files ignore Strava's privacy zones; the public row carries only a route with 400 m cut around both ends. The export may not mark private activities, so a visibility column is honoured when present and `visible` hides the rest.

### Removed
- **Strava API sync** (`0039_training_from_export.sql`): the OAuth script, `/api/strava-sync`, the "Sync now" page, the nightly step and the `strava_auth` / `strava_athlete` tables — written first, then dropped for the export when the API went behind a paywall.

## [v24.2.1] — 2026-11-02

### Fixed
- **/ask answered English questions in Marathi** (`src/lib/askLanguage.js`, `functions/api/ask.js`): the prompt only said "answer in the language the question was asked in", and Marathi sources, the Marathi spelling of the name and earlier Marathi answers often won — "Which marathons has Sanket run in the last 6 months?" came back in Marathi with an empty history. The system prompt now defaults to English and forbids switching because of sources or history, and the latest question goes to the model with a `(Reply in …)` line from `replyLanguage()`: Marathi only when asked for ("in Marathi", "मराठीत"; "marathon" does not count), a Devanagari question in its own language, a spoken one in the language Whisper heard, else English. Retrieval, `ask_log` and the `?q=` link keep the raw question; the answer-cache key is versioned so replies stored under the old prompt are not served.

## [v24.2.0] — 2026-10-31

### Added
- **Scoped search for named types** (`functions/api/ask.js`, `src/lib/askRetrieval.js`): when a question names a content type ("which projects…", "what does he do for a living"), a second `hybrid_search` scoped to those types runs beside the unscoped one and its best few chunks (`mergeScoped`) go ahead of the rest. The unscoped search ranked decks, videos and changelog entries with "projects" in the title above every real project.
- **Project roster carries org · category · status** (`supabase/migrations/0037_ask_facts_visible_projects.sql`): `site_facts()` roster entries for projects gain `x`, written on the roster line, so "which projects were built for NGOs?" can be answered from the complete list.
- **Used tags are indexed** (`scripts/ask-sources/tag.mjs`): every tag on at least one row gets a chunk with its per-type usage counts, not only tags with a description or category — 24 tags (birding, design, accessibility…) had none.

### Changed
- **Project chunks name their links** (`scripts/ask-sources/project.mjs`): the primary link and the repo/demo/write-up links are in the head chunk.
- **Career questions read as résumé** (`src/lib/askRetrieval.js`): "for a living", "profession", "works at/as", नोकरी and similar now name the résumé type.
- **Marathi spelling of the name** (`src/data/identity.js`, `functions/api/ask.js`): `IDENTITY.nameMr` and one prompt line, after answers wrote "संकित तांबे".

### Fixed
- **Facts counted hidden rows** (`supabase/migrations/0037_ask_facts_visible_projects.sql`): under the service role (the judge, `docs:build`) `site_facts()` counted the hidden project and hidden videos — 24 projects against a roster of 23. Counts and breakdowns are visible rows only.

