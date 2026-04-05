# CLAUDE.md — Personal Site

## Project Overview

React 18 single-page application (personal portfolio). Key stack:
- **React 18** with `react-router-dom` v6 for routing
- **react-helmet-async** for per-page `<head>` metadata
- **Tailwind CSS** for styling
- **Deployed on Cloudflare Pages** — build command is `npm run build` (`react-scripts build`). The `react-snap` pre-rendering step is only used for local/gh-pages deploy via `npm run predeploy`, not on Cloudflare.

## Key File Locations

| Purpose | Path |
|---|---|
| Changelog | `src/data/changelog.md` |
| Page layout + Helmet | `src/layouts/Main.js` |
| App routes | `src/App.js` |
| Data files | `src/data/` |
| Static HTML (OG tags, favicons) | `public/index.html` |
| Page components | `src/pages/` |
| Reusable components | `src/components/` |

## Changelog Rule

**Always update `src/data/changelog.md` when making any code change.**

- Add the entry to the **top** of the file, under a new version header if the current date differs from the latest entry, or append to the existing version block if the date matches.
- Choose the version bump:
  - **Patch** (e.g. `v5.1.0` → `v5.1.1`): bug fixes, copy/style tweaks, metadata changes
  - **Minor** (e.g. `v5.1.0` → `v5.2.0`): new features, new pages, new components
  - **Major** (e.g. `v5.1.0` → `v6.0.0`): full redesigns, breaking structural changes

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
convert input.jpg -quality 80 -resize "1200x>" public/images/sports/output.jpg
```

**Option C — convert HEIC → JPEG first (iPhone photos):**
```bash
convert input.heic -quality 80 public/images/sports/output.jpeg
```

**Target guidelines:**
- Max width: 1200px (landscape), 900px (portrait)
- Quality: 75–85%
- Target file size: < 300 KB per image
- Preferred format: `.jpeg` or `.jpg` — avoid `.heic` or `.png` for photos

---

### Now Page

**Data file:** `src/data/now.md`

When pushing a new month's update, rotate sections in this order:

1. Update the `Last updated on \`date\`` line in the intro.
2. The current `## What am I up to this month (OldMonth, YYYY)` heading becomes `## What was I doing last month (OldMonth, YYYY)`.
3. The current `## What was I doing last month (PrevMonth, YYYY)` heading becomes `## PrevMonth YYYY` (archive style — just month + year, no prefix).
4. Add a new `## What am I up to this month (NewMonth, YYYY)` section at the top (after the intro) with the new content.
5. All older archive months remain unchanged below.

**Questions to ask before editing:**
- "What month and year is this update for? (e.g., May, 2026)"
- "What are the bullet-point activities for this month?"

---

### Books Page

**Data file:** `src/data/books.js`

Ask the user these questions to collect all required fields, then append a new object to the bottom of the array:

1. `title` — "What is the full title of the book?"
2. `author` — "Who is the author? (full name)"
3. `category` — "What category/genre? (comma-separated, e.g., Non-Fiction, Technology)"
4. `language` — "Is the book in English or Marathi?"
5. `translator` — "Is it a translated edition? If yes, who is the translator? (otherwise `null`)"
6. `blog_link` — "Do you have a review link? Paste the URL, or say `null`."
7. `blog_platform` — "Which platform hosts the review? (Blogger, Canva, WordPress, or `null`)"
8. `description` — "Write a 2–4 sentence description of the book."
9. `year` — "What year did you read this book?"
10. `tags` — "List relevant tags (comma-separated, e.g., Technology, Non-Fiction, History)"

**Mechanical steps:**
- `id` = last `id` in the array + 1
- Append the new object at the bottom of the array in `books.js`
- No images needed

---

### Sports Page

**Data file:** `src/data/sports.js`  
**Image directory:** `public/images/sports/`

Ask the user these questions, then append a new object to the bottom of the array:

1. `title` — "What is the name of the marathon or race?"
2. `date` — "What was the race date? (format: Month DD, YYYY — e.g., February 22, 2026)"
3. `description` — "Short personal note about the race (1–2 sentences)."
4. `place` — "Where was the race? (e.g., NDA, Pune)"
5. `distance` — "What was the distance? Choose from: `10K`, `21K`, `21 Kms`, `35 Kms`, `42 Kms`, `50 Kms`"
6. `time` — "What was your finishing time? (format: HH:MM:SS — e.g., 01:26:40)"
7. `timeCertificateLink` — "URL to your timing certificate or results page."
8. `bibNumber` — "What was your bib number?"
9. Images — "How many photos do you have? Please share them." (compress before adding — see Image Compression above)

**Image naming convention:**
- Format: `[event-abbreviation]_[YYYY]_[N].jpeg`
- Example: `tum_2026_1.jpeg`, `tum_2026_2.jpeg`
- Place in: `public/images/sports/`

**Mechanical steps:**
- `id` = last `id` in the array + 1
- Build `slideImages` array with one entry per photo; captions are `"Slide 1"`, `"Slide 2"`, etc.
- Path template: `` { url: `${process.env.PUBLIC_URL}/images/sports/[filename]`, caption: "Slide N" } ``
- Append the new object at the bottom of the array in `sports.js`

---

### Treks Page

**Data file:** `src/data/treks.js`  
**Image directory:** `public/images/treks/`

Ask the user these questions, then append a new object to the bottom of the array:

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
- `id` = last `id` in the array + 1
- Build `photos` array with one entry per photo; captions are `"Slide 1"`, `"Slide 2"`, etc.
- Path template: `` { url: `${process.env.PUBLIC_URL}/images/treks/[filename]`, caption: "Slide N" } ``
- Include `blog_link` only if the user provided one — omit the key entirely otherwise
- Append the new object at the bottom of the array in `treks.js`
