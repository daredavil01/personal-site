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
| Jev — TypeSafe AI's System One (`AI_GATEWAY_API_KEY`) | Pages secret, optional | rung 1 of the judge ladder only | free monthly gateway credit |
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

**Jev, from TypeSafe AI — decisions, not prose.** Their "System One" model:
typed questions, calibrated probabilities, no generated text, so it cannot
hallucinate a verdict or return a type error. It is reached two ways, and they
are not the same API — Vercel's AI Gateway (where the free monthly credit is,
via the AI SDK) and `api.typesafe.ai` direct (a plain POST, and metered). See
`docs/ask-evals.md` for both dialects.
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
use), plus reranking, speech-to-text, text-to-speech and vision in the same
catalogue and the same 10,000-neuron budget. Best for batch passes over the
whole archive, where 1,661 calls costing nothing is the entire point.

Model ids checked against the live catalogue on 2026-09-20:

| task | ids |
|---|---|
| rerank | `@cf/baai/bge-reranker-base` |
| speech-to-text | `@cf/openai/whisper`, `@cf/openai/whisper-large-v3-turbo`, `@cf/openai/whisper-tiny-en`, `@cf/deepgram/nova-3`, `@cf/deepgram/flux` |
| text-to-speech | `@cf/deepgram/aura-1`, `@cf/deepgram/aura-2-en`, `@cf/deepgram/aura-2-es`, `@cf/myshell/melotts` |
| vision | `@cf/llava-hf/llava-1.5-7b-hf`, `@cf/moondream/moondream3.1-9B-A2B` |

**One of those rows is a problem, and it shapes every voice-output idea below.**
Whisper is genuinely multilingual, so speech *in* works in Marathi. Nothing in
the TTS row does: Aura is English and Spanish, and MeloTTS's "multi-lingual"
means EN/ES/FR/ZH/JA/KO. **There is no Marathi voice on Workers AI.** On a site
with 21 Marathi books, Marathi micro-posts, Marathi starter chips and a persona
instructed to answer in the language it was asked in, that is not a detail —
see §4.6.

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

The model is `@cf/baai/bge-reranker-base`, confirmed present in the catalogue.

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
type. Expanded into its own section — see §4.5, **V1**.

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

Expanded, with the Marathi problem laid out, in §4.6, **W2**.

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

### 4.5 Voice input

Whisper is multilingual and the free allowance already covers it, so the model
is the easy part. Everything interesting here is about *what happens to the
transcript*.

| # | Feature | Model | Runtime | Effort |
|---|---|---|---|---|
| V1 | Push-to-talk on `/ask` | `whisper-large-v3-turbo` | request | M |
| V2 | Spoken-language detection feeds the answer | Whisper + existing persona | request | S |
| V3 | Voice capture → micro-post in `/admin` | Whisper + Jev | request (owner-only) | M |
| V4 | Dictation into any long-text admin field | Whisper | request (owner-only) | S |
| V5 | Site-wide voice search | Whisper + embeddings | request | M |

**V1 — Push-to-talk on `/ask`.** `MediaRecorder` in `AskChat.js`, a new
`/api/transcribe` Function, the text landing **in the composer, editable, never
auto-sent**. That last part is the whole design. A misheard Marathi question
that sends itself spends a Gemini call, logs a bad row into `ask_messages`,
drags down the judge's pass rate, and reads to the visitor as a broken feature
rather than a misheard word. Transcribe, show, let them fix it, let them press
send.

*Costs to watch:* audio upload is the first request on this site with a
meaningful body size, so it needs its own size cap and its own line in
`ask_quota()` — transcription and answering should not share one counter, or a
noisy microphone eats the day's answers.

**V2 — Spoken-language detection feeds the answer.** The persona already says
"answer in the language the question was asked in," and today that is inferred
from the script the visitor typed. Whisper returns a detected language code
alongside the transcript, which is *better* evidence than script detection — it
catches romanised Marathi, which today reads as English and gets an English
answer. Pass it through as an explicit hint. Tiny change, and it makes V1
meaningfully better for exactly the audience V1 is for.

**V3 — Voice capture → micro-post.** The most interesting idea in this section.
The micro-blog is 1,661 posts and a dead archive: everything in it was imported
from Tumblr, and the admin path for adding one by hand exists but is friction
enough that it goes unused. Speak a thought into `/admin`, Whisper transcribes
it, **A1/C1's tagging machinery tags it**, and you edit and publish. That turns
the largest thing on the site from a museum back into something live, and it
reuses three components that would already exist by then.

**V4 — Dictation into admin fields.** The same endpoint, wired to a mic button
in `FormField.js` for any `textarea`. Pairs naturally with **A2**: dictate the
rough version, let Gemini tidy it, edit. Trivial once V1's endpoint exists.

