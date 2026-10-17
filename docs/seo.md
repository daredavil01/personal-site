# Search and AI crawlers

How sankettambare.in gets found: by Google and Bing, and by the AI assistants
(ChatGPT search, Perplexity, Claude, Google AI Overviews) that answer
"who is Sanket Tambare" from what their crawlers read. Hand-written; the code
lives in `functions/_middleware.js`, `src/lib/seo/` and `src/data/identity.js`.

## Why this exists

An audit on 2026-10-17 found the site was barely indexed: one search engine
returned no pages from the domain at all. The causes were crawlability, not
content:

1. **Every URL served an empty `<div id="root"></div>`.** Google renders
   JavaScript eventually; GPTBot, ClaudeBot, PerplexityBot, CCBot and most
   other crawlers never do, so they saw meta tags and nothing else.
2. **Soft 404s.** Any path — a typo, `/books/99999`, `/About` — answered 200
   with a canonical pointing at itself, so each one looked like a real page.
3. **No structured data.** Nothing told a search engine that the site is about
   one Person, with these profiles, this job, this city.
4. **A hand-written sitemap** of 19 URLs with none of the ~2,000 detail pages,
   and a lastmod four months stale.
5. **Facts that contradicted each other** — Emtec vs Bridgenext, Pune vs Barshi,
   "100+ books" when there were 52 — across llms.txt, agents.md, about.md and
   the About page.
6. **Cloudflare blocked the AI crawlers** that `robots.txt` said were welcome
   (403 to GPTBot, ClaudeBot, CCBot, Amazonbot, Bytespider).

## What a request now looks like

Every HTML response passes through `functions/_middleware.js`. It serves the
same document to everyone — no user-agent sniffing, so it is not cloaking.

| Request | Answer |
|---|---|
| `/about/`, `/About` | 301 to `/about` (query kept; GET/HEAD only; never `/api/`) |
| A path no route claims, a malformed id | 404, `noindex` |
| A detail row Supabase says does not exist | 404, `noindex`, still unfurls as the section |
| Supabase unreachable | 200 with the section's meta, as before — never a 404 |
| `/admin*`, `/ask/s/*`, an `indexable: false` route | `noindex` (meta + `X-Robots-Tag`) |
| A micro-post with no words | `noindex` (and left out of the sitemap) |
| Anything else | 200, head tags + JSON-LD + the page as plain HTML in `#root` |

### The fallback in `#root`

`src/lib/seo/fallbackHtml.js` writes the page reduced to what a reader takes
away: a heading, the facts (date, distance, author…), the text, the row's photo,
the outbound link, the tags, then the site nav and the profiles (`rel="me"`).
A section page lists its rows as links, so a crawler can reach every detail page
by following links — the app's own listings open most items in a modal.

- `index.html` adds a `js` class to `<html>` before first paint and hides
  `.seo-fallback` under it, so a visitor with JavaScript never sees it flash.
  Without JS it is the page, styled plainly.
- `src/index.js` always calls `createRoot`, which clears the fallback on the
  first commit. **Never `hydrateRoot`** — the fallback is not React output.

### Head tags

The meta tags carry `data-rh="true"`, react-helmet-async's own marker, so on
mount Helmet *replaces* them instead of adding a second set: the DOM Google
renders has one canonical and one description. The JSON-LD and the robots tag
carry no marker on purpose; Helmet would remove them, and both must hold for
the URL as it was served.

### JSON-LD

`src/lib/seo/structuredData.js` builds one `@graph` per page with stable ids:

- `https://sankettambare.in/#person` — from `src/data/identity.js`, repeated on
  every page. The repetition is the point: same name, same profiles, everywhere.
- `https://sankettambare.in/#website`
- `<url>#webpage` — a `ProfilePage` for `/`, `/about`, `/resume`; a
  `CollectionPage` + `ItemList` for section and tag pages; `WebPage` otherwise.
