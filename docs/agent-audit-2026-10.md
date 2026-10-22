# Agent-readiness audit — October 2026

How sankettambare.in reads to machines that are not a person in a browser:
AI crawlers and training bots, answer engines that cite the site, and
browsing agents that drive the live page. Black-box: only the live production
site was probed (2026-10-22), then each gap was traced to code.

Companion to [seo.md](seo.md), which describes how the crawler surface is built.

## Method

- **Crawlers.** `GET /` with the user agents of GPTBot, ClaudeBot, CCBot,
  PerplexityBot, OAI-SearchBot, ChatGPT-User, Google-Extended, Googlebot and a
  desktop Chrome. Status, size and time per agent.
- **Discovery files.** `/robots.txt`, `/sitemap.xml`, `/llms.txt`,
  `/llms-full.txt`, `/agents.md`, `/feed.xml`, plus the paths agents commonly
  probe: `/.well-known/{security.txt,mcp.json,ai-plugin.json}`, `/humans.txt`,
  `/index.md`, `/about.md`.
- **Pages without JavaScript.** One detail page per kind (book, trek, race,
  project, deck, newsletter issue, tag) and the busiest section pages: head
  tags, the JSON-LD `@graph`, and the word and link count of the `#root`
  fallback.
- **Status codes.** Trailing slash, unknown path, missing row.
- **Rendered page.** `/`, `/ask` and `/books` in a real browser: landmarks,
  headings, unlabelled controls, empty links, images without `alt`, console
  errors.

## What passed

- Every crawler user agent gets `200` with the same 18 KB document — no
  user-agent sniffing, and Cloudflare's AI Crawl Control no longer returns 403.
- `robots.txt` welcomes eleven named AI bots and repeats the `/admin` and
  `/api/` disallows in their group.
- `/llms.txt` (7 KB), `/llms-full.txt` (73 KB, about 330 detail links),
  `/agents.md` (`text/markdown`), `/sitemap.xml` (25 indexable pages) and
  `/feed.xml` are all `200` with correct content types.
- The no-JS fallback is real on every sampled page: 105 to 2,867 words, one
  `h1`, 32 to 233 links. A Marathi book's fallback carries `<main lang="mr">`.
- Detail pages ship a JSON-LD `@graph` (WebPage, Person, WebSite,
  BreadcrumbList and the entity) with ISO dates; the Person is the same
  stable `/#person` everywhere.
- `/about/` is a 301 to `/about`; an unknown path and a missing row are 404.
- Rendered pages have one `main`, one `h1`, no unlabelled buttons, no empty
  links, no image without `alt`, and no console errors.

## Findings

| # | Finding | Who it misleads | Status |
|---|---|---|---|
| 1 | **Soft 404 on dotted paths.** `/.well-known/mcp.json`, `/.well-known/security.txt`, `/humans.txt`, `/index.md` and similar returned `200 text/html` (the SPA shell): Pages falls back to `index.html` for a missing file and the middleware passed any dotted path straight through. | Agents probing for discovery files conclude they exist. | Fixed: `functions/_middleware.js` turns an HTML answer to a dotted, non-`.html` path into a 404. |
| 2 | **"Ghangad Fort Fort"** in trek JSON-LD. `structuredData.js` appended " Fort" unconditionally; the meta builder already guarded it. | Answer engines quoting the place name. | Fixed: same `\bfort\b` guard. |
| 3 | **Trailing spaces in machine fields** — `"PR South LSoM Half Marathon "`, `"Pune "`, a book author with a trailing space (and a double space in its title). Admin-typed data, never trimmed. | Every consumer of JSON-LD, meta and llms files. | Fixed: `viewOf` in `src/lib/seo/entities.js` trims every string column once. |
| 4 | **Ambiguous trek date** — descriptions read "on 09-08-2026" (DD-MM-YYYY), which most agents parse as 8 September. | Answer engines summarising a trek. | Fixed: `buildTrekMeta` writes "9 August 2026". |
| 5 | **`/ask` input named only by its placeholder.** | Browsing agents reading the accessibility tree. | Fixed: `aria-label` on the textarea. |
| 6 | **The Writing Ledger was a 404.** Pages 308s `/writing-ledger.html` to `/writing-ledger`; no React route claims that, so the middleware served the ledger with status 404, `noindex`, and the SPA's title and meta pasted over its own. Sitemap, `llms.txt`, nav and the page's own canonical all pointed at the redirecting `.html`. Found while verifying #1. | Every crawler (told to drop the page) and every agent following `llms.txt`. | Fixed: middleware passes `/writing-ledger` through untouched; sitemap, `llms.txt`, nav, `/ask` source and canonical/`og:url` now use `/writing-ledger`. |
| 7 | **Generated files keyed their edge cache on the full URL.** `/llms-full.txt?1`, `?2`… each forced a fresh build and table reads (`src/lib/seo/serve.js`). | Nobody directly; a cheap way to burn Worker CPU and Supabase reads. | Fixed: key is origin + path. |

## Code review

After the live probe, the agent-facing code was read end to end:
`functions/_middleware.js`, `src/lib/seo/` (entities, structuredData,
fallbackHtml, llms, sitemap, indexing, serve, rest, routeMatch), the four
generated-file Functions, `public/robots.txt` and `public/agents.md`.
Findings 2, 3, 6 and 7 came from this pass or were traced through it. What
holds up:

- One document for every visitor, no user-agent branches.
- Supabase outage degrades to the section's meta with a 200; only a definite
  missing row is a 404 (`rest()` separates the two).
- RLS applies to every crawler read (publishable key), so hidden projects and
  draft issues never reach a bot.
- Sitemap and noindex share `isNeverIndexed`, so the sitemap never lists a
  noindexed page.
- JSON-LD uses stable `@id`s and one `Person` from `identity.js`; Helmet
  replaces the `data-rh` tags on mount, so the rendered DOM has one canonical.
- Lists capped (JSON-LD 50 items) and every Supabase read edge-cached.

### Noted, no change

- `/api/` is disallowed in `robots.txt`, so a tool-using agent may not call
  `/api/ask` directly; it can use the `/ask` page. Intentional — the endpoint
  spends model quota.
- The sitemap lists pages, never entities (by design, see `seo.md`);
  `/llms-full.txt` is the entity inventory.
- `/blogs` is a 404: there is no such route. Essays live at
  `/100-days-to-offload`.
- Content, for the owner: `/sports/26` says "Finished 22 Kms" while its
  distance is 21 Kms.
- Not added, for want of a real need: `/.well-known/security.txt`, markdown
  content negotiation (`Accept: text/markdown`), an MCP endpoint.

## Re-running

```bash
curl -s -o /dev/null -w '%{http_code}\n' -A 'ClaudeBot/1.0' https://sankettambare.in/
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://sankettambare.in/.well-known/mcp.json
curl -s https://sankettambare.in/treks/20 | grep -o '"LandmarksOrHistoricalBuildings","name":"[^"]*"'
curl -s -o /dev/null -w '%{http_code}\n' https://sankettambare.in/writing-ledger
```

Expect `200`, then `404 text/html`, then `"Ghangad Fort"`, then `200`.

Locally, `wrangler pages dev` keeps the edge cache in `.wrangler/state`, so
`/sitemap.xml` and `/llms.txt` can serve an hour-old build after a code change.
