# Project Architecture

## Stack

| Layer | Technology |
|---|---|
| UI | React 18 (functional components + hooks) |
| Routing | react-router-dom v6 (lazy-loaded routes) |
| Styling | Tailwind CSS (primary) + SCSS (`src/static/css/`) |
| Head/SEO | react-helmet-async |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Icons | FontAwesome (brands, regular, solid SVG) |
| Image slider | react-slideshow-image |
| Markdown | markdown-to-jsx |
| Dates | dayjs |
| Hosting | Cloudflare Pages |

---

## Directory Structure

```
personal-site/
├── index.html                  # Static shell (OG tags, favicons)
├── public/
│   └── images/
│       ├── favicon/            # Favicons referenced in index.html
│       ├── me.jpg              # Profile photo (sidebar + OG)
│       ├── logo.png            # OG/Twitter card image
│       └── logo.svg            # Nav logo mark
├── src/
│   ├── App.js                  # Route definitions (all lazy-loaded)
│   ├── index.js                # React bootstrap (ThemeProvider + HelmetProvider)
│   ├── components/
│   │   ├── Template/           # Layout chrome (Navigation, SideBar, Hamburger, Footer)
│   │   ├── Books/
│   │   ├── Challenges/
│   │   ├── Contact/
│   │   ├── Index/
│   │   ├── Instagram/
│   │   ├── Now/                # Subsection components (blogs, books, running, etc.)
│   │   ├── Projects/
│   │   ├── Resume/
│   │   ├── Sports/
│   │   └── Treks/
│   ├── context/
│   │   ├── ThemeContext.js     # Dark/light mode state
│   │   └── ContentContext.js   # Shared data-fetching context (all collections)
│   ├── data/                   # Hand-maintained static config (not generated)
│   │   ├── contact.js          # Social links
│   │   ├── routes.js           # Navigation route config
│   │   ├── about.md            # Personal bio (markdown)
│   │   ├── changelog.md        # Versioned changelog
│   │   ├── pageMeta.js         # Per-route OG/Twitter metadata
│   │   └── stats/
│   │       └── personal.js     # Hand-curated personal stats
│   ├── layouts/
│   │   └── Main.js             # Standard page wrapper (Helmet + Navigation + Footer)
│   ├── lib/
│   │   ├── supabaseClient.js   # Supabase client + toStorageUrl / toStorageImages helpers
│   │   └── api/                # Per-entity fetchers (snake_case → camelCase mapping)
│   │       ├── books.js
│   │       ├── sports.js
│   │       ├── treks.js
│   │       ├── projects.js
│   │       ├── instagram.js
│   │       ├── blogs.js
│   │       ├── resume.js
│   │       └── now.js
│   ├── hooks/                  # useBooks, useSports, useTreks, useProjects, etc.
│   ├── pages/
│   │   ├── Index.js, About.js, Resume.js, Contact.js, Projects.js
│   │   ├── Stats.js            # Aggregate life stats
│   │   ├── Books.js            # Digital library with filters
│   │   ├── Sports.js           # Marathon log (tabbed: Statistics / Interactive / Cards)
│   │   ├── Treks.js            # Fort trek log (tabbed: Statistics / Cards)
│   │   ├── Instagram.js        # Archived Instagram gallery
│   │   ├── Now.js              # Monthly activity log (Supabase-backed)
│   │   ├── Challenges.js       # Challenges hub
│   │   ├── OneHundredDays.js   # 100 Days To Offload tracker
│   │   ├── Changelog.js        # Markdown-rendered changelog
│   │   ├── InteractiveMe.js    # Shuffled image timeline (sports + treks)
│   │   ├── MindMap.js          # Interactive radial SVG mind map
│   │   ├── NotFound.js
│   │   └── admin/              # Protected admin CRUD editor
│   ├── static/
│   │   └── css/                # SCSS (supplementary to Tailwind)
│   └── utils/
├── functions/
│   └── _middleware.js          # Cloudflare Pages Function: injects route-level OG meta
├── supabase/
│   └── migrations/             # SQL schema + RLS policies
├── scripts/
│   ├── import-to-supabase.mjs  # One-time seed: imports data into Supabase (service-role)
│   └── upload-images-to-supabase.mjs  # One-time bulk image upload to Storage media bucket
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
| `/admin/*` | Admin (protected) |
| `*` | NotFound |

---

## Data Layer

### Supabase (canonical content store)

All dynamic content lives in Supabase Postgres. The browser fetches live data on every page visit via `@supabase/supabase-js` using the publishable key. Row-Level Security (RLS) is enabled on every table:

- `SELECT` is open to `anon` + `authenticated` (public reads).
- `INSERT / UPDATE / DELETE` require the owner `auth.uid()` (admin only).

Tables: `books`, `sports`, `treks`, `projects`, `instagram`, `blogs` (100 Days), `resume_positions`, `resume_degrees`, `resume_certifications`, `resume_skills`, `now_meta`, `now_months`.

### Data-access layer (`src/lib/api/*.js`)

Each fetcher maps Postgres `snake_case` columns → the camelCase shape presentational components expect. Image paths stored in the DB as `/images/…` are resolved to full Supabase Storage CDN URLs via `toStorageUrl()` / `toStorageImages()` in `src/lib/supabaseClient.js`.

### Hooks (`src/hooks/`)

`useBooks`, `useSports`, `useTreks`, `useProjects`, `useInstagram`, `useBlogs`, `useResume`, `useNow` — each returns `{ data, loading, error }`. Shared via `ContentContext` so multiple components on the same page don't fire duplicate requests.

### Hand-maintained static files (`src/data/`)

These are **not** fetched from Supabase and are edited directly:

| File | Purpose |
|---|---|
| `contact.js` | Social/contact links |
| `routes.js` | Navigation route config |
| `about.md` | Personal bio (markdown) |
| `changelog.md` | Versioned changelog |
| `pageMeta.js` | Per-route OG/Twitter metadata consumed by `Main.js` and `functions/_middleware.js` |
| `stats/personal.js` | Hand-curated personal stats |

---

## Images / Storage

All sport, trek, Instagram, and project images are stored in the Supabase `media` Storage bucket (public). The DB stores relative paths (`/images/sports/foo.jpg`); `toStorageUrl()` prepends the bucket base URL at read time. Static assets that remain in `public/images/` are limited to favicons, `me.jpg`, `logo.png`, and `logo.svg`.

---

## Styling

Tailwind CSS is the primary styling system. SCSS in `src/static/css/` provides supplementary base styles, typography variables, and component-level overrides. Dark mode is managed via `ThemeContext` and toggled by `FloatingToggle`.

---

## Social-Share Meta

`functions/_middleware.js` (Cloudflare Pages Function) runs server-side on every request and injects per-route `og:*` / `twitter:*` tags from `src/data/pageMeta.js`, ensuring social crawlers see correct metadata without a server-rendered React pass.
