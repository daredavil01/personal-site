# Share cards (OG images)

Every route on this site unfurls with a real 1200×630 image. There are two
kinds, and no rendering happens at request time:

- **A fixed route** advertises its own generated card, a committed file in
  `public/og/<slug>.png`.
- **A detail route** advertises **the row's own photo** when it has one, and its
  section's committed card when it does not.

Before this, 17 of 20 routes unfurled with the same 400×400 `logo.png`, `/`,
`/about` and `/resume` shared one 889×889 portrait, and `/tags/:name` was
indistinguishable from `/tags`. Both images were square while the site declared
`twitter:card=summary_large_image`, so every platform that crops to 1.91:1
letterboxed them.

- **Layouts, models, figures:** `src/lib/og/`
- **Generator:** `scripts/og-preview.mjs` (`npm run og:fallbacks`)
- **Meta contract (both layers read it):** `src/data/pageMeta.js`
- **Crawler output:** `functions/_middleware.js` (+ `_middleware.test.js`)
- **Route + card guard:** `src/data/routeManifest.js` + its test
- **The cards:** `public/og/*.png`
- **Card fonts:** `scripts/og-fonts/`

---

## Why there is no renderer at the edge

The first version of this rendered each card on demand at
`/api/og/<kind>/<id>.png`, with satori + `@resvg/resvg-wasm` inside the Pages
Function and a `caches.default` layer in front. It was a deliberate bet, and
**the bet lost.**

Workers Free allows **10 ms of CPU per request**. A satori layout pass plus a
1200×630 resvg rasterisation measures **~400 ms of pure CPU** with no I/O to
hide behind, so the endpoint exceeded its budget and the `og:image` URL
resolved to nothing — the links unfurled with **no image at all**, which is
worse than the generic logo it replaced. `wrangler pages dev` does not enforce
the CPU limit, so it passed locally and failed in production.

What this leaves behind, deliberately:

- `src/lib/og/render.js` still takes `satori` and `rasterise` as **injected**
  arguments, so nothing under `src/` imports a renderer. `satori` and
  `@resvg/resvg-wasm` are **devDependencies** — they are build tools now.
- The resvg wasm is no longer vendored. It is read from `node_modules` by the
  generator. It was only ever committed under `functions/` because a Worker
  cannot fetch and compile wasm at runtime.
- The card fonts moved out of `public/` to `scripts/og-fonts/`. Nothing serves
  them, so shipping 254 KB of font data to browsers was dead weight.

**Do not rebuild the endpoint on the Free plan.** Nine per-entity layouts exist
in git history at `005f844` if per-entity cards are ever wanted; the way to get
them is to pre-render them under Node with the generator, not to render them at
the edge.

## PNG, not SVG

Cards are authored as SVG (satori builds it, resvg rasterises it) but **always
stored and served as PNG**. `image/svg+xml` is rejected as an `og:image` by
WhatsApp, Facebook, LinkedIn, X, Slack and iMessage. There is no version of
this that ships SVG to a crawler.

## resvg cannot decode WebP

This is the trap that costs the most time. `src/lib/imageCompress.js` writes
**`.webp` whenever a source image has transparency**, so roughly half the media
bucket is WebP. satori will embed a WebP happily and resvg then draws
**nothing** — no error, just a blank panel where the photo should be. Two tiles
of the `/instagram` contact sheet shipped as flat violet squares before this was
found.

The generator therefore over-fetches candidate photos, checks each response's
`Content-Type` against `image/(jpeg|png|gif)`, and inlines only those as data
URIs. If a card needs photos and comes up short, it renders without them.

This does **not** affect a detail route's own photo: that URL is handed straight
to the platform, which decodes WebP fine.

## What the numbers on a card come from

Never recompute a stat in a layout. Cards read:

| source | used by |
|---|---|
| `GET /api/stats` (live endpoint, else computed from Supabase — `scripts/lib/statsSource.mjs`) | every page card with figures |
| `public/data/writing-ledger.json` | `/writing-ledger` |
| `instagram` / `projects` rows, via the publishable key | the two contact-sheet cards |
| `public/images/me.jpg` | `/`, `/about`, `/resume` |

**The numbers are baked in, so they age.** A card saying "51 BOOKS" keeps
saying it until the file is regenerated. `npm run og:fallbacks` is a chore to
re-run when content has moved, like `npm run blogs:wordcount` — there is no
nightly job by choice.

