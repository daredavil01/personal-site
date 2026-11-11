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

## [v32.1.2] — 2026-11-11

### Changed
- **Build runtime** (`.nvmrc`, `package.json`, `.github/workflows/`): Cloudflare Pages and every GitHub workflow now run on Node 24 (the current LTS) instead of the end-of-life Node 20 on Pages and 22 in CI, and `engines` says so. `wrangler`, `miniflare` and the AI SDK require Node 22 or newer, which is what filled every deploy log with `EBADENGINE` warnings.

## [v32.1.1] — 2026-11-11

### Fixed
- **Deploy** (`package-lock.json`): Cloudflare's `npm ci` refused to install because the lockfile no longer listed `@emnapi/runtime` and `@emnapi/core`, which `package.json`'s dependency tree now needs. Regenerated with npm 10 (the build image's), checked with a clean `npm ci`, build and test run.

## [v32.1.0] — 2026-11-11

### Added
- **Share studio** (`src/components/share/ShareStudio.js`): "Share as image" rebuilt from scratch for every entry that has it — micro-posts, books, blogs, races, treks, Instagram posts, /ask answers, newsletter issues and sections. A live preview with six tabs (Ideas, Text, Theme, Type, Layout, Details), a bottom sheet on phones, swipe or ← → through themes, Shuffle, and Download / Share / Copy. The last look is remembered per kind. Loaded as its own chunk and portalled to `<body>`, so no page pays for it until it opens and no host's CSS can reach the card.
- **39 themes in eight families** (`src/components/share/themes.js`): core, paper and ink, editorial, mesh gradients, print textures (risograph misregistration, halftone, film grain, photocopy), Indian craft (Warli, Kolam, Paithani, Monsoon, Holi, Saffron, Chai), night, minimal — plus a ninth family of two built from the post itself (its photo's colour, its first tag's colour) and a custom accent. Tokens are data; a test holds every theme's text to 4.5:1 contrast.
- **Ten layouts** (`src/components/share/layouts.js`): Editorial, Pull quote, Poster, Polaroid, Note, Column with a drop cap, Minimal, Ticket (race/trek stub with the time and distance in big numbers), Index card (books) and Letter (newsletter). Text fits its frame by measurement (`FitBox.js`), so long Marathi posts never break the card.
- **26 font pairings** (`src/components/share/typography.js`), eleven of them setting Marathi; a Marathi post can only take those. Size, line height, letter spacing, case, weight and quote marks; alignment left/centre/right/justify, top/middle/bottom; frames, margins and six shapes (4:5, 1:1, 9:16, 1.91:1, 16:9, Fit).
- **Photos at full size**: by default the post's photo spans the card's width at its own proportions, never cropped (capped only so the words fit on a fixed frame; uncapped on Fit). Where a frame is a different shape, a blurred copy of the photo fills it instead of bars.
- **Edit the words on the image**: change the title or text, pick one or more sentences as the quote, highlight a phrase (marker, underline or accent ink). Nothing is written back.
- **Ideas for this post** (`src/components/share/presets.js`): 22 named looks ranked on the device from the post's language, length, photo, numbers, tags and — for micro-posts — the hour in its signature.
- **AI picks for the owner** (`src/lib/shareSuggest.js`, `functions/api/assist.js` task `share_design`, switch `share_suggest`, `supabase/migrations/0042_assist_share_design.sql`): signed in, "Ask AI" returns four looks with a reason each, from Jev (one yes/no per preset) or Gemini → Workers AI, filtered back to ids the studio can draw.

### Changed
- **Share card** (`src/components/share/ShareCard.js`, `shareCardConfig.js`): now a thin renderer over theme + layout + pairing; adapters add `stats`, `author`, `date` and `lang`. Bare links are dropped from the card's text (the footer carries the address). `shareFonts.js` is replaced by `typography.js`.

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
