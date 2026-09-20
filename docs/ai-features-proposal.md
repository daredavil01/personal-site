# AI features: what the three models could do next

A proposal, not a plan of record. Nothing here is built. It exists so the
shortlist can be argued about before any of it is written.

The site already has three model providers configured and paid for (or free),
and **all three are used in exactly one place: `/ask`.** Gemini answers, Workers
AI embeds and falls back, Jev grades. Nothing AI-shaped touches authoring,
the detail pages, or media. That asymmetry is the opportunity this document is
about.

---

## 1. What is already wired up

| Capability | Where it is configured | What it is used for today | Cost |
|---|---|---|---|
| Workers AI (`AI` binding) | `wrangler.toml` `[ai]` | `@cf/baai/bge-m3` query embeddings; rungs 2–3 of the answer ladder; rung 3 of the judge ladder | free, 10,000 neurons/day |
| Gemini (`GEMINI_API_KEY`) | Pages secret | rung 1 of the answer ladder; rung 2 of the judge ladder | free tier, ~15 RPM |
| Jev (`AI_GATEWAY_API_KEY`) | Pages secret, optional | rung 1 of the judge ladder only | free monthly gateway credit |
| pgvector index | `content_chunks` (`0009`) | `/ask` retrieval, `related_content_ranked()` | already built, incremental |

And the corpus is big enough to be worth mining:

| | count |
|---|---|
| micro-posts | 1,661 |
| blog posts | 60 |
| books | 51 |
| races | 25 |
| treks | 20 |
| projects | 16 |
| central tags | 98 |

---

## 2. What each model is actually for

This matters more than the feature list, because picking the wrong one is how
these things get expensive or bad.

**Jev — decisions, not prose.** Typed questions, calibrated probabilities, no
generated text, so it cannot hallucinate a verdict or return a type error.
Use it anywhere the answer is *a choice from a known set* or *a yes/no with a
confidence you intend to act on*: classification, routing, gating, triage. Never
use it to write anything. The confidence-band pattern in `src/lib/askJudge.js`
— act on the tails, mark the middle `needs-review` — is the template, and it
should be reused verbatim rather than reinvented.

**Gemini — generation and vision.** Free tier, roughly 1,000–1,500 requests a
day, multimodal. Use it for anything with a reader: draft prose, summaries,
image alt text, one-sentence explanations. Its output is *always* a draft that a
human approves, never something published directly.

**Workers AI — the free allowance already in the pipeline.** Embeddings (in
use), plus reranking, speech-to-text and text-to-speech models in the same
catalogue and the same 10,000-neuron budget. Best for batch passes over the
whole archive, where 1,661 calls costing nothing is the entire point.

---

## 3. Rules any feature here has to obey

Four constraints, three of them learned the hard way on this repo.

1. **Heavy work does not run at the edge.** Workers Free gives 10 ms CPU per
   request. OG cards rendered on demand at `/api/og/…` returned 1102 in
   production and links unfurled with no image at all, and `wrangler pages dev`
   does not enforce the limit, so local success proved nothing. Default to
   index-time or nightly batch — `npm run ask:index` and the 02:00 IST workflow
   already exist and already have the credentials.
2. **Free by default, metered by explicit switch.** `auto_eval_allow_metered`
   is off and a metered rung is filtered out of the ladder *before anything
   runs*, which is what makes "this cannot bill me" a property of the code
   rather than a promise. Anything new inherits that shape.
3. **Numbers baked at build time go stale, and that is accepted.** Same bargain
   as `npm run og:fallbacks` and `npm run blogs:wordcount`: re-run it, don't
   move it to request time.
4. **A new route is a major version and needs its own share card** — a
   `routeManifest.js` entry, a `pageMeta.js` entry, a figure in `FIGURES`, a
   slug in `PAGE_SLUGS`, and a committed `public/og/<slug>.png`. The guard test
   fails the build otherwise. Budget that into any feature marked *new route*.

---

## 4. The catalogue

Effort is S (a day), M (a few days), L (a week-plus). "Runtime" says where the
model call happens, which is the cost and latency question rolled into one.

### 4.1 Authoring assistance in `/admin`

