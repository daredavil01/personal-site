# AI features — development status

Tracks what is actually built from `docs/ai-features-proposal.md`, which is a
catalogue and not a plan of record. The proposal's ids (`A1`, `D1`, `C1`, …) are
kept verbatim so the two documents stay readable side by side.

Hand-maintained. No `<!-- generated:NAME -->` markers, so `npm run docs:build`
never touches this file.

---

## The switchboard

**Every feature below is off until it is switched on at `/admin/ask/settings`,
under *AI features*.** One master switch sits above the rest: off means none of
them run, whatever their own switch says.

It is one jsonb column, `ask_settings.ai_features` (migration `0024`), on the row
that already holds the model ladder, the caps and the persona — so a script, the
admin form and the endpoint all read the same switch, and turning something off
stops the next batch run as well as the button.

- Keys are declared once in `src/data/askConfig.js` (`AI_FEATURES`), which is
  also what the admin card renders. Adding a feature is a row there plus a call
  to `aiFeatureOn()` at the point that spends.
- Default `{}` means **off**, in both directions: an untouched deployment runs
  nothing, and a settings read that fails falls back to `DEFAULT_ASK_SETTINGS`,
  where every flag is false. The same bargain as `auto_eval_enabled` — an
  unreachable database switches the machine off rather than on.
- Enforcement is server-side (`functions/api/assist.js`) and script-side
  (`tiersForFeature` in `scripts/lib/gemini.mjs`). The admin hook
  (`useAiFeatures.js`) only hides controls the endpoint would refuse anyway.

---

## Standing decisions

**Gemini is the primary model.** Every new AI feature uses Gemini unless Gemini
genuinely cannot do the job — embeddings (`@cf/baai/bge-m3`), reranking and
speech-to-text stay on Workers AI because Gemini is not the tool for them.
Gemini is already rung 1 of the `/ask` answer ladder
(`src/data/askConfig.js` → `DEFAULT_ASK_SETTINGS.tiers[0]`, seeded by
`0009_second_brain.sql`, verified against the live row), so this is a convention
being written down, not a change.

**The judge ladder is not touched.** `auto_eval_tiers` keeps Jev at rung 1.
Jev's calibrated probabilities are what `src/lib/askJudge.js` thresholds
against, and a Gemini grade is already tagged `judge-fallback` / uncalibrated.
Reordering that ladder would redefine every grade after it.

**Where the proposal says Jev and this workstream says Gemini.** A1 (tag
suggestions) and C1 (bulk auto-tagging) are specified in the proposal as Jev
classification. They are built with Gemini returning structured JSON instead.
Both only ever populate a form field or run behind a dry-run, so an unparseable
answer costs a retry, never a wrong write.

**A model may not invent a tag.** Both tagging features intersect the model's
answer with the live `tags` table and return the *stored* spelling, so a
suggestion is always a tag that already exists and a title-cased answer cannot
create a duplicate. Creating a tag stays something a person types on purpose.

**Free tier only.** Every feature here is either a local batch script or sits
behind `is_owner()`. Nothing in this workstream adds a model call reachable by
an anonymous visitor. This inherits §3.2 of the proposal — free by default,
metered by explicit switch.

**Generated text is always a draft.** Nothing a model writes is published
without a human seeing it. A batch script writes into a field the admin UI can
edit; a form button fills an input that is only persisted on Save.

**No new routes.** Nothing here adds a route, so no `routeManifest.js` entry, no
`pageMeta.js` entry and no OG card work.

---

## Status

| id | feature | flag | model | runtime | status |
|---|---|---|---|---|---|
| D1 | Tag descriptions | `tag_descriptions` | Gemini | batch script | **built and run** — 97 of 98 tags described |
| A2 | Draft long-text fields | `draft_fields` | Gemini | request (owner-only) | **built** |
| A5 | Book metadata gap-fill | `book_metadata` | Gemini | batch script | **built, not yet run** |
| A1 | Tag suggestions on save | `tag_suggest` | Gemini (JSON) | request (owner-only) | **built** |
| C1 | Micro-blog bulk auto-tagging | `microblog_autotag` | Gemini (JSON) | batch script | **built, not yet run** |
| A3 | Image alt text | `image_alt` | Gemini vision | request (owner-only) | **built** for `slideImages` |
| C3 | Micro-blog near-duplicates | — | none (embeddings) | batch script | **built, report only** |
| E1 | `/ask`-powered 404 | — | none (embeddings) | request | **built** |
| E2 | Semantic "on this day" | — | none (embeddings) | request | **built** on `/microblog` |
| C2 | Own thought vs reblog | `microblog_kind` | Gemini (JSON) | batch script | **built, not yet run** |
| W1 | The Atlas guide speaks | — | Workers AI (aura-2-en) | build-time | **built and run** |
| W5 | Read aloud | — | none (browser) | client | **built** on micro-post pages |
| B6 | Answer cache | `answer_cache` | none | request | **built** |
| V1 | Voice input on `/ask` | `voice_input` | Workers AI (Whisper) | request | **built** |
| V2 | Spoken language feeds the answer | `voice_input` | — | request | **built** |
| B1 | Cross-encoder reranking | `rerank` | Workers AI (bge-reranker) | request | **built and on** |
| D5 | "If you liked this" for books | — | none (embeddings) | request | **built** on book pages |
| E3 | Query autocomplete on `/ask` | — | none (pool text) | client | **built** |
| E5 | Reading time | — | none (arithmetic) | build-time | **built** on blog pages; no difficulty band |
| — | Reblogs sink in `/ask` retrieval | — | none (`post_kind`) | request | **built**, live after the next `ask:index` |
| E4 | Changelog → release notes | `release_notes` | Gemini | batch script | **built, not yet run** |
| B2 | Archive gap report | `archive_gaps` | Gemini | batch script | **built**, dry-run only |

