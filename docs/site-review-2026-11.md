# Site review (November 2026): audit and plan

## Context

The review of sankettambare.in (10 Nov 2026) says the content is strong but the
presentation buries it: a blank homepage, a directory-style front page, a
repeated About card, controls before content, and weak mobile layouts. I checked
each claim against the code and the live site (headless Chromium at 1440 px and
390 px) before planning, because the review itself says its mobile findings were
inferred. About half of it holds; the rest is already handled or was misread.

## Audit: what is true

| Review claim | Verdict | Evidence |
|---|---|---|
| Homepage renders blank | **Confirmed, root cause found** | With WebGL unavailable, `THREE.WebGLRenderer` throws inside `src/components/Index/GlobeRenderer.js`; the app has **no error boundary anywhere**, so React unmounts everything. `#root` is 0 characters, in classic and atlas mode. With WebGL the page renders. Any visitor on a locked-down browser, remote desktop or GPU-blocklisted device gets a white page. |
| Empty book cards | **Not reproduced** | 52 cards, all with title and author. Probably caught mid-load. A cheap guard is still worth adding. |
| About card repeated on every page | **True on desktop only** | `SideBar.js` is `hidden lg:flex`: it never appears on a phone. On desktop it takes a 320 px column on every page and its bio is hard-coded, bypassing `src/data/identity.js`. |
| 10 px uppercase labels | **Confirmed** | `text-[10px]`/`text-[9px]` appear 514 times in 142 files; nav links are 10 px with 0.25em tracking. |
| Homepage is 27 equal links, no live content | **Half true** | The "27 links" is the crawler fallback HTML. The real page has 15 Explore cards, and it does have Latest Writing and a Monthly Digest, but they sit below the globe, the trailer and the stats tiles. The hero copy ("Welcome to my digital garden…") says nothing specific. |
| Controls before content | **True on desktop** | First book cover starts at 923 px on a 900 px screen. On mobile, Books already collapses filters behind one button. |
| Mobile hamburger missing | **False** | It shows below `md`; the reviewer tested at 1920 px. |
| /ask stacks badly on mobile | **Mostly false** | The 390 px start screen is clean; no horizontal overflow on any of the six pages. |
| Writing Ledger is numbers-first and long | **Confirmed** | 16,388 px tall at 390 px. |
| "Play" is a junk drawer, overlapping pages | **Confirmed** | `src/data/routes.js`. |

## Design references (browsed)

- **sive.rs**: "me in 10 seconds", then three doors (about, now, contact), then five newest of each type with "more here". Closest match to this site's existing 10s/1m depths.
- **maggieappleton.com**: one-sentence hero stating what she makes, then a small sample per content type (4 essays with images, 12 notes as titles, 8 books as covers).
- **brianlovin.com**: name plus one sentence, five recent essays, then a plain index of sections with one-line descriptions.
- **stephango.com**: two nav items; one featured "Latest" card above a dated archive.
- **craigmod.com**: newsletter signup placed twice, split "Popular" and "Recent" essays.

Shared pattern: one specific sentence, newest work visible without scrolling,
curated samples instead of a full directory, heavy features lower down.

## Plan

### Phase 1: fixes (one PR, patch version)

1. **Error boundary.** Add `src/components/common/ErrorBoundary.js` (class component, optional `fallback`). Wrap `GlobeRenderer` in `GlobeShowcase.js` and `atlas/intro/OrbitStage.js` (fallback: the existing `GlobeSkeleton` / go straight to the map), and wrap `<Routes>` in `App.js` with a fallback that renders a plain "something broke, reload" inside `Main`. Add a WebGL capability check before mounting the globe so it degrades without throwing.
2. **Test.** A render test that makes `GlobeRenderer` throw and asserts the homepage still shows its heading.
3. **Books guard.** Filter rows without a `title` in `BooksShelf.js`.
4. **Readable nav.** In `Navigation.js` and `Hamburger.js`: 10 px → 13 px, tracking 0.25em → 0.12em, 44 px minimum tap height. Raise the shared button/label style from 10 px to 12 px where it is a control (CTA links, tabs, filter pills); leave decorative eyebrows alone. Do it by pattern, not a blind replace.

