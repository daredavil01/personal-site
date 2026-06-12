# CLAUDE.md — Personal Site

## Project Overview

React 18 single-page application (personal portfolio). Key stack:
- **React 18** with `react-router-dom` v6 for routing
- **react-helmet-async** for per-page `<head>` metadata
- **Tailwind CSS** for styling
- **Decap CMS** (`/cms/`, GitHub backend) for content editing
- **Deployed on Cloudflare Pages** — build command is `npm run build` (`react-scripts build`). A `prebuild` hook runs `npm run cms:sync` so the build always regenerates `src/data/*.js` from the CMS markdown.

## Content Pipeline (Single Source of Truth)

**`src/cms-content/**/*.md` is the canonical content store.** The JS files in
`src/data/` are generated from it by `npm run cms:sync`.

- **Never edit generated `src/data/*.js` files by hand** (`books.js`, `sports.js`,
  `treks.js`, `instagram.js`, `projects.js`, `100DaysToOffload.js`, `resume/*.js`).
  Edit or add the markdown file in `src/cms-content/`, then run `npm run cms:sync`
  and commit **both** the markdown and the regenerated JS.
- CI fails if `src/data/` drifts from the markdown (`cms:sync` + `git diff --exit-code`).
- Hand-maintained files that are NOT generated: `src/data/changelog.md`,
  `src/data/about.md`, `src/data/contact.js`, `src/data/routes.js`,
  `src/data/stats/personal.js`, `src/data/pageMeta.js`.
- `scripts/seed-cms-content.js` regenerates markdown FROM the JS files — only for
  recovery when a JS file is known to be ahead. Normal flow never needs it.

## Key File Locations

| Purpose | Path |
|---|---|
| Changelog | `src/data/changelog.md` |
| Page layout + Helmet | `src/layouts/Main.js` |
| App routes | `src/App.js` |
| CMS content (canonical) | `src/cms-content/` |
| Generated data files | `src/data/` |
| CMS config (collections) | `public/cms/config.yml` |
| Markdown → JS sync | `scripts/sync-cms-to-data.js` |
| Static HTML (favicons) | `public/index.html` |
| Per-route meta (single source) | `src/data/pageMeta.js` (consumed by `Main.js` + middleware) |
| Social-share meta tags | `functions/_middleware.js` (Cloudflare Pages Function) |
| Page components | `src/pages/` |
| Reusable components | `src/components/` |

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

### Image Compression (Required Before Adding Any Images)

Before placing any image in `public/images/sports/` or `public/images/treks/`, compress it to keep page load fast.

**Option A — `sharp-cli` (Node.js, recommended):**
```bash
npx sharp-cli --input path/to/image.jpg --output public/images/sports/ --format jpeg --quality 80
```

**Option B — ImageMagick:**
```bash
convert input.jpg -auto-orient -strip -quality 80 -resize "1200x>" public/images/sports/output.jpg
```

**Option C — convert HEIC → JPEG first (iPhone photos):**
```bash
convert input.heic -auto-orient -strip -quality 80 -resize "1200x>" public/images/sports/output.jpeg
```

**Target guidelines:**
- Max width: 1200px (landscape), 900px (portrait)
- Quality: 75–85%
- Target file size: ≤150 KB per image; **hard cap 300 KB** (mobile-network audience)
- Preferred format: `.jpeg` or `.jpg` — **never** `.heic` (does not render in Chrome/Firefox) and avoid `.png` for photos
- Use lowercase file extensions — hosting is case-sensitive

---

### Now Page

**Data files:** `src/cms-content/now/months/*.md` (one file per month) and
`src/cms-content/now/meta.md` (intro, rituals). The `/now` page reads these
markdown files directly at runtime — there is no generated JS file.

When pushing a new month's update:

1. Create `src/cms-content/now/months/YYYY-Month.md` (e.g. `2026-June.md`) with
   frontmatter: `month`, `year`, `isCurrent: true`, and any of the section keys
   `blogs`, `running`, `books`, `events`, `projects`, `website`, `stats`,
   `certificates`, `misc` (see existing month files for the field shapes).
2. Set `isCurrent: false` in the previous month's file.
3. All older month files remain unchanged — the page sorts and archives them automatically.

**Questions to ask before editing:**
- "What month and year is this update for? (e.g., May, 2026)"
- "What are the bullet-point activities for this month?"

---

### Books Page

**Data files:** `src/cms-content/books/*.md` (canonical) → generates `src/data/books.js`

Ask the user these questions to collect all required fields:

