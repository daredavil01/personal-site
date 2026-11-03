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
- **/training — every Strava activity, in two layouts** (`src/pages/Training.js`, `src/components/Training/`): the atlas tells the log as an animated story in chapters that play the first time they scroll into view and then hand over the controls — an odometer that rolls up the total with a beating heart line and what the distance means (laps of the Earth, Everests), **Light painting** (every route replayed oldest first as trails of light, with play/pause, a scrubber, 1×/3× and hover-to-name), **The spiral of days** (one turn per year, a bead per activity, hover to read it in the centre, light up one year), **Race your past selves** (each year's best effort at a chosen distance run side by side with a race clock and medals), **Tides** (weekly kilometres as a ridgeline per year with a crosshair), **Before the city wakes** (a 24-hour dial of start times), a **shoe rack** of soles worn against 800 km, a **medal case** of records that flip over, **the road so far** (firsts and every round-number kilometre as passport stamps), a split-flap **departures board** of the latest activities and the full log; a sticky sport lens re-tells all of it for one sport. Classic gets counters with a two-year sparkline and five tabs: **Overview** (this year against every other year day by day, months stacked by sport, the sport mix, the medal case, milestones and the latest four with route and split bars), a **Log** grouped by month with route thumbnails and distance bars, a **Calendar** where any day opens its activities plus the months and the week's rhythm, **Stats & PRs** with each distance's gain since the first year, and **Routes** drawn in. Sport colours are one validated categorical set with dark steps (`training.css`). `/training/:id` shows the numbers, a pace profile, splits, laps, best efforts, the route drawn in and every other exported field under "More from Strava", with "View on Strava" and "Powered by Strava".
- **Sample log until the first import** (`src/lib/trainingDemo.js`, `src/components/Training/useTrainingData.js`): while `strava_activities` is empty (or with `?demo=1`) both layouts and `/training/:id` run on a seeded, deterministic four-year log — runs getting faster, races, hikes, rides, swims, routes around Pune, gear and best efforts — labelled "Sample data" everywhere it shows. Sample ids sit above `DEMO_ID_BASE` (`src/lib/trainingDemoId.js`) so they never collide with a real activity. The real rows replace it the moment an import lands.
- **Training figures** (`src/lib/training.js`): `weeklyTotals`, `cumulativeYear`, `monthGrid`, `startHours`, `records`, `milestones` and `howFar`, pure and tested, so both layouts count the same way.
- **Strava export import** (`supabase/migrations/0038_training.sql`, `0039_training_from_export.sql`, `scripts/strava-import.mjs`, `src/lib/stravaExport.js`): Strava's API needs a paid subscription since June 2026, so `npm run strava:import` reads the free bulk export instead — `activities.csv` (repeated headers handled, unmapped columns kept in `extra`), each activity's `.fit.gz` / `.gpx` / `.tcx` (splits, laps, best efforts and PR ranks computed from the track; `fit-file-parser` as a devDependency), `shoes.csv` / `bikes.csv` (mileage summed). No photos. Idempotent upsert on Strava's id; re-run per export.
- **Link races** (`src/pages/admin/TrainingRaces.js`, `src/components/Training/RaceActivity.js`): `/admin/training/races` suggests same-day, same-distance `/sports` races to link; a linked race page shows the activity's pace, heart rate and per-km splits. `/admin/training` edits visibility, the race link and tags (`noCreate` resources hide "New").
- **Training everywhere else**: `/now` and newsletter issues compute the "Strava" stat group from the month's activities unless one was typed (`stravaMonthStats`, `mergeMonthRecords`); `/stats` gains `activityCount` / `activityKm` / `activityHours` / `activityDays` (`STATS_VERSION` 2); `/tags` lists tagged activities; `/ask` gets one chunk per month (`scripts/ask-sources/training.mjs`, off with `ASK_SKIP_TRAINING=1`); the Blueprint's Archives room gains a Training alcove; `npm run refresh` gains a `strava` step that skips when there is no export.
- **Training share card** (`public/og/training.png`, `src/lib/og/layouts/figures.js`): the last 26 weeks as a day grid beside the activity, distance and time counts; a detail page uses the same card, since activities carry no photo. Crawlers get the activity's facts from `src/lib/seo/entities.js` (`activity` kind).

- **Import from activity files alone** (`scripts/strava-import.mjs`, `src/lib/stravaExport.js`): an export with `activities/` but no `activities.csv` now imports — a FIT session is the summary (`activityFromFit`: sport, start, distance, times, heart rate, cadence, power, calories, climb, device; temperature, step length and the rest in `extra`), a GPX keeps its Strava name (`activityFromGpx`), and unnamed activities get Strava's default ("Morning Run"). `findDuplicates` skips an activity stored under another id that starts within 60 s in the same sport, and rows that already exist are re-sent without `name`. First real import: 358 activities (COROS PACE 3, Dec 2025 – Nov 2026, plus three older GPX runs); the share card now carries their numbers.
- **Light painting frames the home ground** (`src/components/Training/atlas/NightMap.js`): routes within 15 km of the median route set the frame, so hikes to distant forts no longer shrink the streets to specks; "Everywhere" zooms out. Year labels on the scrubber no longer print over each other.

### Changed
- **Privacy by table, not by column**: raw GPS, start/end points, the private note and athlete weight are in owner-only `strava_activity_private`, because the files ignore Strava's privacy zones; the public row carries only a route with 400 m cut around both ends. The export may not mark private activities, so a visibility column is honoured when present and `visible` hides the rest.

### Fixed
- **Lint failing on main** (`src/components/Projects/Story.js`, `src/lib/askLanguage.js`): the projects film is music only, so its missing caption track is now a documented exception rather than an error, and `withReplyLanguage` fits on one line.

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

