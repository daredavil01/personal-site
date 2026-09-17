# CLAUDE.md — Personal Site

## Project Overview

React 18 single-page application (personal portfolio). Key stack:

- **React 18** with `react-router-dom` v6 for routing
- **react-helmet-async** for per-page `<head>` metadata
- **Tailwind CSS** for styling
- **Supabase** (Postgres + Storage + Row-Level Security) as the content store and backend
- **Built with Vite** (`vite.config.js`) — JSX lives in `.js` files via an esbuild loader shim; `process.env.PUBLIC_URL` is shimmed to `""` with `define`.
- **Deployed on Cloudflare Pages** — build command is `npm run build` (`vite build`, output in `build/`). Server-side logic lives in `functions/` as Cloudflare Pages Functions (file-based routing).

## Content Store (Single Source of Truth)

**All dynamic content lives in Supabase Postgres.** There is no markdown/CMS
pipeline — the old `src/cms-content/` + `npm run cms:sync` flow, `public/cms/`
Decap config, and generated `src/data/*.js` content files were removed. Supabase
is canonical.

- **Schema:** `supabase/migrations/*.sql` (tables, RLS policies, indexes, RPCs).
  Apply via the Supabase SQL editor or `supabase db push`.
- **Client data access:** `src/lib/api/*.js` — each module wraps one table with the
  `createResource` CRUD factory (`_crud.js`) and `fromRow` / `toRow` mappers.
  Full lists are loaded lazily and cached through `src/context/ContentContext.js`,
  which exposes hooks: `useBooks`, `useSports`, `useTreks`, `useProjects`,
  `useBlogs`, `useInstagram`, `useResume`, `useNowMeta`, `useNowMonths`,
  `useTags` (each returns `{ data, loading, error }`), plus `useTagColors`
  (tag name → color map) and `useContentRefresh` (re-fetch one key).
- **Microblog is the exception** — 1,600+ rows, so it is **not** in the context.
  Query it directly via `src/lib/api/microblog.js` (server-side paginated search
  plus `getMicroblogMonths` / `getMicroblogByMonth` date helpers).
- **Editing content:** the admin dashboard at `/admin` (`src/pages/admin/`). Forms
  are schema-driven from `src/pages/admin/resources.js` — each resource's `fields`
  match the shape its api's `toRow` expects. Postgres auto-assigns row `id`s.
- **Bulk seeding scripts** (`scripts/`, require `SUPABASE_SERVICE_ROLE_KEY` in
  `.env`): `npm run microblog:import` (Tumblr archive, idempotent upsert),
  `npm run tags:migrate` (one-time legacy tag migration — see Tags below),
  `npm run images:upload` (`upload-images-to-supabase.mjs`).

## Tags (Centralized)

Tags are **not** columns on content rows. One `tags` table holds each tag's
metadata (lowercase `name`, `display_name`, `color`, `category`,
`description`); a polymorphic `tag_associations` table (`entity_type`,
`entity_id`, `tag_id`, `position`) links tags to rows in `books`, `blogs`,
`instagram`, `microblog`, `sports`, `treks`, `projects`. Schema + RPCs:
`supabase/migrations/0003_centralized_tags.sql`. Resume skill categories are
**not** tags (`resume_skills.category` stays a plain `text[]`).

- **Reads:** select `*, tag_names` — `tag_names(<table>)` is a PostgREST computed
  field. `_crud.js` does this automatically for resources created with
  `tagType`; each `fromRow` maps `r.tag_names` onto its `tags` (blogs:
  `blog_tags`) field, so components still read `.tags`.
- **Writes:** `_crud.js` calls `rpc("set_entity_tags", { p_type, p_id, p_names })`
  after saving the row. It normalizes (lowercase/trim/dedupe), creates missing
  tags, and replaces the row's tag set atomically. Never write tag arrays to
  content tables.
- **Other RPCs:** `tags_with_counts()` (hub/admin/colors), `tag_entities(name)`
  (cross-entity results), `merge_tags(from, into)`, `microblog_tag_facets()`,
  `microblog_month_tags()`. Deleting a content row deletes its associations
  (trigger).
