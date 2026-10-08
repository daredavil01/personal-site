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

## [v21.1.0] — 2026-10-08

### Added

- **The Blueprint film** (`scripts/generate-blueprint-film.mjs`, `scripts/blueprint-film/`): `npm run blueprint:film` turns the `/blueprint` sheets into illustrated video for sharing as a series — a full film (cover, six sheets, end card) and one short episode per sheet (title card, the sheet, end card), 1080×1080 H.264 at 30 fps with a poster PNG each, written to `knowledge_base/blueprint-film/`. Each sheet is animated rather than recorded: the plan's walls draw themselves and the redline walks from room to room, a riser grows down the section, a question runs through the Ask circuit while the first model's switch is thrown open, three links unfurl into their real committed cards, three visitors drop down the shell chute, and the tag loom weaves and is rewoven without the micro-blog. Frames are SVG rasterised by resvg with the card fonts (unwrapped from WOFF by `scripts/blueprint-film/woff.mjs`); the content is the page's own modules — `features.js`, `circuitSequence()`, `decideShell()`, `pageMeta.js` — loaded through Vite's SSR loader, plus the live `/api/stats` snapshot and changelog. The soundtrack is the site's own Workshop ambient loop with the stamp, chime and whoosh sprite. Requires ffmpeg; `--stills`, `--frame=`, `--only=` and `--no-audio` for quicker passes.
- **Vertical cuts and subtitles** (`scripts/generate-blueprint-film.mjs`, `scripts/blueprint-film/draw.mjs`): every cut now also renders at 1080×1920 (`-vertical`) for Reels, Shorts and Stories — the header, the same drawing and larger captions stacked clear of the bands those apps cover with their own UI — and each cut gets an `.srt` of its captions (the film also a `.vtt`). Segments render in parallel worker processes sharing one stats snapshot, so a run draws the same numbers throughout; the soundtrack is stereo, normalised to −19 LUFS.
- **The film on /blueprint** (`src/components/Blueprint/FilmPlayer.js`, `src/pages/Blueprint.js`, `public/video/`): a new sheet A-07 plays the film with captions, chapter buttons that jump to each sheet, and a download link; the cover gets a "Watch the two-minute film" link. `npm run blueprint:film -- --publish` writes the web encode, poster, WebVTT and chapter list to `public/video/`; `preload="none"` keeps the page's cost to the poster until someone presses play. `film.test.js` fails the build if the four files are missing or the chapters are out of order.
- **Audio description for the film** (`scripts/blueprint-film/voice.mjs`, `scripts/blueprint-film/film.mjs`, `scripts/generate-blueprint-film.mjs`): `npm run blueprint:film -- --describe` narrates the full film — 27 lines timed to the drawing, saying what is on screen and what the burned-in captions say, so it can be followed without watching (WCAG 1.2.5). Counts, names and outcomes in the script come from the same data as the captions. Each line gets the time until the next; one that overruns is sped up to at most 1.35× and reported if it still does not fit. The music and effects duck under the voice with a sidechain compressor. The voice is Workers AI's Aura 2 — the Atlas guide's — when Cloudflare keys are set, else Piper; the published cut uses Piper's `en_GB-cori-high` (public-domain LibriVox data). `--describe-only` re-narrates the rendered film without drawing a frame. Writes `the-blueprint-described[-vertical].mp4` and the narration as `.srt`/`.vtt`.
- **/blueprint plays the described film** (`src/components/Blueprint/FilmPlayer.js`, `public/video/`): A-07 now serves the audio-described cut, its caption track is the narration transcript, and the narrator is credited under the player.

## [v21.0.0] — 2026-10-08

### Added

- **The Blueprint** (`src/pages/Blueprint.js`, `src/components/Blueprint/`): a new `/blueprint` page that draws the site's features as a set of interactive architectural sheets, in a whiteprint (light) and cyanotype (dark) style with a red "redline" for whatever is selected. A cover with an exploded axonometric of the stack and a title block (live revision and release count from the changelog tables); **A-01 Site plan** — every feature as a room on a floor plan, each room's "floor area" a live count, with a specification panel; **A-02 Section** — a cut through the six layers (shells, pages, data, edge, Postgres, scripts) where the selected room runs a riser through every floor it touches, and a floor lists every room standing on it; **A-03 The Ask circuit** — `functions/api/ask.js` as a wiring diagram you can run, with switches to take model rungs or the embedding service offline and watch the question fall through to the next rung or to keyword-only search; **A-04 Unfurl bench** — pick a route and see the real committed card, the link preview and the exact head tags a bot and a browser receive, with a 300 px thumbnail test; **A-05 Shell switch** — the five view-mode rules as a sorting chute, driven by the real `resolveViewMode`; **A-06 Tag loom** — the most-used tags woven across collections from the `/api/stats` snapshot, with the micro-blog removable; and a revision block of recent majors. The selected room is kept in `?room=`.
- **Blueprint share card** (`src/lib/og/layouts/figures.js`, `public/og/blueprint.png`): a floor-plan figure with one room redlined, generated by `npm run og:fallbacks`.
- **Route wiring**: `/blueprint` in `src/App.js`, `src/data/routeManifest.js`, `src/data/pageMeta.js`, the Play menu (`src/data/routes.js`), the homepage Explore grid (`src/data/homeFeatures.js`) and the Atlas Workshop region (`src/atlas/regions/registry.js`, `src/atlas/map/mapRegions.js`).
- **`getMajorHeadlines()`** (`src/lib/api/changelog.js`): every major's headline in one query, for the revision block.
- **Tests** (`src/components/Blueprint/features.test.js`, `shellLadder.test.js`): rooms link only to real routes and tile the plan exactly; the circuit falls through rungs in order; the drawn shell ladder agrees with `resolveViewMode` for all 72 input combinations.