**V5 — Site-wide voice search.** Speak from anywhere, get taken to the right
page. There is already a `CommandPalette.js` in `/admin` that is most of this
pattern; the public version would embed the transcript and jump to the nearest
item rather than opening a chat.

### 4.6 Voice output

**Read §2's model table before reading this section.** There is no Marathi voice
on Workers AI. Every design below either routes around that or is honest about
excluding it.

The good news is larger than that problem, though: **the hard part of voice
output on this site is already built and shipped.** `src/atlas/audio/` has a
hand-rolled WebAudio manager with a master gain, equal-power crossfades, a
buffer cache, `visibilitychange` suspension, and an SFX sprite system. Sound is
**off by default and strictly opt-in** — the toggle click doubles as the
autoplay-unlock gesture — and `sfxBus.js` is a no-op until the manager
registers, so not one audio byte loads for a visitor who never turns sound on.
That is the correct consent model for voice, already implemented, already
tested against real browsers. None of it has to be invented.

| # | Feature | Model | Runtime | Effort |
|---|---|---|---|---|
| W1 | The Atlas guide speaks | `aura-2-en` / `melotts` | build-time | S |
| W2 | Listen to this post | `aura-2-en` | batch | M |
| W3 | Speak the `/ask` answer | `aura-2-en` | request, on demand | M |
| W4 | Region narration in the Atlas | `aura-2-en` | build-time | M |
| W5 | Browser `SpeechSynthesis` fallback | none | client | S |
| W6 | Audio digest with a podcast feed | `aura-2-en` + Gemini | batch | L |

**W1 — The Atlas guide speaks.** Start here. `src/atlas/guide/guideScript.js`
holds a handful of speech beats written in warm first-person Sanket voice — the
guide *already talks*, it just does it in a speech bubble. Those lines are
fixed, few, and English. Generate them once at build time, encode them into a
sprite exactly like `public/audio/sfx.m4a`, and add offsets to `sfxMap.js`.

**That is the entire feature.** No endpoint, no request-time model call, no new
consent UI, no new audio graph — `scripts/generate-atlas-audio.mjs` already
renders sprites, `sfxMap.js` already maps offsets, `playSfx` already fires them,
and the sound toggle already gates them. It is the smallest voice-output feature
available on this codebase and probably the most charming.

**W2 — Listen to this post.** Batch TTS over the 60 blog posts, encoded to
`public/audio/` under the same ≤200 KB-per-file budget the atlas beds observe,
committed, served static. Full post text already exists offline in
`knowledge_base/blog-posts-text.json` from `npm run blogs:wordcount`, so the
input is sitting there. Do **not** do this to 1,661 micro-posts.

*The Marathi problem lands here:* English posts get a voice, Marathi posts get
nothing, and a "Listen" button that appears on some posts and not others needs
to say why rather than look broken. See W5.

**W3 — Speak the `/ask` answer.** A speaker button beside an answer that has
finished streaming — not during. Synthesising while the SSE is still running
means holding audio and text on the same request, and §3.1 is the standing
warning about doing real work at the edge. Cache the audio by answer hash, which
is **B6's cache key with a second column**: the two should be built together or
W3 will re-synthesise the same starter-chip answer for every visitor and burn
the neuron budget on it.

**W4 — Region narration.** Six regions, one spoken intro each, generated at
build time and crossfaded in by the manager that already crossfades biome beds.
A natural extension of W1 once W1 proves the pipeline. Needs care: ambience is
pleasant and unattended narration is not, so it should be a separate opt-in from
the ambient toggle, not a free rider on it.

**W5 — Browser `SpeechSynthesis` fallback.** No model, no neurons, no endpoint
— and the platform voices on most devices cover Hindi and often Marathi, which
Workers AI does not. Quality is worse than Aura and varies by device, which is
exactly the trade worth making for a language that otherwise gets silence.
It also gives the whole site a "read this page" control for free.

**This is the honest answer to the Marathi gap**, and it should ship *with* W2
rather than after it: pre-rendered audio where there is a good voice, the
browser's own voice where there is not, and the difference disclosed rather than
hidden.

**W6 — Audio digest with a podcast feed.** The end state of D3 and W2
together: each month's digest written by Gemini, spoken, encoded, and published
with an RSS enclosure so it is subscribable. You already proxy one RSS feed in
`functions/rss-feed.js`, so the shape is familiar. Listed for completeness — it
is the largest thing here and should not be attempted until W2 and D3 both
exist.

### 4.7 Smaller ideas worth a line each

| # | Feature | Model | Runtime | Effort |
|---|---|---|---|---|
| E1 | `/ask`-powered 404 | embeddings only | request | S |
| E2 | Semantic "on this day" | embeddings only | batch | S |
| E3 | Query autocomplete on `/ask` | embeddings only | client | M |
| E4 | Changelog → release notes | Gemini | batch | S |
| E5 | Reading time and difficulty | none / Jev | batch | S |
| E6 | Atlas quest validation | Jev | batch | M |