- **Admin:** `/admin/tags` (`src/pages/admin/TagManager.js`) — edit color /
  display name / category, rename, merge duplicates, delete, JSON export/import
  of metadata. Form tag fields with `suggest: true` autocomplete from the
  central list.
- **Public:** `/tags` (`src/pages/TagsHub.js`) and `/tags/:name`
  (`src/pages/TagDetail.js`). Link with `tagPath(name)` from
  `src/lib/api/tags.js` (URI-encoded, never slugified — Marathi names).
  Tag colors resolve through `colorForTag` in `src/lib/generativeArt.js`
  (stored color, else a hue hashed from the name).
- **Compare tags case-insensitively** — names are stored lowercase.
- **Legacy migration (one-time):** apply 0003 → `npm run tags:migrate -- --dry-run`
  → `npm run tags:migrate` (verify must pass) → re-run just before deploying
  → deploy → apply `0004_drop_legacy_tag_columns.sql`.
- **Hand-maintained files NOT in Supabase:** `src/data/changelog.md`,
  `src/data/about.md`, `src/data/contact.js`, `src/data/routes.js` (nav),
  `src/data/pageMeta.js`, `src/data/stats/personal.js`.

## Docs (read before touching a table)

`docs/` is the deep reference; this file is the summary.

- `docs/data-model.md` — every table's columns, types, CHECK constraints and live
  row counts, generated from the database.
- `docs/entities.md` — what each content type *means* (hand-written, and the part
  that is not derivable from the schema).
- `docs/routes.md`, `docs/tags.md` — route map and the tag vocabulary.
- `docs/chatbot-context.md` — the ~1,200-token card `/ask` injects; derived, never
  hand-edited.

Regenerate with `npm run docs:build` (or `npm run ask:index`, which calls it).
Generated blocks live between `<!-- generated:NAME start/end -->` markers; prose
outside them survives. See `docs/README.md`.

## Per-Route Meta and OG Cards

**Every route unfurls with a real 1200×630 image, and a new route is not
shippable until it does** — a route that unfurls as a generic logo is a bug, and
`src/data/routeManifest.test.js` fails the build if one ships.

Two kinds of image, and **nothing renders at request time**:

- **A fixed route** advertises its own generated card, committed to
  `public/og/<slug>.png`.
- **A detail route** advertises **the row's own photo** when it has one (treks,
  races, projects, photo micro-posts) and its section's committed card when it
  does not (books, blogs, decks, tags, shares — none of which have an image).

Three files move together when you add a route to `src/App.js`:

1. **`src/data/routeManifest.js`** — one declarative entry (`path`, `component`,
   `meta`, `og.strategy`, `indexable`). The guard test asserts **set equality**
   against `src/App.js`, so a route that is added *or deleted* without updating
   this list fails. `docs/routes.md` is generated from it.
2. **`src/data/pageMeta.js`** — `title`, `description`, `image`, `imageAlt`,
   `ogSlug` and `type` for a fixed route; a `build<Thing>Meta` builder for a
   parameterised one, whose `image` argument is the row's photo and whose
   fallback is the section card. **This module must stay import-free** (no
   imports, no `process.env`, plain literals) because esbuild bundles it into
   the Worker. It is read by `src/components/Template/PageMeta.js` (client)
   *and* `functions/_middleware.js` (crawlers) — never add a tag to one without
   the other. `og:site_name` belongs to neither: `index.html` carries it
   globally.
3. **The card.** Add a layout to `FIGURES` in `src/lib/og/layouts/page.js`, its
   slug to `PAGE_SLUGS` in `src/lib/og/model.js`, then `npm run og:fallbacks`
   and commit the resulting `public/og/<slug>.png`.

**Each section gets its own figure, not a shared template** — the card should be
recognisable as that section before the text is readable. Cards must survive a
WhatsApp thumbnail (~300 px): headline ≤ 6 words at ≥ 64 px, at most three
numbers, one accent colour, photos duotoned. Read stats from `computeSiteStats`,
colours from `colorForTag`, art from `postArt` — never recompute, and never
hardcode a number into a figure. A stat with no value is **omitted**, never
rendered as `0`; a figure with no data renders **nothing**, never a placeholder.