### Phase 2: homepage and navigation (one PR, major version)

5. **New classic homepage order** in `src/pages/Index.js`:
   1. Hero: name, a two-line sentence read from `src/data/identity.js`, an Ask box that navigates to `/ask?q=…` (reuse the `/ask` starter questions from `src/lib/askQuestions.js`), and one "Start here" link to `/about`.
   2. **Now strip**: four cards: latest essay (`LatestPosts` data), latest race or trek (`useSports`/`useTreks`), current book (`useBooks`, `status === "reading"`), current newsletter issue (`useNowMonths`). Omit a card with no data.
   3. **Four doors** replacing the 15-card Explore grid: Writing, Running & Treks, Work, About, each with a live count from `useSiteStats`.
   4. `LifeStats`, then `GlobeShowcase` and `Trailer` (kept, moved down).
   5. `MonthlyDigest`, newsletter link, existing contact block.
   Trim `src/data/homeFeatures.js` to match; update the fallback in `src/lib/seo/fallbackHtml.js` so crawlers see the same structure.
6. **Navigation** in `src/data/routes.js`: About · Ask · Writing · Running & Treks (Sports, Training, Treks) · Work · Life (Now, Newsletter, Books, Instagram, Videos). Move Mind Map, Blueprint, Films, Stats, Interactive Me and both Changelog pages to a footer group "How this site works". No routes are deleted, so `routeManifest.js`, share cards and the Blueprint rooms are untouched.
7. **Sidebar.** Keep `SideBar` on `/` and `/about` only; elsewhere the content takes the full width and the footer carries the contact icons. Read its bio from `identity.js`.

### Phase 3: content before chrome (one PR, minor version)

8. **Books / Treks desktop**: collapse filters and tag cloud behind the single Filters button already used on mobile (`BookFilters.js`, the pill rows in `src/pages/Treks.js`).
9. **Writing Ledger**: three featured essays above the counter; hide the "This month" bar at 0%; on narrow containers show the last three months of the ink calendar with an expand control (`src/components/WritingLedger/`).
10. **About**: open on the 1-minute story; move the time picker below the first screen.
11. **One instruction line per page**, the pattern `/treks` already uses.

### Not doing (and why)

- Merging Sports + Training, or the six writing pages, into single pages: large, breaks URLs, cards and films for modest gain. Regrouping the nav gets most of the benefit.
- /ask mobile restructure: not supported by what I measured.
- New ideas (fort map, year in review, EN/मराठी toggle, Start Here page): separate projects; worth choosing one after Phase 2 ships.

## Housekeeping per CLAUDE.md

Status: plan only, nothing here is implemented yet. Each PR adds its entry to `src/data/changelog.md`. Phase 2 touches a Blueprint
room (`src/components/Blueprint/features.js`, Foyer) and `docs/routes.md` if nav
labels are referenced. Work on branch `ccr-141330ac-hhkjmq`.

## Verification

- `npm test` (route manifest, Blueprint and nav tests must stay green) and `npm run build`.
- Playwright against `npm run dev`: `/` and `/?view=atlas` launched with `--disable-gpu --disable-3d-apis` must render text (today: 0 characters); repeat with WebGL on.
- Screenshots at 390 px and 1440 px of `/`, `/books`, `/treks`, `/writing-ledger`, `/about`: no horizontal scroll, first content item above 700 px, nav text ≥ 13 px.
- Check the middleware fallback for `/` still matches the rendered page.

## Sources

- Review audited: "sankettambare.in — Site Review", 10 November 2026.
- Design references: [sive.rs](https://sive.rs), [maggieappleton.com](https://maggieappleton.com), [brianlovin.com](https://brianlovin.com), [stephango.com](https://stephango.com), [craigmod.com](https://craigmod.com).
