# Features Documentation

Comprehensive overview of all features across the personal portfolio site.

**Version:** 6.4.x  
**Last Updated:** April 2026

---

## Global Features

### Navigation System
**Location:** Header (Desktop) / Hamburger drawer (Mobile)

- Active route highlighting
- "More" dropdown for secondary routes (Projects, Instagram, Contact)
- Challenges dropdown with sub-route link (100 Days To Offload)
- Mobile hamburger: sliding drawer with full route tree

**Routes:**
| Route | Page |
|---|---|
| `/` | Home |
| `/about` | About |
| `/now` | Now |
| `/challenges` → `/100-days-to-offload` | Challenges |
| `/books` | Digital Library |
| `/sports` | Sports Log |
| `/treks` | Treks Log |
| `/instagram` | Instagram Gallery |
| `/resume` | Resume |
| `/stats` | Stats |
| `/changelog` | Changelog |
| `/contact` | Contact |
| `/admin` | Admin CMS (auth-gated) |

### Dark Mode
A floating toggle (bottom-right corner) switches between light and dark themes site-wide. State is persisted via `ThemeContext`.

### Responsive Design
Mobile-first layouts with Tailwind CSS breakpoints. Navigation collapses to hamburger drawer on mobile. All pages are readable and functional at any viewport width.

### Performance
- All route components are lazy-loaded via `React.lazy` + `Suspense`
- Code splitting per route
- Images use `object-cover` with aspect-ratio containers to avoid layout shift

### SEO / Head Management
`react-helmet-async` sets per-page `<title>`, `<meta description>`, and Open Graph tags. OG image and base tags are set in `public/index.html`.

---

## Pages

### Home (`/`)
Landing page linking out to all major sections. Features a `LifeStats` component that displays aggregate personal metrics (age, books read, races run, etc.).

### About (`/about`)
Markdown-rendered personal biography sourced from `src/data/about.md`.

### Now (`/now`)
Monthly activity log. Data comes from Decap CMS markdown files (`src/cms-content/now/`) parsed at runtime by `parseNowCms.js`.

**Features:**
- Hero section with last-updated date
- Daily Rituals cards (from CMS `meta.md`)
- Tabbed monthly entries — one tab per month
- Subsections per month: Blogs, Running, Books, Events, Projects, Stats, Website, Certificates, Misc
- Current month is automatically highlighted

### Books (`/books`)
Digital library of 44+ books read since 2019, sourced from `src/data/books.js`.

**Features:**
- Featured book hero with random-shuffle (books with reviews)
- Quick stats: total books, Marathi count, reviews written
- Search across title + author
- Filter by tag, language, review status
- Clear-filters button
- Book detail modal with metadata and blog links

### Sports (`/sports`)
Marathon and race log of 20+ events since 2023, sourced from `src/data/sports.js`.

**Tabs:**
1. **Statistics** — Distance breakdown, PR bars, cumulative metrics, top summary cards
2. **Interactive** — Filter/sort table view of all races
3. **Cards** — Default card grid with image sliders and cert links

### Treks (`/treks`)
Fort and trail trek log of 15 treks since 2019, sourced from `src/data/treks.js`.

**Tabs:**
1. **Statistics** — Difficulty distribution, yearly timeline, total hours
2. **Cards** — Filterable card grid (difficulty, year, blog presence); detail modal with image slider

### Instagram (`/instagram`)
Archived Instagram posts displayed as a card gallery with image sliders, sourced from `src/data/instagram.js`.

### Resume (`/resume`)
Professional resume sourced from four files in `src/data/resume/`:
- Work experience (positions.js)
- Education (degrees.js)
- Skills with competency levels (skills.js)
- Certifications (certifications.js)

Also links to a downloadable PDF (`public/sanket-tambare-resume.pdf`).

### Projects (`/projects`)
Portfolio project gallery sourced from `src/data/projects.js`. Cards include screenshot, description, tech stack, and live/GitHub links.

### Challenges (`/challenges`)
Hub page explaining the personal challenges initiative. Links out to active challenges.

### 100 Days To Offload (`/100-days-to-offload`)
Blog challenge tracker sourced from `src/data/100DaysToOffload.js`. Lists all posts with title, date, platform, tags, and direct links.

### Stats (`/stats`)
Aggregate stats dashboard pulling from multiple data files (sports, treks, books, resume, etc.) to display life-level metrics.

### Changelog (`/changelog`)
Markdown-rendered version history sourced from `src/data/changelog.md`. Displays the full release history of the site.

### Contact (`/contact`)
Social links and email contact, sourced from `src/data/contact.js`.

### Admin (`/admin`)
Password-protected (SHA-256 hash in `AuthGate`) local CMS panel. Provides form-based editors for all data types:

- Books, Sports, Treks, Instagram, Projects
- 100 Days To Offload posts
- Now page (meta + monthly entries)
- Resume: Positions, Skills, Degrees, Certifications

Each editor persists drafts to `localStorage` and exports ready-to-paste JS code. Editors do **not** write to disk directly — the export is copy-pasted into the source file and committed.

---

## Technical Notes

### Data Storage
All content is stored as static JS arrays/objects in `src/data/` except the Now page, which uses Decap CMS markdown files in `src/cms-content/now/`. All image arrays use the `slideImages` field name consistently across Sports, Treks, and Instagram.

### Styling
Tailwind CSS is the primary styling system. Supplementary SCSS lives in `src/static/css/`. Component styles use Tailwind utility classes inline; base typography and resets are in SCSS.

### Deployment
Hosted on Cloudflare Pages. Pushes to `main` trigger automatic builds (`npm run build`, output: `build/`). See `docs/deployment.md` for full details.
