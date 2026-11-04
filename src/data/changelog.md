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

## [v28.0.0] — 2026-11-04

### Changed
- **Micro Blog redesign: Overview, Posts and Stats** (`src/pages/MicroBlog.js`, `src/components/MicroBlog/`): /micro-blog now opens on an **Overview**. It starts with a night sky where each timed post is a dot, placed by date and by the time it was signed (51% fall between 9 pm and 3 am). Next come **today's ten**, and then the whole archive read in eight chapters: the 24-hour clock, the shape of the years, English against Marathi, each tag's life with the tags arriving and fading, recurring phrases in both languages, streaks and silences, four moments, and emoji and running numbers. Each chapter's sentence is written from the numbers, and a chapter with no data is left out. Each chapter links to the posts behind it. **Posts** keeps search, the month river, On This Day, pinboard and list, plus removable filter chips. **Stats** has a year switch (`?year=`) over KPI tiles, posts per month, a weekday × hour heatmap, format/language/kind/source shares, a calendar of every day, top tags, the length histogram, emoji, records and a year-by-year table. Both shells draw the same tabs: the atlas at night with chapters that rise into view, classic on paper and still. `?tab=list` still opens Posts.
- **Posts tab merges its URL state** (`src/components/MicroBlog/PostsTab.js`): typing in the filters used to rewrite the whole query string, which dropped `?view=`. Filters now merge into the existing params.