**E1 — `/ask`-powered 404.** `NotFound` currently apologises. It could embed
the URL the visitor actually asked for and offer the three nearest real pages.
No model call — the embeddings exist — and it turns the worst page on the site
into a useful one.

**E2 — Semantic "on this day".** Not "a year ago today" but "this is what you
were thinking about the last time you wrote about this." Cheap, because it is
cosine similarity over vectors that already exist, and it is the kind of thing
an archive this size can do that a small one cannot.

**E3 — Query autocomplete on `/ask`.** As the visitor types, surface the
questions the log shows get answered well. Turns the starter-chip idea into
something that works past the first click, and it is a direct use of the
`question_pool` and the conversation log together.

**E4 — Changelog → release notes.** The changelog entries here are unusually
rich — they explain *why*, not just what. A Gemini pass could produce the short
public-facing version from them for `/changelog`, keeping the long engineering
one intact underneath.

**E5 — Reading time and difficulty.** Reading time is arithmetic and needs no
model; it belongs in `computeSiteStats` like every other number on this site.
A difficulty or "depth" band is a Jev choice if it is wanted at all.

**E6 — Atlas quest validation.** `src/atlas/gamification/quests.js` is
hand-written, and a quest that points at content which has since moved silently
becomes uncompletable. A batch check that every quest still has a reachable
target is mostly not an AI problem — but deciding whether a quest is *still
thematically right* after the archive grew is a Jev-shaped question.

---

## 5. What I would actually build, in order

Ranked by value per unit of risk, not by interest.

1. **D1 — tag descriptions.** A batch script and nothing else. The column, the
   admin editor and the two render sites all already exist. Ship it in a day
   and `/tags/:name` stops being a bare list.
2. **W1 — the Atlas guide speaks.** The only feature on this list where the
   consent model, the audio graph, the sprite renderer, the offset map and the
   playback call *all already exist and are shipped*. It is a build-time script
   and a few rows in `sfxMap.js`. Nothing else here has that ratio.
3. **C1 — micro-blog auto-tagging.** Same argument as D1 at ten times the
   scale: the tag pages, facet counts and filters are built and starved of data.
   One Jev pass, written through the existing RPC.
4. **V1 + V2 — voice input on `/ask`.** Whisper is multilingual where the TTS
   models are not, so voice *in* is the half of this that works properly in both
   languages — and it is the half that helps the Marathi audience most, because
   typing Devanagari on a phone is the actual friction. V2 rides along for
   almost nothing.
5. **A1 + A2 — admin assistance.** Owner-only, low blast radius, and they make
   every future content addition cheaper. A1 shares its shortlisting code with
   C1, so they are one piece of work in two places.
6. **V3 — voice capture → micro-post.** Only sensible *after* C1 and V1, at
   which point it is mostly wiring — and it is the one idea here that makes the
   archive live again rather than just better organised.
7. **B2 — archive gap report.** Reads data you are already collecting and have
   never looked at in aggregate. Tells you what to write next.
8. **W2 + W5 — listen to this post, with the browser fallback.** Shipped
   together, never separately: pre-rendered audio where there is a good voice,
   `SpeechSynthesis` where there is not, and the difference stated out loud.
9. **A3 — image alt text.** Fixes something genuinely broken. Sequenced here
   only because the schema change is larger than the model work.
10. **B1 — reranking.** Real upside, but it is the first item that touches the
    visitor's latency path and it moves the eval baseline. Worth doing after
    there is a stable grade history to compare against.

Everything else is worth doing and none of it is worth doing first. **D4** in
particular should be a throwaway script that prints clusters before anyone
designs a page for it, and **W6** should not be started until W2 and D3 both
exist.

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
- **What is the Marathi answer?** §4.6 proposes `SpeechSynthesis` as the
  fallback, but that is a workaround, not a decision. The alternatives are
  Gemini's own speech models, a metered third-party voice, or deciding that
  voice output is an English-only feature and saying so plainly on the page.
  Worth choosing before W2 ships, because retrofitting a second path after
  people have used the first one is harder than building both.
- **Does voice output belong to the Atlas toggle or its own?** Ambient sound is
  opt-in and pleasant. A voice reading at you is a different kind of consent,
  and folding narration into `world.sound` would silently change what that
  toggle means for people who already turned it on.
- **Does transcription get its own quota?** `ask_quota()` counts answers. Audio
  bodies are the first requests on this site with real size, and a hot
  microphone should not be able to consume the day's Gemini calls. Almost
  certainly a second counter, decided before V1 rather than after the first
  bill-shaped surprise.
- **Is any of the voice audio retained?** V1 sends a visitor's recorded voice to
  a third party. The honest default is that nothing is stored, the transcript is
  discarded with the conversation, and the page says so — but it is a decision
  to make on purpose, given `ask_conversations` already logs the text.
