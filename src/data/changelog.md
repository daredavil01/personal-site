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
