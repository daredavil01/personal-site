# The Wanderer's Atlas — Complete Redesign Plan (v11.0.0)

> **Status:** Approved design, pre-implementation. This is the authoritative
> build plan for the gamified site redesign. Implementation is phased (16
> phases, each leaving the branch green) on a **single long-running branch**
> with a hidden `/world` preview route, then merged + flipped live as
> **v11.0.0**.
>
> Written 2026-07-08. Creative decisions (§2) and build-workflow decisions
> (§10) were confirmed one-by-one with Sanket; the architecture was designed
> against the codebase as of v10.4.0. Items still to elaborate are tracked in
> §11 — refine them before their phase, not before starting.
>
> **See also:** [`wanderers-atlas-build-log.md`](wanderers-atlas-build-log.md) —
> the narrative of how it was actually built, prompt by prompt, with the key
> user choices highlighted at each turn (the story to this spec's blueprint).

---

## 1. Vision

The site becomes a single-theme, end-to-end **gamified world**:

1. **Arrival** — a bright orbital scene: a stylized vector globe (evolved from
   the existing homepage globe), day-side, drifting clouds, six glowing regions
   teasing live counts ("42 races · 26 books · 1.6k micro-posts"). Drag to
   rotate. One pulsing CTA: **"Enter the World"** — with "Skip intro" beneath.
2. **The Dive** — clicking Enter plays an authored ~3.5s cinematic: the camera
   plunges, clouds whip past into a white bloom, and the curved globe
   **unfolds into a flat illustrated map**. Skippable mid-flight.
3. **The Atlas hub** — a full-screen 2.5D parallax vector map: six biomes
   around a hometown center. Idle life everywhere (flag flutter, page-birds,
   workshop gears). Hover a region: it lifts and shows a teaser + quests.
   Click: the camera flies in and the region art becomes the page's header.
4. **Region interiors** — every content page rebuilt as a themed interior of
   its region, with a persistent world HUD instead of the old nav chrome.
5. **The game layer** — a passport with per-region stamps, quests, hidden
   easter eggs in the map art, achievement toasts and confetti. A mini
   illustrated Sanket guides visitors with speech-bubble prompts.

**"The Wanderer's Atlas"** is the world's name — tying to the Substack
identity ("The Wanderer's Technical Anecdotes") and framing visitors as
fellow explorers.

### Research grounding

Direction informed by: [Bruno Simon](https://bruno-simon.com/) (loading as
part of the show), [Jordan Breton](https://jordan-breton.com/) (camera glides
between fixed viewpoints — explorable but nobody gets lost),
WoraWork (cozy walkable world), and the
[Stripe globe](https://stripe.com/blog/globe) (globe landing engineering).
Guardrails from research: dual-layer architecture (spectacle over crawlable
semantic HTML with real routes), blocking splash screens lose ~12% of
visitors (make loading part of the experience), mobile as a first-class tier,
sound strictly opt-in.

---

## 2. Locked creative decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Direction | **Living Atlas** — globe orbit → cinematic dive → illustrated map hub |
| 2 | Game depth | HUD + quests + passport (no walkable avatar) |
| 3 | Breadth | Full rebuild of every page as region interiors (data layer unchanged) |
| 4 | Escape hatch | "Skip intro" always visible; remembered Atlas/Classic preference; reduced-motion auto-lands in Classic |
| 5 | Art style | Flat vector illustration, authored as inline-JSX SVG components |
| 6 | Intro motion | Click Enter → authored ~3.5s GSAP dive, skippable |
| 7 | Sound | Ambient loop per biome + micro SFX; **OFF by default**; HUD toggle; hand-rolled WebAudio (no Howler) |
| 8 | Guide | Mini illustrated Sanket avatar with speech bubbles — **replaces react-joyride** |
| 9 | Site chrome | World HUD (compass menu, Return-to-Map, passport, sound, sun/moon) replaces nav/sidebar/footer in atlas mode |
| 10 | Legacy pages | /mindmap → "Observatory", /interactive-me → "Gallery Trail" (same URLs, inside Hometown region) |
| 11 | Day/night | Auto from visitor local hour (19:00–06:00 → night) + manual toggle; coupled to ThemeContext `dark` class |
| 12 | World name | **The Wanderer's Atlas** |
| 13 | Rollout | Single long-running branch; phased commits behind `/world` preview + `ATLAS_LIVE` flag; merge + flip → v11.0.0 |
| 14 | Quests | Explorer + Collector + hidden easter eggs + time/return achievements (all localStorage, no accounts) |
| 15 | Mobile hub | Same map, pan + pinch (reuse `usePanZoom`) |
| 16 | Animation | GSAP (free incl. all plugins), confined to lazy atlas chunks |

---

## 3. The six regions

Region keys reuse the existing domain keys from
`src/components/Index/globe/domains.js` verbatim (this also makes the
localStorage migration trivial — see §5.2).

| Region (biome) | Key | Color | Routes |
|---|---|---|---|
| **Coastal Road** — winding shoreline running route | `marathons` | `#3b82f6` | `/sports`, `/sports/:id` |
| **Sahyadri Ridge** — fort-crowned mountain range | `treks` | `#22c55e` | `/treks`, `/treks/:id` |
| **Scriptorium** — writer's study & printing press | `writer` | `#ec4899` | `/100-days-to-offload`(+`/:id`), `/challenges`, `/micro-blog`(+`/:id`) |
| **Book Forest** — shelves as tree rows | `reader` | `#f97316` | `/books`, `/books/:id` |
| **Workshop** — drafting tables & gears | `creator` | `#a855f7` | `/projects`, `/projects/:id`, `/resume` |
| **Hometown Square** — the personal center | `person` | `#b22200` | `/about`, `/now`, `/contact`, `/instagram`, `/stats`, `/changelog`, `/mindmap` (Observatory), `/interactive-me` (Gallery Trail) |

### Per-page interior concepts (applied in the page waves, PRs 5–10)

- **Books** — walk the Book Forest: featured review as a clearing, filters as
  trail signs, book cards as leaf-cards on shelf-trees.
- **Sports** — the Coastal Road as a winding timeline; each race a mile-marker
  with a medal; PBs celebrated as road signs.
- **Treks** — a mountain elevation profile; each trek a summit flag colored by
  endurance level.
- **100 Days / Micro Blog / Challenges** — the Scriptorium desk: blogs as
  letter stacks, micro-posts as a pinboard, the progress heatmap as a wall
  calendar.
- **Projects / Resume** — Workshop blueprints on drafting tables; the resume
  as the workshop's certification wall (skills as gauge dials).
- **About / Now / Contact / Stats / Instagram / Changelog** — Hometown Square
  buildings: house (About), clock tower (Now), post office (Contact),
  observatory annex (Stats), photo studio (Instagram), archive hall
  (Changelog).
- **Observatory** (`/mindmap`) — the radial mind map reframed as a star chart.
- **Gallery Trail** (`/interactive-me`) — the photo timeline as a walking
  trail through framed moments.

---

## 4. Architecture

### 4.1 Route & shell model — one route table, two shells

The route table in `src/App.js` stays identical (same paths, same lazy
chunks). What changes is the wrapper:

- **`src/atlas/PageShell.js`** — the single mode switch.
  `<PageShell region="reader" …>{content}</PageShell>` renders
  `RegionShell` (lazy) in atlas mode or the existing `Main` in classic mode.
  Every page in `src/pages/` changes exactly one import + wrapper element;
  content components (`DigitalLibrary`, etc.) are untouched.
- **View-mode resolution** (`src/atlas/useViewMode.js`), priority order:
  1. `?view=classic` / `?view=atlas` URL param (persists the choice)
  2. Stored preference (`atlas.v1.view`)
  3. `prefers-reduced-motion: reduce` → classic (automatic escape hatch)
  4. `atlas.preview` localStorage flag → atlas (preview mechanism)
  5. `ATLAS_LIVE` constant from `src/config/featureFlags.js` (false until flip)

  Resolved synchronously in a state initializer so first render is
  deterministic. Note: react-snap is **not** in dependencies — the
  `hydrateRoot` branch in `src/index.js` is a legacy guard that never fires;
  if prerendering is ever added, view-mode must become a post-mount upgrade
  (document this constraint in `useViewMode.js`).

### 4.2 The homepage state machine

`/` in atlas mode renders **`src/atlas/AtlasHome.js`**: `orbit → dive → map`.

- **orbit** — reuses `GlobeRenderer` (which must remain a lazy default
  export) with a new `mode="orbit"` prop: hides legend/tracker/autoplay
  chrome, brighter vector styling, overlaid Enter CTA + Skip link.
- **dive** — one GSAP master timeline: globe zoom (via the globe ref POV API)
  → `CloudBloom` (3 layered SVG cloud sheets) scales to whiteout → globe
  unmounts, `WorldMap` mounts with viewBox pre-zoomed at center → clouds part
  → `usePanZoom.animateTo` pulls out to the full map. The globe→map "unfold"
  is sleight of hand at the whiteout frame — never a real three.js→SVG morph.
  Skip = `timeline.progress(1)`.
- **map** — the hub. `introSeen` persists; returning visitors land here with
  a 400ms fade. "Replay intro" lives in the passport modal.

Classic mode `/` renders the current `src/pages/Index.js` unchanged.

### 4.3 Deep links & SEO

- A Google visitor hitting `/books` in atlas mode gets the themed page
  **instantly** — the map fly-in animation only plays when
  `location.state.fromMap === true` (set by the map's navigate call).
- `RegionShell` renders real semantic HTML: `<main id="main">`, `<h1>`,
  skip-link, Helmet meta. All biome SVG art is `aria-hidden` decoration.
- The Helmet block currently inlined in `src/layouts/Main.js` is extracted to
  **`src/components/Template/PageMeta.js`**, consumed by both shells so meta
  can never fork.
- `functions/_middleware.js` logic is unchanged; only addition is
  `X-Robots-Tag: noindex` for `/world` during the preview period (plus a
  Helmet robots meta on the route itself).

### 4.4 Preview mechanism & the flip

- **`src/config/featureFlags.js`**: `export const ATLAS_LIVE = false;` — the
  single flip bit.
- **`/world`** (added in PR 1): renders `AtlasHome` unconditionally and sets
  `localStorage['atlas.preview']='1'` so navigation across the site stays in
  atlas mode in that browser. Noindexed, absent from nav/sitemap; carries a
  small "preview build" ribbon until flip.
- **Kill switch**: `?view=classic` or the passport modal's Classic toggle.
- **Branch model (confirmed)**: all atlas work happens on one long-running
  branch (`feat/wanderers-atlas`) pushed to GitHub — the Cloudflare Pages
  branch preview deploy is the review surface. `main` stays untouched until
  the flip; merge `main` into the branch after any content hotfix lands there
  to avoid drift.
- **The flip (v11.0.0)** = final commits on the branch (`ATLAS_LIVE = true`;
  `/world` → `<Navigate to="/" replace/>`; remove the ribbon; the single
  comprehensive changelog entry), then one merge to `main`.

### 4.5 WorldContext & gamification state

Single versioned localStorage key **`atlas.v1`**:

```js
{
  version: 1,
  view: null | "atlas" | "classic",   // explicit user choice only
  sound: false,
  time: "auto" | "day" | "night",
  introSeen: false,
  visitedRegions: { reader: "2026-07-08T…", … },  // region → first-visit ISO
  stamps: { reader: { first: ts }, … },
  actions: { "book:open": ["id1","id2"], … },      // deduped ids per action
  quests: { explorer: { done: ts|null }, … },
  eggs: { lighthouse: ts, … },
  visitDays: ["2026-07-08", …]                     // capped at 30
}
```

- Managed exclusively by **`src/atlas/world/WorldContext.js`**
  (`WorldProvider` in `App.js` inside `ContentProvider`) via one
  `read → migrate → useReducer → debounced persist` pipeline in
  `storage.js`. Nothing else touches localStorage directly.
- **Migration** (`migrate.js`, pure + jest-tested): if `atlas.v1` is absent
  and `globe-visited-worlds` exists, its domain keys seed `visitedRegions` +
  `stamps`; `globe-all-worlds-celebrated` seeds the Explorer quest. Old keys
  stay until a post-flip cleanup removes the globe's own tracker.
- **API**: `visitRegion(key)` (RegionShell mount → first-visit stamp+toast),
  `track(action, id)` (e.g. `track("book:open", id)` sprinkled in pages),
  `foundEgg(id)`, `setView/toggleSound/setTime`.
- **Quest engine** (`src/atlas/gamification/questEngine.js`): a pure reducer
  over declarative definitions in `quests.js`:

  ```js
  { id: "collector_books", type: "collector", region: "reader",
    action: "book:open", target: 5,
    title: "Bibliophile", reward: { stamp: "bibliophile" } }
  ```

  Explorer quests derive from `visitedRegions`. Time achievements: Night Owl
  (visit 23:00–05:00), Regular (3 distinct visit days within 7), Completionist
  (all quests). Completions queue into `pendingRewards` →
  `RewardToaster` pops them with the existing confetti (promoted to
  `src/atlas/lib/confetti.js`, re-export shim left behind).
- Tracking runs in **both** modes; game UI renders only in atlas mode.

### 4.6 The map hub

**`src/atlas/map/WorldMap.js`** — one `<svg>`, viewBox `0 0 2000 1250`,
driven by `usePanZoom` (promoted from `src/components/MindMap/usePanZoom.js`
to `src/hooks/usePanZoom.js`; one-line re-export shim left at the old path).

Layer order (each a `<g>`):

1. `SkyLayer` — day/night gradient, sun/moon, stars (CSS-var colored)
2. `FarLayer` — distant ranges/clouds, parallax factor 0.35
3. `MidLayer` — the six biome landmasses, factor 0.7
4. `NearLayer` — foreground props (waves, trees, smoke), factor 1.0
5. `RegionLayer` — six interactive hotspots with generous hit paths
6. `EggLayer` — easter-egg hotspots drawn as part of the art
7. `LabelLayer` — region name plaques

- **Parallax**: computed from viewBox x/y plus ±8px pointer drift on fine
  pointers, applied via `gsap.quickSetter` on layer transforms.
- **Ownership rule (prevents animation fights):** `usePanZoom` owns the
  viewBox; GSAP only ever touches element transforms/opacity.
- **A11y**: roving tabindex across regions, arrow keys move in geographic
  order, Enter/Space activates, Escape resets zoom. An offscreen `<nav>` with
  six real `<Link>`s mirrors the map for screen readers (SVG hotspots become
  `aria-hidden` — one source of truth for AT).
- **Mobile**: viewBox initializes ~1.6× zoomed on the hometown square;
  pinch/drag via the hook; the compass menu doubles as a region-list
  fallback.
- **Art pipeline**: each biome is an inline-JSX SVG component in
  `src/atlas/map/art/` (`BiomeCoast`, `BiomeRidge`, `BiomeScriptorium`,
  `BiomeForest`, `BiomeWorkshop`, `BiomeSquare`). Inline SVG (not `<img>`) is
  required for CSS-var theming and per-element idle animation.
  **Budgets: ≤25KB minified source per biome; whole map chunk ≤120KB gz**
  (enforced with `npm run analyze`).

### 4.7 Transition system

Decision: **overlay choreography, not cross-route GSAP Flip** (React Router
unmounts the source tree; shared-element FLIP across routes is fragile).

- **`src/atlas/AtlasFrame.js`** mounts once in `App.js` (inside
  `BrowserRouter`, outside `Routes`) when atlas mode is on. It owns the HUD,
  `RegionTransitionOverlay`, `RewardToaster`, and `GuideAvatar` — it never
  remounts on navigation, so transitions bridge routes without flashes.
- **Map → region**: click → `animateTo(regionViewBox, 450)` while the overlay
  (region-color wash + biome silhouette strip) fades in →
  `navigate(path, { state: { fromMap: true } })` → `RegionShell` sees
  `fromMap`, plays a 500ms entrance, clears the overlay.
- **Region → map**: "Return to Map" navigates `/` with
  `state: { toRegion }`; the map mounts with its viewBox pre-set to that
  region and animates out to the full map (the exact reverse read).
- GSAP is imported only via **`src/atlas/lib/gsap.js`** (single import point
  → tree-shaking + chunk placement controlled; GSAP lands in the lazy atlas
  chunk, never the entry bundle).

### 4.8 RegionShell & the page-rebuild system

- **`src/atlas/regions/registry.js`** — the region truth table:

  ```js
  reader: {
    label: "Book Forest", color: "#f97316",
    routes: ["/books", "/books/:id"],
    Header: lazy(() => import("./headers/ForestHeader")),
    stamp: "stamp-reader", audio: "forest", tokensClass: "region-reader",
  }
  ```

- **`src/atlas/regions/RegionShell.js`** renders: `PageMeta`, skip link,
  themed header band (lazy biome art + `<h1>`), breadcrumb
  (Map → Region → page), parchment content column with region CSS-var
  accents, a `visitRegion(key)` effect, and the `fromMap` entrance.
- **Migration contract:** a wave-1 PR *wraps* a page (shell only, content
  visually identical inside); later waves restyle content interiors. Each
  page PR stays small, reviewable, and shippable dark.
- `/mindmap` and `/interactive-me` keep their URLs — they simply render
  inside the Hometown `RegionShell` as "Observatory" and "Gallery Trail";
  `src/data/routes.js` labels update at flip.
- **react-joyride is retired entirely** at PR 13: `GuideAvatar` (driven by
  WorldContext state; script in `src/atlas/guide/guideScript.js`) replaces
  the tour in atlas mode; classic view is the simplicity hatch and gets no
  tour. Removing joyride (~40KB) roughly funds GSAP (~30KB).

### 4.9 Audio manager

Hand-rolled WebAudio (~150 lines), **no Howler**:

- **`src/atlas/audio/audioManager.js`** — module singleton, dynamically
  imported the first time the sound toggle turns ON (that click is the
  autoplay-unlock gesture). API: `enable() / disable() / setBiome(key) /
  sfx(name)`.
- Loops: `public/audio/loop-<region>.m4a`, mono ~64kbps, **≤200KB each**,
  fetched + decoded only when sound is on and the region is entered; 1s
  equal-power crossfade; decoded buffers cached.
- SFX: single `public/audio/sfx.m4a` sprite + offset map (`stamp`, `chime`,
  `whoosh`, `egg`).
- `visibilitychange` suspends the context. Zero audio bytes load for
  visitors who never enable sound.

### 4.10 Day/night token system

- **`src/atlas/theme/atlasTokens.css`**: `--atlas-sky, --atlas-horizon,
  --atlas-water, --atlas-foliage-1..3, --atlas-stone, --atlas-glow,
  --atlas-parchment` defined under `.atlas-root[data-time="day"]` and
  `[data-time="night"]`, plus per-region accent overrides under
  `[data-region="…"]`. All atlas art uses only these vars — that IS the
  palette-swap mechanism (night = windows light up, stars appear, fireflies
  in the Book Forest).
- **One-way coupling**: the HUD sun/moon sets WorldContext `time` AND calls
  `toggleTheme()` (existing `ThemeContext`), so Tailwind `dark:` content
  inside RegionShell always matches the scene. Auto mode: if no stored theme
  and `time === "auto"`, local hour 19:00–06:00 → night, evaluated at
  provider mount.

### 4.11 Legacy CSS neutralization (safe order)

`src/static/css/main.scss` (1625-line HTML5UP legacy, imported after
tailwind.css) styles bare `button`/`h1–h6`/`a:hover` with `!important` and
pt-based body sizing — it will fight every new component. Removal order:

1. **PR 0**: delete provably dead partials (`author`, `blurb`, `mini-post`,
   `intro`, `menu`, `hamburger`, the whole `.dark-mode` block); visual-diff
   the five pages still consuming scss partials (contact/resume/stats/books/
   notFound).
2. **PR 2**: `.atlas-root` scoped reset (sane bare-element defaults) so atlas
   UI never depends on load-order wins.
3. **Page waves**: migrate remaining partial usage to Tailwind inside the
   shared content components (classic view benefits too).
4. **PR 14**: delete the remaining element globals + `main.scss` + the `sass`
   devDependency; add ~100 lines of scoped `classic.css` for the slim classic
   shell. Also fix `tailwind.config.js` `borderRadius.full` (currently
   0.75rem, not a circle) via a temporary `rounded-circle` alias migration,
   then restore `full: 9999px` — the atlas needs true circles (compass,
   sun/moon, stamps).

---

## 5. File map

New files:

```
src/config/featureFlags.js
src/hooks/usePanZoom.js                      (moved from MindMap; shim left)
src/atlas/
  PageShell.js  useViewMode.js  AtlasHome.js  AtlasFrame.js
  world/    WorldContext.js  storage.js  migrate.js
  gamification/ questEngine.js  quests.js  achievements.js  easterEggs.js
  hud/      Hud.js  CompassMenu.js  ReturnPortal.js  PassportButton.js
            PassportModal.js  SoundToggle.js  TimeToggle.js  RewardToaster.js
  map/      WorldMap.js  RegionHotspot.js  EasterEggHotspot.js  parallax.js
            art/ BiomeCoast.js BiomeRidge.js BiomeScriptorium.js
                 BiomeForest.js BiomeWorkshop.js BiomeSquare.js SkyLayer.js
  intro/    OrbitStage.js  DiveSequence.js  CloudBloom.js
  regions/  registry.js  RegionShell.js  headers/*.js  stamps/*.js
  guide/    GuideAvatar.js  guideScript.js
  audio/    audioManager.js  sfxMap.js
  theme/    atlasTokens.css  timeOfDay.js
  lib/      gsap.js  confetti.js (moved; shim left)
public/audio/loop-<region>.m4a  sfx.m4a
```

Modified: `src/App.js` (WorldProvider, AtlasFrame, `/world` route), all files
in `src/pages/` (one wrapper line each, across waves), `src/layouts/Main.js`
(PageMeta extraction), `src/components/Index/GlobeRenderer.js` (orbit mode),
`functions/_middleware.js` (`/world` noindex), `src/data/pageMeta.js`,
`src/data/routes.js` (labels at flip), `tailwind.config.js`, `package.json`
(gsap in; react-joyride + sass out at flip), `src/data/changelog.md`
(single v11.0.0 entry at the flip — silent before that, see §10).

Deleted at/near flip: `TourContext.js`, `TourGuide.js`, `TourMount.js`,
`tourSteps.js`, `main.scss` + partial directories.

---

## 6. Phased build plan

All phases land as commit-waves on the single `feat/wanderers-atlas` branch
(the "PR n" numbering below is kept as phase numbering throughout this doc).
Each phase leaves the branch green (`lint`, `test`, `build`) and public-safe
(behind the flag). **The changelog stays silent until the flip** — phase 15
writes the one comprehensive v11.0.0 entry (confirmed workflow decision, §10).

**Gate before phase 3:** the art **concept board** (§10) must be approved
before real biome art is built.

| # | Phase | Contents | Size |
|---|---|---|---|
| 0 | Dead-CSS prune | Delete dead SCSS partials + `.dark-mode` block; record visual baseline of the 5 scss-dependent pages | S |
| 1 | Foundation | `featureFlags.js`, WorldContext + storage + migration (+ jest tests), `useViewMode`, `PageShell` (classic passthrough), `PageMeta` extraction, `/world` stub + noindex | M |
| 2 | Atlas frame | GSAP dep + `lib/gsap.js`, `AtlasFrame` + HUD skeleton, `atlasTokens.css` + `.atlas-root` reset, day/night ↔ ThemeContext | M |
| 3 | Map hub | `WorldMap` layers with placeholder biome shapes, panzoom, hotspots, keyboard/ARIA, region → navigate | L |
| 4 | Intro | `OrbitStage` (GlobeRenderer orbit mode), `DiveSequence`, skip, `introSeen` | M |
| 5 | First region | `RegionShell` + registry + Book Forest wave (`/books`, `/books/:id`), stamps, `RewardToaster` + confetti reuse | M |
| 6 | Game layer | Quest engine, `PassportModal`, achievements, map easter eggs | M |
| 7 | Wave 2 | Coastal Road (`/sports*`) + Sahyadri Ridge (`/treks*`) | M |
| 8 | Wave 3 | Scriptorium trio (`/100-days-to-offload*`, `/challenges`, `/micro-blog*`) | M |
| 9 | Wave 4 | Workshop (`/projects*`, `/resume`) | M |
| 10 | Wave 5 | Hometown Square (`/about`, `/now`, `/contact`, `/instagram`, `/stats`, `/changelog`) incl. Observatory (`/mindmap`) + Gallery Trail (`/interactive-me`) conversions | M |
| 11 | Art & perf | Final biome art + parallax + idle animations; perf pass (`npm run analyze`, budgets) | L |
| 12 | Audio | `audioManager` + loop/sfx assets + HUD sound enable | M |
| 13 | Guide | `GuideAvatar` + guide script; retire react-joyride (dep + Tour* files) | M |
| 14 | Cleanup | Classic-view slimming, `main.scss` removal, `rounded-full` fix | M |
| 15 | **Flip** | `ATLAS_LIVE = true`, `/world` → `/` redirect, routes labels, the single comprehensive changelog entry **v11.0.0**, merge branch → `main` | XS |

---

## 7. Risks & mitigations

- **Bundle budget** (mobile-network audience): GSAP (~30KB gz) confined to
  lazy atlas chunks via the single import point; joyride removal (~40KB)
  offsets it; three.js stays exactly as lazy as today (orbit reuses the
  existing chunk). Entry bundle must not grow >5KB across the whole project —
  checked with `source-map-explorer` at PRs 3, 11, 15.
- **Hydration**: no active prerender today; view-mode resolution lives in
  state initializers; constraint documented in `useViewMode.js`.
- **usePanZoom vs GSAP contention**: ownership rule (hook owns viewBox, GSAP
  owns transforms) stated in code comments; `DiveSequence` hands off at the
  whiteout frame only.
- **localStorage migration**: pure function with jest fixture tests
  (old globe keys → v1 schema); never throws (try/catch to defaults).
- **Asset discipline**: biome art is code (SVG-in-JSX, per-file budgets);
  audio lazy and ≤200KB/loop; no new raster images (guide avatar is SVG).
- **Cloudflare middleware**: untouched logic; only additive `/world` noindex;
  OG injection keeps working because routes never change.

---

## 8. Verification playbook

- **Per PR**: `npm run lint`, `npm test` (new unit tests: questEngine,
  storage/migrate, timeOfDay), manual `npm run dev` pass at `/world` + one
  classic route.
- **Cloudflare Pages branch previews**: `/world` flows end-to-end; deep-link
  `/books` in both modes; view-source OG tags on atlas routes.
- **Modes matrix** (DevTools): reduced-motion emulation → lands in classic
  with zero GSAP activity; 375px touch emulation → map pan/pinch, compass
  fallback, HUD reachability; day/night computed-style cross-check against
  the `dark` class.
- **Lighthouse** on `/`, `/books`, `/world` at PRs 3, 11, 15: performance ≥
  the pre-PR-1 baseline (record it first), accessibility ≥ 95 in both shells.
- **Migration test**: seed `globe-visited-worlds` in localStorage → load
  `/world` → passport shows migrated stamps. Clear storage → verify auto
  day/night by faking the system clock.
- **Flip rehearsal**: on a branch, set `ATLAS_LIVE = true` and run the full
  matrix before opening PR 15.

---

## 9. Appendix — key reuse points

| Existing asset | Reused as |
|---|---|
| `src/components/Index/globe/domains.js` | Region keys/colors/labels (single source of truth persists) |
| `src/components/Index/GlobeRenderer.js` | Orbit stage (new `mode="orbit"` prop; stays a lazy default export) |
| `src/components/MindMap/usePanZoom.js` | Map hub pan/zoom/pinch + fly-in transitions (promoted to `src/hooks/`) |
| `src/components/MindMap/MindMapDetailPanel.js` | Content detail modal inside region interiors |
| `src/components/Index/globe/confetti.js` | Reward celebrations (promoted to `src/atlas/lib/`) |
| `localStorage: globe-visited-worlds` | Seeds passport `visitedRegions` via `migrate.js` |
| `useCountUp` (`LifeStats.js`) | Orbit-stage live-count teasers + stat animations in interiors |
| ContentContext hooks | Unchanged — all interiors read the same data |

---

## 10. Build workflow decisions (confirmed 2026-07-08)

| Topic | Decision |
|---|---|
| **Git** | Single long-running branch (`feat/wanderers-atlas`); phased work pushed to it as commit-waves; `main` untouched until the flip merge. Cloudflare Pages branch preview deploy is the review surface. Merge `main` into the branch whenever content hotfixes land there. |
| **Changelog** | **Silent during the dark build** — no entries for phases 0–14 (deliberate exception to the always-update rule); phase 15 lands one comprehensive **v11.0.0** entry telling the whole redesign story. |
| **Art approval** | **Concept board gate before phase 3**: a rendered HTML/SVG mockup showing the map composition, one fully-detailed biome, the day/night palettes, and the HUD — approved by Sanket once, cheaply, before any real biome art is built. |
| **Audio sourcing** | Claude sources CC0/public-domain audio (freesound, Pixabay audio), edits/compresses to spec (mono ~64kbps `.m4a`, ≤200KB/loop), and documents each file's source + license in the phase commit. |

## 11. Open items to elaborate later

Pending decisions with proposed defaults — confirm each before its phase, not
before starting:

1. **Guide avatar likeness** (before phase 13) — how the mini illustrated
   Sanket is derived. *Default: stylized flat-vector character based on
   `public/images/me.jpg`; 2–3 sketch options presented for approval.*
2. **Copy voice** (from phase 5 on) — tone for quest names, guide dialogue,
   achievement toasts. *Default: warm first-person Sanket, playful but not
   jokey; English-only UI copy (content itself stays bilingual).*
3. **Easter-egg references** (phase 6/11) — which personal details hide in the
   map art. *Candidates: Tata Ultra 50K medal, 22-hr Panhala–Pawankhind trek
   tent, Jan-22 birthday constellation visible at night, Nirman sapling,
   paper-boat Substack nod.*
4. **Analytics** (phase 6) — whether gtag events fire for atlas interactions
   (region visits, quest completions, intro skips/finishes, view-mode
   switches). *Default: yes, anonymous event names only.*
5. **Passport share card** (phase 6 or follow-up) — a shareable "I explored
   the Wanderer's Atlas" image via the existing `html-to-image` pipeline.
   *Default: yes.*
6. **Mobile intro** (verify at phase 4) — full orbit+dive on phones vs an
   abbreviated version. *Default: full — orbit reuses the already-lazy globe
   chunk; re-evaluate on real devices.*
7. **`/admin`** — stays on the classic shell, untouched by the redesign.
   *Default: yes.*
8. **Browser baseline** — evergreen browsers; WebGL-less browsers should land
   in classic view automatically. *Default: yes.*

## 12. Alternatives considered (for history)

Three other directions were explored (with web research) and declined in
favor of the Living Atlas:

- **Cozy 3D Island** — Breton/WoraWork-style low-poly floating island with
  camera-glide districts. Strongest wow/awards potential; declined for the
  Blender asset bottleneck, R3F adoption, and mobile-network bundle risk.
- **Pixel Quest RPG** — top-down walkable pixel village (RPG character-sheet
  resume, dialog-box content). Lightest tech, best mobile perf; declined as a
  hard permanent brand shift away from the editorial identity.
- **Guided Odyssey** — one continuous scroll-driven cinematic through all six
  worlds. Most controllable and mobile-safe; declined for lack of free-roam
  agency — but its authored-dive idea survives as the intro sequence, and its
  scroll-storytelling patterns may inform individual page interiors.

Exemplars that informed the research: [Bruno Simon](https://bruno-simon.com/)
([case study](https://medium.com/@bruno_simon/bruno-simon-portfolio-case-study-960402cc259b)),
[Jordan Breton](https://jordan-breton.com/), WoraWork
([three.js showcase roundup](https://www.creativedevjobs.com/blog/best-threejs-portfolio-examples-2025)),
[Stripe's globe write-up](https://stripe.com/blog/globe), and
[2D RPG portfolio patterns](https://github.com/atilio-ts/rpg-2d-portfolio).
