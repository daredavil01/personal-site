# The Writing Ledger — Refreshing Blog Word-Count Data

The Writing Ledger (`/writing-ledger`) reads every blog post published on
Substack and WordPress as an accountant's ledger bound like a magazine. It is a
React route inside the site's shell (header, sidebar and footer, or the atlas
`writer` region), at `src/pages/WritingLedger.js`. Until v26 it was a standalone
`public/writing-ledger.html`; the middleware now 301s that old URL.

It holds no data of its own: on load it fetches `/data/writing-ledger.json`.
Month-to-date and year-to-date are recomputed in the browser for today's date
(`src/lib/writingPeriod.js`), so they are correct even on days the JSON was not
regenerated. Everything else the page derives lives in `src/lib/writingLedger.js`
(pure, tested in `writingLedger.test.js`).

## The page, folio by folio

| Folio | What it draws | Component |
|---|---|---|
| Cover | Odometer total, reading-time / pages / novels / words-a-day equivalents, account lines with dot leaders, this month and this year as progress bars | `Cover.js` |
| I · The shelf | Every post as a book spine: height = √words, colour = platform, a saffron band = Marathi | `Shelf.js` |
| II · The ink calendar | Every day since the first post, a year per row, a blot per post day sized by words | `InkCalendar.js` |
| III · The long arc | Running total with 25k-word milestones and the longest silence shaded; year tiles; every calendar month (gaps included), stacked by platform | `LongArc.js` |
| IV · Recurring themes | Squarified treemap of topics by words, and a topic × year dot matrix. A tile filters the full ledger | `Topics.js` |
| V · Rhythm | Weekday rose, length ruler (each post a tick), platform / language / format mix | `Rhythm.js` |
| VI · Records | Longest and shortest essay, busiest month and day, longest streak, longest silence, biggest year, top topic | `Records.js` |
| VII · Fresh ink | The five newest posts with their cover images | `FreshInk.js` |
| VIII · The full ledger | Search, platform / year / language / topic filters, sortable, a word bar per row | `LedgerTable.js` |

Design notes, and where they came from: big-number lead and dot-leader
"account" lines after Nicholas Felton's annual reports; the day calendar after
Simon Willison's and Jim Nielsen's blog calendars; overview first, then zoom in
(the EU data-visualisation guide's narrative patterns). Tags are merged across
spellings (`Data Privacy` = `data_privacy`) and the `100_days_to_offload`
challenge tag is not counted as a topic. Language is the post's own label, or
Marathi when the title is in Devanagari, else English. Colours are tokens in
`ledger.css`: Substack rust, WordPress ink blue, English indigo and Marathi
saffron (the Logbook's pair), the site redline for peaks and records.

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

- `src/pages/WritingLedger.js` — the page itself, through `src/lib/writingLedger.js`.
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

Serve the site (`npm run dev`) and open `/writing-ledger`. The odometer total
and the "This month" day count should reflect today.

## Troubleshooting

**"The ledger data could not be loaded"** — `public/data/writing-ledger.json` is
missing or unreachable. Run `npm run blogs:wordcount`.

**`Word-count extraction failed: 4xx/5xx`** — an upstream API is down or
rate-limiting. The script writes nothing on failure; wait and re-run.

**`post text: … failed`** — some Substack bodies could not be downloaded. The
previous cached text is kept for those posts; the next run retries them.