| # | Feature | Model | Runtime | Effort |
|---|---|---|---|---|
| A1 | Tag suggestions on save | Jev | request (owner-only) | M |
| A2 | Draft descriptions and blurbs | Gemini | request (owner-only) | S |
| A3 | Image alt text at upload | Gemini vision | request (owner-only) | M |
| A4 | Drafted `/now` monthly entry | Gemini | request (owner-only) | M |
| A5 | Book metadata gap-fill | Gemini | batch script | S |

**A1 — Tag suggestions on save.** Every form with a `tags` field already
autocompletes from the central list (`suggest: true` in `resources.js`), but the
author still has to remember which of 98 tags apply. Jev answers one yes/no per
candidate tag against the row's text, in a single parallel pass. High confidence
pre-checks the tag, the middle band offers it greyed, low confidence never
appears. Writes go through `set_entity_tags` unchanged — this only ever
populates a form field, so a bad suggestion costs a click. Owner-only, behind
`is_owner()`, and it should be shortlisted to plausible candidates by embedding
similarity first so the question count stays bounded.

*Risk:* 98 questions per save is the naive version and too many. Pre-filter.

**A2 — Draft descriptions and blurbs.** A book's 2–4 sentences, a project's
problem/solution/outcome triple, a trek's notes. Gemini gets the title, the
link, and the existing rows of the same type as style examples; the author gets
an editable draft, never a saved value. Smallest possible surface: one "draft"
button per long-text field in `FormField.js`.

**A3 — Image alt text at upload.** There is no alt-text story on the site at
all today. `src/lib/imageCompress.js` already intercepts every `image` and
`slideImages` upload in the browser and knows the final bytes; Gemini reads the
compressed image and returns a sentence, which lands in a new `alt` field beside
the URL. This is an accessibility fix first and an SEO one second, and it is the
only item on this list that improves something currently broken rather than
adding something new.

*Open question:* storing alt text means a schema change everywhere
`slideImages` is a bare `text[]`. That is the real cost of this one, not the
model call.

**A4 — Drafted `/now` monthly entry.** `src/lib/monthDigest.js` already
aggregates a month's blogs, treks, marathons and micro-posts and reconciles
their differing date formats for the homepage. Feed that aggregate to Gemini and
it drafts the `now_months.sections` blob in the shape the existing rows use; the
author edits and publishes. This removes a recurring manual chore rather than
adding a feature, which is the best kind of item on this list.

**A5 — Book metadata gap-fill.** `books:backfill` / `books:template` /
`books:apply` already exist as a three-step manual pipeline. Gemini could
propose the missing publisher, ISBN, category and description fields into the
same template JSON, leaving the existing apply step as the human gate.

### 4.2 Making `/ask` meaningfully better

| # | Feature | Model | Runtime | Effort |
|---|---|---|---|---|
| B1 | Cross-encoder reranking | Workers AI | request | M |
| B2 | Archive gap report | Gemini + Jev | batch | M |
| B3 | Question-type routing | Jev | request | M |
| B4 | Question-pool gate | Jev | batch | S |
| B5 | Voice input | Workers AI (Whisper) | request | M |
| B6 | Answer cache for repeat questions | none (hashing) | request | S |

**B1 — Cross-encoder reranking.** The single biggest quality lever available.
`askRetrieval.js` re-ranks the over-fetched candidate set with good heuristics —
type chips that narrow-then-widen, `site`/`page` chunks sunk unless the question
is about the site, a per-entity cap — but they are heuristics over an RRF fusion
score. A reranker model scores *this query against this passage* directly, which
is what the heuristics are approximating. Workers AI has bge-reranker models in
the same free allowance the embeddings already draw from.

*Verify the exact model id against the current Workers AI catalogue before
committing to this — it is the one claim here I have not checked against a live
list.*

*Risk:* this is a request-time call on the visitor path, so it must be timed and
must fail open to today's ordering. It also changes what the judge grades, so
expect the eval pass rate to move for reasons unrelated to the models.

**B2 — Archive gap report.** `ask_messages` has recorded every answer, every
reader `feedback_*`, and now every `eval_*` grade. Nothing reads them in
aggregate except the tiles. A batch pass that clusters the questions readers
actually asked — especially the ones that *refused* — is a content roadmap
written by the audience. "Eleven people asked about X and the archive had
nothing" is the most useful sentence this site could produce about itself.
Jev classifies each refusal as fairly-refused vs should-have-answered (it
already answers a near-identical question in the judge rubric); Gemini clusters
and names the themes.

