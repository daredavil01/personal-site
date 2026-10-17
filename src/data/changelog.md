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

## [v23.1.5] — 2026-10-17

### Changed
- **IndexNow** (`scripts/lib/indexnow.mjs`): micro-post permalinks (`/micro-blog/:id`) are no longer submitted, with or without `--all` — 1,600+ of the thinnest pages would crowd out the essays, books and races. The `/micro-blog` page is still sent, and the posts stay in the sitemap.

## [v23.1.4] — 2026-10-17

### Added
- **Crawler-readable pages** (`functions/_middleware.js`, `src/lib/seo/fallbackHtml.js`, `src/lib/seo/entities.js`): every HTML response now carries the page as plain HTML inside `#root` — heading, facts, text, the row's photo, outbound link, tags, and for a section page every row as a link. GPTBot, ClaudeBot, PerplexityBot and most other crawlers never run JavaScript and used to see an empty `<div>`. Everyone gets the same document; `index.html` hides it once JS runs and `src/index.js` always `createRoot`s over it (the old react-snap `hydrateRoot` branch is gone).
- **Structured data** (`src/lib/seo/structuredData.js`, `src/data/identity.js`): a JSON-LD `@graph` on every page with one Person (`/#person`: Bridgenext, Pune, education, `sameAs` profiles) repeated everywhere, a `ProfilePage` for `/`, `/about` and `/resume`, `CollectionPage` + `ItemList` for sections and tags, a breadcrumb trail, and per-row `Book` + `Review`, `BlogPosting` (citing the essay's real Substack/WordPress URL), `SocialMediaPosting`, `Article` about a fort or a `SportsEvent`, `CreativeWork` and `PresentationDigitalDocument`.
- **Generated sitemap, feed and llms files** (`functions/sitemap.xml.js`, `functions/feed.xml.js`, `functions/llms.txt.js`, `functions/llms-full.txt.js`): built from the route manifest and the live tables and cached an hour. The sitemap goes from 19 hand-written URLs to ~2,000 with real `lastmod`s; `/feed.xml` is RSS of the newest 50 items site-wide (linked from `index.html`); `/llms-full.txt` lists every essay, issue, book, race, trek, project and deck. The static `public/sitemap.xml` and `public/llms.txt` are removed.
- **IndexNow** (`scripts/indexnow.mjs`, `public/indexnow-key.txt`): `npm run indexnow` submits URLs whose live sitemap `lastmod` moved in the last 3 days to Bing and friends (`--all` for everything). Runs nightly in `ask-refresh.yml` and as the last `npm run refresh` step.
- **One identity module** (`src/data/identity.js`): name, job, employer, location, education, bio and profiles, read by the JSON-LD, the fallback, `/llms.txt`, `agents.md` and a new Bio section on the About page. A test fails if a `contact.js` profile is missing or `agents.md` drifts.
- **docs/seo.md**: how search engines and AI crawlers see the site, and the Cloudflare, Search Console and Bing settings only the owner can change.

### Changed
- **Home page** (`src/pages/Index.js`, `src/atlas/AtlasHome.js`, `src/data/pageMeta.js`): the H1 is now the name ("The Digital Hub" moves to the kicker), and the title is "Sanket Tambare — Software Engineer, Ultramarathoner & Writer" via a new `fullTitle` meta field, with a description naming Bridgenext and Pune.
- **robots.txt** (`public/robots.txt`): one welcome group for current AI crawlers (OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, Perplexity-User, Google-Extended, Applebot-Extended…) that repeats the `/admin` and `/api/` disallows — a named group replaces `*`, so the old file let those bots into `/admin`.
- **agents.md, about.md, personal facts** (`public/agents.md`, `src/data/about.md`, `src/data/stats/personalFacts.js`): Bridgenext as the employer, NAST in the past tense, Pune as the city, 10K–50K races, no Decap, no stale counts, no date of birth.
- **Head tags** (`functions/_middleware.js`, `src/components/Template/PageMeta.js`): edge tags carry `data-rh="true"` so Helmet replaces them on mount — the rendered DOM had two canonicals and two descriptions. Tag, share and micro-blog pages now take their copy from the shared builders instead of their own strings.
- **Headings and links** (`src/components/common/SectionHeader.js`, `src/components/Books/`, permalinks on treks, races and 100 Days): section labels are real `<h2>`s, book cards and table titles are real links to `/books/:id` (a plain click still opens the modal), icon-only permalinks carry the item's name, the micro-post page has an `<h1>`, content photos get alt text from their words, and Marathi books, essays and posts are marked `lang="mr"`.
- **Web manifest and favicon** (`public/images/favicon/manifest.json`, `public/favicon.ico`): named "Sanket Tambare" rather than daredavil01.com, with `start_url`/`display`; a root `/favicon.ico`.

### Fixed
- **Soft 404s** (`functions/_middleware.js`, `src/lib/seo/routeMatch.js`): a path no route claims, a malformed id, or a row that does not exist now answers 404 + `noindex` instead of a 200 with a self-canonical. An unreachable Supabase still answers 200, so an outage cannot deindex the site.
- **Duplicate URLs**: `/about/` and `/About` are 301s to `/about`.
- **Indexing rules** (`src/lib/seo/indexing.js`, `src/data/routeManifest.js`): `/admin`, shared `/ask/s/*` conversations and photo micro-posts with no text are `noindex` and kept out of the sitemap; `indexable` in the route manifest now actually drives this.
- **Copy** (`src/data/pageMeta.js`): `/books` no longer claims "100+ books", `/sports` reaches a 50K ultra, and trek descriptions read "An easy … trek to Ghangad Fort" rather than "A easy … Ghangad Fort fort".
