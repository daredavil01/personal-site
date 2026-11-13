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

## [v33.1.2] — 2026-11-13

### Fixed
- **Blank homepage without WebGL** (`src/components/common/ErrorBoundary.js`, `src/lib/webgl.js`, `src/components/Index/GlobeShowcase.js`, `src/atlas/intro/OrbitStage.js`, `src/atlas/AtlasHome.js`): when the browser has no WebGL (locked-down browsers, remote desktops, blocklisted GPUs) `THREE.WebGLRenderer` threw inside the globe, nothing caught it, and React unmounted the whole site — `#root` was empty in both shells. The globe now checks for WebGL first and draws a static panel when there is none; an error boundary catches a throw anyway. The atlas skips its orbit straight to the map without WebGL, and its title and buttons survive a globe that fails.
- **Route error boundary** (`src/App.js`): a page that throws now shows "Something broke on this page" inside the normal shell, with Reload and Go home, instead of a white screen; moving to another route clears it.
- **Untitled book rows** (`src/pages/Books.js`): rows with no title are left off the shelf instead of drawn as empty books.

### Changed
- **Readable navigation** (`src/components/Template/Navigation.js`, `Hamburger.js`, `Footer.js`, `SideBar.js`, `FloatingToggle.js`): nav links go from 10 px at 0.25em tracking to 13 px at 0.12em with a 44 px tap height; drawer links, footer headings and links, sidebar buttons and the shell's other controls go to 12–14 px. The desktop bar now starts at `lg` (1024 px) because the larger labels no longer fit at `md`; the drawer covers everything narrower.
- **Shared controls** (`src/components/common/LogKit.js`, `PhotoViewer.js`, `src/pages/Index.js`): "Clear filters", "Full size" and the homepage call-to-action links go from 10 px to 12 px. Section eyebrows and figure labels stay small on purpose.

### Added
- **Globe fallback tests** (`src/__tests__/components/GlobeFallback.test.js`): the homepage and the atlas arrival render with a globe that throws and with no WebGL at all; `ErrorBoundary` recovers when its reset key changes.
