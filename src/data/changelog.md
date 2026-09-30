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

## [v20.1.0] — 2026-09-30

### Added

- **Presentations filters** (`src/pages/Presentations.js`, `src/lib/deckFilters.js`): `/presentations` gets the same control bar as `/projects` — search over title, description and tags, a year filter with an Undated bucket, tag chips with counts (multi-select, combined with OR like `/books` and `/projects`), and sort by date or title in either direction. Undated decks sink in both directions. State lives in the URL (`?q=&year=&tags=&sort=&dir=`), merged so `?view=` survives; Clear keeps the sort.

### Changed

- **Micro-blog tagged by Claude**: every micro-post with text (1,635 of 1,666) was read in a Claude Code session and given up to four tags from the existing vocabulary, merged onto its current tags (at most five per post) through `set_entity_tags`. 816 posts gained tags; no new tag was created. The run's journal in `knowledge_base/` holds each row's tags before and after.
- **Removed `npm run microblog:tag`** (`scripts/tag-microblog.mjs`, `package.json`): the Gemini batch pass it ran is done, so the script, its npm entry and the `microblog_autotag` switch in `AI_FEATURES` (`src/data/askConfig.js`) are gone. `docs/ai-features-status.md` records the run.
- **Removed finished one-time scripts** (`package.json`): `tags:migrate` (`migrate-tags-to-central.mjs` — the legacy tag columns it read were dropped by `0004`) and `images:upload` (`upload-images-to-supabase.mjs` — `public/images/` no longer holds content images; admin uploads go straight to Storage). References in `CLAUDE.md`, `.env.example`, `docs/setup_guide.md` and `docs/architecture.md` updated.
- **Micro-posts classified by Claude**: every micro-post with text now has a `post_kind` (own / quote / reblog / link) and a confidence, read in a Claude Code session rather than the Gemini pass — 1,516 own, 33 quote, 38 reblog, 48 link. Before this only 6 rows were classified, so the own-vs-reblog filter and the reblog sinking in `/ask` retrieval had almost nothing to act on. The journal is compatible with `npm run microblog:classify -- --undo`.