Everything else in the proposal is **not started**: A4, B3–B5, C1's sibling
passes, D2–D4, D6, V3–V5, W2–W4, W6, E6.

Six of the seventeen above spend **nothing at all** — C3, E1, E2 and D5 read
vectors `npm run ask:index` already wrote, E3 matches text the settings row
already carries, and E5 is division — which is why they carry no switch: there
is no model call to switch off.

### What each one is

- **D1 — `npm run tags:describe`.** Fills `tags.description` from each tag's own
  items, read through the existing `tag_entities()` RPC, so the sentence says
  what the tag covers *on this site*. `--dry-run`, `--force`, `--limit N`,
  `--tag <name>`. Skips a tag that already has text and a tag with no items.
- **A2 — the Draft button.** On any admin `textarea` flagged `aiDraft: true`
  (`resources.js`). The prompt is the row as the form currently holds it plus
  the three longest existing values of the same field as style examples. Fills
  the box; saves nothing.
- **A5 — `npm run books:propose`.** Step 2.5 of the existing
  `books:template` → `books:apply` pipeline, writing into the same template JSON
  so the human gate is unchanged. Never proposes `cover_url` — a hallucinated
  ISBN is visible in review, a hallucinated image URL is a 404 that
  `books:apply` would try to download — and an ISBN that is not 10 or 13 digits
  is dropped.
- **A1 — the Suggest button.** On every central-tag field on the site: books,
  races, treks, projects, decks, photos, blog posts and micro-posts. Confident
  names are added to the input, plausible ones offered as chips. Writes still go
  through `set_entity_tags` on Save, exactly as a typed tag does. Micro-blog
  needed its own wiring — `MicroblogManager` keeps its own field list rather
  than a `resources.js` entry. **Not** on `techStack` (the build axis, a plain
  `text[]`) or on resume skill `category`, neither of which is a central tag.
- **C1 — `npm run microblog:tag`.** A batch pass over the untagged micro-posts.
  `--dry-run`, `--limit N`, and every real run writes a journal to
  `knowledge_base/microblog-tag-journal-<timestamp>.json` holding each row's tags
  before and after; `--undo <file>` replays it backwards. Resumable — a row that
  already has tags is skipped — which matters at ~15 requests a minute.
- **A3 — alt text on upload.** `slide_images` is jsonb, so `alt` lives beside
  `url` and `caption` with **no migration**. The sentence is written from the
  compressed bytes the browser already holds, never by fetching the URL back;
  an existing sentence is never overwritten; and a failure is silent, because
  the upload itself worked and the field can be typed. `ImageSlider` prefers
  `alt` over `caption` — a caption is written for someone who can already see
  the picture.

### Wave 2 — what each one is

- **C3 — `npm run microblog:dupes`.** Every micro-post through
  `related_content_ranked()`, reporting pairs above a cosine threshold
  (`--threshold`, default 0.92). Report only: it writes
  `knowledge_base/microblog-duplicates-<timestamp>.json` and changes nothing.
  Posts shorter than 60 characters are skipped — the wordless photo-post chunks
  are all near-identical to each other and would be the entire report.
- **E1 — the 404.** `pathToQuery` decodes the path, splits it, drops ids, years
  and one-character fragments, and hands the words to `hybrid_search` with a
  null embedding. Suggestions are restricted to site paths; a failed lookup
  leaves the page exactly as it was.
- **E2 — "on this day".** `microblog_on_this_day(month, day)` for the seed,
  `related_content_ranked()` for the echoes. Hidden while a filter is on, and it
  renders nothing on a silent date.
