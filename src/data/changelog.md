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

## [v28.1.0] — 2026-11-04

### Added
- **Blueprint rooms for five pages** (`src/components/Blueprint/features.js`): Training (112), About (113), Resume (114), Writing Ledger (115) and Micro-blog (116) are rooms on sheet A-01, each with its specification and the slice it cuts through the stack on A-02. Code facts are read from the modules that define them (`ABOUT_SECTIONS`, `POSITION_GROUPS`, `MOODS`, `DAILY_COUNT`, the ledger's reading constants, the training `VARIABLES`); Training's and the Micro-blog's floor areas come from the stats snapshot and are omitted when missing.
- **Plan furniture** (`src/components/Blueprint/SitePlan.js`): a running track, a stopwatch, an A4 sheet, an open ledger and a constellation.

### Changed
- **Site plan** (`src/components/Blueprint/SitePlan.js`, `features.js`): the plan grows a fourth row (960×800, exported as `PLAN`); the Foyer moves down to it so the main entrance stays in the outer wall, and Training takes its old place under the Archives. The test now holds the rooms to `PLAN` and the entrance to the Foyer.
- **Section floor list** (`src/components/Blueprint/SectionRiser.js`): rows tighten when a floor holds many rooms, so all sixteen stay on the sheet.
- **Docs**: `docs/routes.md` regenerated (it was missing `/writing-ledger`); `docs/SITE_DOSSIER.md` describes the redesigned `/micro-blog` and adds `/writing-ledger`, `/training` and `/blueprint`; `docs/architecture.md` points to the generated route map instead of a stale hand-copied one; `docs/site-tour.md` is marked retired; CLAUDE.md's Blueprint section covers the plan size and the film.