Layout code lives in `src/lib/og/`, **not** under `functions/` (Pages routes
every file there), and contains **no JSX and no React** — satori trees are built
with the `h()` hyperscript in `src/lib/og/h.js`.

Four things to know before touching this:

- **Do not move rendering back to the edge.** It was there, on demand at
  `/api/og/…`; Workers Free allows 10 ms CPU per request and a render costs
  ~400 ms, so production returned 1102 and links unfurled with **no image at
  all**. `wrangler pages dev` does not enforce the limit, so local success
  proves nothing. satori and resvg are devDependencies for that reason.
- **The numbers are baked in and go stale.** Re-run `npm run og:fallbacks`
  after content moves, the way `npm run blogs:wordcount` is re-run. There is no
  nightly job by choice.
- **resvg cannot decode WebP**, and `/admin` uploads `.webp` whenever a source
  image has transparency — satori embeds it and resvg silently draws nothing.
  The generator only inlines `image/(jpeg|png|gif)`.
- **satori is pinned to 0.32.0.** 0.33+ adds HarfBuzz (correct Devanagari
  conjuncts) but could not run on Workers. That constraint is gone now that
  nothing renders at the edge, so it is upgradable — read `docs/og-cards.md`
  first.

`og:image` is always **PNG at 1200×630**; SVG is rejected by WhatsApp, Facebook,
LinkedIn, X, Slack and iMessage. `og:image:width`/`height` are declared **only**
for our own cards (`isCardImage`), never for a row's photo — asserting a size we
do not know makes every platform crop it wrong.

## Second Brain (/ask)

Natural-language chat over the whole content store.

- **Index:** `content_chunks` (`supabase/migrations/0009_second_brain.sql`), one
  embedded chunk per row, built by `npm run ask:index`
  (`scripts/build-content-index.mjs`). Idempotent and incremental. Needs
  `CF_ACCOUNT_ID` / `CF_API_TOKEN` for Workers AI embeddings.
- **Retrieval:** `hybrid_search()` fuses tsvector keyword ranking with pgvector
  semantic ranking via RRF, and runs keyword-only when the caller passes a null
  embedding. It returns `match_score` / `match_kind` and drops semantic matches
  below `min_similarity` (the `semantic_floor` setting) — without that floor the
  semantic half always returns its nearest rows however unrelated. It returns
  **no** `embedding` or `fts` column: nothing reads them and they dominated the
  payload. `site_facts()` supplies the counting/aggregate answers, plus `roster`
  (every book, trek, race, project, deck and photo set as `{t,d,u}`, newest
  first) and `latest` for the types too big to list. Enumeration and recency are
  answered from those, never from search.
- **Type chips re-rank, they do not scope.** The worker over-fetches unscoped
  (`match_count * 3`) and `src/lib/askRetrieval.js` picks from that: it keeps the
  chosen types, widens back to everything when fewer than three survive, sinks
  `site`/`page` chunks unless the question is about the site, and caps chunks per
  entity. Passing the chips as `p_types` filtered *before* ranking, which is why
  a scoped question used to return eight confident, unrelated items.
- **Endpoint:** `functions/api/ask.js` — `/api/ask`, **not** `/ask`: a Function
  at `/ask` would shadow the `/ask` page. Streams SSE (sources first, then the
  answer); `?stream` off falls back to one JSON response. Shared helpers live in
  `src/data/askConfig.js`, `src/lib/askTiers.js`, `src/lib/askRetrieval.js` and
  `src/lib/askFormat.js` — NOT under `functions/`, because Pages routes every
  file there.
- **Model ladder:** Gemini → Workers AI → Workers AI → search-only. Order and
  model ids are rows in `ask_settings`, not constants — a retired model is an
  `/admin` edit. The one hard-coded model is the **embedding** model
  (`EMBEDDING_MODEL` in `askConfig.js`): changing it invalidates every stored
  vector, so it is a re-index, not a setting.
