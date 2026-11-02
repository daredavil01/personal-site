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