- `<url>#main` — `Book` with a `Review` by the Person, `BlogPosting` (whose
  `url` is the Substack/WordPress essay, so assistants cite the real home),
  `SocialMediaPosting`, `Article` about a fort or a `SportsEvent`,
  `CreativeWork`, `PresentationDigitalDocument`.
- A `BreadcrumbList` everywhere but the home page.

### Generated files

| URL | Built from | Function |
|---|---|---|
| `/sitemap.xml` | the manifest's indexable routes + every readable row, `lastmod` = `updated_at` | `functions/sitemap.xml.js` |
| `/feed.xml` | the newest 50 items across all types, RSS 2.0 | `functions/feed.xml.js` |
| `/llms.txt` | `identity.js` + the nav + `PAGE_META` (no database read) | `functions/llms.txt.js` |
| `/llms-full.txt` | the above + one line per essay, issue, book, race, trek, project and deck | `functions/llms-full.txt.js` |

Each is cached for an hour per data centre (`src/lib/seo/serve.js`), five
minutes if a table could not be read. `public/robots.txt` and `public/agents.md`
stay static; a test holds `agents.md` to `identity.js`.

### IndexNow

`npm run indexnow` reads the live sitemap and submits URLs whose `lastmod` is in
the last 3 days to `api.indexnow.org` (Bing, Yandex, Seznam, Naver).
`--all` submits everything — run it once after this ships. The key is public at
`/indexnow-key.txt`. It runs in the nightly workflow and as the last step of
`npm run refresh`. Bing's index is what ChatGPT search, Copilot and DuckDuckGo
answer from, so this is the shortest path from an `/admin` edit to an AI answer.

## Settings outside the repo

These matter as much as the code, and only the owner can change them.

1. **Cloudflare → Security → Bots → AI Crawl Control.** Allow GPTBot,
   ClaudeBot and CCBot; they were getting 403 while `robots.txt` welcomed
   them. Training crawlers are how future models *know* who you are; the
   search crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot) were
   already allowed. Also check that "Managed robots.txt" is not rewriting
   the file.
2. **Google Search Console.** Add a *Domain* property and verify it with the
   DNS TXT record (Cloudflare DNS). Submit `https://sankettambare.in/sitemap.xml`.
   Run URL Inspection → *Test live URL* on `/` and `/about` and *Request
   indexing*. Watch Page indexing for "Soft 404" and "Crawled – currently not
   indexed".
3. **Bing Webmaster Tools.** *Import from GSC*, then submit the sitemap.
4. **www.** `www.sankettambare.in` does not resolve. Add the DNS record and a
   Redirect Rule from www to the apex.
5. **Profiles.** Put `https://sankettambare.in` in the website field of GitHub,
   LinkedIn (Contact info and Featured), X, Substack (profile and publication
   About), WordPress, and as the first Linktree link. Same name, same headshot.
6. **Substack.** A standing footer line linking to the site — the strongest
   backlink there is.

## Checking it

```bash
curl -s https://sankettambare.in/books/50 | grep -A3 '<h1>'      # the fallback
curl -s -o /dev/null -w '%{http_code}\n' https://sankettambare.in/nope   # 404
curl -sI https://sankettambare.in/About | grep -i location            # 301
curl -s https://sankettambare.in/sitemap.xml | grep -c '<url>'
```

Then Google's Rich Results Test and validator.schema.org on `/`, `/about` and a
book page, and Search Console's URL Inspection → *View crawled page*.

## Not done yet

- **Core Web Vitals.** The globe chunk (~540 KB gzipped) loads right under the
  home page heading; the full Supabase client ships in the main bundle; the
  Material Symbols font is render-blocking, and ~190 icon spans without
  `aria-hidden` leak ligature words ("arrow_right_alt") into indexed text.
- **Slugs in detail URLs** (`/books/50-<title>`): a small gain, a redirect risk.
- **Essays on this domain.** They live on Substack and WordPress, so topic
  searches land there. Hosting the full text here (with the platforms as
  syndicated copies) is the biggest remaining lever, and a deliberate choice
  not to make yet.
