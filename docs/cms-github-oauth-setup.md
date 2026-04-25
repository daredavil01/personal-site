# Decap CMS — GitHub OAuth Production Setup

This guide sets up a Netlify OAuth proxy so Decap CMS (`/cms/`) can authenticate
with GitHub in production (Cloudflare Pages).

---

## Overview

```
Browser  →  Decap CMS  →  OAuth Proxy (Netlify)  →  GitHub
```

The proxy holds your Client Secret server-side so it never touches the browser
or gets committed to the repo.

---

## Prerequisites

- GitHub OAuth App already created (`personal-website-app`)
- A free Netlify account
- Your Client ID and Client Secret (from the GitHub OAuth App page)

---

## Step 1 — Deploy the OAuth Proxy to Netlify

### 1a. Fork / clone the proxy repo

Go to:

```
https://github.com/vencax/netlify-cms-github-oauth-provider
```

Click **Fork** (or use the **Deploy to Netlify** button in that repo's README
for a one-click deploy — fastest option).

### 1b. Create a new Netlify site from the fork

1. Log in to [netlify.com](https://netlify.com)
2. **Add new site → Import an existing project**
3. Connect to your GitHub fork of `netlify-cms-github-oauth-provider`
4. Build settings — leave defaults (`npm install` / no build command needed)
5. Click **Deploy site**

Netlify gives you a URL like `https://splendid-fox-abc123.netlify.app`.
**Copy this URL — you'll need it in every step below.**

### 1c. Set environment variables

In Netlify: **Site settings → Environment variables → Add variable**

| Key | Value |
|-----|-------|
| `GITHUB_CLIENT_ID` | *(your Client ID)* |
| `GITHUB_CLIENT_SECRET` | *(your Client Secret)* |

> **Never put the Client Secret in `config.yml` or anywhere in the git repo.**

After adding both variables, go to **Deploys → Trigger deploy → Deploy site**
to restart with the new env vars.

---

## Step 2 — Update the GitHub OAuth App Callback URL

1. Go to GitHub → **Settings → Developer settings → OAuth Apps**
2. Click **personal-website-app**
3. Change **Authorization callback URL** to:

```
https://YOUR-NETLIFY-APP.netlify.app/callback
```

Replace `YOUR-NETLIFY-APP` with the actual subdomain from Step 1b.

4. Click **Update application**

> The current callback (`urn:ietf:wg:oauth:2.0:oob`) is for desktop apps
> and will not work with Decap CMS — this update is required.

---

## Step 3 — Update `public/cms/config.yml`

Open `public/cms/config.yml`. Comment out the `test-repo` backend and
uncomment the `github` block, filling in your values:

```yaml
# backend:
#   name: test-repo        ← comment this out

backend:
  name: github
  repo: daredavil01/personal-site
  branch: main
  base_url: https://YOUR-NETLIFY-APP.netlify.app
  auth_endpoint: auth
  squash_merges: true
  commit_messages:
    create:      'cms: add {{collection}} "{{slug}}"'
    update:      'cms: update {{collection}} "{{slug}}"'
    delete:      'cms: delete {{collection}} "{{slug}}"'
    uploadMedia: '[skip ci] cms: upload "{{path}}"'
    deleteMedia: '[skip ci] cms: delete "{{path}}"'
```

Only `base_url` is secret-adjacent — and even that is just the proxy URL,
not a credential. The Client ID and Secret are **never** written here.

Commit and push the updated `config.yml`.

---

## Step 4 — Test the Login Flow

1. Open your live site at `https://your-site.pages.dev/cms/`
2. Click **Login with GitHub**
3. GitHub shows an authorization prompt — click **Authorize**
4. You should land back in the Decap CMS dashboard, logged in

If you see a redirect error, double-check:
- The callback URL in the GitHub OAuth App exactly matches `https://YOUR-NETLIFY-APP.netlify.app/callback`
- The env vars are set and the Netlify site was redeployed after adding them

---

## Step 5 — After Editing Content in Decap CMS

Decap commits markdown files to the repo. To apply the changes to the live site:

```bash
# Pull the new commits Decap pushed
git pull origin main

# Convert markdown → JS data files
npm run cms:sync

# Review the updated data files, then commit and push
git add src/data/
git commit -m "cms: sync content updates"
git push
```

Cloudflare Pages will auto-deploy on push.

---

## Reverting to Local Dev Mode

To go back to the no-login local test mode, swap the backend block in
`public/cms/config.yml`:

```yaml
backend:
  name: test-repo   # ← uncomment this

# backend:          # ← comment out the github block
#   name: github
#   ...
```

The `test-repo` backend stores everything in browser `localStorage` and
requires no credentials. Navigate to `http://localhost:3000/cms/` to use it.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| "Unable to authenticate" on login | Callback URL mismatch | Re-check Step 2 — URL must match exactly |
| Redirected to blank page | Netlify app not deployed or crashed | Check Netlify deploy logs |
| "Bad credentials" in Decap | Env vars not set or redeploy not triggered | Re-check Step 1c |
| Content saved but site not updated | Forgot to run `npm run cms:sync` | Run sync and push data files |
| Login works locally but not in production | `test-repo` still active in config | Ensure you pushed the updated `config.yml` |
