# Site Dossier — daredavil.pages.dev

> A complete feature and architecture reference for Sanket Tambare's personal
> website. Written as the source document for a Claude-generated showcase
> presentation. Facts, counts, and version numbers are accurate **as of
> 2026-07-18 (site version v11.2.0)**; content counts grow over time.

---

## 1. What This Site Is

A personal **digital garden** — the online home of Sanket Tambare: software
developer, ultra-marathoner, fort trekker, bilingual (English + Marathi)
writer, and reader. It is not a static portfolio; it is a living archive of
everything he does, backed by a real database and updated continuously
(11 major versions and counting, documented in a public changelog).

- **URL:** https://daredavil.pages.dev
- **Identity line:** "The Digital Hub." — a digital garden
- **Content domains:** marathons & races, fort treks, books & reviews, blog
  writing (the "100 Days To Offload" challenge + Substack newsletter *The
  Wanderer's Technical Anecdotes*), a 1,600+ post micro-blog archive,
  software projects, and personal stats
- **Stack in one line:** React 18 + Vite SPA · Tailwind CSS · Supabase
  (Postgres + Storage + RLS) as the content store · Cloudflare Pages with
  edge Functions · custom admin CMS at `/admin`

The single most distinctive fact: the site ships **two complete front doors
for the same content** — a classic editorial layout and a fully gamified,
illustrated world called **The Wanderer's Atlas**, which is currently the
default experience.

---

## 2. The Two-Shell System

Every content page renders inside one of two interchangeable "shells",
selected at runtime by `src/atlas/PageShell.js`:

- **Classic shell** (`src/layouts/Main.js`) — editorial portfolio layout:
  fixed translucent nav, sticky sidebar with bio/avatar/contact, footer,
  floating theme + "Enter the Atlas" buttons.
- **Atlas shell** (`src/atlas/regions/RegionShell.js`) — the same page
  content wrapped in a themed "biome" band with breadcrumb navigation
  ("Map › Region"), region accent colors, and the world HUD.

**View-mode resolution** (`src/atlas/useViewMode.js`), first match wins:

1. `?view=classic` / `?view=atlas` URL parameter (persisted once seen)
2. Stored visitor preference (part of the `atlas.v1` world state)
3. `prefers-reduced-motion: reduce` → classic (accessibility escape hatch)
4. `atlas.preview` localStorage flag → atlas
5. `ATLAS_LIVE` feature flag (`src/config/featureFlags.js`, currently
   `true`) → **atlas is the default for everyone**

Both directions are one click: the atlas passport offers "Switch to
Classic", and the classic shell's floating button offers "Enter the Atlas".
The inner page content is identical between shells — the shells are pure
presentation.

---

## 3. The Wanderer's Atlas (Headline Feature)

The site's front door is an explorable, hand-illustrated 2.5D world
(`src/atlas/`, ~70 files, launched as v11.0.0 — "sixteen phases on a single
branch behind a feature flag"). Six regions of the map are the six things
the site is about; every page is a place inside one of them.

### 3.1 Arrival: orbit → dive → map

A three-stage state machine in `src/atlas/AtlasHome.js`:

- **Orbit** (`src/atlas/intro/OrbitStage.js`) — first-time visitors arrive
  in orbit above a rotating 3D globe (Three.js, reused from the classic
  homepage in a special `orbit` mode). Overlaid: "Welcome, fellow explorer",
  the title "The Wanderer's Atlas", four animated count-up teasers
  (races · treks · books · micro-posts), a pulsing **"Enter the World"**
  CTA and an always-visible **"Skip intro"**. The teaser counts are
  hardcoded (`src/data/atlasStats.js`) so this first screen paints
  instantly on cold mobile networks with **zero API calls**.
- **Dive** (`src/atlas/intro/DiveSequence.js`, lazy-loaded only on click) —
  a ~3.5-second GSAP master timeline: the globe camera plunges, three
  layered SVG cloud sheets rush past, a white bloom whites out the screen,
  and at that exact frame the globe is swapped for the freshly mounted
  world map (a sleight of hand, not a real 3D→SVG morph). Skip is safe at
  any moment; reduced-motion users bypass the dive entirely.
- **Map** — the world hub. Returning visitors (`introSeen`) land here
  directly; "Replay intro" in the passport re-enters at orbit.

### 3.2 The world-map hub

`src/atlas/map/WorldMap.js` — a single SVG scene (viewBox 2000×1250) with
full **pan / wheel-zoom / pinch** via a custom hook (`src/hooks/usePanZoom.js`),
on-screen zoom controls for touch users, and Escape-to-reset. Layered:
sky → far mountain range → sea/roads → biomes → near props → hotspots →
labels.

**Six biomes** (`src/atlas/map/mapRegions.js`), each a piece of illustrated
map art with its own accent color and landing route:

| Region key | Place name | Content | Lands on |
|---|---|---|---|
| `marathons` | The Coast | races & running | `/sports` |
| `treks` | The Ridge | fort treks | `/treks` |
| `reader` | Book Forest | books & reviews | `/books` |
| `creator` | The Workshop | projects & resume | `/projects` |
| `writer` | Scriptorium | blogs & micro-posts | `/100-days-to-offload` |
| `person` | Hometown Square | about, now & everything home | `/about` |

Activating a region **flies the camera into it** (with a whoosh sound
effect), then navigates to the page; returning from a page reverses the
fly-in. Reduced-motion users get instant navigation.

**Day/night theming** (`src/atlas/theme/timeOfDay.js` +
`src/atlas/theme/atlasTokens.css`): the whole palette is CSS custom
properties switched by a `data-time` attribute — auto mode derives
day/night from the visitor's local clock (night = 19:00–06:00): sun ↔
crescent moon, a 22-star field appears, sky shifts from `#7ec8e3` to
`#101b3c`. The atlas time toggle keeps the site-wide Tailwind dark mode in
lockstep.

**Idle life & parallax** (`src/atlas/map/art/biomeLife.css`,
`src/atlas/map/parallax.js`): the map is alive — drifting clouds and mist,
fluttering flags, spinning workshop gears, chimney smoke, night fireflies,
bobbing boats and buoys, lapping waves, a writing quill, a stamping
printing press, a pulsing fountain, low-flying birds. Sky and far layers
lag the camera; near props lead it; fine pointers add ±8px drift. All of
it no-ops under `prefers-reduced-motion`.

A floating **"Life in Numbers" placard** (`src/atlas/map/StatsWidget.js`)
hangs above the Book Forest as a shortcut to `/stats`.

### 3.3 HUD chrome

Mounted once app-wide (`src/atlas/AtlasFrame.js` → `src/atlas/hud/Hud.js`),
so it never flashes between pages:

- **Compass menu** (🧭) — a full page directory grouped by region; the
  touch-friendly fallback to map navigation.
- **Time toggle** (☀️/🌙) — day/night, synced with dark mode.
- **Sound toggle** (🔊/🔇) — audio is strictly opt-in; the enabling click
  doubles as the browser autoplay-unlock gesture.
- **Passport** (📖) — the gamification hub (below).
- **Return portal** (🗺️, bottom-left) — "Return to Map" from any page.

The admin dashboard sheds all atlas chrome.

### 3.4 Gamification

The **passport** (`src/atlas/hud/PassportModal.js`) shows "N of 6 regions ·
N quests · N secrets", a **stamp grid** (one stamp per region with its
first-visit date), and a quest list with progress bars.

**Seven quests** (`src/atlas/gamification/quests.js`):

| Quest | How to earn it |
|---|---|
| Cartographer | visit all 6 regions |
| Bibliophile | open 5 books |
| Roadrunner | open 5 races |
| Summiteer | open 5 treks |
| Wordsmith | open 5 blog posts |
| Tinkerer | open 3 projects |
| Curious Wanderer | find all 5 easter eggs |

**Three achievements** (`src/atlas/gamification/achievements.js`):
**Night Owl** (explore between 23:00–05:00), **Regular** (visit on 3
different days within a week), **Completionist** (finish every quest).

**Five easter eggs** (`src/atlas/gamification/easterEggs.js`) hidden in the
map art as faint glints, each a real biographical detail: the Tata Ultra
50K medal on the coast, a lone tent for the 22-hour Panhala→Pawankhind
night trek, a paper boat for the Substack, a Nirman sapling in the square,
and a **night-only** birthday constellation over the Book Forest.

Rewards pop via a **confetti toaster** (`src/atlas/hud/RewardToaster.js`,
dependency-free canvas confetti) with distinct sound effects for stamps,
quests, and eggs. The quest engine
(`src/atlas/gamification/questEngine.js`) is a pure, injectable-clock
module with unit tests. Collector actions are tracked from the real detail
pages in **both** shells, so classic-mode readers earn quests too.

### 3.5 Audio

A hand-rolled WebAudio system (`src/atlas/audio/audioManager.js`) —
no library, dynamically imported only when the visitor enables sound
(zero audio bytes otherwise):

- **Per-biome ambient loops** (`public/audio/loop-<region>.m4a`) that
  **crossfade with equal-power curves** over 1s as you move between
  regions; loop points carry a guard pad so AAC edge padding never clicks.
- **A single SFX sprite** (`public/audio/sfx.m4a`) with offset-mapped
  stamp / chime / whoosh / egg sounds.
- The audio assets themselves are **procedurally synthesized** by a DSP
  script (`scripts/generate-atlas-audio.mjs` — filtered noise, sine
  partials, seamless-loop crossfades, ffmpeg-encoded to ≤200 KB budgets).
- Auto-suspends when the tab is hidden.

### 3.6 The guide

An illustrated flat-vector mini-Sanket (`src/atlas/guide/GuideAvatar.js` —
red pheta, mustache, cream bandi) appears bottom-right with one speech
bubble at a time: welcoming first-timers to the map, pointing at the
passport after a first stamp, hinting at the sound toggle, and teasing
that secrets are hidden in the world. Each beat shows exactly once
(script: `src/atlas/guide/guideScript.js`, unit-tested).

### 3.7 World state

`src/atlas/world/WorldContext.js` owns a single persisted `atlas.v1`
localStorage document (debounced writes): view preference, sound, time,
intro-seen, visited regions with first-visit dates, stamps, quest/action
progress, found eggs, distinct visit days, and acknowledged guide beats.
Migration seeds it from the older homepage-globe exploration keys, so
pre-atlas visitors keep their progress.

---

## 4. Classic Homepage (`src/pages/Index.js`)

The editorial front page, one column, section-stacked under the headline
**"The Digital Hub."**:

### 4.1 GlobeShowcase — "My World"

An interactive **3D WebGL globe** (`react-globe.gl` / Three.js;
`src/components/Index/GlobeShowcase.js` + `GlobeRenderer.js`), lazy-loaded
and IntersectionObserver-gated. Real content becomes map pins across six
"worlds" (marathons, treks, writer, reader, creator, person), each domain
scattered around an anchor point with a Vogel golden-spiral distribution.
Features:

- Auto-rotation, scroll-driven rotation, and "user took over" detection
- Camera fly-to with `?world=` deep-linking
- **Auto-tour** (drifts world-to-world every 5s) and **journey replay**
  (chronological hop through every race and trek with animated arcs and
  captions)
- **"Surprise me"** random pin, fullscreen mode, zoom cluster
- Per-domain procedural hex-bin terrain, cross-fading backdrop imagery,
  constellation arcs, atmosphere glow, dark-mode starfield
- **Gamification**: dwell-based per-world "explored" tracking with an
  on-screen tracker and a **confetti "World traveler!" celebration** when
  all six are visited
- First-visit coach mark, full touch + reduced-motion handling

Clicking any pin opens a shared detail panel (the same one the Mind Map
uses).

### 4.2 The rest of the homepage

- **LifeStats** (`src/components/Index/LifeStats.js`) — six gradient KPI
  tiles (Books, KM On Foot, Treks, Posts, Projects, Micro Posts) that
  **count up** when scrolled into view (`src/hooks/useCountUp.js`); each
  links to its section. Total KM is genuinely summed from race distances.
- **"In 1 Minute"** (`src/components/common/OneMinuteIntro.js`) — the
  shared elevator-pitch blurb (also used on About).
- **LatestPosts** (`src/components/Index/LatestPosts.js`) — **live
  Substack RSS** rendered from the site's own edge proxy, with skeleton
  loading, silent failure, and infinite scroll-to-reveal inside a capped
  scroll region.
- **MonthlyDigest** (`src/components/Index/MonthlyDigest.js`) — an
  auto-aggregated month-by-month rollup across blogs, treks, marathons,
  micro-posts, and books, with a month picker and per-type KPI tiles
  (date-format reconciliation in `src/lib/monthDigest.js` — the four
  content types store dates in four different formats).
- **Explore grid** (`src/data/homeFeatures.js`) — 12 feature cards linking
  to every section.
- Closing CTA: "Let's build the future together." → `/contact`.

---

## 5. Page-by-Page Catalog

All routes are lazy-loaded (`React.lazy` + `Suspense`) from `src/App.js`;
nav structure lives in `src/data/routes.js` (secondary pages collapse under
a "More" dropdown).

### Content archives

- **`/books` — Digital Library** (`src/components/Books/DigitalLibrary.js`)
  48 books, English and Marathi. Featured-review hero with a **shuffle**
  button, three stat cards, debounced search + tag / language /
  review-status filters, poster-style abstract generated covers, and a
  detail modal with Goodreads/review links, share-image export, copy link,
  and native share.
- **`/sports` — Sports Log** (`src/pages/Sports.js`) 21 races
  (10K → 50K ultra). Three tabs synced to the URL: **Statistics** (most
  active city/year, per-distance counts, personal bests, average paces),
  **Interactive**, and **Default** list views; per-race detail modal with
  photo slides, finish time, bib number, and timing-certificate link.
- **`/treks` — Trek Log** (`src/pages/Treks.js`) 18 fort treks. Statistics
  + timeline tabs (year and difficulty breakdowns), per-trek detail modal
  (fort name, duration, endurance level, photos, linked blog).
- **`/100-days-to-offload` — Blog Challenge Tracker**
  (`src/pages/OneHundredDays.js`) The richest tracker page: typewriter
  subtitle, animated **SVG progress ring** toward the 100-post goal, pace
  stats (ahead/behind target), a **GitHub-style calendar heatmap** with
  clickable day cells, a posts-per-month bar chart that filters on click,
  search + platform + tag filters, and a detail modal with share-image
  export.
- **`/micro-blog` — Micro-Blog Archive** (`src/pages/MicroBlog.js`)
  1,631+ short posts (a rescued Tumblr archive plus new manual posts).
  **Server-side full-text search** (Postgres tsvector, debounced input),
  tag-facet cloud (top 40, multi-select, with counts), source and type
  filters, Newest/Oldest/**Shuffle** sort, "Load more" pagination (24 per
  page), and a Stats tab (totals, date range, type/source breakdowns, top
  tags). **Every filter mirrors into the URL**, so any filtered view is
  shareable.
- **`/instagram` — Instagram Archive** (`src/pages/Instagram.js`)
  Posts preserved from a deleted Instagram account, each with a photo
  carousel (`react-slideshow-image`).

### Portfolio & person

- **`/projects` — Curated Works** (`src/components/Projects/ProjectGallery.js`)
  Editorial asymmetric grid — every 6th item becomes a large case-study
  feature; grayscale→color image hover.
- **`/resume`** (`src/pages/Resume.js`) Bento grid of skills (with
  competency levels), experience, education, and certifications — all
  database-driven across four tables.
- **`/stats` — "Metrics of Intent"** (`src/pages/Stats.js`) A ~14-card
  **bento dashboard** computed live from every collection: genre and
  language splits, reading velocity, books-per-year bar chart, 100-Days
  progress, endurance PBs, trek log, blog intelligence, and a site-wide
  tag cloud spanning books, blogs, and the micro-blog facets.
- **`/about`** (`src/components/About/AboutDocument.js`) Document-style
  bio with animated count-up stats, drawing on live content counts.
- **`/now`** (`src/pages/Now.js`) A month-by-month "what I'm doing now"
  page: pulsing last-updated pill, **Daily Rituals** grid, and a
  horizontally scrollable month-pill timeline; each month renders typed
  card sections (Blogs, Running, Books, Events, Projects, Website,
  Certificates, Stats, Misc) from a JSON blob per month.
- **`/contact`**, **`/challenges`** (challenge ledger), **`/changelog`**
  (renders the real `src/data/changelog.md` with version quick-nav
  badges), and a designed 404.

### Interactive novelties

- **`/interactive-me` — Visual Narrative**
  (`src/components/InteractiveMe/InteractiveMeTimeline.js`) An image-first
  **zig-zag timeline** of sports/treks where alternating cards are joined
  by recomputed **SVG cubic-bezier dashed curves**; the page can
  **auto-scroll itself** (slow/fast, hover to pause) via a floating
  control cluster.
- **`/mindmap`** (`src/components/MindMap/MindMapCanvas.js`) An SVG
  **radial mind map**: central "Sanket" node, five colored category
  bubbles; click to zoom-focus and burst-animate that category's children
  (staggered), click a child for a detail panel. Full pan/zoom (pointer,
  pinch, wheel) via the shared `usePanZoom` hook.

### Detail pages

Every archive has permalink detail routes (`/books/:id`, `/sports/:id`,
`/treks/:id`, `/projects/:id`, `/100-days-to-offload/:id`,
`/micro-blog/:id`) with back-links, share/copy actions, share-image
export, and **per-item social-share meta** (see §6).

---

## 6. Cross-Cutting Features

### Share-image editor (v11.2.0)

Any content item — micro-post, blog, book, trek, race, instagram post —
can be exported as a designed PNG (`src/components/share/`):

- **17 themes in 5 families**: Core (Light/Dark/Abstract), Editorial
  (Sepia/Ivory/Charcoal/Midnight), Gradient (Sunset/Ocean/Forest/Aurora),
  Texture (Notebook/Terminal/Blueprint/Newsprint), Signature
  (Letterpress/Neon)
- **4 shapes**: Portrait 1080×1350, Square, Story 9:16, Auto-height
- Text style (plain / serif quote / bold headline), font, size, alignment;
  per-shape line budgets so text never overflows
- Toggles for hero image (+S/M/L sizing), timestamp, tags, handwritten
  signature
- **8 display typefaces chosen from live specimens** — five
  Marathi/Devanagari faces (Tiro Devanagari Marathi, Yatra One, Modak,
  Kalam, Rozha One — specimens render "मराठी") and three English
  handwriting faces (Caveat, Dancing Script, Shadows Into Light). The font
  stylesheet loads only when the editor opens — zero cost to normal page
  loads.
- Export via `html-to-image` at 2× pixel ratio with font/image readiness
  waits (`src/components/share/useImageExport.js`); download or native
  Web Share.

### SEO that can't drift

`src/data/pageMeta.js` is a deliberately **dependency-free** module
consumed by **both** the client (react-helmet-async via
`src/components/Template/PageMeta.js`) **and** the Cloudflare edge
middleware — so the meta a crawler sees and the meta the SPA renders come
from the same source. Pure per-item builders (`buildBookMeta`,
`buildTrekMeta`, `buildSportMeta`, `buildBlogMeta`, `buildMicroblogMeta`,
`buildProjectMeta`) give **every individual content item** its own
OpenGraph/Twitter card (see §10).

### Everything else

- **Dark mode** — class strategy, initialized from stored preference or
  `prefers-color-scheme`, togglable everywhere, synced with atlas
  day/night.
- **Accessibility** — skip-to-content links in both shells, global
  `:focus-visible` ring, keyboard-navigable map hotspots (roving
  tabindex, arrow-key ring walking) with an offscreen real-link mirror,
  `aria-live` reward toasts, and reduced-motion honored at every layer
  (from "route to classic entirely" down to individual confetti bursts).
- **Analytics** — Google Analytics (gtag) plus small non-PII atlas events
  (intro skip/finish, rewards, view switches).
- **PWA manifest + full favicon set**; the changelog page doubles as
  release notes; sitemap-friendly canonical URLs.

---

## 7. Design Language

- **Typography:** `Noto Serif` (700/900) for headlines, `Inter` for body,
  `Plus Jakarta Sans` for labels/overlines, **Material Symbols Outlined**
  for iconography throughout.
- **Color:** Tailwind `stone` neutrals with a signature rust-red accent
  `#b22200` (`secondary` token) for hovers, active states, and accents; a
  broader Material-3-style token palette sits in `tailwind.config.js`.
  Each atlas region carries its own accent (coast blue, scriptorium pink,
  etc.) via CSS custom properties.
- **Shape:** deliberately squared, editorial border radii (small radius
  scale, with `rounded-full` reserved for true pills/circles — avatars,
  compass, stamps).
- **Dark mode:** Tailwind `class` strategy; nearly every component ships
  `dark:` variants; atlas night mode and classic dark mode stay in sync.
- **Motion vocabulary:** count-up numbers (ease-out cubic), scroll-reveal
  via IntersectionObserver, hover gap-widening arrows on links, staggered
  burst entrances (mind map), GSAP timelines only inside the atlas (dive,
  parallax) behind a single import point so GSAP stays out of the entry
  bundle.
- **CSS architecture:** the classic shell's bare-element styles live in
  `src/styles/classic.css` wrapped in `:where(.classic-root)` for **zero
  specificity** (Tailwind utilities always win) — the modern replacement
  for a deleted 1,625-line HTML5UP theme. The atlas has a parallel token
  layer (`src/atlas/theme/atlasTokens.css`) driven by `data-region` and
  `data-time` attributes.

---

## 8. Content & Data Architecture

### Supabase Postgres is the single source of truth

No markdown pipeline, no third-party CMS. Schema lives in
`supabase/migrations/*.sql`; every table gets `created_at`/`updated_at`
(trigger-maintained), Row-Level Security with **public read** and
**owner-only write** (an `is_owner()` JWT-email guard), and a public
`media` storage bucket with the same policy split.

**Tables:** `books`, `sports`, `treks`, `projects`, `blogs` (100 Days),
`instagram`, `now_meta` (singleton) + `now_months` (JSON `sections` per
month), four resume tables (`resume_positions`, `resume_degrees`,
`resume_certifications`, `resume_skills`), and `microblog`.

### The client data layer

- `src/lib/api/_crud.js` — a `createResource` factory giving every table
  the same `{list, create, update, remove}` surface with
  `fromRow`/`toRow` mappers (snake_case DB ↔ camelCase app). The same
  mappers serve both the public site and the admin CMS.
- `src/context/ContentContext.js` — **lazy-once caching**: each collection
  fetches at most once per app lifetime, on first use, exposed as hooks
  (`useBooks`, `useSports`, `useTreks`, `useProjects`, `useBlogs`,
  `useInstagram`, `useResume`, `useNowMeta`, `useNowMonths`) returning
  `{data, loading, error}` with identity-stable empty fallbacks.
- `src/lib/supabaseClient.js` — client + storage URL helpers
  (`toStorageUrl`/`toStorageImages`); boots safely with placeholder
  credentials so a misconfigured build still renders.

### The micro-blog exception (scale case study)

1,600+ rows never load wholesale. `src/lib/api/microblog.js` +
`supabase/migrations/0002_microblog.sql`:

- A **generated stored tsvector column** `search_tsv`
  (`to_tsvector('simple', title || text)` — the `simple` config chosen so
  mixed English + Marathi/Devanagari tokenizes predictably) with a GIN
  index; the column is excluded from client selects so it never ships to
  the browser.
- Server-side paginated **websearch-syntax full-text search**, tag
  `contains` filters, exact counts, and a `microblog_tag_facets()` SQL
  RPC for the tag cloud.
- `unique(source, source_id)` makes the Tumblr importer idempotent while
  letting admin-authored `manual` posts coexist safely.

---

## 9. Admin CMS (`/admin`)

A fully custom, in-app content management dashboard
(`src/pages/admin/`):

- **Auth:** Supabase email+password session; the client only gates UI —
  real authorization is the server-side RLS `is_owner()` policy.
- **Schema-driven forms:** `src/pages/admin/resources.js` declares each
  resource's fields once; a generic `ResourceManager` + `FormField`
  renders list views and editors for every table. Field types include
  chip-style tag inputs, string lists, date-format converters, JSON
  editors with live validation, select-with-custom-fallback, and
  **repeatable image-slide rows with direct-to-Supabase-Storage upload**
  (`src/lib/api/storage.js`).
- **MicroblogManager** — a dedicated server-side-searched, paginated
  editor for the big table (debounced search, 20/page).
- **NowMetaEditor** — singleton editor for the Now page's intro, rituals,
  and inspirations.
- Bulk operations live in `scripts/`: full content import, idempotent
  Tumblr micro-blog import (HTML-entity cleanup, batch upserts of 500),
  and bulk image upload to Storage.

---

## 10. Platform & Delivery

- **Build:** Vite with two notable quirks — JSX lives in `.js` files via
  an esbuild loader shim, and `process.env.PUBLIC_URL` is shimmed to `""`
  (`vite.config.js`); output in `build/`, source maps on.
- **Hosting:** Cloudflare Pages (`wrangler.toml`); browser-safe Supabase
  keys committed as vars, service-role key kept as a dashboard secret.
- **Edge middleware** (`functions/_middleware.js`): runs on every HTML
  request. For dynamic detail routes it fetches the actual row from
  Supabase REST and injects **per-item OpenGraph/Twitter tags via
  Cloudflare HTMLRewriter** — sharing the exact meta-builder functions the
  client uses — so a shared micro-post or book link unfurls with its own
  title, description, and image. Also handles the `/world` → `/` legacy
  redirect.
- **RSS proxy** (`functions/rss-feed.js`): fetches the Substack feed
  server-side (Substack blocks CORS), parses it with a dependency-free
  regex parser, and edge-caches the JSON for 30 minutes.
- **Testing/tooling:** Jest (quest engine, guide script, page meta),
  ESLint over `src/` + `functions/`, source-map-explorer bundle analysis.
- **Performance posture:** every route lazy-loaded; Three.js, GSAP, the
  dive sequence, biome art, region headers, the audio manager, and the
  share-editor fonts are all code-split or loaded on demand; the atlas
  arrival screen makes zero network calls; the map's idle animation
  suspends for reduced-motion; audio suspends on hidden tabs.

---

## 11. By the Numbers (as of 2026-07-18)

| Metric | Value |
|---|---|
| Site version | v11.2.0 (public changelog, semver rules) |
| Races logged | 21 (10K to 50K ultra) |
| Fort treks | 18 |
| Books | 48 (English + Marathi) |
| Micro-blog posts | 1,631+ (searchable archive) |
| Blog challenge | 100 Days To Offload, live progress tracking |
| Public routes | ~24 (plus admin) |
| Atlas regions / quests / achievements / easter eggs | 6 / 7 / 3 / 5 |
| Share-image themes / shapes / display fonts | 17 / 4 / 8 |
| Content tables in Postgres | 12 |
| Presentation shells | 2 (Atlas + Classic), one content source |

**Version-history highlights:** v11.0.0 "The Wanderer's Atlas" (the
gamified world redesign, shipped as sixteen phases behind a feature flag),
v11.1.0 (map zoom controls, instant orbit arrival), v11.2.0 (full
share-image editor with Marathi typography). Earlier eras include the
Supabase migration (replacing a markdown CMS pipeline), the 3D globe
homepage, and the original editorial redesign.

---

*Reference document generated from a full codebase survey on 2026-07-18.
File paths cite the actual implementation for drill-down.*