1. `title` — "What is the full title of the book?"
2. `author` — "Who is the author? (full name)"
3. `category` — "What category/genre? (comma-separated, e.g., Non-Fiction, Technology)"
4. `language` — "Is the book in English or Marathi?"
5. `translator` — "Is it a translated edition? If yes, who is the translator? (otherwise omit)"
6. `blog_link` — "Do you have a review link? Paste the URL, or skip."
7. `blog_platform` — "Which platform hosts the review? (Blogger, Canva, WordPress, Substack, Medium — or skip)"
8. `description` — "Write a 2–4 sentence description of the book."
9. `year` — "What year did you read this book?"
10. `tags` — "List relevant tags (comma-separated, e.g., Technology, Non-Fiction, History)"

**Mechanical steps:**
- `id` = highest existing `id` in `src/cms-content/books/` + 1 (ids must be unique)
- Create `src/cms-content/books/{id}-{slugified-title}.md` with the fields as YAML frontmatter (omit empty optional fields entirely; see existing files)
- Run `npm run cms:sync` and commit both the markdown and `src/data/books.js`
- No images needed

---

### Sports Page

**Data files:** `src/cms-content/sports/*.md` (canonical) → generates `src/data/sports.js`
**Image directory:** `public/images/sports/`

Ask the user these questions:

1. `title` — "What is the name of the marathon or race?"
2. `date` — "What was the race date? (format: Month DD, YYYY — e.g., February 22, 2026)"
3. `description` — "Short personal note about the race (1–2 sentences)."
4. `place` — "Where was the race? (e.g., NDA, Pune)"
5. `distance` — "What was the distance? Choose from: `5K`, `10K`, `21K`, `21 Kms`, `35 Kms`, `42 Kms`, `50 Kms`"
6. `time` — "What was your finishing time? (format: HH:MM:SS — e.g., 01:26:40)"
7. `timeCertificateLink` — "URL to your timing certificate or results page."
8. `bibNumber` — "What was your bib number?"
9. Images — "How many photos do you have? Please share them." (compress before adding — see Image Compression above)

**Image naming convention:**
- Format: `[event-abbreviation]_[YYYY]_[N].jpeg`
- Example: `tum_2026_1.jpeg`, `tum_2026_2.jpeg`
- Place in: `public/images/sports/`

**Mechanical steps:**
- `id` = highest existing `id` in `src/cms-content/sports/` + 1
- Create `src/cms-content/sports/{id}-{slugified-title}.md` with the fields as YAML frontmatter
- `slideImages` is a YAML list of `{ url: /images/sports/[filename], caption: "Slide N" }` (plain paths — the sync script adds the `PUBLIC_URL` prefix)
- Run `npm run cms:sync` and commit both the markdown and `src/data/sports.js`

---

### Treks Page

**Data files:** `src/cms-content/treks/*.md` (canonical) → generates `src/data/treks.js`
**Image directory:** `public/images/treks/`

Ask the user these questions:

1. `fort_name` — "What is the name of the fort or trek location?"
2. `trek_time` — "How long was the trek? (e.g., 2 Hrs, 22 Hours)"
3. `endurance_level` — "What is the difficulty level? Choose from: `Easy`, `Medium`, `Hard`"
4. `date` — "What was the trek date? (format: DD-MM-YYYY — e.g., 17-02-2019)"
5. `blog_link` — "Do you have a blog post about this trek? Paste the URL, or leave blank."
6. Images — "How many photos do you have? Please share them." (compress before adding — see Image Compression above)

**Image naming convention:**
- Format: `[fort-name-lowercase-underscores]_[N].jpg`
- Example: `tikona_1.jpg`, `panhala_pawankhind_1.jpg`
- Place in: `public/images/treks/`

**Mechanical steps:**
- `id` = highest existing `id` in `src/cms-content/treks/` + 1
- Create `src/cms-content/treks/{id}-{slugified-fort-name}.md` with the fields as YAML frontmatter
- `slideImages` is a YAML list of `{ url: /images/treks/[filename], caption: "Slide N" }`
- Include `blog_link` only if the user provided one — omit the key entirely otherwise
- Run `npm run cms:sync` and commit both the markdown and `src/data/treks.js`

---

### 100 Days To Offload

**Data files:** `src/cms-content/100days/*.md` (canonical) → generates `src/data/100DaysToOffload.js`

- `id` = highest existing `id` + 1; filename `YYYY-MM-DD-{slugified-title}.md`
- Frontmatter fields: `id`, `blog_title`, `blog_description`, `blog_link`,
  `blog_platform` (Substack/Medium/Ghost/WordPress/Other), `blog_date`
  (YYYY-MM-DD), `language` (English/Marathi), `blog_tags` (list),
  `challenge_id: 100_days_to_offload`
- Run `npm run cms:sync` and commit both files
