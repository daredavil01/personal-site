# Supabase Backend Migration Plan

> **Author decisions captured:** live runtime fetch · custom `/admin` editor ·
> email+password auth · single repository.

## Implementation status (branch `feat/supabase-backend`)

**Done in code (lint + build + tests green; runtime-verified to degrade gracefully without env):**
- SQL schema, RLS, triggers, storage bucket — `supabase/migrations/0001_initial_schema.sql`
- `@supabase/supabase-js`, client, env wiring — `src/lib/supabaseClient.js`, `.env.example`
- Data-access layer + content provider/hooks — `src/lib/api/*`, `src/context/ContentContext.js`, `src/hooks/useCollection.js`
- One-time import script — `scripts/import-to-supabase.mjs` (`npm run data:import`)
- Live fetch on the primary content pages — Books, Projects, Resume, Now, 100-days, Instagram, Sports (+children), Treks (+children)
- Protected `/admin` editor with CRUD + image upload — `src/pages/admin/*`

**Remaining before merge / cleanup:**
1. **Provision Supabase** ✅ (done by owner): project created, migration run, owner user created, `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set. Images uploaded to `media` bucket via `npm run images:upload`.
2. **Run one-time import** — `npm run data:import` (requires running the SQL migration first in the Supabase SQL editor).
3. **Verify end-to-end** against the live project (pages load real data; admin CRUD round-trips; anon write rejected by RLS).
4. **Cleanup phase** (only after 2–3): remove `public/cms/`, `src/cms-content/`, generated `src/data/*.js`, the `cms:sync`/`prebuild`/`cms:seed` scripts and the CI drift gate; update `CLAUDE.md`.

The remainder of this document is the original design/reference.

---

## 1. Context & Goal

Today the site is fully static:

```
src/cms-content/**/*.md   (canonical markdown, edited via Decap CMS / GitHub)
        │  npm run cms:sync  (scripts/sync-cms-to-data.js)
        ▼
