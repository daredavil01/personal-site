# Deployment Guide

This site is deployed on **Cloudflare Pages** with automatic deployments triggered on every push to `main`.

## Building for Production

```bash
npm run build
```

Produces a `build/` directory of static assets ready for any CDN or static host.

## Cloudflare Pages Setup

The site is connected directly to the GitHub repository via the Cloudflare Pages dashboard. No manual deploy step is needed — Cloudflare pulls from `main` on every push and builds automatically.

**Dashboard settings:**

| Setting | Value |
|---|---|
| Framework preset | None (Vite — set build command and output dir explicitly) |
| Build command | `npm run build` |
| Build output directory | `build` |
| Node.js version | 20 |

## Environment Variables

Set these in the Cloudflare Pages dashboard under **Settings → Environment Variables**. These are baked into the bundle at build time by Vite (they are **not** available at runtime).

| Variable | Purpose | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://xxx.supabase.co`) | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key — safe to expose in the browser when RLS is enabled | Yes |

> After adding or changing these variables in the Cloudflare dashboard, clear the build cache (**Settings → Builds → Clear cache**) and trigger a new deployment so Vite re-bakes the updated values into the bundle.

## CI/CD (GitHub Actions)

The `.github/workflows/node.js.yml` workflow runs on every push and pull request to `main`:

1. Installs dependencies (`npm ci`)
2. Lints (`npm run lint`)
3. Builds (`npm run build`)
4. Runs tests (`npm test`)

This is a **validation-only** workflow — it does not deploy. Cloudflare Pages handles deployment independently.

## Local Development

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm start              # dev server at http://localhost:3000
npm run build          # production build
npm test               # run tests
```

## Supabase Auth — Redirect URL Allowlist

After deploying, add your Cloudflare Pages domain to the Supabase Auth URL allowlist:

**Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**

Add both:
- `https://<your-project>.pages.dev/**`
- Your custom domain if configured (e.g. `https://yourdomain.com/**`)

This is required for the `/admin` login flow to complete successfully.
