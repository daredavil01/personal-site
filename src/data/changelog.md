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

## [v24.1.0] — 2026-10-23

### Added
- **The /videos film** (`scripts/videos-film/`, `public/video/the-videos-story.{mp4,jpg,vtt}`): 90 seconds, vertical, narrated. It opens in orbit and zooms on real satellite imagery down to Pune, where a browser opens on the site; rewinds through the channel year by year since its first upload; counts what the site already tracked against the twelve fields a video took by hand; cuts the ribbons on /videos; walks the live page (the Shorts switch, search, filters, most viewed, play); then runs Sync now in the admin and follows the data from the YouTube Data API through the Cloudflare Worker into Postgres and onto the page. Each act has its own type and palette; the score is synthesised for it and the narrator is the Blueprint film's.
- **Film pipeline** (`scripts/videos-film/capture.mjs`, `film.html`, `score.mjs`, `render.mjs`, `npm run videos:film`): capture once (satellite tiles, thumbnails, live phone shots, the admin against a replayed backend), render frame by frame like the homepage trailer, `--remix` for sound only, `--publish` for the web copy. Every number comes from the live videos table and /api/stats when it renders.
- **Film on /videos** (`src/components/Videos/Story.js`, `src/pages/Videos.js`): the film sits in the page header with its poster and narration captions, and loads nothing until play is pressed; `story.test.js` holds the web encode under 8 MB.

## [v24.0.0] — 2026-10-23

### Added
- **Videos page** (`src/pages/Videos.js`, `/videos`): every video and Short from the YouTube channel, with search, an All / Videos / Shorts switch, tag chips, year and playlist filters and five sorts (newest, oldest, most viewed, longest, shortest). Filtering is the pure `src/lib/videoFilters.js`; the state lives in the URL (`useVideoFilters`) and never touches `?view=`.
- **Video detail pages** (`src/pages/VideoPost.js`, `/videos/:id`): the thumbnail until play is pressed, then a `youtube-nocookie.com` player (9:16 for Shorts), with date, duration, views, playlists, tags, a linkified description and "more like this". Each one unfurls with its own YouTube thumbnail.
- **`videos` table** (`supabase/migrations/0035_videos.sql`): synced columns owned by YouTube, plus `kind_override`, `visible` and central tags owned by the site; tag wiring, a `tag_entities()` arm, `site_facts()` counts and a `video` roster, and the service-role-only `set_video_playlists()`.
- **YouTube sync** (`functions/api/youtube-sync.js`, `src/pages/admin/YoutubeSync.js`, `/admin/videos/sync`): an owner-only **Sync now** that copies the channel's public uploads page by page (25 per request, inside Workers Free's CPU and subrequest limits), files them into playlists, detects Shorts (≤ 3 minutes, confirmed at `/shorts/<id>`), adds one video by link, and lists stored videos a run did not see. Never overwrites an override, a hidden flag or a tag. Helpers in `src/lib/youtube.js`.
- **Videos in /admin** (`src/pages/admin/resources.js`): a Videos resource for tags, the Short/Video override and visibility.
- **Videos share card** (`public/og/videos.png`, `src/lib/og/layouts/figures.js`): a widescreen frame beside a Shorts phone frame; counts appear once there are videos.
- **Videos across the site:** JSON-LD `VideoObject`, the crawler fallback, sitemap, feed, `llms-full.txt`, tag pages, /stats tag analysis, `computeSiteStats` (`videoCount`, `shortCount`, `videoViews`), the nav, the atlas (Hometown Square), the home Explore grid, the Blueprint archives room, backups and the /ask index (`scripts/ask-sources/video.mjs`).
- **YouTube profile** (`src/data/contact.js`, `src/data/identity.js`, `public/agents.md`): the channel joins the contact links and `sameAs`.
- **Social kit** (`src/pages/admin/SocialKit.js`, `/admin/social`): paste a blog link, pull its title, subtitle and text from the Substack RSS feed (or paste them), and copy ready-made ChatGPT prompts for three Substack Notes, a LinkedIn post, WhatsApp/Facebook/Threads messages and graphics (a blog banner at a chosen size, plus 4:5, 9:16 and 1.91:1). No model is called; prompts are saved per post in `social_kits` (`0036_social_kits.sql`, owner-only).
- **Prompt templates** (`src/lib/socialPrompts.js`, `docs/social-kit.md`): one module, every rule traced to a source — Notes end on an easy question that names its answer format, the LinkedIn headline fits the ~140 characters before "see more", the Threads link goes in a reply, image text is quoted and locked verbatim — and versioned on each saved kit.

### Changed
- **Substack RSS proxy** (`functions/rss-feed.js`): `?full=1` adds each post's body and cover image; the home page's response is unchanged.
- **HTML-to-text helpers** (`src/lib/htmlText.js`): moved out of `scripts/blog-word-counts.mjs` so the Social kit shares them; the word counts are computed exactly as before.
- **Blueprint alcoves** (`src/components/Blueprint/SitePlan.js`, `features.js`): the archives room draws as many alcoves as there are collections, and its counts of collections and routes come from the list instead of being typed in.

---

## [v23.2.1] — 2026-10-22

