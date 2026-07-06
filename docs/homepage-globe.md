# Homepage Globe — "My World"

Interactive 3D WebGL globe on the homepage (`/`). Plots six themed "worlds" of
content as clickable pins on an abstract globe, with a rich set of exploration
features. This is the authoritative reference for how it works and how to
maintain it. (The original design brief lives in
[`globe-illustration-plan.md`](globe-illustration-plan.md) — kept for history;
the implementation has since diverged.)

## Stack & bundle strategy

- **`react-globe.gl`** (three.js + d3 under the hood). `three` is a peer dep.
- The globe is **code-split and lazy-mounted**: `GlobeShowcase` only renders the
  heavy `GlobeRenderer` (which imports `react-globe.gl`) once the section
  scrolls into view (IntersectionObserver, `threshold: 0.15`). `GlobeRenderer`
  is a `React.lazy` default export — that file is the chunk boundary, so
  three.js never lands in the main bundle. **Keep it a default export imported
  only via `React.lazy`.**

## File map

| File | Role |
|---|---|
| `src/pages/Index.js` | Renders `<GlobeShowcase />` (tagged `data-tour="globe"`) |
| `src/components/Index/GlobeShowcase.js` | Cheap outer wrapper: lazy-mount gate, builds the `pins` array from content data, owns `selectedItem` → opens `MindMapDetailPanel`, passes `paused` down |
| `src/components/Index/GlobeRenderer.js` | The heavy globe (three.js). All rendering + interaction features. **Chunk boundary — default export, lazy-only.** |
| `src/components/Index/globe/domains.js` | `DOMAINS` config (the six worlds), `PIN_ICONS`, helpers |
| `src/components/Index/globe/DomainLegend.js` | Always-visible chip strip (click to fly) |
| `src/components/Index/globe/DomainInfoCard.js` | Active-domain glass card (top-left) |
| `src/components/Index/globe/ExplorationTracker.js` | "Worlds explored" pill (top-right) |
| `src/components/Index/globe/CoachMark.js` | First-visit "drag to explore" hint |
| `src/components/Index/globe/Starfield.js` | Dark-mode twinkling starfield canvas |
| `src/components/Index/globe/confetti.js` | Dependency-free confetti burst |
| `src/components/Index/globe/globe.css` | Pin label reveal, coach-mark & toast animations, reduced-motion |
| `public/images/globe/` | `bg-<key>.jpg` per-world backdrops + `globe-texture-{light,dark}.jpg` |
| `src/components/MindMap/MindMapDetailPanel.js` | Reused modal opened when a pin is clicked |

## How pins are built

`DOMAINS` (in `domains.js`) defines the six worlds. Each has a `type` that maps
to a **content source** in `GlobeShowcase.js`'s `listsByType`:

| Domain `key` | `type` | Source (ContentContext) | Anchor `lng` | Color |
|---|---|---|---|---|
| marathons | `marathon` | `useSports()` | 0 | `#3b82f6` |
| treks | `trek` | `useTreks()` | 60 | `#22c55e` |
| writer | `blog` | `useBlogs()` (first 15) | 120 | `#ec4899` |
| reader | `book` | `useBooks()` (first 20) | 180 | `#f97316` |
| creator | `project` | `useProjects()` | 240 | `#a855f7` |
| person | `feature` | `HOME_FEATURES` | 300 | `#b22200` |

Each world's items are scattered around its `(lat, lng)` anchor with a Vogel
(golden-angle) spiral so the clusters look organic and don't overlap. Pins are
**not** real geolocations — this is an abstract "map of my life", not a world
map. (An earlier plan geocoded real Maharashtra locations; that was dropped.)

A pin object is `{ id, type, lat, lng, label, color, data }`. Clicking a pin
calls `onPinClick(pin)` → `GlobeShowcase` sets `selectedItem` → renders
`<MindMapDetailPanel item={pin} />`. The panel already renders each `type`
(`marathon`, `trek`, `blog`, `book`, `project`, `feature`).

## Features (all in `GlobeRenderer.js`)

- **Domain legend chips**, **active-domain info card**, **exploration tracker**.
- **Auto-play** — drifts world-to-world every 5s.
- **Journey replay** — round-robins across all six worlds (a few stops each), so
  every "next move" rotates the globe to a different section; draws a comet arc
  and a section-labelled caption. Stops on any interaction.
- **Constellation arcs** linking the active world's pins.
- **Starfield** (dark mode only) + **confetti** when all six worlds are visited.
- **Coach mark** (first visit) + **deep links** (`/?world=treks` opens focused).
- **Domain-tinted atmosphere/terrain/ring** that re-tint to the active world.
- **Refined scroll rotation** — drifts on page scroll but pauses while dragging,
  while the detail modal is open (`paused` prop), when off-screen, in
  fullscreen, and under `prefers-reduced-motion`.
- Pins are keyboard-focusable (Enter/Space); labels reveal on hover/zoom.

**localStorage keys:** `globe-visited-worlds`, `globe-all-worlds-celebrated`,
`globe-coach-seen`. **Reduced motion** disables scroll-rotation, auto-play,
rings, journey/arc animation, and the starfield/confetti.

## Maintenance recipes

### Add / change a world (domain)

1. Edit `DOMAINS` in `src/components/Index/globe/domains.js`: add
   `{ key, type, lat, lng, color, label, icon, bg, desc, path }`. Anchors are
   spaced 60° apart in `lng` — if you add a 7th world, respace all anchors
   evenly (e.g. `360 / N`) so they don't collide.
2. Add `PIN_ICONS[type]` for the new pin's Material Symbols icon.
3. Wire the data source in `GlobeShowcase.js` → `listsByType[type] =
   { items, getLabel }`.
4. If `type` is new, extend `MindMapDetailPanel.js`: add a `*Detail` renderer, a
   `titleMap[type]`, a `ctaConfig[type]`, and the `{type === '…' && …}` branch.
5. Add a compressed `bg-<key>.jpg` (see below) referenced by `bg` in the domain.

### Globe image assets

All live in `public/images/globe/` and follow the repo image rules (see
CLAUDE.md → Image Compression). **JPEG only, hard cap 300 KB**, target ≤235 KB.

```bash
# Per-world backdrop (landscape art)
npx sharp-cli --input source.png --output public/images/globe/bg-<key>.jpg \
  --format jpeg --quality 72 resize 1300
# Equirectangular globe surface texture
npx sharp-cli --input source.png --output public/images/globe/globe-texture-<mode>.jpg \
  --format jpeg --quality 80
```

Verify sizes after: nothing in `public/images/globe/` should exceed 300 KB.
Do **not** re-introduce large PNGs — the previous per-domain PNG textures
(~6.7 MB) were deleted precisely because of the mobile-network budget.

### Verify after changes

- Homepage loads; `GlobeRenderer` chunk only requests after scrolling to the
  section (Network tab, throttle to Fast 3G to see the skeleton).
- One pin of each `type` opens the correct modal; ESC/click-outside closes.
- Dark mode swaps the texture cleanly; atmosphere re-tints per world.
- Touch drag rotates; controls are visible on touch devices.
- `prefers-reduced-motion` disables the animated extras.
- `npm run lint` passes.
