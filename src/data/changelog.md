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

## [v23.1.8] — 2026-10-17

### Changed
- **Sitemap** (`src/lib/seo/sitemap.js`): `/sitemap.xml` no longer lists individual micro-post (`/micro-blog/:id`) or 100-days post (`/100-days-to-offload/:id`) URLs. Their section pages stay listed and dated by the newest row, and the permalinks remain reachable through them. IndexNow follows automatically, since it reads the live sitemap.

## [v23.1.7] — 2026-10-17

### Fixed
- **Refresh noise** (`scripts/build-docs.mjs`, `scripts/lib/dataFile.mjs`): `npm run docs:build` (and the `ask` refresh step that calls it) no longer rewrites `docs/facts.json` when only `site_facts()`'s `generated_at` stamp would change.
