# The Writing Ledger — Refreshing Blog Word-Count Data

The Writing Ledger (`/writing-ledger.html`) is a self-contained infographic of
every blog post published on Substack and WordPress: total words, monthly and
yearly trends, month/year-to-date, top posts, tag and length breakdowns.

The page is hand-maintained HTML in `public/`. It holds no data of its own: on
load it fetches `/data/writing-ledger.json` and renders from that. Month-to-date
and year-to-date are recomputed in the browser for today's date, so they are
correct even on days the JSON was not regenerated.

## Refreshing

```bash
npm run blogs:wordcount
```

That is the whole refresh. It rewrites `public/data/writing-ledger.json`; commit
it and deploy. The nightly **Ask refresh** GitHub Action
(`.github/workflows/ask-refresh.yml`) runs the same command at 02:00 IST and
commits the file only when a post was added, removed or edited — a change to
the generation date alone is ignored.

## What the Script Does

| Reads | Writes |
|---|---|
| Substack archive API, WordPress.com API, Supabase `blogs` table | `public/data/writing-ledger.json` (committed) |
| Substack per-post API, only for new or edited posts | `knowledge_base/blog-posts-text.json` (gitignored) |

`scripts/blog-word-counts.mjs` pages through both public APIs, counts words per
post, and aggregates by month, year, platform, day of week, section, tag and
length. It never writes to Supabase. It reads the `blogs` table only to mark
which posts the site tracks, with the public publishable key — so **no
`SUPABASE_SERVICE_ROLE_KEY` is needed**. If Supabase is unreachable the run still
succeeds and every post is marked `trackedInBlogsTable: null`.

It also saves each post's full text to `knowledge_base/blog-posts-text.json` for
the `/ask` index (`scripts/ask-sources/writing.mjs`). That file is a cache: a
Substack body is downloaded again only when the post's publish date or word
count changes, so a routine run makes no per-post requests. The text is never
written to `public/`.

Word counts use two methods, flagged per post as `wordsSource`:

- `substack_api` — Substack's own `wordcount` field.
- `derived_html` — WordPress bodies with tags stripped, split on whitespace.

They are not the same methodology, so cross-platform comparisons are approximate.

## Who Reads the JSON

- `public/writing-ledger.html` — the page itself.
- `functions/api/ask.js` — the `/ask` facts card (`writing`), cached for an hour.
- `scripts/ask-sources/stats.mjs` — the ledger totals as a searchable chunk.

## Anomalies

The console summary lists problems found, never fixed:

| Anomaly | Meaning | What to do |
|---|---|---|
| `untracked_post` | Published, but no row in the Supabase `blogs` table | Add it via `/admin` → **100 Days (Blogs)** if it belongs there. A high count is normal. |
| `unmatched_blogs_row` | A `blogs` row whose `blog_link` matches no live post | Check the URL, or the post was unpublished |
| `malformed_blog_date` | A `blogs` row's `blog_date` is not `YYYY-MM-DD` | Fix it in `/admin` |
| `missing_word_count` | Substack returned no `wordcount` | Usually a non-article post; safe to ignore |

## Verifying

Serve the site (`npm run dev`) and open `/writing-ledger.html`. The headline
number and the "as of" date should reflect today. Opening the file straight
from disk no longer works — browsers block `fetch` on `file://`.

## Troubleshooting

**"The ledger data could not be loaded"** — `public/data/writing-ledger.json` is
missing or unreachable. Run `npm run blogs:wordcount`.

**`Word-count extraction failed: 4xx/5xx`** — an upstream API is down or
rate-limiting. The script writes nothing on failure; wait and re-run.

**`post text: … failed`** — some Substack bodies could not be downloaded. The
previous cached text is kept for those posts; the next run retries them.