- **C2 — `npm run microblog:classify`.** `post_kind` is one of `own`, `quote`,
  `reblog`, `link`, or null for not-yet-classified. Same journal/`--undo`/
  resumable shape as C1. The public filter narrows rather than widens.
- **W1 — `npm run atlas:voice`.** Four beats, one sprite, generated offsets.
  Lazy-loaded on the first beat; gated by the existing sound toggle; stops any
  other voice before it starts.
- **W5 — `ReadAloud`.** The browser's own synthesiser, Marathi → Hindi →
  English, rendering nothing when the device has no matching voice.
- **B6 — the answer cache.** Ten minutes, keyed by question + picked chunk ids +
  scope + spoken language + the settings row. First questions only, real tiers
  only, quota still counted.
- **V1/V2 — voice input.** `POST /api/transcribe`: size cap → switch → settings
  → Turnstile → quota → Whisper. Nothing stored. The detected language is
  passed to the persona as an explicit hint.
- **B1 — reranking.** Between the over-fetch and `selectChunks`, 1200 ms cap,
  fails open. The cap is above the measured tail (333–898 ms live, and latency
  is the round trip rather than the payload) because a timeout spends the whole
  budget and returns nothing.

**Switched on 2026-09-21.** Grades either side of that date were produced by
different retrieval and are not comparable as one series.

Measured on the live index, top 8 after `selectChunks`, reranked versus not:

| question | items changed |
|---|---|
| Which forts has he trekked? | 3 of 8 |
| How many marathons has he run? | 6 of 8 |
| What has he written about digital detox? | 5 of 8 |
| Which Marathi books has he read? | 5 of 8 |

The marathon question is the clearest: unreranked it returned blog posts and a
presentation about the archive; reranked it returns the `sport` rows — the
races themselves.

**Reranking runs before the cache check, and a cache hit still pays for it.**
The cache key holds the *picked* chunk ids, and which chunks are picked depends
on the reranked order, so the key cannot be built without running it. Keying on
the pre-rerank candidates instead would skip the call, but a hit would then
show sources chosen by a different ordering than the stored answer cited, and
its [1]/[2] would point at the wrong items. One free call per hit is the
cheaper mistake; the generation call, which is the expensive one, is still
saved — `generation 0 ms` in the log.

**Sound belongs to the atlas.** The guide's voice, the ambient beds and
`ReadAloud` all exist only in atlas mode, and the shell now silences the audio
context when it unmounts — switching to classic view or opening `/admin` used
to leave a bed playing over a view with no control to stop it. One voice plays
at a time, across the generated sprite and the browser's synthesiser both.

**Still bare:** single-image fields (`cover_url` on books, `image` on projects)
have nowhere to put alt text — those are plain `text` columns, and giving them
one is a real migration. Only `slideImages` is covered so far.

### Wave 3 — what each one is

- **Reblogs sink in retrieval.** The follow-up wave 2 deferred on purpose:
  `post_kind` existed and `/ask` could not read it, because `hybrid_search`
  returns the chunk body and nothing about the row it came from. The kind is now
  a line in the chunk head (`scripts/ask-sources/microblog.mjs`), which puts it
  in front of the answering model as well as in front of `selectChunks`. It
  **sinks, never drops** — a reblog is still archive and still answers "has he
  mentioned this" — and an unclassified post is not one of the four kinds, so it
  does not move. Nothing changes until the next `npm run ask:index`: the chunk
  text changed, so those rows re-embed.
- **D5 — "if you liked this".** Three books from the same shelf above the
  existing cross-type strip. `related_content_ranked()` has taken `p_types`
  since `0013` and nothing ever passed it. The cross-type strip below now
  excludes books, so the two strips cannot print the same title twice.
- **E3 — autocomplete on `/ask`.** `matchQuestions()` over `question_pool`,
  three characters minimum, every typed word matched anywhere in the question.
  Clicking fills the box and sends nothing — the same rule voice input follows.
  **Not from the conversation log**, which is the better source and is owner-only
  RLS on purpose: every visitor's questions are in `ask_messages`.
- **E5 — reading time.** Arithmetic at 200 words a minute over the ledger's own
  word counts, emitted as `src/data/blogWords.js` by `npm run blogs:wordcount`
  so a list page does not fetch a 128 KB report for one number. A post with no
  counted words shows no label rather than "1 min read". The proposal's
  difficulty band is **not built**: a depth grade nobody can check reads as a
  fact, and Jev grading 107 posts to produce one is spend for a decoration.
- **E4 — `npm run changelog:notes`.** One paragraph per version, written under
  its heading as a blockquote. The blockquote is load-bearing: `/changelog`
  renders markdown wholesale so nothing needed building, and
  `src/lib/changelogEntries.js` reads `-` bullets under `###` headings, so it
  walks past one. The paragraph is then offered **first and pre-checked** in the
  Now editor's "Pull highlights from changelog", because it is already written in
  the words a Now page wants. `--dry-run`, `--limit N`, `--version vX`,
  `--force`. The human gate is git.
