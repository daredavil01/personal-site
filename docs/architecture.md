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
│   ├── cms-content/            # CANONICAL content store (Decap CMS markdown)
│   │   ├── now/                # Now page (read at runtime by parseNowCms.js)
│   │   │   ├── meta.md         # Daily rituals, site meta
│   │   │   └── months/         # One .md file per month
│   │   ├── books/, sports/, treks/, projects/, instagram/, 100days/
│   │   └── resume/             # positions/, degrees/, skills/, certifications/
│   ├── components/
│   │   ├── Template/           # Layout chrome (Navigation, SideBar, Hamburger, Footer, etc.)
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
│   ├── data/                   # GENERATED from cms-content (do not edit by hand)
│   │   ├── treks.js, sports.js, books.js, instagram.js,
│   │   ├── 100DaysToOffload.js, projects.js, resume/*.js
│   │   ├── contact.js          # Hand-maintained: social links
│   │   ├── routes.js           # Hand-maintained: navigation route config
│   │   ├── about.md            # Personal bio (markdown)
│   │   ├── changelog.md        # Versioned changelog (markdown)
│   │   └── resume/
│   │       ├── positions.js
│   │       ├── skills.js
│   │       ├── degrees.js
│   │       └── certifications.js
│   ├── layouts/
│   │   └── Main.js             # Standard page wrapper (Helmet + Navigation + Footer)
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
│   │   ├── InteractiveMe.js    # Shuffled image timeline (sports + treks)
│   │   ├── MindMap.js          # Interactive radial SVG mind map
│   │   └── NotFound.js
│   ├── static/
│   │   └── css/                # SCSS (supplementary to Tailwind)
│   └── utils/
│       └── parseNowCms.js      # Async parser: reads CMS markdown → structured Now data
├── docs/                       # Project documentation
├── scripts/
│   ├── sync-cms-to-data.js     # One-way sync: cms-content markdown → src/data/*.js
│   └── seed-cms-content.js     # Recovery tool: regenerates markdown FROM JS files
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
| `/interactive-me` | InteractiveMe |
| `/mindmap` | MindMap |
| `*` | NotFound |

---

## Data Layer

### Generated JS data files (`src/data/`)

All content pages (Sports, Treks, Books, Resume, Projects, Instagram, Challenges) import static JS arrays/objects. These files are **generated** from `src/cms-content/` markdown by `npm run cms:sync` (run automatically by the `prebuild` hook and verified by CI). Content is updated by editing markdown — via Decap CMS at `/cms/` or directly — never by editing the JS files.

**Image arrays** in sports, treks, and instagram all use the `slideImages` field:
```js
slideImages: [
  { url: `${process.env.PUBLIC_URL}/images/treks/fort_1.jpg`, caption: "Slide 1" },
]
```

### Runtime-loaded Now page (`src/cms-content/now/`)

The Now page (`/now`) reads its markdown directly at runtime — there is no generated JS file for it:
- `src/cms-content/now/meta.md` — daily rituals and site meta
- `src/cms-content/now/months/*.md` — one file per month

`src/utils/parseNowCms.js` reads these files asynchronously at runtime and converts them to the structured format consumed by `NowDocument` and its subsection components.

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
