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

## [v34.2.0] — 2026-11-18

### Added
- **IoAI Ambassador card** (`src/components/common/IoaiAmbassador.js`): The Institute of AI "AI Ambassador" badge, a short note on what IoAI offers and a link to it, shown on the homepage after Latest Writing and in the one-minute tier of /about. /about also gains an "AI Ambassador, IoAI" role chip and a dated #career line in its Latest log.