- **Config + caps:** the `ask_settings` singleton, edited at `/admin/ask/settings`,
  read by the worker with a 60-second cache. Quotas are counted in `ask_usage`
  through the `ask_quota()` RPC and fail closed.
- **UI:** `src/pages/Ask.js` (`/ask`) and `src/components/Ask/AskLauncher.js`
  (site-wide, mounted in `Main.js`), both rendering `AskChat.js`. Local dev
  needs `npm run dev:ask` beside `npm run dev` — Vite proxies `/api` to it.
- **Starter chips** come from `ask_settings.question_pool` (jsonb `[{q, c}]`,
  edited at `/admin/ask/settings`), sampled by `src/lib/askQuestions.js`: one
  question from each of four random categories per page load, four chips on
  `/ask` and three in the launcher. Stratified rather than shuffled, because a
  flat draw keeps offering four book questions at once. `GET /api/ask` appends
  one or two chips built from the facts roster, so they name whatever is newest.
  An empty pool falls back to `suggested_questions`. Only add a question the
  archive answers well — a chip that refuses reads as a broken feature.
- **Conversation log:** `ask_conversations` / `ask_messages`, written by the
  `ask_log()` RPC from `waitUntil()` so it can never slow an answer. Owner-only;
  read and exported at `/admin/ask/conversations`.
- **Shared conversations** (`0021`): a reader presses Share and the thread is
  snapshotted into `ask_shares`, served read-only at `/ask/s/<token>`.
  **`ask_shares` is owner-only RLS on purpose** — an anon select policy would let
  anyone `GET /rest/v1/ask_shares?select=*` and enumerate every shared
  conversation, so "unlisted" would be a fiction. The public reaches it only
  through `get_ask_share(token)` / `bump_ask_share_view(token)`, both SECURITY
  DEFINER and token-gated. `create_ask_share` is **service-role only** and called
  from `functions/api/share.js`: the per-IP daily cap (`daily_share_cap`) is
  meaningless if the caller can pick its own `ip_hash`, and only the edge knows
  the real address. Snapshot shape and the derived columns come from
  `src/lib/askShareSnapshot.js`. Managed at `/admin/ask/shares` — filter, search
  the stored text, open, revoke (reversible, keeps the record) or delete.
- **Related content:** `related_content_ranked()` powers the "more like this"
  strip on every detail page from the same embeddings — no model call at read
  time.

## Ask Sources, Stats Snapshot and Feedback

- **Sources are files.** Every `scripts/ask-sources/*.mjs` is a source (`type`,
  `load`, `toChunks`); the indexer loads the whole folder. Since `0016` no
  migration is needed per type. How-to: `scripts/ask-sources/README.md`.
- **Incremental by content.** `npm run ask:index` hashes each chunk: unchanged
  rows are skipped, text that moved reuses its vector, only new text is embedded.
  `-- --dry-run` prints the plan per type; `-- --full` re-embeds everything.
- **Full blog text** (every Substack + WordPress post) comes from
  `knowledge_base/blog-posts-text.json`, written by `npm run blogs:wordcount` as
  a cache — only new or edited posts are downloaded. Never written to `public/`.
- **/stats numbers have one implementation: `src/lib/siteStats.js`.** The page
  renders from `GET /api/stats` (edge-cached for an hour, `src/lib/statsEndpoint.js`;
  computed in the browser if the endpoint is unreachable), and the `/ask` facts
  card and the `stats` source read the same snapshot. Never recompute a stat
  inside a component — add it to `computeSiteStats`.
- **Writing Ledger:** `public/writing-ledger.html` fetches
  `public/data/writing-ledger.json`; month/year-to-date are recomputed at read
  time (`src/lib/writingPeriod.js`). See `docs/writing-ledger.md`.
- **Answers** may only link to, or show, URLs the archive supplied:
  `sanitiseAnswer` (`src/lib/askFormat.js`) runs in the worker and in the UI.
  Links and images are **separate** allow-lists — a retrieved item's photo is not
  a valid link target — and the worker passes the roster urls as extra allowed
  links, so the UI pass needs the same list (`linkable`) or it strips them.
