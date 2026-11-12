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

## [v33.1.1] — 2026-11-12

### Added
- **Site upkeep skill** (`.claude/skills/site-upkeep/SKILL.md`): `/site-upkeep` runs `npm run refresh` end to end — preflight, a before snapshot, the run, Haiku for any changelog summary the model ladder failed on, the share cards whose numbers moved, validation — and returns a before/after summary of what changed.
- **Refresh report** (`scripts/refresh-report.mjs`, `npm run refresh:report`): `snapshot <file>` records the ledger, text cache, Logbook, micro-blog, card and changelog/`/ask` numbers; `diff <file>` prints what moved and checks that every post's text is cached, the Logbook counts every ledger post, the data files are inside their test budgets, no card is newly over 300 KB and every version and major has a summary. Exits 1 on a failed check.
- **Summary hand-off** (`scripts/summarise-changelog.mjs`, `scripts/summarise-majors.mjs`): `--export <dir>` writes each pending prompt and calls no model; `--import <dir>` writes another model's answers back through the same parser, with the script's own source hash and a `--model` label, for when Gemini 503s and the Workers AI rungs cannot run in node.

### Changed
- **Logbook includes every post** (`scripts/build-logbook.mjs`, `src/lib/logbook.js`): the 150-word floor that left ten short posts off (nine podcast show notes and the launch placeholder) is gone, so the Logbook counts what the Writing Ledger counts — 126 posts each.

### Fixed
- **Substack archive paging** (`scripts/blog-word-counts.mjs`): Substack now answers `{ posts, nextCursor }` and rejects any `offset` with a 400, so every run fell back to the last ledger and four new essays never arrived. The archive is paged by cursor (the old array shape is still read); all 97 Substack bodies download again.
- **Supabase URL from wrangler.toml** (`scripts/build-docs.mjs`): `loadEnv` fills `VITE_SUPABASE_URL` and the publishable key from `wrangler.toml` when neither the shell nor `.env` sets them, so a machine with only the secrets no longer stops at "Missing SUPABASE_URL".
