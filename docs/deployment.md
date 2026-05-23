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
| Framework preset | Create React App |
| Build command | `npm run build` |
| Build output directory | `build` |
| Node.js version | 20 (set via `.nvmrc`) |

## Environment Variables

Set these in the Cloudflare Pages dashboard under **Settings → Environment Variables**:

| Variable | Purpose | Required |
|---|---|---|
| `REACT_APP_GA_TRACKING_ID` | Google Analytics tracking ID | Optional |
| `NODE_ENV` | Set to `production` for production builds | Automatic |
| `PUBLIC_URL` | Override asset base path (e.g. for CDN subpath) | Optional |

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
npm start        # dev server at http://localhost:3000
npm run build    # production build
npm test         # run tests
```

## CMS (Decap CMS)

The Now page is managed via Decap CMS at `/cms`. To run the CMS locally against your git repo:

```bash
npm run cms:server    # starts netlify-cms-proxy-server on port 8081
npm start             # dev server, then visit http://localhost:3000/cms/
```

See `docs/cms-github-oauth-setup.md` for the full Cloudflare Pages production CMS setup.