- **Feedback** (thumbs, reason tags, comment) is written onto the answer's
  `ask_messages` row by `ask_feedback()`, which checks the browser session. The
  admin Conversations page filters and summarises the log and exports rated
  exchanges as evals JSONL.
- **Admin evals** (`0017`): the Conversations page's "Eval mode" toggle adds a
  per-answer form (verdict, 1–5 score, tags, notes, ideal answer) saved to the
  `eval_*` columns on `ask_messages` — separate from reader `feedback_*`, written
  directly under owner RLS. Filter by evaluated / not evaluated.
- **Nightly:** `.github/workflows/ask-refresh.yml` (02:00 IST) runs
  `blogs:wordcount` + `ask:index` and commits the ledger JSON only when posts
  changed. Repo secrets: `SUPABASE_SERVICE_ROLE_KEY`, `CF_ACCOUNT_ID`, `CF_API_TOKEN`.

## Environment Variables

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — client (baked into the
  bundle by Vite). Public; committed in `wrangler.toml` `[vars]`.
- `SUPABASE_SERVICE_ROLE_KEY` — **secret**, server/scripts only. Never commit;
  set via `wrangler pages secret put` or the Cloudflare dashboard.

## Images (Supabase Storage)

Images live in the public **`media`** storage bucket, not the repo. Admin form
image / `slideImages` fields upload through `src/lib/api/storage.js`
(`uploadImage(file, folder)` → `media/<folder>/…` and returns the public URL).
At read time, `toStorageUrl` / `toStorageImages` (in `src/lib/supabaseClient.js`)
prefix stored relative paths with the bucket URL. Admin uploads are **resized and
compressed automatically** in the browser by `src/lib/imageCompress.js` (see
Image Compression below); bulk script uploads still need compressing by hand.
Uploads are grouped by type folder (`sports`, `treks`, etc.).

## Key File Locations

| Purpose | Path |
|---|---|
| Changelog | `src/data/changelog.md` |
| Page layout + Helmet | `src/layouts/Main.js` |
| App routes | `src/App.js` |
| Nav menu | `src/data/routes.js` |
| Supabase client + storage helpers | `src/lib/supabaseClient.js` |
| Content API layer (per table) | `src/lib/api/*.js` |
| Content context hooks | `src/context/ContentContext.js` |
| Admin dashboard | `src/pages/admin/` |
| Admin form schema | `src/pages/admin/resources.js` |
| DB schema / migrations | `supabase/migrations/` |
| Tag API / admin / public pages | `src/lib/api/tags.js`, `src/pages/admin/TagManager.js`, `src/pages/TagsHub.js`, `src/pages/TagDetail.js` |
| Tag colors + micro-blog art | `src/lib/generativeArt.js` |
| Per-route meta (single source) | `src/data/pageMeta.js` (consumed by `Main.js` + middleware) |
| Route manifest (meta + card guard) | `src/data/routeManifest.js` |
| OG card layouts / models / figures | `src/lib/og/` |
| OG card generator | `scripts/og-preview.mjs` (`npm run og:fallbacks`) |
| The committed share cards | `public/og/*.png` |
| Card fonts (build-time only) | `scripts/og-fonts/` |
| Social-share meta tags | `functions/_middleware.js` (Cloudflare Pages Function) |
| Substack RSS proxy | `functions/rss-feed.js` (Cloudflare Pages Function) |
| Second brain endpoint | `functions/api/ask.js` |
| Ask shared config / model ladder | `src/data/askConfig.js`, `src/lib/askTiers.js` |
| Ask UI | `src/pages/Ask.js`, `src/components/Ask/` |
| Ask sources (plug-in registry) | `scripts/ask-sources/`, `scripts/lib/registry.mjs` |
| /stats numbers + hourly snapshot | `src/lib/siteStats.js`, `functions/api/stats.js` |
| Answer link/image rules | `src/lib/askFormat.js` |
| Writing Ledger data | `public/data/writing-ledger.json` (`npm run blogs:wordcount`) |
| Nightly ask + ledger refresh | `.github/workflows/ask-refresh.yml` |
| Generated + hand-written docs | `docs/` |
| Page components | `src/pages/` |
| Reusable components | `src/components/` |

