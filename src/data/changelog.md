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

## [v23.2.0] — 2026-10-22

### Added
- **Weekly text backups to R2** (`scripts/backup-r2.mjs`, `.github/workflows/backup.yml`): `npm run backup` dumps 23 Supabase tables (content, tags, now/newsletter, resume, settings, feedback, /ask conversations and shares) into one gzipped JSON at `personal-website-backups/text/<date>.json.gz`, every Monday 02:30 IST. Embeddings, usage counters and git-derived commits are left out. A bucket lifecycle rule expires backups after 30 days. Restore steps in `docs/backups.md`.
- **Projects join /now and the newsletter by their date** (`src/lib/nowAutofill.js`): a visible project dated in a month is pulled into that month's Projects section — live on /now, by the admin pull button, and by `npm run newsletter:draft`. Undated and hidden projects never appear; a hand-typed row with the same link keeps its text and gains the archive ref.
- **AI assist admin page** (`src/pages/admin/AiAssist.js`, `/admin/ai`): switches for Draft, Suggest tags and alt text, an own model ladder (`ask_settings.assist_tiers`, falls back to the /ask ladder when empty), per-task request counts, error and fallback rates, p50/p95 latency, and a filterable log of every `/api/assist` call (`assist_log`, migration `0034`). Prompts and image bytes are never stored.

### Fixed
- **Shared conversations could run script on this domain** (`src/components/Ask/AnswerBody.js`, `src/pages/AskShare.js`, `src/lib/askShareSnapshot.js`): raw HTML in answers now renders as text, share snapshots keep only http(s) or site-path URLs, and a source link's target is decided from its URL rather than a stored flag. markdown-to-jsx upgraded to 7.7 (CVE-2024-21535).
- **Anyone could exhaust /ask's daily cap or forge log rows** (`supabase/migrations/0033_lock_service_rpcs.sql`, `functions/api/ask.js`, `functions/api/transcribe.js`): `ask_quota`, `ask_log`, `ask_record_tier`, `ask_eval_budget` and `ask_eval_record` are now service-role only, and the worker calls them with the service key.
- **Open redirect** (`functions/_middleware.js`): a path like `//evil.example/` no longer 301s to another host.
- **Newsletter issue jumped to the bottom on load** (`src/components/Ask/AskChat.js`): the chat's follow-the-conversation scroll also ran on mount, so the issue's embedded chat dragged the window to its foot. It now scrolls only once there is a conversation.