**Stats omit, never zero.** A tile with no real value is dropped rather than
printed as `0`, so a generator run without the stats snapshot produces cards
with no numbers instead of cards that lie.

## Known limitation: Devanagari conjuncts

**satori is pinned to 0.32.0.** 0.33+ added `harfbuzzjs` for real OpenType
shaping, which is what Devanagari needs — but it also cannot run in a Worker at
all (`TypeError: Cannot read properties of undefined (reading 'href')` at
harfbuzz init). 0.32 does naive glyph mapping, so `व्यक्ती` renders as
`व् य क् ती`, with the viramas visible.

Since the renderer left the edge, the Worker constraint no longer applies —
**this is now upgradable**, and the reason not to have done it yet is that no
generated card carries Devanagari: all 23 page cards are English, and Marathi
titles reach a share only through a detail route's own text, which platforms
render themselves. Revisit this if a card ever needs Marathi. Shaping failures
are silent, so it needs a visual check, not a test.

## Layouts

One shared frame (eyebrow, headline, stats or lede, brand ribbon, footer) and
**one bespoke figure per section** — a section should be identifiable by its
shape before any text is readable, because that is all that survives a
thumbnail.

| card | figure |
|---|---|
| `/books` | a shelf of spines, hashed from the top genres |
| `/treks` | a ridgeline hashed from fort names, flag on the peak |
| `/sports` | a distance dial, with the three PB times |
| `/tags` | a swatch cloud, sized by count and coloured by `colorForTag` |
| `/100-days-to-offload` | a hundred-dot progress grid |
| `/challenges` | a single progress bar |
| `/stats` | a six-tile number wall plus four sparklines |
| `/instagram`, `/projects` | a contact sheet of duotoned real photos |
| `/presentations` | a fanned stack of slide frames |
| `/mindmap`, `/interactive-me` | radial spokes / a connected curve |
| `/resume` | a timeline rail |
| `/ask`, `/ask/s/:token` | stacked chat bubbles |
| `/changelog` | a stack of version plates |
| `/writing-ledger` | twelve months of real word counts |
| `/`, `/about` | the portrait, duotoned |
| `*` (404) | the ridgeline with a dotted trail that stops |

**Rules that keep them legible at ~300 px** (what WhatsApp renders): headline
≤ 6 words at ≥ 64 px, at most three numbers (`/stats` is the deliberate
exception), one accent colour, photos duotoned.

**A figure with no data draws nothing.** Padding the two contact sheets out to
six tiles drew empty rounded rectangles that read as a gallery which had failed
to load — worse than no figure at all. Same rule everywhere: no data, no figure.

## og:image:width / height

Declared **only** for our own cards, which are exactly 1200×630, and never for
a row's photo — `isCardImage` in `src/lib/og/paths.js` is the one test, used by
both meta layers. A photo is whatever shape the camera was; asserting 1200×630
over a 900 px-tall portrait makes every platform crop it wrong, whereas leaving
the dimensions out makes them fetch and measure it.

## Adding a route

See the **Per-Route Meta and OG Cards** section in `CLAUDE.md`. In short: add
the route to `src/data/routeManifest.js`, give it meta in `src/data/pageMeta.js`,
add a layout in `src/lib/og/layouts/page.js` plus its slug in `PAGE_SLUGS`, then
run `npm run og:fallbacks` and commit the PNG. The guard test fails until the
file exists.

## Commands

```bash
npm run og:fallbacks              # write public/og/*.png — commit them
npm run og:fallbacks -- --offline # no network: fixture numbers, no photos
npm run og:preview                # same cards + a contact sheet to review
npm run og:preview -- --only=books
npm test -- routeManifest         # the guard
npm test -- _middleware           # what a crawler sees
```

`og:preview` writes to gitignored `knowledge_base/og-preview/`. The sheet shows
every card at full size **and at 300 px**; the 300 px column is the one that
decides whether a layout works.

## Notes

- `LAYOUT_VERSION` is gone from `src/lib/og/tokens.js`. It existed only as part
  of the edge cache key; with no cache and no renderer, a layout change ships by
  regenerating the PNGs.
- Platforms cache an unfurl. Existing shares keep the old image until each
  re-scrapes, and **WhatsApp's cache cannot be purged** — treat the first share
  of any link as final.
- `public/writing-ledger.html` carries literal meta tags of its own: the
  middleware early-returns on any path whose last segment contains a dot, so it
  never sees that page.