**B3 — Question-type routing.** The persona prompt currently explains in prose
that counts come from the facts block and specifics come from the retrieved
items, and it mostly works. Jev could decide it structurally — counting vs
specifics vs roster vs out-of-scope — before the answering model is called, so
the right context is assembled rather than hoped for. Adds a hop to the visitor
path, which is the argument against.

**B4 — Question-pool gate.** `CLAUDE.md` says "only add a question the archive
answers well — a chip that refuses reads as a broken feature." That is currently
a rule a human remembers. Run the candidate question through retrieval, ask Jev
whether the retrieved extracts would support an answer, and refuse to save the
chip if they would not. Small, self-contained, and it enforces an existing
written rule with code.

**B5 — Voice input.** Whisper on Workers AI, a microphone button in
`AskChat.js`. Genuinely useful for the Marathi questions, which are tedious to
type. Needs a real look at Marathi transcription quality before it ships —
shipping bad Marathi on a site with 21 Marathi books would be worse than not
shipping it.

**B6 — Answer cache.** Not an AI feature, but it belongs on this list because
it is the cheapest way to make the free tiers go further: hash
(question, retrieved chunk ids) and serve a stored answer. Starter chips are
clicked far more than they are varied, so the hit rate should be high, and every
hit is a Gemini request not spent.

### 4.3 Mining the micro-blog archive

1,661 posts is the largest thing on the site and currently the least
navigable — a wall of cards with generative art. Three passes would change that,
and all three are batch work on free allowances.

| # | Feature | Model | Runtime | Effort |
|---|---|---|---|---|
| C1 | Bulk auto-tagging | Jev | batch | M |
| C2 | Own-thought vs reblog classifier | Jev | batch | M |
| C3 | Near-duplicate detection | embeddings only | batch | S |

**C1 — Bulk auto-tagging.** The Tumblr import only wrote tags "for posts that
have them," so a large share of the 1,661 carry none and are invisible to
`/tags`, to the `?tags=` filter and to `microblog_tag_facets()`. A one-off Jev
pass against the 98-tag vocabulary, shortlisted per post by embedding
similarity, would light up the whole archive against machinery that already
exists. Written through `set_entity_tags` like everything else.

*This is the highest ratio of visible improvement to new code on the entire
list*, because nothing needs building — the tag pages, filters and facets are
already there and simply have no data to show.

**C2 — Own-thought vs reblog.** `CLAUDE.md` instructs the persona to say, in
prose, that a micro-post may be "a reblog of someone else — not a considered
position." That is a warning the model has to remember to give. A stored column
makes it structural: the UI can label it, `/ask` can weight it, and the reader
browsing 1,661 posts can filter to the ones that are actually his. A four-way
choice (own thought / quote / reblog / link-share) is exactly Jev's shape.

**C3 — Near-duplicate detection.** No model call at all — the embeddings are
already in `content_chunks`. Cosine similarity over the micro-post vectors finds
the reposts and near-repeats, which is both a cleanup tool for `/admin` and a
way to stop `/ask` returning eight variations of the same thought.

### 4.4 Reader-facing features

Each of these adds surface, and the two marked *new route* carry the full
manifest + `pageMeta` + OG card cost from §3.4.

| # | Feature | Model | Runtime | Effort |
|---|---|---|---|---|
| D1 | Tag descriptions | Gemini | batch | S |
| D2 | Listen to this post | Workers AI (TTS) | batch | M |
| D3 | Monthly auto-digest | Gemini | batch | L *(new route)* |
| D4 | Threads — emergent themes | embeddings + Gemini | batch | L *(new route)* |
| D5 | "If you liked this" for books | embeddings only | request | S |
| D6 | Marathi glosses | Gemini | batch | M |

**D1 — Tag descriptions.** `tags.description` already exists as a column,
is already editable in `TagManager.js`, and already renders as the intro
paragraph on `/tags/:name` and the tooltip on `/tags` — and is mostly empty.
Generating one sentence per tag from its own items is **zero new UI, zero schema
change, and 98 Gemini calls in a batch script.** Strongest effort-to-value ratio
in this section, and it improves the `/tags/:name` meta description as a side
effect.