### Added
- **Micro-blog insights** (`src/lib/microblogInsights.js`, `scripts/build-microblog-insights.mjs`, `public/data/microblog-insights.json`): `npm run microblog:insights` reads every post and writes a ~50 KB file: summaries for the whole archive and for each year, the posting clock parsed from the posts' own signatures (`#25:09:2021::11:37:pm`, in either script), languages by share of letters, tag lives, phrases, streaks and silences, quoted moments, and the pool the daily ten come from. No model calls, and it reads with the public key when there is no service key. Tested in `microblogInsights.test.js`, including a size budget. It is the `microblog` step of `npm run refresh` and runs in the nightly workflow.
- **The deep read, in my own voice, with four more chapters** (`src/components/MicroBlog/OverviewTab.js`, `MeaningCharts.js`, `YearCards.js`): every sentence on the Overview is now first person ("I write after dark: 51% of my timed posts…"), and the chapters are a numbered list with a contents row, so a chapter with no data drops out cleanly. New chapters:
  - **English and Marathi, side by side:** length, night share, busiest hour and day, hour profile, tags, words and emoji per language (`byLang`).
  - **A map of what I write:** every post placed by meaning (a seeded UMAP layout of the `/ask` vectors), split into 7 k-means neighbourhoods named by the tags each over-uses, or by its words when no tag stands out. You can colour it by neighbourhood, language, year or tone, hover for details, click to read, and each region shows the post closest to its middle.
  - **The tone of my years:** five tones, each defined by posts I tagged myself (#calmness, #philosophy, #personaldevelopment, #love, #desperate me). Every other post takes the nearest tone, tracked by quarter, and the page says no sentiment model is involved. As a check, the method puts 75% of the tagged posts back in their own tone.
  - **Each year on a card:** a 4:5 card per year with three numbers, its months, top tag, tone and one line I wrote, downloadable as a PNG or shared from a phone. Colours are fixed, and the quote is trimmed in code so the export never ends mid-sentence.
- **Moods and the map at build time** (`assignMoods`, `moodSeries`, `kmeans`, `nameRegions`, `regionWords`, `buildMap` in `src/lib/microblogInsights.js`; `scripts/build-microblog-insights.mjs`): read from the vectors `content_chunks` already holds, with no model calls. Posts not yet indexed are left off the map, never placed at the origin. The file is now ~94 KB (budget 150 KB).
- **Today's ten** (`dailyPicks()`): one post from each year, at least three in each language, weighted towards longer posts in the archive's own words. Seeded by the date, so every reader sees the same ten today and a new ten tomorrow. The ten are fetched by id (`getMicroblogPostsByIds`).

---

## [v27.0.1] — 2026-11-04

### Fixed
- **Resume prints on one page** (`src/components/Resume/ResumePrint.js`, `src/lib/resumeModel.js`, `resume.css`): "Print / save PDF" printed the screen sheet across three A4 pages. Paper now gets a dedicated one-page layout — header with contact details, summary, experience (two bullets per job, one for the fellowship, campus roles in one line), four selected projects, skills by group, the six newest certifications and education — chosen by `onePageResume()` (tested) and scaled down on `beforeprint` until it fits. It is portalled under `<body>` so printing hides the rest of the site without leaving blank pages, and the rule is scoped so other pages still print normally after a visit to /resume. The button now says "(1 page)", and Ctrl+P gives the same page.
- **The printed page uses the whole sheet** (`ResumePrint.js`, `onePageResume()` in `src/lib/resumeModel.js`): the first one-page layout left a fifth of the sheet blank. It now carries more of the site's own data — up to three bullets per job and two for the fellowship, four selected projects, each with what it is and two or three lines of what it did (`projectLines()`, shared with the screen cards, which now show the same lines), eight skills per group plus the stack the projects ship with, every certification, and a Beyond work list from the live stats — and scales itself to fit.

### Added
- **Hobbies** (`src/data/about.md`, `hobbiesWithEvidence()` in `src/lib/aboutModel.js`): Reading, Writing and Vibe coding, listed on /resume (screen and PDF) and in /about's long version, each with the site's own count beside it — books read, 100-days posts, projects shipped — linked to its page. A hobby the site keeps no record of is shown by name alone, never with a 0. Books and posts moved out of Beyond work so nothing is counted twice. Edit with `npm run about -- set "Hobbies" …`.
- **Off the printed resume** (`src/data/about.md`, `onePageResume({ skip })`): project titles listed there stay on the web page but are left off the one-page PDF, the next project taking the slot. Museum of Failures is the first.

---

## [v27.0.0] — 2026-11-04

### Changed
- **/about, redesigned as "How long have you got?"** (`src/components/About/AboutPage.js`, `about.css`): one page read at 10 seconds, 1 minute, 5 minutes or 10 minutes (`?read=`), each tier a superset of the last on a stopwatch rail with a dial that fills as you go deeper. The line and a Latest log; the gist with live numbers and Work / Latest build / Latest race cards; five chapters (engineer, runner, trekker, reader and writer, citizen) each with up to three live numbers, plus a year-by-year timeline built from the resume, races, treks and featured projects; the long version with "How I work" principles linked to the projects that show them, facts, likes, podcasts, a press kit of bios in three lengths with copy buttons, and an /ask chat seeded with questions from about.md. Replaces `AboutDocument.js`.
- **/resume, redesigned as a recruiter-first sheet** (`src/components/Resume/ResumeDocument.js`, `resume.css`): a summary sentence and KPIs computed from the tables (years professional, projects shipped and live, organisations built for, certifications), roles newest first grouped into professional / fellowship & research / leadership & community with durations and the skills each names, selected projects as case-study cards plus an "also built" list by year, skills with level dots and how many projects use each, "shipping with lately" counted from project stacks, certifications newest first, education, beyond work, a "last updated" stamp, an A4 print stylesheet and "Copy as plain text" for ATS forms. Replaces the four bento section components.
- **`src/data/about.md` restructured** into the sections the page reads (10 seconds, Updates, 5 minutes chapters, 10 minutes, How I work with `[evidence: …]`, Facts, I like, Podcasts, Short bio, Ask me); /ask still indexes it as the About page.
- **Footer** (`src/components/Template/Footer.js`): the sign-off now reads "intentionality Build with ❤️".

### Added
- **Latest log** (`src/components/common/LatestLog.js`, `latest.css`): a dated feed on both pages merging hand-written lines from about.md with what the tables say happened — certifications, roles, shipped projects, races, forts — so a row saved in /admin appears with no page edit.
- **Owner tools** (`src/components/common/OwnerTools.js`): with a Supabase session, both pages show pencils and plus buttons into /admin, and an update composer that produces the exact `npm run about` command. `ResourceManager` now opens `?edit=<id>` deep links.
- **`npm run about`** (`scripts/about.mjs`): `update`, `updates`, `unupdate`, `show`, `set`, `check` (sections, reading-time budgets, principle evidence) and `bios`.
- **`npm run resume`** (`scripts/resume.mjs`): `list`, `add`, `edit`, `bullet`, `remove`, `export` to YAML and `import` (upsert, optional `--prune`) for the four resume tables, with dates validated by the page's parser.
- **Models** (`src/lib/aboutModel.js`, `src/lib/resumeModel.js`, tested): loose date and date-range parsing, durations, position grouping, overlap-free professional months, skill aliases and project evidence, stack beyond the skills list, plain-text resume, about.md parsing and editing, principle evidence, timeline and updates.
- **`updatedAt`** on resume rows (`src/lib/api/resume.js`), read-only, for the "last updated" stamp.

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