- `/admin/*` and `/world` have no card on purpose, listed in `OG_EXEMPT_PATHS`.

## Development status

Fixed vocabulary, for processing: `not-started` · `code-complete` ·
`awaiting-local-run` · `verified` · `blocked`.
Owner: `claude` (written in this repo) · `local` (needs your machine).

<!-- og-status start -->
| # | item | status | owner | note |
|---|---|---|---|---|
| 1 | `src/lib/og/` layout engine (h, tokens, primitives, figures, model, render, fonts, paths) | verified | claude | lint clean; unit tests pass |
| 2 | 23 page-card layouts | verified | claude | all render; reviewed full size and at 300 px |
| 3 | Generator `scripts/og-preview.mjs` | verified | claude | 23/23 cards, median ~400 ms |
| 4 | Committed cards `public/og/*.png` | verified | claude | rendered from the **live** stats snapshot, ledger and real photos |
| 5 | On-demand endpoint removed | verified | claude | `functions/api/og/` and the 2.4 MB vendored wasm deleted; worker bundle 104 KB |
| 6 | satori + resvg moved to devDependencies | verified | claude | confirmed absent from the Pages Functions bundle |
| 7 | Card fonts moved to `scripts/og-fonts/` | verified | claude | no longer shipped to browsers |
| 8 | `_middleware.js`: row photo, else section card | verified | claude | 11 tests in `functions/_middleware.test.js` |
| 9 | `og:image:width/height` only for cards | verified | claude | `isCardImage`, tested both directions |
| 10 | `PageMeta.js` client parity | verified | claude | same tag set as the middleware |
| 11 | 9 detail pages pass their own photo | verified | claude | trek/sport/project/microblog photos; the other five have none |
| 12 | Route manifest + guard test | verified | claude | asserts a committed PNG behind every route |
| 13 | `wrangler.toml` unchanged | verified | claude | no `OG_MODE`, no `nodejs_compat`; zero diff |
| 14 | `docs/og-cards.md`, `CLAUDE.md`, changelog | verified | claude | this file |
| 15 | `npm run docs:build` to refresh `docs/routes.md` | awaiting-local-run | local | needs `SUPABASE_SERVICE_ROLE_KEY` for row counts |
| 16 | Real unfurl checks (FB debugger, LinkedIn inspector, WhatsApp to self) | awaiting-local-run | local | use a Pages preview URL |
| 17 | Re-run `npm run og:fallbacks` when content moves | awaiting-local-run | local | the numbers are baked in; no nightly job by choice |
| 18 | Upgrade satori past 0.32 for Devanagari | not-started | local | now unblocked — nothing renders it at the edge any more |
<!-- og-status end -->

### Notes from verification

- **Reviewing every card is what finds the bugs.** Giving the cards live data
  (they were previously generated with no stats payload at all) surfaced four
  real defects that fixtures had hidden: `/instagram` and `/projects` drew six
  empty placeholder tiles; the `/books` shelf read as a bar chart because the
  live payload supplies eight genres rather than fourteen titles; `/tags`
  painted all 44 swatches one violet because almost no tag has a stored colour
  and the figure read `tag.color` instead of going through `colorForTag`; and
  `/writing-ledger` drew a **hardcoded** five-bar series on the one card whose
  whole subject is counting words. All fixed.
- `topBookTags` arrives from `/api/stats` as `[name, count]` pairs, not objects.
  The model read `t.name || t`, which fell through to the pair and still hashed
  to a stable spine — correct by accident. Now handled explicitly.
- The two contact-sheet cards are the heaviest at ~400 KB and ~210 KB, because
  JPEG photos re-encode as lossless PNG. Well inside every platform's limit.
- `wrangler pages dev` could not be run in the container that built this (it
  now demands a `CLOUDFLARE_API_TOKEN` for its remote-proxy session), which is
  why `functions/_middleware.test.js` exists: it stubs `HTMLRewriter` and pins
  the emitted tags in plain Jest, with no network and no workerd.

### What needs your machine, in order

1. `npm ci`
2. `npm run og:preview` → open `knowledge_base/og-preview/index.html` and check
   the 300 px column.
3. `npm run docs:build` to refresh `docs/routes.md`.
4. Deploy, then confirm a real unfurl: Facebook's Sharing Debugger and
   LinkedIn's Post Inspector both work against a Pages preview URL. For
   WhatsApp, X, Slack and iMessage the only ground truth is sending yourself the
   link — and the first share is the one that sticks.