## Homepage Sections

`src/pages/Index.js` composes, in order: `LifeStats` (aggregate KPI tiles), an
"In 1 Minute" intro, **`LatestPosts`** (live Substack RSS feed proxied by
`functions/rss-feed.js`, scroll-to-reveal), **`MonthlyDigest`** (auto-aggregated
monthly digest of blogs / treks / marathons / micro-posts — uses
`src/lib/monthDigest.js` to reconcile the differing date formats), then the
"Explore" grid. Section meta comes from `src/data/pageMeta.js`.

## Changelog Rule

**Always update `src/data/changelog.md` when making any code change.**

- Add the entry to the **top** of the file following the versioning rules below.
- Choose the version bump:
  - **Major** (e.g. `v5.0.0` → `v6.0.0`): new page addition, major code refactor, or full redesign. A new route counts as a new page — and it also needs its own share card (see **Per-Route Meta and OG Cards**).
  - **Minor** (e.g. `v5.1.0` → `v5.2.0`): new features, new components, data updates, content additions.
  - **Patch** (e.g. `v5.1.0` → `v5.1.1`): bug fixes, copy/style tweaks, metadata changes, documentation updates.

#### Weekly Minor Version Rule

- Create **at most one minor version per calendar week** (Monday–Sunday).
- If a minor change is made and a minor version already exists for the current week: **do not bump** — instead update the date on the existing version header to today and append the new change entries to that block.
- Only create a new minor version if no minor version exists yet for the current week, or if the previous change was a major bump.
- Patch versions are not subject to the weekly cap — create a new patch entry whenever a bug fix is needed.

### Changelog Format

Follow this exact format (taken from the existing entries):

```markdown
## [vX.Y.Z] — YYYY-MM-DD

### Added
- **Component or Feature Name** (`file/path.js`): What was added and why.

### Changed
- **Component Name** (`file/path.js`): What was changed and what it affects.

### Fixed
- **Component Name** (`file/path.js`): What was broken and how it was fixed.
```

- Only include sections (`### Added`, `### Changed`, `### Fixed`) that are relevant to the change.
- Use **bold** for the component/feature name, backtick path in parentheses, then a colon and description.
- Omit the path if the change spans multiple files or is conceptual.

---

## Dynamic Content Update Instructions

Add/edit any content type through the **admin dashboard** (`/admin`), which writes
to Supabase via `src/lib/api/*`. The field lists below are what to collect from the
user; the concrete form schema (types, options, required flags) lives in
`src/pages/admin/resources.js`. Postgres assigns the `id`.

### Image Compression

**Admin uploads compress themselves — drop the full-size photo in.**
`src/lib/imageCompress.js` runs in the browser on every `image` / `slideImages`
field, so no manual pre-step is needed for anything added through `/admin`. The
field shows the before/after size and the final dimensions once it's done.

**Targets** (the constants in `imageCompress.js` — keep this list and that file
in sync):

- Max long edge: 1200px (landscape/square), 900px (portrait)
- Quality: ladders 85% → 50%, stopping at the first size that fits
- Target file size: ≤150 KB per image; **hard cap 300 KB** (mobile-network
  audience). If quality alone can't get there the long edge steps down
  (1200 → 1000 → 800 → 640) until it does.
- Output: `.jpeg`, or `.webp` when the source actually has transparency.
  Extensions are lowercased — hosting is case-sensitive.
- Images already under 150 KB and within bounds are uploaded untouched rather
  than re-encoded.

**HEIC is rejected, not converted** — Chrome and Firefox can't decode it.
Convert iPhone photos first:

```bash
convert input.heic -auto-orient -strip -quality 80 -resize "1200x>" output.jpeg
```

**Bulk uploads still need manual compression.** `npm run images:upload`
(`scripts/upload-images-to-supabase.mjs`) pushes raw bytes from `public/images/`
with no processing, so compress before running it:

