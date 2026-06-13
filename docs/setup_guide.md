# Installation & Setup Guide

## Prerequisites

- **Node.js** v20 or higher ([nodejs.org](https://nodejs.org/))
- **npm** (bundled with Node.js)
- A **Supabase** project with the schema applied (see `supabase/migrations/`)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/daredavil01/personal-site.git
cd personal-site
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Project Settings → API → Project API keys → Publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → Project API keys → service_role (**server-only, never commit**) |

`SUPABASE_SERVICE_ROLE_KEY` is only needed when running the one-time import scripts (`npm run data:import`, `npm run images:upload`). It is never used by the browser.

### 4. Start Development Server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). The page reloads on changes.

## One-Time Data Import (first setup only)

If setting up a fresh Supabase project, run the seed scripts once:

```bash
npm run data:import       # imports all content into Supabase tables
npm run images:upload     # uploads public/images/** to the media Storage bucket
```

Both scripts require `SUPABASE_SERVICE_ROLE_KEY` to be set in `.env`. They are safe to re-run (upsert-based).

## Building for Production

```bash
npm run build
```

Output goes to `build/`. See [deployment.md](deployment.md) for Cloudflare Pages setup.

## Troubleshooting

- **Blank pages / "not set" warning in console**: `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing from `.env`. Vite bakes these at build time — restart the dev server after editing `.env`.
- **`npm install` fails**: Delete `node_modules` and `package-lock.json`, then retry.
- **Port 3000 is busy**: Vite will prompt to use an alternate port — confirm with `Y`.
