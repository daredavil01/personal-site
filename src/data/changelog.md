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

## [v23.1.9] — 2026-10-17

### Changed
- **Sitemap** (`src/lib/seo/sitemap.js`, `functions/sitemap.xml.js`): `/sitemap.xml` now lists pages only — the manifest's indexable routes plus `/writing-ledger.html` — and no individual entity (books, treks, races, projects, decks, newsletter issues, tags). Tables are read for `updated_at` alone to date each section page, and tags are no longer read at all. Detail pages stay crawlable through their section pages; IndexNow now submits section pages whose newest row moved.

## [v23.1.8] — 2026-10-17

### Changed
- **Sitemap** (`src/lib/seo/sitemap.js`): `/sitemap.xml` no longer lists individual micro-post (`/micro-blog/:id`) or 100-days post (`/100-days-to-offload/:id`) URLs. Their section pages stay listed and dated by the newest row, and the permalinks remain reachable through them. IndexNow follows automatically, since it reads the live sitemap.

## [v23.1.7] — 2026-10-17

### Fixed
- **Refresh noise** (`scripts/build-docs.mjs`, `scripts/lib/dataFile.mjs`): `npm run docs:build` (and the `ask` refresh step that calls it) no longer rewrites `docs/facts.json` when only `site_facts()`'s `generated_at` stamp would change.
