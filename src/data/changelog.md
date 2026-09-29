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

## [v20.1.1] — 2026-09-29

### Fixed

- **`npm run refresh -- --dry-run` wrote files** (`scripts/refresh.mjs`): a step whose script has no dry run (`blogs`) ran for real and rewrote the writing ledger. It is now skipped under `--dry-run`. The commented-out `gaps` step is removed and `ask:gaps` stays a separate command, since it spends model tokens on a report.

### Changed

- **Removed three dead AI switches** (`src/data/askConfig.js`): `tag_descriptions`, `book_metadata` and `microblog_kind` gated only the one-time scripts deleted in v20.1.0, so they no longer appear in `/admin/ask/settings`. `docs/ai-features-status.md`, the micro-blog admin form comment and the changelog script usage lines no longer name removed commands.