```bash
# sharp-cli
npx sharp-cli --input path/to/image.jpg --output ./ --format jpeg --quality 80
# or ImageMagick
convert input.jpg -auto-orient -strip -quality 80 -resize "1200x>" output.jpg
```

---

### Now Page

**Tables:** `now_months` + `now_meta` (Supabase), read via `useNowMonths` /
`useNowMeta`. Edit in the admin dashboard → **Now · Months** (and the Now-meta
editor, `src/pages/admin/NowMetaEditor.js`).

Each `now_months` row has `month`, `year`, `isCurrent` (boolean), and a `sections`
JSON blob keyed by any of `blogs`, `running`, `books`, `events`, `projects`,
`website`, `stats`, `certificates`, `misc` (see existing rows for field shapes).

When pushing a new month's update:

1. Add a `now_months` row with `isCurrent: true` and the month's `sections`.
2. Set `isCurrent: false` on the previous month's row.
3. Older rows stay unchanged — the page sorts/archives them automatically.

**Questions to ask:** "What month and year? (e.g., May, 2026)" and "What are the
bullet-point activities for this month?"

---

### Books Page

**Table:** `books` (`src/lib/api/books.js`), admin → **Books**. Collect:

1. `title`, 2. `author`, 3. `category` (comma-separated genres),
4. `language` (English/Marathi), 5. `translator` (optional),
6. `blog_link` (optional review URL), 7. `blog_platform` (optional),
8. `description` (2–4 sentences), 9. `year`, 10. `tags` (comma-separated).

No images.

---

### Sports Page

**Table:** `sports` (`src/lib/api/sports.js`), admin → **Sports / Races**. Collect:

1. `title`, 2. `date` (**Month DD, YYYY** — e.g. `February 22, 2026`),
3. `description`, 4. `place`, 5. `distance` (`10 Kms` / `21 Kms` / `35 Kms` /
`42 Kms` / `50 Kms`, or other), 6. `time` (HH:MM:SS), 7. `timeCertificateLink`,
8. `bibNumber`, 9. `tags` (optional, e.g. `marathon`), 10. Images.

Add photos via the form's **Images** (`slideImages`) field — full-size files are
fine, they're compressed in the browser on the way to the `media` bucket
(`sports` folder).

---

### Treks Page

**Table:** `treks` (`src/lib/api/treks.js`), admin → **Treks**. Collect:

1. `fort_name`, 2. `trek_time` (e.g. `2 Hrs`), 3. `endurance_level`
(Easy/Medium/Hard), 4. `date` (**DD-MM-YYYY** — e.g. `17-02-2019`),
5. `blog_link` (optional), 6. `tags` (optional, e.g. `forts`), 7. Images.

Add photos via the **Images** (`slideImages`) field — full-size files are fine,
they're compressed in the browser on the way to the `media` bucket (`treks`
folder).

---

### Projects Page

**Table:** `projects` (`src/lib/api/projects.js`), admin → **Projects**. Collect:

1. `title`, 2. `subtitle`, 3. `date` (**YYYY-MM-DD**, optional — a real Postgres
`date` since `0005`), 4. `category` (Web App / Website / Data Story / Tool /
Design / Other), 5. `status` (Live / In Progress / Archived / Concept),
6. `role`, 7. `org` (blank for personal), 8. `featured` (pins it to the
spotlight), 9. `visible` (off = draft), 10. `link` (required primary URL),
11. `image` (optional cover), 12. `techStack`, 13. `tags`, 14. `links`
(`{label, url}` rows — GitHub repo, demo, write-up), 15. `desc`,
16. `highlights`, 17. `problem` / `solution` / `outcome`, 18. Screenshots.

Add screenshots via the form's **Screenshots** (`slideImages`) field — full-size
files are fine, they're compressed in the browser on the way to the `media`
bucket (`projects` folder). A project with no cover image falls back to its first
screenshot.

- **Visibility is enforced in Postgres, not React.** `0005` narrows the table's
  RLS select policy to `visible or is_owner()`, so a hidden project never reaches
  an anonymous payload, its `/tags` pages, its share card, or the public counts.
  `/admin` is authenticated as the owner and still sees everything.
