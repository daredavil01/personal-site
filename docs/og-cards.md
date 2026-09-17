# Share cards (OG images)

Every route on this site has its own 1200×630 social share card, rendered **on
demand** at `/api/og/<kind>/<id>.png` and cached at the edge.

Before this, 17 of 20 routes unfurled with the same 400×400 `logo.png`, `/`,
`/about` and `/resume` shared one 889×889 portrait, and `/tags/:name` was
indistinguishable from `/tags`. Both images were square while the site declared
`twitter:card=summary_large_image`, so every platform that crops to 1.91:1
letterboxed them.

- **Layouts, models, figures:** `src/lib/og/`
- **Endpoint:** `functions/api/og/[[path]].js`
- **Meta contract (both layers read it):** `src/data/pageMeta.js`
- **Route + card guard:** `src/data/routeManifest.js` + its test
- **Committed fallbacks:** `public/og/*.png`
- **Preview tool:** `npm run og:preview`

---

## PNG, not SVG

Cards are authored as SVG (satori builds it, resvg rasterises it) but **always
served as PNG**. `image/svg+xml` is rejected as an `og:image` by WhatsApp,
Facebook, LinkedIn, X, Slack and iMessage. There is no version of this that
ships SVG to a crawler.

## The open question: CPU on Workers Free

This is the one deliberate bet in the design, and the thing to watch after
deploying.

- **Workers Free allows 10 ms CPU per request.** A satori layout pass plus a
  1200×630 resvg rasterisation measures a **median of ~436 ms locally** (32
  cards, `npm run og:preview`). That is 40× the Free budget, and it is real CPU
  with no I/O to hide behind, so it can return **error 1102 / `exceededCpu`**.
- **Bundle size is *not* a constraint.** Worker limits are 64 MiB uncompressed
  on both plans, with no compressed limit. The built Worker is ~3.6 MB.
- **`wrangler pages dev` does NOT enforce the CPU limit.** The endpoint works
  perfectly locally and can still fail in production. Local timings prove
  nothing. Do not treat a green local run as evidence.

What makes the bet survivable:

1. **Edge caching.** Every response is stored in `caches.default` for 24 h, so
   only the *first* request per card per colo can burn the budget. Crawler
   traffic is overwhelmingly repeat scrapes.
2. **`OG_MODE`, the kill-switch.** Set `OG_MODE=static` in the Pages
   environment and every `og:image` reverts to a committed `public/og/*.png`
   with no rendering at all. One variable, no deploy, no code change. Both
   layers honour it: `functions/_middleware.js` emits the static URL directly
   (several image scrapers do not follow redirects) and the endpoint also 302s
   to the fallback as a second line of defence.
3. **Committed fallbacks ship from day one**, so the retreat is already wired
   rather than hypothetical.

**Where to look after deploying:** Cloudflare dashboard → Workers & Pages → the
project → Metrics → Invocation Statuses, for `exceededCpu`. Also watch p99 CPU
time. Set `OG_DEBUG=1` to get render errors back as plain text instead of a
silent redirect.

**If CPU turns out to be a problem**, the fix is pre-rendering, and the seam is
already there: `src/lib/og/render.js` takes `satori` and `rasterise` as injected
arguments, and `scripts/og-preview.mjs` already renders every layout under Node.
A build step would reuse both without touching a single layout.

## Known limitation: Devanagari conjuncts

**Marathi text renders with broken conjuncts.** This is a hard upstream
trade-off, not an oversight, and it is the other thing to decide about.

- satori **≥ 0.33** added `harfbuzzjs`, which does real OpenType shaping and
  renders Marathi correctly (`व्यक्ती आणि वल्ली`, `श्रद्धा`, `स्त्री`, `विद्यार्थी` all
  correct).
- satori **≥ 0.33 cannot run on Cloudflare Workers at all.** `harfbuzzjs` is an
  Emscripten build whose glue resolves its own `.wasm` from a script directory
  that does not exist on Workers, throwing `Cannot read properties of undefined
  (reading 'href')` at module init. It also needs to compile that wasm at
  runtime, which Workers prohibit outright
  (`WebAssembly.instantiate()` accepts pre-compiled modules only).
- So this repo pins **satori 0.32.0**, the newest release before `harfbuzzjs`.
  It runs at the edge, and it renders simple Devanagari (`#मराठी`) correctly —
  but it breaks conjuncts, printing `व् य क् ती` with visible viramas instead of
  the `व्य` / `क्ती` ligatures.

This affects Marathi book titles (~41 books), Marathi tag cards, and Marathi
blog posts. **Pinning satori is load-bearing: do not upgrade it without
re-reading this section.** If correct Marathi matters more than on-demand
rendering, the answer is pre-rendering with satori ≥ 0.33 under Node, where
HarfBuzz works fine — which is what `npm run og:preview` already does.

