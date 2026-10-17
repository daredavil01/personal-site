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

## [v23.1.6] — 2026-10-17

### Fixed
- **Refresh noise** (`scripts/lib/dataFile.mjs`, `scripts/blog-word-counts.mjs`, `scripts/build-logbook.mjs`): `npm run refresh` no longer rewrites `public/data/writing-ledger.json` or `public/data/logbook.json` when only `generatedAt` / `currentPeriod` would change, so a run with no new essays leaves no diff to commit. Same rule the nightly workflow's commit step already applied.