src/data/*.js             (generated JS modules, committed to git)
        │  static import
        ▼
React pages  →  vite build  →  Cloudflare Pages (static)
```

There is **no database, no API, and no user-facing auth.** Editing requires a
GitHub commit + a rebuild before content goes live.

**Goal:** move dynamic content — books, treks, marathons (sports), projects,
blogs (100-days), instagram, resume, and the now-page — into a **Supabase**
(Postgres) backend that the owner edits through an in-app admin UI, with changes
appearing **live, with no rebuild**.

> "User data" here means the **site owner's content**, not visitor-generated data
> (no comments/likes/accounts for visitors). The site stays read-only for the public.

---

## 2. Repository Recommendation — Same Repo (do **not** create a separate backend)

**Recommendation: keep everything in this single repository.**

Supabase *is* the backend. It is a managed service providing Postgres + Auth +
Storage + an auto-generated REST/Realtime API + Row-Level Security (RLS). There is
no Node/Express server to write or host, so there is nothing to put in a second repo.

| Concern | Same repo (recommended) | Separate backend repo |
|---|---|---|
| Server code to maintain | None — Supabase hosts it | Would invent a server that isn't needed |
| Deploy units | One (Cloudflare Pages) | Two to coordinate |
| Schema ↔ app drift | Migrations live beside the app | Easy to drift |
| Admin UI | A protected route in the same app | Cross-origin auth/CORS overhead |
| When it would make sense | — | Heavy custom API, or one backend shared by many frontends (not our case) |

The browser talks to Supabase directly through `@supabase/supabase-js`; **RLS** is
what enforces "owner can write, everyone can read." Schema is versioned as SQL in
`supabase/migrations/` so the database and the app evolve together.

**Target repo layout (additions):**

```
supabase/
  migrations/            # versioned SQL (schema, RLS policies)
  seed.sql               # optional
scripts/
  import-to-supabase.js  # one-time: existing src/data/*.js + now markdown → Supabase
src/
  lib/
    supabaseClient.js    # configured client (anon key)
    api/
      books.js sports.js treks.js projects.js blogs.js
      instagram.js now.js resume.js
  hooks/
    useCollection.js     # loading/error/data hook
  pages/
    admin/               # protected editor (login + dashboard + per-type forms)
.env                     # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (gitignored)
.env.example             # documented placeholders (committed)
```

---

## 3. Architecture: Before → After

**Before** (static): markdown → `cms:sync` → `src/data/*.js` → static import → static CF Pages.

**After** (live CSR):

```
Supabase Postgres (canonical content)
        │  @supabase/supabase-js  (anon key, RLS-guarded)
        ▼
src/lib/api/*.js  →  useCollection() hook  (loading / error / data)
        ▼
React pages (client-side render)  →  Cloudflare Pages
```

**Unaffected infrastructure:** `functions/_middleware.js` injects social-share meta
tags using `src/data/pageMeta.js`, which is **per-route, not per-item**. It keeps
working with no changes — list pages have no per-item routes that would need
per-record meta.

---

## 4. Database Schema

Conventions: `public` schema, `bigint generated always as identity` primary keys,
`snake_case` columns, `created_at timestamptz default now()` and
`updated_at timestamptz default now()` on every table (with an `updated_at` trigger).
`slide_images` and now-page sections are stored as `jsonb` (simplest for CRUD and
live reads — no child tables to join).

| Table | Key columns | Nullable / notes |
|---|---|---|
| `books` | title, author, category, language, description, year `int`, tags `text[]` | translator, blog_link, blog_platform nullable |
| `sports` | title, date, description, place, distance, time, time_certificate_link, bib_number, `slide_images jsonb` | `[{url,caption}]` |
| `treks` | fort_name, trek_time, endurance_level, date, `slide_images jsonb` | blog_link nullable |
| `projects` | title, link, image, date, description, sort_order `int` | subtitle nullable |
| `blogs` | blog_title, blog_description, challenge_id, blog_tags `text[]`, blog_date, blog_link, blog_platform, language | (the 100-days collection) |
| `instagram` | title, caption, tags `text[]`, `slide_images jsonb` | |
| `now_meta` | intro_story, category_labels `text[]`, nownownow_url, `inspired_by jsonb`, `daily_rituals jsonb` | **single row** |
| `now_months` | month, year `int`, is_current `bool`, `sections jsonb` | sections = blogs/running/books/events/projects/website/stats/certificates/misc |
| `resume_positions` | company, position, link, daterange, `points jsonb` (text[]), sort_order | |
| `resume_degrees` | school, degree, link, year `int`, sort_order | |
| `resume_certifications` | name, link, source, issued_date, sort_order | |
| `resume_skills` | title, competency `int` (1–5), category `text[]`, sort_order | |

Out of scope (stay as hand-maintained files): `src/data/changelog.md`,
`src/data/about.md`, `src/data/contact.js`, `src/data/routes.js`,
`src/data/stats/personal.js`, `src/data/pageMeta.js`.

**Example migration (books):**

```sql
create table public.books (
  id              bigint generated always as identity primary key,
  title           text not null,
  author          text not null,
  category        text not null,
  language        text not null,
  description     text not null,
  year            int  not null,
  tags            text[] not null default '{}',
  translator      text,
  blog_link       text,
  blog_platform   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

---

## 5. Authentication & Row-Level Security

- **Supabase Auth, email + password.** Create one owner user (the site owner).
  Enable Supabase's leaked-password protection; turn off public sign-ups.
- **RLS enabled on every table.** Public read, owner-only writes:

```sql
alter table public.books enable row level security;

-- Anyone (anon + authenticated) may read — this is a public site.
create policy "public read books"
  on public.books for select
  using (true);

-- Only the owner may write. Replace with the owner's auth.uid().
create policy "owner write books"
  on public.books for all
  using (auth.uid() = '<OWNER_UID>')
  with check (auth.uid() = '<OWNER_UID>');
```

- The **anon key is safe to ship in the client** — RLS, not key secrecy, controls
  writes. Public reads are intentionally open.
- The **service-role key is never used in the browser.** It is used only by the
  one-time `scripts/import-to-supabase.js` (run locally) and stored in a local,
  gitignored `.env`.
- Storage bucket gets analogous policies: public read, authenticated write.

---

## 6. Data-Access Layer & Page Changes

**Client** — `src/lib/supabaseClient.js`:

```js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

**Per-entity fetchers** — `src/lib/api/*.js` map Postgres `snake_case` to the exact
shape each component already consumes, so the presentational components
(`DigitalLibrary`, `ProjectGallery`, `ImageSlider`, etc.) need **no changes**:

```js
// src/lib/api/sports.js
import { supabase } from "../supabaseClient";

export async function getSports() {
  const { data, error } = await supabase
    .from("sports").select("*").order("id");
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date,
    description: r.description,
    place: r.place,
    distance: r.distance,
    time: r.time,
    timeCertificateLink: r.time_certificate_link, // snake → camel
    bibNumber: r.bib_number,
    slideImages: r.slide_images,                  // [{url, caption}]
  }));
}
```

**Field-mapping highlights** (DB → component prop):

| DB column | Component prop |
|---|---|
| `slide_images` | `slideImages` |
| `time_certificate_link` | `timeCertificateLink` |
| `bib_number` | `bibNumber` |
| `fort_name` | `fort_name` (already snake in component) |
| `blog_*` (books/blogs) | unchanged (already snake) |

**Hook** — `src/hooks/useCollection.js` mirrors the existing runtime-fetch pattern in
[`src/pages/Now.js`](../src/pages/Now.js) + [`src/utils/parseNowCms.js`](../src/utils/parseNowCms.js),
so **no new query dependency is required**:

```js
import { useState, useEffect } from "react";

export function useCollection(fetcher) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetcher()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [fetcher]);
  return { data, error, loading };
}
```

**Pages to migrate** from static import → hook, each adding loading / error / empty
states: `src/pages/Books.js`, `Sports.js`, `Treks.js`, `Projects.js`,
`OneHundredDays.js`, `Resume.js`, `Instagram.js`, and `Now.js` (replace the
markdown-glob loader in `parseNowCms.js` with Supabase reads).

---

## 7. Images & Storage

- Create a **public Supabase Storage bucket** (e.g. `media`) with public read and
  authenticated write.
- The admin's image-upload widget uploads to Storage and writes the resulting
  **full public URL** into `slide_images` / `image`.
- Existing files under `public/images/**` keep working as-is (still deployed with
  the site), so URLs of both forms coexist. A **one-time bulk migration** of those
  images into Storage is documented as an optional follow-up, not a blocker.
- Image compression guidance in `CLAUDE.md` (≤150 KB target, 300 KB hard cap, JPEG,
  lowercase extensions) still applies to admin uploads.

---

## 8. Admin UI (`/admin`)

- **Login page** (email + password) → on success, session guard via
  `supabase.auth.getSession()` / `onAuthStateChange`. Unauthenticated visits to
  `/admin/*` redirect to login.
- **Dashboard** listing every content type; each type has list / create / edit /
  delete forms plus the image-upload widget. Form fields derive directly from the
  §4 schema (e.g. tags as a chip input, `slide_images` as a repeatable
  url+caption+upload row, now-page sections as structured JSON-backed forms).
- Built with the existing stack (React + Tailwind), reusing layout patterns from
  [`src/layouts/Main.js`](../src/layouts/Main.js). Admin routes are added to
  `src/App.js` alongside the public routes.
- Note the legacy global SCSS quirk (bare `<button>`/headings are restyled) — admin
  controls should follow the project's existing workaround for interactive elements.

---

## 9. Phased Implementation Steps (for the later task)

1. **Provision Supabase**: create project; apply §4 migrations; enable RLS + §5
   policies; create the owner user; create the `media` Storage bucket + policies.
2. **Wire the client**: add `@supabase/supabase-js`; create `supabaseClient.js`;
   add `.env` + `.env.example`; set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
   in Cloudflare Pages project env vars.
3. **Import existing data**: `scripts/import-to-supabase.js` (service-role, run
   locally once) seeds rows from `src/data/*.js` and the now-page markdown.
4. **Data layer + reads**: build `src/lib/api/*` + `useCollection`; switch each
   public page to live fetch with loading/error/empty states.
5. **Admin**: build the protected `/admin` (auth + per-type CRUD + image upload).
6. **QA**: every public page renders from Supabase; admin CRUD round-trips to the
   public page; RLS verified (anonymous write rejected).
7. **Cleanup**: remove `public/cms/`, `src/cms-content/`, generated `src/data/*.js`,
   the `cms:sync` / `prebuild` / `cms:seed` scripts, and the CI drift gate
   (`.github/workflows/node.js.yml`); update `CLAUDE.md`'s content-pipeline section
   and the changelog. Retire the Decap GitHub-OAuth worker.

---

## 10. Trade-offs & Risks

- **Perceived performance / loading states** — content now arrives client-side.
  Mitigate with skeleton placeholders and optional in-memory/session caching of
  fetched collections.
- **Weaker per-item SEO** — content isn't in the initial HTML. Impact is low: pages
  are list-only (no per-item routes) and route-level meta is retained via the
  unchanged middleware. Revisit only if per-item pages are added later.
- **Key handling** — anon key in the client is fine *because of RLS*; the
  service-role key must never reach the browser/bundle.
- **Single dependency** — site reads now depend on Supabase availability and
  free-tier limits; watch quotas.
- **Loss of git-versioned content history** — markdown was diffable in git. Mitigate
  with scheduled Supabase backups / periodic DB exports committed or archived.

---

## 11. Verification (of the eventual implementation)

- **Local reads**: `npm run dev` with env set; confirm Books, Sports, Treks,
  Projects, 100-days, Instagram, Resume, and Now load live from Supabase, and that
  loading / error / empty states behave. Use preview tools (`preview_snapshot`,
  `preview_console_logs`, `preview_screenshot`).
- **Admin writes**: log in → create / edit / delete a record → confirm it appears
  on the matching public page; confirm logout blocks `/admin`; confirm an anonymous
  write is **rejected** by RLS (quick `supabase-js` insert test without a session).
- **Meta intact**: confirm `functions/_middleware.js` still injects route meta
  (view-source a couple of routes).

---

## Appendix — Source-of-truth references in the current codebase

- Current pipeline: [`scripts/sync-cms-to-data.js`](../scripts/sync-cms-to-data.js), `src/cms-content/**`, `src/data/*.js`
- Runtime-fetch pattern to mirror: [`src/pages/Now.js`](../src/pages/Now.js), [`src/utils/parseNowCms.js`](../src/utils/parseNowCms.js)
- Infra to preserve: [`functions/_middleware.js`](../functions/_middleware.js), [`src/data/pageMeta.js`](../src/data/pageMeta.js), [`vite.config.js`](../vite.config.js)
- To retire later: [`public/cms/config.yml`](../public/cms/config.yml), `public/cms/index.html`, `package.json` cms scripts
