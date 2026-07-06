# Interactive 3D Globe — Homepage Illustration Plan

## Context

The homepage (`src/pages/Index.js`) currently has a hero header, `LifeStats`, a short "In 1 Minute" intro, a static 12-item feature grid, and a closing CTA — all text/card-based. The goal is to add a more visual, exploratory way to browse the same content: an interactive 3D globe with clickable pins that pop up rich info bubbles, sitting alongside (not replacing) the existing feature grid.

## Confirmed Decisions

1. **Pin content — mixed:** every Sports race + every Trek entry (real locations), plus all 12 homepage feature-grid entries (About, Now, Books, Sports, Projects, Resume, Mind Map, etc.) as a second pin type.
2. **Visual style:** real interactive 3D WebGL globe via `react-globe.gl` (three.js + d3 under the hood) — chosen because it has a built-in Points layer with per-point click handlers/tooltips, avoiding hand-rolled hit-testing.
3. **Placement:** new section on the homepage, inserted between the "In 1 Minute" section and the "Explore Features" grid — a visual breather before the text-heavy grid, after the reader has gotten a quick personal intro.
4. **Bubble depth:** rich preview card on click — thumbnail where available, description, metadata chips (distance/time for races, difficulty/duration for treks, icon+link for feature pins).
5. **Load strategy:** lazy-load the globe (code-split via `React.lazy`), only mounting the heavy three.js component once the section scrolls into view (IntersectionObserver) — keeps initial homepage bundle/paint unaffected.
6. **Mobile:** full 3D experience with touch-drag rotate everywhere (three.js OrbitControls supports touch out of the box) — no simplified fallback.
7. **Geocoding:** Sports/Treks only store free-text location (`place` / `fort_name`, no lat/lng). Build a static lookup mapping each unique place/fort name to an approximate `{lat, lng}` using general geographic knowledge (all locations are in Maharashtra, India). One-time curated data file, not a runtime geocoding API call.
8. **Feature pins:** not real locations — cluster them in a small jittered radius around a neutral anchor (Pune, ~18.52°N 73.85°E) so they're visually grouped and distinguishable (different pin color) from real race/trek pins.

## Codebase Facts Used

- `src/pages/Index.js` — hero (94-102), `<LifeStats />` (104), "In 1 Minute" (106-116), local `SectionHeader` (7-14), local `features` array of 12 `{title, desc, path, icon}` (16-89, rendered 118-145), closing CTA (147-159).
- `src/context/ContentContext.js` — app-wide cached data hooks (`useSports()`, `useTreks()`, etc.) via a `FETCHERS` map (17-27) and `useResource` (64-75); first call anywhere triggers the fetch, cached after that.
- `src/components/Index/LifeStats.js` — reference pattern for `useSports()`/`useTreks()` usage (32-34) and the IntersectionObserver lazy-animate pattern (56-63, `threshold: 0.25`).
- Sports record (`src/lib/api/sports.js`): `{ id, title, date, description, place, distance, time, timeCertificateLink, bibNumber, slideImages }`.
- Trek record (`src/lib/api/treks.js`): `{ id, fort_name, trek_time, endurance_level, date, blog_link, slideImages }` — no separate `place`, `fort_name` IS the location.
- `src/components/MindMap/MindMapDetailPanel.js` — reusable rich-modal pattern: full-screen overlay, ESC/click-outside close, body-scroll-lock (130-139), sticky header/footer, per-type content renderers (`BookDetail`, `MarathonDetail`, `TrekDetail`, `ProjectDetail`, `BlogDetail`, 19-119) selected via a `type` discriminator, `ctaConfig` map (121-127), `MetaChip` (12-17).
- No 3D/animation libraries installed today — this is the site's first three.js-class dependency. CLAUDE.md stresses a mobile-network audience and strict image-size caps, so bundle impact must be actively mitigated (lazy mount, not just lazy import).
- Dark mode via class strategy (`src/context/ThemeContext.js`), `dark:` Tailwind classes throughout; brand accent `secondary: #b22200`, `stone` grays, `font-headline`/`font-label`/`font-body`.

## Implementation Steps

### 1. Dependency

Add to `package.json` dependencies:
```json
"react-globe.gl": "^2.35.1",
"three": "^0.169.0"
```
`react-globe.gl` declares `three` as a peer dep and does not bundle it — confirm exact compatible versions at install time. No `vite.config.js` changes needed (ESM-compatible, no new JSX-in-non-.js concerns). Expect the vendor chunk to add ~150-250KB gzipped — this is why lazy-mount-on-scroll (step 4) is required, not optional.

### 2. Geocoding data file — `src/data/geo/placeCoordinates.js`

