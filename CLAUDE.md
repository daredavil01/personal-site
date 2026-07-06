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
  `useBlogs`, `useInstagram`, `useResume`, `useNowMeta`, `useNowMonths`
  (each returns `{ data, loading, error }`).
- **Microblog is the exception** — 1,600+ rows, so it is **not** in the context.
  Query it directly via `src/lib/api/microblog.js` (server-side paginated search
  plus `getMicroblogMonths` / `getMicroblogByMonth` date helpers).
- **Editing content:** the admin dashboard at `/admin` (`src/pages/admin/`). Forms
  are schema-driven from `src/pages/admin/resources.js` — each resource's `fields`
  match the shape its api's `toRow` expects. Postgres auto-assigns row `id`s.
- **Bulk seeding scripts** (`scripts/`, require `SUPABASE_SERVICE_ROLE_KEY` in
  `.env`): `npm run data:import` (`import-to-supabase.mjs`),
  `npm run microblog:import` (Tumblr archive, idempotent upsert),
  `npm run images:upload` (`upload-images-to-supabase.mjs`).
- **Hand-maintained files NOT in Supabase:** `src/data/changelog.md`,
  `src/data/about.md`, `src/data/contact.js`, `src/data/routes.js` (nav),
  `src/data/pageMeta.js`, `src/data/stats/personal.js`.

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
prefix stored relative paths with the bucket URL. **Always compress before
uploading** (see Image Compression below) and group by type folder (`sports`,
`treks`, etc.).

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
| Per-route meta (single source) | `src/data/pageMeta.js` (consumed by `Main.js` + middleware) |
| Social-share meta tags | `functions/_middleware.js` (Cloudflare Pages Function) |
| Substack RSS proxy | `functions/rss-feed.js` (Cloudflare Pages Function) |
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
  - **Major** (e.g. `v5.0.0` → `v6.0.0`): new page addition, major code refactor, or full redesign.
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

### Image Compression (Required Before Adding Any Images)

Before uploading any image (to the `media` bucket, e.g. for sports/treks slides),
compress it to keep page load fast.

**Option A — `sharp-cli` (Node.js, recommended):**

```bash
npx sharp-cli --input path/to/image.jpg --output ./ --format jpeg --quality 80
```

**Option B — ImageMagick:**

```bash
convert input.jpg -auto-orient -strip -quality 80 -resize "1200x>" output.jpg
```

**Option C — convert HEIC → JPEG first (iPhone photos):**

```bash
convert input.heic -auto-orient -strip -quality 80 -resize "1200x>" output.jpeg
```

**Target guidelines:**

- Max width: 1200px (landscape), 900px (portrait)
- Quality: 75–85%
- Target file size: ≤150 KB per image; **hard cap 300 KB** (mobile-network audience)
- Preferred format: `.jpeg` or `.jpg` — **never** `.heic` (does not render in Chrome/Firefox) and avoid `.png` for photos
- Use lowercase file extensions — hosting is case-sensitive

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
8. `bibNumber`, 9. Images.

Add photos via the form's **Images** (`slideImages`) field — they upload
compressed to the `media` bucket (`sports` folder). Compress first.

---

### Treks Page

**Table:** `treks` (`src/lib/api/treks.js`), admin → **Treks**. Collect:

1. `fort_name`, 2. `trek_time` (e.g. `2 Hrs`), 3. `endurance_level`
(Easy/Medium/Hard), 4. `date` (**DD-MM-YYYY** — e.g. `17-02-2019`),
5. `blog_link` (optional), 6. Images.

Add photos via the **Images** (`slideImages`) field — they upload to the `media`
bucket (`treks` folder). Compress first.

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
  `search_tsv` GIN index + RLS + `microblog_tag_facets()` RPC). Apply it via the
  Supabase SQL editor or `supabase db push` before importing.
- **Seeding from the Tumblr export:** `npm run microblog:import` reads
  `knowledge_base/tumblr_posts.json`, cleans each post (HTML-entity decode,
  `<br>` → newline, post_type mapping), and **upserts on `(source, source_id)`**.
  It is idempotent (re-runnable, no duplicates) and **non-destructive** — it
  never clears the table, so admin-authored `manual` posts survive re-imports.
  Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
- **Adding posts by hand:** admin dashboard → **Micro Blog** tab
  (`src/pages/admin/MicroblogManager.js`). New posts default to `source: manual`
  with a null `source_id`.
- **`source` column** (`tumblr` | `instagram` | `manual`) lets other archives
  (e.g. an Instagram text export) share this table later.
- **Photo posts:** ~59% of Tumblr posts are photos whose images aren't in the
  repo; `image_url` is currently blank. To backfill, upload the Tumblr export's
  `media/` folder to the `media` storage bucket and set each row's `image_url`
  (the source filename is `<source_id>.png`).