### Fixed
- **Soft 404 on dotted paths** (`functions/_middleware.js`): `/.well-known/mcp.json`, `/humans.txt`, `/index.md` and other missing files returned the SPA shell as `200 text/html`, so agents probing discovery files read them as existing. A dotted, non-`.html` path that comes back as HTML is now a 404.
- **Trek JSON-LD place name** (`src/lib/seo/structuredData.js`): "Ghangad Fort Fort" — " Fort" is appended only when the name lacks it, matching `buildTrekMeta`.
- **Trailing spaces in machine-read fields** (`src/lib/seo/entities.js`): `viewOf` trims every string column, so race names, places and book authors reach JSON-LD, meta and llms files unpadded.
- **Trek date in descriptions** (`src/data/pageMeta.js`): "on 09-08-2026" read as 8 September to most agents; now "9 August 2026".
- **/ask input label** (`src/components/Ask/AskChat.js`): the textarea had only a placeholder; it now has an `aria-label` for accessibility-tree agents.
- **Writing Ledger served as a 404** (`functions/_middleware.js`): Pages 308s `/writing-ledger.html` to `/writing-ledger`, which no React route claims, so the ledger went out with status 404, `noindex` and the SPA's meta over its own. The middleware now passes it through, and the sitemap, `llms.txt`, nav, `/ask` stats source and the page's canonical/`og:url` use `/writing-ledger`.
- **Generated-file cache key** (`src/lib/seo/serve.js`): `/sitemap.xml`, `/feed.xml` and the llms files keyed the edge cache on the full URL, so any query string forced a rebuild and fresh table reads; keyed on the path now.

### Added
- **Agent-readiness audit** (`docs/agent-audit-2026-10.md`): live probe of crawlers, answer engines and browsing agents, findings and re-run commands.

---

## [v23.2.0] — 2026-10-22

### Added
- **Weekly text backups to R2** (`scripts/backup-r2.mjs`, `.github/workflows/backup.yml`): `npm run backup` dumps 23 Supabase tables (content, tags, now/newsletter, resume, settings, feedback, /ask conversations and shares) into one gzipped JSON at `personal-website-backups/text/<date>.json.gz`, every Monday 02:30 IST. Embeddings, usage counters and git-derived commits are left out. A bucket lifecycle rule expires backups after 30 days. Restore steps in `docs/backups.md`.
- **Projects join /now and the newsletter by their date** (`src/lib/nowAutofill.js`): a visible project dated in a month is pulled into that month's Projects section — live on /now, by the admin pull button, and by `npm run newsletter:draft`. Undated and hidden projects never appear; a hand-typed row with the same link keeps its text and gains the archive ref.
- **AI assist admin page** (`src/pages/admin/AiAssist.js`, `/admin/ai`): switches for Draft, Suggest tags and alt text, an own model ladder (`ask_settings.assist_tiers`, falls back to the /ask ladder when empty), per-task request counts, error and fallback rates, p50/p95 latency, and a filterable log of every `/api/assist` call (`assist_log`, migration `0034`). Prompts and image bytes are never stored.
- **90-second vertical trailer** (`scripts/trailer/`): `npm run trailer` renders a 1080×1920 site trailer — eleven beat-cut scenes (cold open, title, Atlas, life in numbers, run/climb, read/write, /ask, the workshop, the tag web, the wall of pages, end card) over real phone footage of the live site (`capture.mjs`). The picture is `trailer.html`, a page that draws any moment from the time alone and is screenshotted frame by frame on parallel Chrome tabs; the music is synthesised in `score.mjs` on the same 120 BPM grid, with the site's SFX sprite on the cuts. Numbers come from `/api/stats`, the Logbook data, git and the route manifest. Output goes to gitignored `knowledge_base/trailer/`.
- **Trailer on the homepage** (`src/components/Index/Trailer.js`, `src/pages/Index.js`): the trailer plays between My World and Life in Numbers, from a 720×1280 web copy (`npm run trailer -- --publish` writes `public/video/the-trailer.{mp4,jpg,vtt}`, ~7.5 MB, captions are the on-screen text). `preload="none"`, so the page costs only its poster; `trailer.test.js` fails the build if a file is missing or the video passes 8 MB.
- **Tag suggestions on Jev** (`functions/api/assist.js`, `src/lib/assistTags.js`): `jev` rungs at the top of the assist ladder answer tag suggestions as classification — one calibrated yes/no per tag, ≥ 0.7 suggested, 0.4–0.7 maybe — through the judge's existing Jev client (`runJevRung` in `src/lib/askJudgeTiers.js`). Drafts and alt text skip Jev rungs; the metered TypeSafe route obeys `auto_eval_allow_metered`. Live ladder: jev-direct → gemini-flash-lite → cf-gpt-oss-20b (~360 ms, ~4k input tokens per suggestion).

### Fixed
- **Shared conversations could run script on this domain** (`src/components/Ask/AnswerBody.js`, `src/pages/AskShare.js`, `src/lib/askShareSnapshot.js`): raw HTML in answers now renders as text, share snapshots keep only http(s) or site-path URLs, and a source link's target is decided from its URL rather than a stored flag. markdown-to-jsx upgraded to 7.7 (CVE-2024-21535).
- **Anyone could exhaust /ask's daily cap or forge log rows** (`supabase/migrations/0033_lock_service_rpcs.sql`, `functions/api/ask.js`, `functions/api/transcribe.js`): `ask_quota`, `ask_log`, `ask_record_tier`, `ask_eval_budget` and `ask_eval_record` are now service-role only, and the worker calls them with the service key.
- **Open redirect** (`functions/_middleware.js`): a path like `//evil.example/` no longer 301s to another host.
- **Newsletter issue jumped to the bottom on load** (`src/components/Ask/AskChat.js`): the chat's follow-the-conversation scroll also ran on mount, so the issue's embedded chat dragged the window to its foot. It now scrolls only once there is a conversation.