Flat lookup keyed by normalized (`trim().toLowerCase()`) place/fort name:
```js
export const PLACE_COORDINATES = {
  "nda, pune": { lat: 18.5793, lng: 73.9089 },
  "tikona": { lat: 18.6392, lng: 73.3822 },
  "panhala": { lat: 16.8106, lng: 74.1108 },
  // ...one entry per distinct place/fort_name currently in the data
};

export const FEATURE_ANCHOR = { lat: 18.52, lng: 73.85 }; // Pune

export const resolvePlaceCoordinates = (raw) =>
  PLACE_COORDINATES[raw?.trim().toLowerCase()] ?? null;
```
Before writing this file, enumerate every distinct `place` (Sports) and `fort_name` (Treks) value currently in the data — this is a one-time data-entry task, not inferrable from schema. Records with no match are silently excluded from pins (not rendered, no crash) with a dev-only `console.warn` so future CMS entries missing a geocode don't break the homepage.

### 3. Hoist the feature list — `src/data/homeFeatures.js`

Move the 12-entry `features` array out of `Index.js` verbatim into `export const HOME_FEATURES = [...]`. `Index.js`'s grid and the new globe pin-builder both import from here — single source of truth, no duplication.

Optionally also hoist the local `SectionHeader` component into `src/components/common/SectionHeader.js` since it'll now be used in two places.

### 4. New components

**`src/components/Index/GlobeShowcase.js`** — outer section wrapper (cheap, eagerly rendered):
- `ref` + `IntersectionObserver` (`threshold: 0.15`) → `inView` state, same pattern as `LifeStats`.
- Renders `SectionHeader`, then either `GlobeSkeleton` (before `inView`) or `<Suspense fallback={<GlobeSkeleton />}><GlobeRenderer .../></Suspense>` (after).
- `GlobeRenderer = React.lazy(() => import("./GlobeRenderer"))`.
- Calls `useSports()`/`useTreks()` unconditionally (Rules of Hooks) — matches `LifeStats`, data fetch starts on mount but is cheap; only the heavy three.js chunk/WebGL work is gated by `inView`.
- Builds unified `pins` array in `useMemo([sportsData, treksData, inView])`:
  - Sports → `resolvePlaceCoordinates(place)`, skip nulls, `{ id: 'sport-'+id, type: 'marathon', lat, lng, label: title, color: '#3b82f6', data: record }`.
  - Treks → same via `fort_name`, `type: 'trek'`, color `'#22c55e'`.
  - Features → 12 `HOME_FEATURES` entries jittered around `FEATURE_ANCHOR` in a small stable circle (`angle = (index/12) * 2π`, fixed radius ~0.15-0.3°), `type: 'feature'`, color `'#b22200'` (brand secondary).
- Manages `selectedItem` state; passes `onPinClick` down; renders `{selectedItem && <MindMapDetailPanel item={selectedItem} onClose={...} />}`.

**`src/components/Index/GlobeRenderer.js`** — the actual heavy component, default export, only ever imported via `React.lazy` (this file is the chunk boundary):
- Thin wrapper around `Globe` from `react-globe.gl` using the **Points layer** (`pointsData`, `pointLat`, `pointLng`, `pointColor`, `pointRadius`, `pointAltitude`, `onPointClick`, `pointLabel` for native hover tooltip) — lighter than the HTML-elements layer since rich content lives in the modal, not inline.
- Explicit pixel `width`/`height` via a `ResizeObserver` or fixed responsive Tailwind heights (`h-[420px] md:h-[560px]`) — the library needs pixel dimensions, doesn't auto-fill a flex parent.
- Drag/touch rotation is automatic via the library's three.js `OrbitControls`; just avoid `overflow-hidden`/conflicting touch-action CSS on the container.
- `theme` prop drives `globeImageUrl` (`earth-day.jpg` vs `earth-dark.jpg`), `atmosphereColor`, and `backgroundColor: 'rgba(0,0,0,0)'` (transparent in both modes so the page background/dark class shows through).
- `onPointClick` just calls the `onPinClick` prop — no local state.

**`GlobeSkeleton`** — small named export inside `GlobeShowcase.js`: fixed-height (matching real globe exactly, no layout shift) `animate-pulse bg-stone-100 dark:bg-stone-800 rounded-2xl` div with a centered `material-symbols-outlined` "public" icon + "Loading globe…" label.

### 4a. Extend `MindMapDetailPanel.js` (don't fork)

Reuse in place — it already has the full modal chrome plus `MarathonDetail`/`TrekDetail` renderers verbatim-usable. Additive changes only:
- Add `FeatureDetail` renderer (same bordered-blockquote style as others, `border-secondary/40`) for the new `"feature"` type.
- Add `feature: data.title` to `titleMap`.
- Add `feature: { label: 'Explore Section', path: data.path, color: 'bg-secondary hover:bg-secondary/90' }` to `ctaConfig` (no external link — only the internal button shows).
- Add the `{type === 'feature' && <FeatureDetail feature={data} />}` branch.
- Add a guarded thumbnail (`data.slideImages?.[0]?.url`) to the top of `MarathonDetail` and `TrekDetail`; give `FeatureDetail` an icon-only equivalent header for visual consistency.

