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

## [v23.1.1] — 2026-10-16

### Fixed
- **Embedded Ask chats** (`src/components/Newsletter/IssueParts.js`, `src/components/Logbook/EntrySheet.js`): the newsletter's "Ask about this month" box and the Logbook essay sheet's "Ask the archive" box were capped at 32rem / 28rem, so the input, type chips and voice note took most of the box and the answer scrolled inside a strip of 120–320 px. The caps are gone: the thread now grows in the page (or the sheet) the way it does on `/ask`. The corner launcher keeps its own cap.
- **Ask source cards** (`src/components/Ask/AskChat.js`): the grid switched to two columns on a viewport breakpoint, so a narrow container (the Logbook sheet, the launcher) got two truncated columns, and a long source domain overflowed them and gave the thread a sideways scrollbar. Columns now come from the container's own width (one column under ~32rem), and the meta line truncates.
