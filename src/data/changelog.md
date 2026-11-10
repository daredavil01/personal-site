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

## [v32.0.0] — 2026-11-10

### Added
- **Arena design kit** (`src/components/Arena/`): the shared language of /training, /sports and both detail pages — an always-dark "before sunrise" stage, Barlow Condensed numbers that count up once, lens tabs, reading plates, figure tiles and a film dialog. Layouts switch on a container query, so the classic sidebar no longer makes breakpoints lie.
- **The swarm** (`src/components/Training/Swarm.js`, `src/lib/swarmLayouts.js`): every training session is one dot on a canvas, and each lens is a different formation of the same dots — stacked by week, a calendar, a 24-hour dial, distance against pace, heart rate against time out, a skyline of climbing, and the ledger. Dots fly between formations, rise from the horizon on first load, dim under filters, name themselves on hover and open their session on a click. Race days wear a gold ring. The formation maths is pure and tested.
- **Rhythm and Engine lenses** (`src/components/Training/TrainingLenses.js`): when the watch starts and which days carry the kilometres; and the body's numbers — total steps with a month-by-month chart, the biggest step session, heart-rate zones, running form (pace, heart rate, cadence, stride, ground contact, bounce) as monthly trend lines, strength, and the inventory of every recorded variable (`stepStats`, `formTrends` in `src/lib/trainingFacts.js`).
- **The start line** (`src/components/Sports/StartLine.js`): every finish at one distance replayed from the same gun at its own average pace, with a race clock, a scrubber, and a photo-finish strip where each race's photo arrives in finishing order.
- **The bib wall** (`src/components/Sports/BibWall.js`): each race as its photograph, shown whole, with the bib it was run in pinned underneath — the real bib number, the distance band, the finish time, pace and gap to the personal best.
- **Race standing and the race-day session** (`src/lib/raceLog.js`, `src/lib/api/training.js`, `src/components/Training/RaceActivity.js`): a race page now ranks the finish among every other at its distance on one time line, compares it with the previous attempt at the same event, and shows the watch's record of the day — splits, heart rate, steps, climb — found by `sport_id` or, failing that, by the same day and distance.
- **Splits chart** (`src/components/Training/SplitChart.js`): an activity's kilometres as bars with the fastest marked, the average dashed and the heart-rate line over the top.

### Changed
- **/training** (`src/pages/Training.js`, `src/components/Training/TrainingArena.js`): complete redesign. One layout replaces the atlas story and the classic tabs; seven lenses (Overview, Calendar, Rhythm, Records, Engine, Routes, Log) keep the old `?tab=` ids, and the figures worth keeping moved to `src/components/Training/figures/`.
- **/sports** (`src/pages/Sports.js`): complete redesign. The stage carries the headline, the half-marathon clock running down from the first finish to the best, the start line and a readout of races, kilometres, hours and personal bests; the Overview, Races and Records lenses sit under it. A race opens its own page instead of a quick-look sheet.
- **/sports/:id** (`src/pages/SportPost.js`): redesigned — photo, bib, finish time and pace on the stage, then the standing, the session from the watch, the photographs, the certificate and the neighbouring races.
- **/training/:id** (`src/pages/TrainingPost.js`): redesigned — the route drawing itself, the headline numbers, the day replayed, the splits chart, time at each heart rate, form, conditions, laps and best efforts.
- **Share cards** (`src/lib/og/layouts/figures.js`, `public/og/training.png`, `public/og/sports.png`): /training's card is now the swarm of the last 26 weeks, /sports' is the start line; both re-rendered from the live numbers.

### Fixed
- **Race photos** (`src/components/Sports/BibWall.js`, `src/components/Sports/StartLine.js`): photographs are anchored to the top and never covered by the bib or a full-height gradient, so faces are no longer cropped out of the cards.
- **Training log rows** (`src/components/Training/figures/ActivityLog.js`): every row said "no map", even for runs that have a route, because the list never loads routes. The placeholder is gone; a thumbnail shows only for rows that carry one.
- **Tall plates** (`src/components/Arena/Arena.js`): a plate taller than the screen (the Log) could stay invisible on a phone because it waited for a share of itself to be in view. It now appears as soon as any part is.
