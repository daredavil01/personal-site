# Project Architecture

## Stack

| Layer | Technology |
|---|---|
| UI | React 18 (functional components + hooks) |
| Routing | react-router-dom v6 (lazy-loaded routes) |
| Styling | Tailwind CSS (primary) + SCSS (`src/static/css/`) |
| Head/SEO | react-helmet-async |
| Icons | FontAwesome (brands, regular, solid SVG) |
| Image slider | react-slideshow-image |
| Markdown | markdown-to-jsx |
| Dates | dayjs |
| CMS | Decap CMS (git-based, no backend) |
| Hosting | Cloudflare Pages |

---

## Directory Structure

```
personal-site/
├── public/
│   ├── index.html              # Static shell (OG tags, favicons)
│   ├── cms/                    # Decap CMS UI + config
│   │   ├── index.html
│   │   └── config.yml          # CMS collection definitions
│   └── images/
│       ├── sports/             # Race photos (named: abbrev_YYYY_N.jpeg)
│       ├── treks/              # Fort trek photos (named: fort_name_N.jpg)
│       ├── insta_posts/        # Instagram gallery images
│       └── projects/           # Project screenshots
├── src/
│   ├── App.js                  # Route definitions (all lazy-loaded)
│   ├── index.js                # React bootstrap (ThemeProvider + HelmetProvider)
│   ├── cms-content/
│   │   └── now/                # Decap CMS markdown files (primary Now data source)
│   │       ├── meta.md         # Daily rituals, site meta
│   │       └── months/         # One .md file per month
│   ├── components/
│   │   ├── Template/           # Layout chrome (Navigation, SideBar, Hamburger, Footer, etc.)
│   │   ├── Admin/              # CMS admin panel components
│   │   │   ├── Editors/        # One editor per data type (lazy-loaded)
│   │   │   └── utils/
│   │   ├── Books/
│   │   ├── Challenges/
│   │   ├── Contact/
│   │   ├── Index/
│   │   ├── Instagram/
│   │   ├── Now/                # 12 subsection components (blogs, books, running, etc.)
│   │   ├── Projects/
│   │   ├── Resume/
│   │   ├── Sports/
│   │   └── Treks/
│   ├── context/
│   │   └── ThemeContext.js     # Dark/light mode state
│   ├── data/
│   │   ├── treks.js            # 15 fort trek entries
│   │   ├── sports.js           # 20 marathon/race entries
│   │   ├── books.js            # 44 book entries
│   │   ├── instagram.js        # Instagram post entries
│   │   ├── 100DaysToOffload.js # Blog challenge post log
│   │   ├── projects.js         # Portfolio project entries
│   │   ├── contact.js          # Social links for footer/sidebar
│   │   ├── now-data.js         # Fallback/seed data for the Now CMS editor
│   │   ├── routes.js           # Navigation route config
│   │   ├── about.md            # Personal bio (markdown)
│   │   ├── changelog.md        # Versioned changelog (markdown)
│   │   └── resume/
│   │       ├── positions.js
│   │       ├── skills.js
│   │       ├── degrees.js
│   │       └── certifications.js
│   ├── hooks/
│   │   ├── useCMSStatus.js     # CMS connectivity check
│   │   ├── useDraftStore.js    # localStorage draft persistence for admin editors
│   │   └── useExportGenerator.js
│   ├── layouts/
│   │   ├── Main.js             # Standard page wrapper (Helmet + Navigation + Footer)
│   │   └── AdminLayout.js      # Admin panel layout
│   ├── pages/
│   │   ├── Index.js, About.js, Resume.js, Contact.js, Projects.js
│   │   ├── Stats.js            # Aggregate life stats
│   │   ├── Books.js            # Digital library with filters
│   │   ├── Sports.js           # Marathon log (tabbed: Statistics / Interactive / Cards)
│   │   ├── Treks.js            # Fort trek log (tabbed: Statistics / Cards)
│   │   ├── Instagram.js        # Archived Instagram gallery
│   │   ├── Now.js              # Monthly activity log (CMS-backed)
│   │   ├── Challenges.js       # Challenges hub
│   │   ├── OneHundredDays.js   # 100 Days To Offload tracker
│   │   ├── Changelog.js        # Markdown-rendered changelog
│   │   ├── Admin.js            # CMS admin dashboard (auth-gated)
│   │   └── NotFound.js
│   ├── static/
│   │   └── css/                # SCSS (supplementary to Tailwind)
│   └── utils/
│       └── parseNowCms.js      # Async parser: reads CMS markdown → structured Now data
├── docs/                       # Project documentation
├── scripts/
│   ├── sync-cms-to-data.js     # Bi-directional CMS ↔ JS data sync
│   └── seed-cms-content.js     # Seeds CMS markdown from now-data.js
└── package.json
```

---

## Routing

All routes are lazy-loaded via `React.lazy` + `Suspense` in `App.js`:

| Route | Page |
|---|---|
| `/` | Index |
| `/about` | About |
| `/resume` | Resume |
| `/projects` | Projects |
| `/stats` | Stats |
| `/contact` | Contact |
| `/books` | Books |
| `/sports` | Sports |
| `/treks` | Treks |
| `/instagram` | Instagram |
| `/now` | Now |
| `/challenges` | Challenges |
| `/100-days-to-offload` | OneHundredDays |
| `/changelog` | Changelog |
| `/admin` | Admin (auth-gated) |
| `*` | NotFound |

---

## Data Layer

### Static JS data files (`src/data/`)

All content pages (Sports, Treks, Books, Resume, Projects, Instagram, Challenges) import directly from static JS arrays/objects. No API calls. Data is updated by editing the files and committing.

**Image arrays** in sports, treks, and instagram all use the `slideImages` field:
```js
slideImages: [
  { url: `${process.env.PUBLIC_URL}/images/treks/fort_1.jpg`, caption: "Slide 1" },
]
```

### CMS-backed Now page (`src/cms-content/now/`)

The Now page (`/now`) is the only data source backed by Decap CMS. Data lives in:
- `src/cms-content/now/meta.md` — daily rituals and site meta
- `src/cms-content/now/months/*.md` — one file per month

`src/utils/parseNowCms.js` reads these files asynchronously at runtime and converts them to the structured format consumed by `NowDocument` and its subsection components.

`src/data/now-data.js` provides fallback/seed data used by the Admin CMS editor when CMS files aren't available locally.

### Admin panel (`/admin`)

Password-protected (SHA-256 hash) local admin UI for editing all data types. Each editor:
1. Loads the current data file as initial state
2. Persists drafts to `localStorage` via `useDraftStore`
3. Exports ready-to-paste JS code via `ExportPanel`

The admin panel does **not** write files directly — it generates code to copy-paste into the data files and commit.

---

## Styling

Tailwind CSS is the primary styling system. SCSS in `src/static/css/` provides supplementary base styles, typography variables, and component-level overrides that are difficult to express in Tailwind alone.

Dark mode is managed via `ThemeContext` and toggled by `FloatingToggle` (bottom-right corner on all pages). The `dark:` Tailwind variant is used throughout.

---

## Known Data Inconsistencies (Planned Future Work)

| Inconsistency | Files | Status |
|---|---|---|
| Date formats: Treks use `DD-MM-YYYY`, Sports use `"Month D, YYYY"` | `treks.js`, `sports.js` | Deferred |
| Distance units inconsistent in Sports: `"10K"` vs `"21 Kms"` | `sports.js` | Deferred |
| Books `category` is a comma-separated string; `tags` is an array | `books.js` | Deferred |