## Why the wasm is bundled and the fonts are fetched

`functions/api/og/resvg.wasm` is vendored and imported as a module because
Workers only accept pre-compiled WebAssembly modules — fetching the bytes at
runtime is impossible.

Fonts are different: they are ordinary bytes, so the endpoint fetches them from
the site's own `/og/fonts/` assets and memoises them per isolate. See
`public/og/fonts/README.md` for provenance and why the subsets are not narrowed
further.

## Layouts

One shared frame (eyebrow, headline, stats or lede, brand ribbon, footer) and
**one bespoke figure per section** — a section should be identifiable by its
shape before any text is readable, because that is all that survives a
thumbnail.

| where | figure |
|---|---|
| `/books`, `/books/:id` | a shelf of spines / a generated cover plate |
| `/treks`, `/treks/:id` | a ridgeline hashed from fort names, flag on the peak |
| `/sports`, `/sports/:id` | a distance dial / a bib with the finish time |
| `/tags`, `/tags/:name` | a swatch cloud / the tag's colour and a `#` watermark |
| `/micro-blog`, `/micro-blog/:id` | the pinboard's own `postArt`, unchanged |
| `/100-days-to-offload` | a hundred-dot progress grid |
| `/stats` | a six-tile number wall plus sparklines |
| `/projects/:id` | browser chrome around the screenshot |
| `/presentations` | a fanned stack of slide frames |
| `*` (404) | the ridgeline with a dotted trail that stops |

**Rules that keep them legible at ~300 px** (what WhatsApp renders): headline
≤ 6 words at ≥ 64 px, at most three numbers (`/stats` is the deliberate
exception), one accent colour, photos duotoned.

**Photos degrade, never fail.** The endpoint fetches an image itself and inlines
it, so a slow or missing photo means the card renders without it rather than
500ing. `PhotoPanel` keeps its tinted ground, and every photo layout is built to
read without its photo.

**Stats omit, never zero.** If `/api/stats` is unreachable, a card drops the
figure rather than printing `0 BOOKS`. The committed fallbacks are rendered with
no payload at all for exactly this reason.

## Adding a route

See the **Per-Route Meta and OG Cards** section in `CLAUDE.md`. In short: add
the route to `src/data/routeManifest.js`, give it meta in `src/data/pageMeta.js`,
add a layout in `src/lib/og/layouts/`, and run `npm run og:fallbacks`.
`src/data/routeManifest.test.js` fails until all of that exists.

Bump `LAYOUT_VERSION` in `src/lib/og/tokens.js` when a layout changes: it is
part of the edge cache key, so bumping it is what makes already-cached cards
re-render. Then re-run `npm run og:fallbacks` and commit the PNGs.

## Commands

```bash
npm run og:preview              # render every layout + a contact sheet
npm run og:preview -- --only=trek
npm run og:fallbacks            # regenerate the committed public/og/*.png
npm run dev:ask                 # wrangler pages dev, to exercise the endpoint
```

The contact sheet (`knowledge_base/og-preview/index.html`, gitignored) shows
each card at full size **and at 300 px**. The 300 px column is the review that
matters.

## Notes

- Committed fallbacks are ~3.6 MB of PNG for 23 cards. There is no PNG optimiser
  in the toolchain; running `oxipng`/`pngquant` over `public/og/` after
  `og:fallbacks` would cut that substantially, and is safe to do by hand.
- **No `nodejs_compat` flag is needed**, and `wrangler.toml` is unchanged by
  this feature. Worth knowing why, because it is a trap if satori is ever
  upgraded: satori **0.33+** pulls in `harfbuzzjs`, whose Emscripten glue has a
  `require("fs")` behind a runtime `ENVIRONMENT_IS_NODE` check. That branch
  never executes on Workers, but the bundler still has to resolve the
  specifier, so `wrangler pages functions build` fails outright without the
  flag. At the pinned 0.32 there is no `harfbuzzjs`, so the question does not
  arise — verified by building *and* rendering with the flag absent.
- `og:site_name` is emitted by neither meta layer: `index.html` carries it
  globally, and adding it would duplicate the tag on every page.

---

## Development status

Fixed vocabulary, for processing: `not-started` · `code-complete` ·
`awaiting-local-run` · `verified` · `blocked`.
Owner: `claude` (written in this repo) · `local` (needs your machine).