Sports/Treks pins pass `{ type: 'marathon'|'trek', data: record }` — identical shape to what `MindMap.js` already builds, zero extra adaptation.

### 5. Wire into `Index.js`

- Add `import GlobeShowcase from "../components/Index/GlobeShowcase";`
- Replace local `SectionHeader` and `features` with imports from the hoisted files.
- Insert `<GlobeShowcase />` between the "In 1 Minute" section (ends 116) and the "Explore" grid (starts 118) — no extra wrapper markup, the component renders its own `<section>`.

### 6. Earth texture assets

Avoid `react-globe.gl`'s default external-CDN texture. Download/compress two equirectangular JPEGs (per CLAUDE.md's image rules — max ~1200px wide, quality 75-85%, target well under 150KB) to:
- `public/images/globe/earth-day.jpg`
- `public/images/globe/earth-dark.jpg`

Reference with whatever `public/` path convention the rest of the codebase already uses (check `Main.js`/favicon references) — don't introduce a second convention. Skip bump-map/star-field extras unless the default look needs them; keep asset footprint to these two files.

### 7. Dark mode

`GlobeShowcase` reads `useTheme()` and passes `theme` to `GlobeRenderer`, which swaps `globeImageUrl` and dims `atmosphereColor` accordingly; `backgroundColor` stays transparent in both modes. Pin colors stay theme-invariant (matches `MindMap.js`'s category colors today).

### 8. Changelog

Add to top of `src/data/changelog.md` — Minor bump to `v10.3.0`, dated `2026-07-06` (new calendar week, no minor version yet created this week):

```markdown
## [v10.3.0] — 2026-07-06

### Added
- **Interactive 3D globe on homepage** (`src/components/Index/GlobeShowcase.js`, `src/components/Index/GlobeRenderer.js`, `src/data/geo/placeCoordinates.js`, `src/data/homeFeatures.js`): A new "Where I've Been" section renders a WebGL globe (react-globe.gl/three.js) plotting every Sports race and Trek location (geocoded via a new static Maharashtra place lookup) alongside the 12 homepage feature-section pins (clustered near Pune). Clicking a pin opens a rich detail card (extended MindMapDetailPanel with a new `feature` type) with thumbnail, description, and metadata chips. The globe and its three.js dependency are code-split via React.lazy and only mount once the section scrolls into view.

### Changed
- **Homepage feature list hoisted** (`src/data/homeFeatures.js`, `src/pages/Index.js`): The 12-entry feature-grid array moved out of Index.js into a shared data module so both the feature grid and the new globe pins consume the same source of truth.
```

If another minor version already landed earlier in the week by implementation time, update that header's date and append instead of creating a new block.

## Verification Plan

1. `npm run dev`, open the homepage.
2. DevTools Network tab: confirm no `GlobeRenderer` chunk request fires until the section scrolls into view (throttle to "Fast 3G" to see the skeleton pulse before the globe fades in).
3. Confirm `sports`/`treks` Supabase requests aren't duplicated (ContentContext cache should mean one fetch app-wide even though `LifeStats` also uses these hooks).
4. Click one pin of each type (Sports, Trek, Feature) — verify correct title, thumbnail/icon header, metadata chips, CTA behavior, ESC/click-outside close, body-scroll lock/restore.
5. Toggle dark mode — texture swaps cleanly, no flash of wrong texture, modal styling matches existing dark-mode conventions.
6. Test mobile/touch viewport — one-finger drag rotates smoothly, doesn't fight page scroll, tap opens the same modal as desktop click.
7. `npm run build && npm run analyze` — confirm the `GlobeRenderer` chunk is isolated from the main/vendor bundle.
8. `npm run lint` — new files pass existing ESLint (airbnb) config.

## Critical Files

- `src/pages/Index.js`
- `src/components/MindMap/MindMapDetailPanel.js`
- `src/components/Index/LifeStats.js`
- `src/context/ContentContext.js`
- `src/lib/api/sports.js`, `src/lib/api/treks.js`
- `package.json`
- `src/data/changelog.md`

## New Files

- `src/components/Index/GlobeShowcase.js`
- `src/components/Index/GlobeRenderer.js`
- `src/data/geo/placeCoordinates.js`
- `src/data/homeFeatures.js`
- `src/components/common/SectionHeader.js` (hoisted, optional but recommended)
- `public/images/globe/earth-day.jpg`, `public/images/globe/earth-dark.jpg`