- **B2 — `npm run ask:gaps`.** Three independent signals, any one of which makes
  an answer a gap: retrieval found nothing, the grader called the refusal wrong,
  or a reader pressed thumbs down. Only the first is always present — grades and
  thumbs are both sparse — so it carries the report. Repeat askings collapse on
  a normalised question, so one starter chip clicked forty times is one gap and
  not forty. Gemini groups the list into themes and says what the archive would
  need; **the list is the report and the clustering is the extra**, so a failed
  model call still writes the file. Report only, into `knowledge_base/`.

---

## Shared groundwork

`scripts/lib/gemini.mjs` — the only new model-calling code for scripts. It does
not contain a Gemini fetch: `src/lib/askTiers.js` already holds the provider
registry and its `gemini` provider reads `GEMINI_API_KEY` off a plain `env`
object, so the same ladder `/ask` answers with runs unchanged in node. The
`workers-ai` rungs below it throw `no AI binding` there and the ladder falls
through, which is correct rather than a branch to write.

Exports: `tiersForFeature(supabase, key)` (the switchboard check plus the live
ladder — exits with a message rather than throwing, because this is the top of a
script), `loadTiers(supabase)`, `askGemini({ tiers, system, prompt })` (one call,
4.5s minimum gap for the ~15 RPM free tier), `parseJson(text)`.

`functions/api/assist.js` — one owner-only endpoint, three tasks (`draft`,
`tags`, `alt`), each naming the switch that allows it. Named `assist.js` at
`functions/api/` rather than under `functions/api/ask/` for the same reason as
`ask-eval.js`. The `alt` task filters the ladder to Gemini rungs before running:
`askTiers` maps a multimodal part list down to its text, so a Workers AI rung
would describe an image it never saw, just as confidently.

---

## Log

### 2026-09-22 — wave 3 (post_kind in retrieval, D5, E3, E5, E4, B2)

- **No migration.** Every item reads a column, a settings field or a file that
  already exists.
- Two new switches, both default off: `release_notes`, `archive_gaps`.
- `src/data/blogWords.js` is generated by `npm run blogs:wordcount` — do not
  edit it by hand.
- `npm run ask:gaps -- --dry-run --days 365` over the live log: 127 answers, 10
  distinct questions the archive did not answer, all of them graded
  over-refusals rather than empty retrievals.
- **Not yet run:** `npm run changelog:notes`, and `npm run ask:gaps` with the
  model. Neither switch is on in the live row.
- **Pending:** `npm run ask:index`, without which reblogs do not sink — the
  chunk text carrying `post_kind` is not in the index yet.

### 2026-09-21 — wave 2 (C3, E1, E2, C2, W1, W5, B6, V1, V2, B1)

- Migrations `0025` (post_kind + microblog_on_this_day), `0026` (voice quota)
  and `0027` (rerank_ms + from_cache on ask_messages), all applied.
- Four new switches: `microblog_kind`, `answer_cache`, `voice_input`, `rerank`.
  All default off, and the live row has none of them yet.
- `scripts/lib/workersAi.mjs` is now the one Workers AI call for scripts; the
  indexer's own copy was removed in favour of it.
- `BEATS` moved to `src/atlas/guide/guideBeats.js` so the audio script can read
  the lines in node — `guideScript.js` imports `mapRegions`, which node cannot
  resolve and the script has no use for.
- **Not yet run:** `npm run microblog:classify` against production.

### 2026-09-21 — phases 1–6

- **Switchboard** (`0024_ai_features.sql`, `askConfig.js`, `AskSettingsEditor.js`,
  `useAiFeatures.js`): one jsonb column, one admin card, checked in the endpoint
  and in every script.
- **D1** shipped and run: 97 written, 1 failed, 0 skipped.
- **A2, A1, A3** shipped behind their flags in `/admin`.
- **A5, C1** shipped as scripts, not yet run against production.
- Migration `0024` must be applied before the switchboard can be saved.

---

## Open questions carried from §6 of the proposal

- **Gemini daily headroom.** Worth measuring current usage from `ask_usage`
  before C1 runs over the untagged micro-posts — that is the first pass here
  measured in hundreds of calls rather than dozens.
- **Where generated content is disclosed as generated.** A drafted description
  the author edits is his. A tag description nobody reads before it ships is
  not. Currently undecided; D1 writes into a field the admin UI shows, which is
  a review path but not a disclosure.
- **Alt text for single-image fields.** Covered for `slideImages` because that
  column is jsonb. `cover_url` and `image` are plain text and would each need a
  sibling column.