<!-- og-status start -->
| # | item | status | owner | note |
|---|---|---|---|---|
| 1 | `src/lib/og/` layout engine (h, tokens, primitives, figures, model, registry, render, fonts, paths) | verified | claude | lint clean; 32 unit tests pass |
| 2 | On-demand endpoint `functions/api/og/[[path]].js` | verified | claude | returns real 1200×630 PNGs under `wrangler pages dev` |
| 3 | 23 fixed-page layouts | verified | claude | all render; reviewed on the contact sheet |
| 4 | 9 entity layouts (book, blog, sport, trek, project, presentation, microblog, tag, ask-share) | verified | claude | all render from fixtures |
| 5 | Vendored fonts + `resvg.wasm` | verified | claude | 7 woff faces, 254 KB; wasm 2.4 MB |
| 6 | `pageMeta.js`: card URLs, `imageAlt`, `og:type`, `OG_IMAGE`, `buildTagMeta`, `buildShareMeta` image | verified | claude | import-free invariant held; 30 tests pass |
| 7 | `_middleware.js`: card URLs, `/tags/:name` branch, 5 new tags, derived `og:type` | verified | claude | crawler output checked with a `facebookexternalhit` UA |
| 8 | `PageMeta.js` client parity + prop forwarding through both shells | verified | claude | crawler + client emit the same tag set |
| 9 | 9 detail pages point at their own cards | verified | claude | checked against live rows for treks, books, tags |
| 10 | Route manifest + guard test | verified | claude | 10 tests; confirmed it fails on an unregistered route |
| 11 | Committed fallbacks `public/og/*.png` | verified | claude | 23 cards, rendered with no stats |
| 12 | `OG_MODE` kill-switch | verified | claude | exercised end-to-end; it caught a real fallback bug (see below) |
| 13 | `wrangler.toml` left unchanged | verified | claude | no `nodejs_compat` needed at satori 0.32; confirmed by building and rendering without it |
| 14 | `docs/og-cards.md`, `CLAUDE.md`, changelog | verified | claude | this file |
| 15 | Render cards against **live Supabase rows** | verified | claude | Supabase turned out to be reachable: all 9 kinds render from real rows, incl. a Devanagari tag |
| 16 | `npm run docs:build` to refresh `docs/routes.md` | awaiting-local-run | local | needs live Supabase for row counts |
| 17 | Review the contact sheet | verified | claude | full-size pass over the complex layouts found 4 real defects (see below); a 300 px thumbnail pass is still worth your eye |
| 18 | Real unfurl checks (FB debugger, LinkedIn inspector, WhatsApp to self) | awaiting-local-run | local | use a Pages preview URL |
| 19 | Watch `exceededCpu` in the Cloudflare dashboard | awaiting-local-run | local | the open bet; flip `OG_MODE=static` if it fires |
| 20 | Decide the Devanagari trade-off (satori 0.32 at the edge vs 0.33 pre-rendered) | blocked | local | needs your call; see **Known limitation** above |
<!-- og-status end -->

### Notes from verification

- Supabase was reachable from this container after all, so every card kind was
  rendered from **live rows**: a trek with its real photo composited, a book, a
  race, a micro-post, a project, a deck, a 100-days post, and the Devanagari tag
  `#भटकंती` with live per-type counts.
- Exercising `OG_MODE=static` found a real bug worth recording: the middleware
  passed `CARD_FALLBACKS.page` (`"home"`) as the fallback for *every* fixed
  route, so `/treks` advertised `/og/home.png`. A page's fallback is its own
  card. Fixed in both layers, with a regression test in
  `src/lib/og/paths.test.js`.
- Edge caching measured 441 ms → 5 ms on the second request for the same card,
  which is the mitigation the CPU bet rests on.
- **Reviewing every card, rather than a sample, is what found the bugs.** A
  full-size pass over the complex layouts turned up four: the race card
  rendered *completely blank* (`Frame`'s bleed slot was in normal flow and
  pushed the content column off the canvas), `/stats` drew its sparklines over
  its own numbers, trek cards drew a ridgeline on top of a photo of a ridge,
  and Marathi tag cards printed their own URL as percent-escapes. All fixed.
  Budget time for this on any new layout — satori will not tell you.
- Photo-composited cards are heavy: the live trek card is ~1 MB, because a JPEG
  photo re-encodes as lossless PNG. Within every platform's limit, but it is the
  number to watch if bandwidth matters.

### What needs your machine, in order

1. `npm ci`
2. `npm run og:preview` → open `knowledge_base/og-preview/index.html`, review the
   300 px column.
3. `npm run dev:ask`, then:
   ```bash
   curl -o /tmp/a.png -D- localhost:8788/api/og/book/12.png
   curl -o /tmp/b.png -D- localhost:8788/api/og/tag/42.png
   curl -s localhost:8788/books/12 | grep -o '<meta property="og:[^>]*>'
   curl -s "localhost:8788/tags/%E0%A4%98%E0%A4%B0" | grep -o '<meta property="og:[^>]*>'
   ```
   Open the PNGs. These are the first cards built from real rows.
4. `npm run docs:build` to refresh `docs/routes.md`.
5. Deploy, then check Invocation Statuses for `exceededCpu`.