- **`tech_stack` is a plain `text[]`, not tags.** `set_entity_tags` replaces an
  entity's *entire* tag set, so it can't back two independent tag fields on one
  row. Central `tags` stay the topical axis; tech stack is the build axis. Both
  are filterable on `/projects`.
- **Ordering is featured-first, then newest-first.** The old `sort_order` column
  was dropped in `0005`; don't reintroduce it.
- **Public page:** `src/pages/Projects.js` composes four views from
  `src/components/Projects/` (Showcase, Timeline, Statistics, Table) over one
  `useProjectFilters` hook. Filters and `?view=` are both URL state, so merge
  into existing search params — never `setSearchParams({ view })`, which wipes
  the filters.

---

### Presentations Page

**Table:** `presentations` (`src/lib/api/presentations.js`), admin → **Presentations**. Collect:

1. `title`, 2. `url` (required, https link to the HTML deck), 3. `date`
(**YYYY-MM-DD**, optional), 4. `tags`, 5. `description`.

- **Decks are embedded by URL, never copied.** The deck stays on its host
  (GitHub Pages) and renders in an iframe on `/presentations` (live scaled
  previews) and `/presentations/:id` (viewer). Adding a deck is an `/admin`
  edit, not a deploy.
- **The host must allow framing** — no `X-Frame-Options` / CSP
  `frame-ancestors`. GitHub Pages sends neither. If an embed goes blank, the
  viewer's "Open original" link still works.
- **Supabase Storage can't host decks** — it serves `.html` as `text/plain`.
- `/ask` indexes the deck's slide text (fetched by `scripts/ask-sources/presentation.mjs`)
  on the next `npm run ask:index`.
- Previews load every deck on the list page; switch to image thumbnails if the
  list grows past ~20 decks.

---

### 100 Days To Offload

**Table:** `blogs` (`src/lib/api/blogs.js`), admin → **100 Days (Blogs)**. Collect:

- `blog_title`, `blog_description`, `blog_date` (**YYYY-MM-DD**), `blog_link`,
  `blog_platform` (Substack/Medium/Ghost/WordPress/Other), `language`
  (English/Marathi), `blog_tags` (list), `challenge_id` (`100_days_to_offload`).

---

### Micro-Blog Page

**Table:** the Supabase `microblog` table. This page is a bulk-imported social
archive with server-side full-text search; there is no generated JS data file.

- **Schema:** `supabase/migrations/0002_microblog.sql` (`microblog` table +
  `search_tsv` GIN index + RLS). Tags live in the central tag tables (0003);
  `microblog_tag_facets()` and the `?tags=` filter read them via `tag_names`.
  Apply migrations via the Supabase SQL editor or `supabase db push` before importing.
- **Seeding from the Tumblr export:** `npm run microblog:import` reads
  `knowledge_base/tumblr_posts.json`, cleans each post (HTML-entity decode,
  `<br>` → newline, post_type mapping), and **upserts on `(source, source_id)`**.
  It is idempotent (re-runnable, no duplicates) and **non-destructive** — it
  never clears the table, so admin-authored `manual` posts survive re-imports.
  Export tags are written through `set_entity_tags` (only for posts that have
  them). Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
- **Pinboard art:** each card draws seeded generative art (`src/lib/generativeArt.js`)
  from its tags' colors, or a palette seeded by post id when untagged.
- **Adding posts by hand:** admin dashboard → **Micro Blog** tab
  (`src/pages/admin/MicroblogManager.js`). New posts default to `source: manual`
  with a null `source_id`.
- **`source` column** (`tumblr` | `instagram` | `manual`) lets other archives
  (e.g. an Instagram text export) share this table later.
- **Photo posts:** ~59% of Tumblr posts are photos whose images aren't in the
  repo; `image_url` is currently blank. To backfill, upload the Tumblr export's
  `media/` folder to the `media` storage bucket and set each row's `image_url`
  (the source filename is `<source_id>.png`).