**D2 — Listen to this post.** The repo already generates and ships audio —
`scripts/generate-atlas-audio.mjs` builds seamless loops and encodes them to
`public/audio/*.m4a` with a 200 KB budget per file. The same shape applies:
TTS at index time, encoded, committed, served static. Blog posts and the longer
micro-posts only; there is no case for doing this to 1,661 rows.

*Marathi TTS quality is the deciding question, and the Devanagari limitation
already documented for the OG cards suggests caution.*

**D3 — Monthly auto-digest.** `MonthlyDigest` already reconciles and aggregates
the month on the homepage. A `/digest/:year-:month` route would give each month
a permanent, linkable, unfurlable page with a Gemini-written paragraph over the
existing aggregate. Shares an engine with A4 — build them together or not at
all.

**D4 — Threads.** Cluster `content_chunks` by embedding, have Gemini name each
cluster, and publish the result as emergent themes that cross content types —
the reading, the running and the writing that turn out to be about the same
thing. This is the most interesting idea on the list and the least certain: it
either produces something genuinely surprising or it reproduces the tag list
with worse names. Prototype it as a script that prints clusters before writing
any page.

**D5 — "If you liked this".** `related_content_ranked()` already powers a "more
like this" strip on detail pages from the same embeddings with no model call at
read time. Extending it to a books-specific recommendation ("you finished this,
the shelf also has…") is mostly presentation over machinery that exists.

**D6 — Marathi glosses.** 21 of 51 books and a share of the micro-posts are
Marathi. `bge-m3` is multilingual so retrieval already crosses languages, but a
reader who does not read Marathi hits a wall on the page itself. One-sentence
English glosses, generated at index time, stored beside the row, displayed as a
disclosed translation and never as a substitute.

---

## 5. What I would actually build, in order

Ranked by value per unit of risk, not by interest.

1. **D1 — tag descriptions.** A batch script and nothing else. The column, the
   admin editor and the two render sites all already exist. Ship it in a day
   and `/tags/:name` stops being a bare list.
2. **C1 — micro-blog auto-tagging.** Same argument at ten times the scale: the
   tag pages, facet counts and filters are built and starved of data. One Jev
   pass, written through the existing RPC.
3. **A1 + A2 — admin assistance.** Owner-only, low blast radius, and they make
   every future content addition cheaper. A1 shares its shortlisting code with
   C1, so they are one piece of work in two places.
4. **B2 — archive gap report.** Reads data you are already collecting and have
   never looked at in aggregate. Tells you what to write next.
5. **A3 — image alt text.** Fixes something genuinely broken. Sequenced fifth
   only because the schema change is larger than the model work.
6. **B1 — reranking.** Real upside, but it is the first item that touches the
   visitor's latency path and it moves the eval baseline. Worth doing after
   there is a stable grade history to compare against.

Everything else is worth doing and none of it is worth doing first. **D4** in
particular should be a throwaway script that prints clusters before anyone
designs a page for it.

---

## 6. Open questions

- **Does the `/ask` free tier have headroom for this?** A2, A4 and D1 are
  owner-only or batch, so they compete with visitor answers for the same Gemini
  quota only at the margins — but B2 and D6 are hundreds of calls. Worth
  measuring current daily usage from `ask_usage` before assuming the budget is
  free.
- **Where does generated content get marked as generated?** A drafted `/now`
  entry the author edits is his. A tag description nobody reads before it ships
  is not. The site's voice is a real asset and a paragraph of model prose under
  a tag heading is the first place it could quietly erode. Worth deciding the
  rule once, here, rather than per feature.
- **How much of this should be reversible?** C1 and C2 write to 1,661 rows.
  Both need a dry-run mode and a way to undo the pass — `tags:migrate`'s
  `--dry-run` + verify shape is the precedent.
- **Is Jev's gateway credit actually sufficient?** The judge barely touches it.
  C1 at archive scale is a different order of magnitude, and the answer decides
  whether `auto_eval_allow_metered`'s sibling switch has to exist for tagging
  too.
