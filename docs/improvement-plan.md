# Improvement Plan

Audit date: 2026-06-12. Full audit and execution plan for this repository.
Status legend: ✅ done (committed on this branch) · ⬜ open · 🔶 partially done.

## Decisions (owner-confirmed)

| Question | Decision |
|---|---|
| Future of the `/admin` panel | **Deleted.** Decap CMS at `/cms/` is the single editing UI. |
| Instagram archive | **Keep** — page stays, images fixed (HEIC → JPEG). |
| Canonical domain | `daredavil.pages.dev` is permanent; hardcoding acceptable. |
| Image budget | Hard cap **300KB**/image, target ~150KB (mobile-network audience). |
| Versioning | Keep CLAUDE.md semver-with-weekly-cap rules; changelog header fixed to match. |

## Audit summary (what was wrong on `main`)

1. **CI dead since ≥ Mar 28, 2026** — workflow targeted the retired `ubuntu-20.04`
   runner; every run since was cancelled or stuck queued. Nothing was validated.
2. **Test suite failing 7/7** — `App.test.js` rendered without `ThemeProvider`
   (added later in `src/index.js`), and jsdom lacks `matchMedia` /
   `IntersectionObserver`.
3. **Lint was a no-op** — `eslint **/*.js` expanded to ~5 files; ~110 source files
   were never linted.
4. **Content drift between the two sources of truth** — `src/cms-content/*.md`
   (CMS) vs `src/data/*.js` (imported by pages): books 43 vs 47, 100days 24 vs 36,
   treks 15 vs 16. Running `cms:sync` would have deleted 12 posts, 4 books, 1 trek.
5. **Three parallel content pipelines** (direct JS edits, Decap→sync, /admin→
   clipboard) and a deprecated-but-still-imported `now-data.js`.
6. **53 HEIC images** referenced by Instagram/Sports — blank in Chrome/Firefox/Edge.
7. **114MB of images**, files up to 8.5MB, zero lazy-loading.
8. **Stale docs** — CLAUDE.md pointed at nonexistent `src/data/now.md`; README
   documented a nonexistent `npm run deploy`; changelog header contradicted
   CLAUDE.md versioning rules.
9. **EOL platform** — Create React App (`react-scripts` 5.0.1) is unmaintained;
   67 `npm audit` findings, essentially all build-time transitive deps.
10. Client-side `/admin` "auth" was bypassable security theater (now moot — deleted).

## Task plan

### Milestone 0 — Safety net

| # | Task | Status |
|---|---|---|
| T1 | CI revival: `ubuntu-latest`, actions v4, npm cache, 10-min timeout | ✅ |
| T2 | Repair test suite: ThemeProvider wrapper, jsdom mocks (`jest.setup.js`), jest-dom registration, 15s timeout | ✅ |
| T3 | Real lint coverage: `eslint src scripts functions --ext .js` (passes clean) | ✅ |
| T4 | CI drift gate: `cms:sync && git diff --exit-code src/data` fails the build if markdown and generated JS disagree | ✅ |

### Milestone 1 — Critical correctness

| # | Task | Status |
|---|---|---|
| T5 | Drift backfill: 12 posts, 4 books, 1 trek written back into `src/cms-content/`; sync now idempotent | ✅ |
| T6 | HEIC eradication: all 53 `.heic` converted to compressed JPEG; zero `.heic` refs remain in `src/` | ✅ |
| T7 | Docs truth pass: CLAUDE.md recipes target markdown; README deploy section fixed; changelog header matches semver rules | ✅ |

### Milestone 2 — High-leverage

| # | Task | Status |
|---|---|---|
| T8 | Single content pipeline: `/admin` deleted (pages, components, hooks, layouts), `now-data.js` deleted, `prebuild` runs `cms:sync` so every build regenerates `src/data` from markdown | ✅ |
| T9a | Image compression: full pass over `public/images` — 114MB → 37MB, zero files over the 300KB cap; PNG→JPG renames with all refs updated | ✅ |
| T9b | Image loading: add `loading="lazy"` to gallery/timeline `<img>`s; replace `ImageSlider`'s CSS `background-image` slides with real `<img>` so lazy/decode semantics apply | ✅ |
| T10 | CRA → Vite migration: `define` shim for `process.env.PUBLIC_URL`, `import.meta.glob` replaces `require.context` in `parseNowCms.js`, output to `build/` so Cloudflare config is untouched; jest stays (now an explicit dep + `parseNowCms` stub for `import.meta`) | ✅ (isolated branch `claude/vite-migration`) |
| T11 | Single meta-tag source: shared `src/data/pageMeta.js` consumed by `functions/_middleware.js` and `src/layouts/Main.js` (pages no longer pass duplicated props); `/interactive-me` and `/mindmap` entries added | ✅ |

### Milestone 3 — Polish

| # | Task | Status |
|---|---|---|
| T12 | De-duplicate `jsSerialize` | ✅ (admin copy deleted; single copy lives in `scripts/sync-cms-to-data.js`) |
| T13 | Version hygiene: `package.json` version matches changelog; `engines` reflects Node 20 | ✅ |
| T14 | Extract Stats.js calculation helpers (`getPBRaw`, time parsing) into a tested util | ✅ (`src/utils/raceStats.js` + 11 jest tests) |
| T15 | ESLint ratchet: re-enable a handful of high-value disabled rules | ✅ (`no-trailing-spaces`, `react/self-closing-comp`, `no-nested-ternary`, `react/no-unused-prop-types`, `react/jsx-no-useless-fragment`; `button-has-type` and `no-array-index-key` deferred — 33/21 violations) |

## Remaining-work notes

- **T10 (Vite)** — done on the isolated branch `claude/vite-migration` (stacked on
  the T9b/T11/T14/T15 branch). All planned gotchas handled: `define` shim for
  `process.env.PUBLIC_URL`, `import.meta.glob`/`?url` for the markdown fetches,
  no `ReactComponent` SVG imports existed. Extra findings: jest had to become an
  explicit devDependency (it was transitive via react-scripts) and `parseNowCms`
  needs a jest stub because CJS cannot evaluate `import.meta`. After merge, the
  Cloudflare Pages "framework preset" dashboard setting should be flipped from
  Create React App to None/Vite (build command and output dir are unchanged).
- **Not doing** (deliberate): server-side auth for admin (deleted instead);
  chasing individual CRA CVEs (superseded by T10); TypeScript or broad
  unit-test coverage (wrong maturity); git-history rewrite for repo size.

## Done criteria

- CI: last 5 runs on `main` green; a seeded lint error or data drift turns a PR red. ✅ gate exists — verify on first merged PR
- Content: one documented way to add content (markdown → sync); direct `src/data` edits impossible-by-convention. ✅
- Images: every referenced image renders cross-browser; nothing over 300KB. ✅
- Performance: Lighthouse mobile LCP < 3s on `/sports` and `/instagram` (re-measure after T9b).
- Platform: `npm audit` criticals ≈ 0 (after T10). ✅ 0 critical after the Vite
  migration (67 findings → 19: 9 moderate, 10 high — all build-time/transitive)
