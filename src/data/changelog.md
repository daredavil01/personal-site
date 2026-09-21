---
---
# Changelog

All notable changes to this project are documented here.
Versioning follows the semver-style rules in CLAUDE.md: major for new pages/refactors/redesigns,
minor for features and content additions (at most one minor version per calendar week),
patch for fixes and tweaks.

---

## [v18.2.1] — 2026-09-21

### Fixed

- **Now-month changelog highlights** (`src/lib/changelogEntries.js`): imported the changelog URL statically so Cloudflare Pages serves the asset without a failing runtime module request.

## [v18.2.0] — 2026-09-22

### Fixed

- **`/ask` retrieval returned confident, unrelated items** (`supabase/migrations/0023_ask_retrieval_relevance.sql`): a Jev-graded run of 106 logged answers failed 79 of them, and the cause was not the model. Three faults, each measured against the live database. **`match_score` carried no relevance** — every query returned the same ladder, `0.0196, 0.0192, 0.0189…`, because RRF fuses rank positions and threw `ts_rank_cd` away, so nothing downstream could tell a perfect match from a junk one. **The keyword half had no floor**, so a question the archive cannot answer still filled all eight slots. And **`to_tsvector('simple')` does not stem**, so `trekked` never matched `trek` and `marathons` never matched `marathon`: live, "Which forts has he trekked?" retrieved zero trek chunks and "How many marathons has he run?" retrieved zero race chunks. The migration adds a second generated column, `fts_en`, stemmed with the `english` config and matched *beside* the existing `simple` one rather than replacing it — `simple` is the reason Marathi works at all — floors the keyword half on a normalised `ts_rank_cd` (flag 32, so the number means the same thing across queries), and returns `kw_score` and `sem_score` so the two halves can be told apart. No re-embedding: only the tsvector side changed.
- **Trek, race and book chunks were metadata and nothing else** (`scripts/ask-sources/trek.mjs`, `sport.mjs`, `book.mjs`): `Trek: Rajgad | Duration: 3 hrs | Endurance: Medium` is six terms, none of them the words a reader uses — the word "fort" appeared in no trek body on the site. A six-term document cannot out-rank `changelog.md`. Each row now also carries one plain sentence saying what it is, built only from columns the row actually has: the race sentence takes its distance from the row rather than calling a 10 Kms run a marathon. 96 rows re-embedded.
- **The prompt contradicted itself about citations** (`scripts/build-docs.mjs`): the generated archive card carried its own "Answering rules" section, shipped in the same message as the `## Rules` block in `functions/api/ask.js`. One said "cite by naming the item; the interface renders the links itself", the other "cite with the item's number in square brackets". 21 of the 106 graded answers were tagged `formatting` for citing nothing at all. The card also told the model to say what the archive does cover when the items fall short — the gap-narration the rules ban outright. The card now describes the corpus; the rules live in one place.

### Added

- **Reblogs stop answering for him** (`src/lib/askRetrieval.js`, `scripts/ask-sources/microblog.mjs`): `post_kind` has been on the micro-blog row since `0025` and `/ask` could not see it — `hybrid_search` returns the chunk body and nothing else about the row. The kind now rides in the chunk head, so a quote, a reblog or a bare link sinks below his own posts in every answer, and the answering model can see which is which instead of being asked in prose to remember. It sinks rather than drops: a reblog is still archive, it still answers "has he ever mentioned this", it just stops being quoted back as his position. Unclassified posts are not one of the four kinds and do not move. Takes effect on the next `npm run ask:index`.
- **"If you liked this" on a book page** (`src/pages/BookPost.js`, `src/components/Ask/RelatedContent.js`): the related strip has always been able to narrow by type — `related_content_ranked()` has taken `p_types` since `0013` and nothing passed it. A book page now opens with three books from the same shelf, above the cross-type strip, and the cross-type strip drops books so the two never print the same title twice. No model call: these are the vectors `npm run ask:index` already wrote.
- **Autocomplete on `/ask`** (`src/lib/askQuestions.js`, `src/components/Ask/AskChat.js`): typing three characters offers the pool questions that match, by word and anywhere in the sentence — nobody types a question from its first letter. Clicking one fills the box and sends nothing, the same rule the microphone follows. Drawn from `question_pool`, not from the conversation log: `ask_messages` is owner-only RLS on purpose and every visitor's questions are in it.
- **Reading time on a post** (`src/lib/readingTime.js`, `src/pages/BlogPost.js`): 200 words a minute over the word count the nightly ledger job already fetches, now emitted as a small generated module (`src/data/blogWords.js`) rather than read from a 128 KB report a page should not download. A post the crawler has not seen has no label instead of a wrong one. The proposal's other half — a "difficulty" band — is deliberately not built: a depth label nobody can check reads as fact.
- **Changelog summaries, written for readers** (`scripts/summarise-changelog.mjs`): `npm run changelog:notes` writes one plain paragraph under each version heading, as a blockquote — so `/changelog` renders it with no component work, and the parser that feeds the Now editor walks past it. The engineering entries stay exactly as they are; this is the version of them that does not open with `ts_rank_cd`. `--dry-run`, `--limit`, `--version`, `--force`, and the human gate is git: it edits a tracked file and nothing ships until the diff is read.
- **The summary is offered to the Now page** (`src/lib/changelogEntries.js`, `src/pages/admin/now/NowMonthEditor.js`): "Pull highlights from changelog" now lists that version's reader-facing paragraph first, pre-checked, beside the individual entries. It is already written in the words a Now page wants, which is what every engineering bullet under it has to be trimmed into by hand.
- **The archive gap report** (`scripts/archive-gaps.mjs`): `npm run ask:gaps` reads the questions readers actually asked and the answers that found nothing, were graded an over-refusal, or got a thumbs down, collapses repeat askings, and has Gemini group them into themes with one line each on what the archive would need. Report only — a JSON in `knowledge_base/`, no row touched, because deciding what to write next is not a model's call. `--dry-run` skips the model and still prints the list, which is most of the value.
- **Complete lists are written out, not buried** (`functions/api/ask.js`): `site_facts().roster` has always held every book, trek, race, project and deck, and the prompt has always said to use it — inside an 11 KB single-line JSON blob. 30 of 35 enumeration and recency questions failed anyway, refusing questions whose full answer was sitting in that blob. When a question plainly asks for a list or for the newest of something, that roster is now lifted out and rendered as lines, and refusing is stated to be wrong when one is present. Deterministic, by regex over the question: a model call to classify it would put a metered dependency on a public, anonymous endpoint.
- **A per-type slot cap** (`src/lib/askRetrieval.js`): `perEntity` capped chunks per *entity*, so eight different micro-posts broke no rule and still took every slot — and micro-blog is 1,664 of 2,969 chunks, which wins on base rate alone. At most three items may now share a type unless the question or the chips asked for it. `typesNamed()` reads the subject out of a question in English and Marathi, and is used again for the rosters and for the admin filter below.
- **Keyword floor as a setting** (`/admin/ask/settings`): `semantic_floor` has been editable since 0019; its twin now is too, because the right value depends on the corpus and finding it should be a slider rather than a deploy.
- **Retrieval is visible in the log** (`src/pages/admin/AskConversations.js`): each source card now carries `kw`/`sem`, and a **Retrieval missed the subject** filter lists answers whose question named a content type that none of its sources were. That is the exact shape of this bug, and it was invisible here for a month because nothing compared the question's subject against what came back.

- **One switchboard for every AI feature outside `/ask`** (`supabase/migrations/0024_ai_features.sql`, `src/data/askConfig.js`, `src/pages/admin/AskSettingsEditor.js`): five new features all call a model, and each would otherwise have decided for itself whether it was allowed to. `ask_settings.ai_features` is one jsonb column on the row that already holds the ladder, the caps and the persona — a master switch plus one key per feature, rendered as a card at `/admin/ask/settings`. Default `{}` means **off in both directions**: an untouched deployment runs nothing, and a settings read that fails falls back to `DEFAULT_ASK_SETTINGS`, where every flag is false, so an unreachable database switches the machine off rather than on. Enforcement is in the endpoint and in `tiersForFeature()` — a script answers to the same switch as the button, or turning a feature off would stop the button and leave the next batch running. The admin hook only hides controls the server would refuse anyway.
- **Gemini-backed tag descriptions** (`scripts/describe-tags.mjs`, `scripts/lib/gemini.mjs`): `tags.description` has existed since `0003`, `TagManager` has edited it, `/tags` and `/tags/:name` have rendered it and `ask-sources/tag.mjs` has indexed it — and it was empty, so the tag pages were a bare list. `npm run tags:describe` fills it from each tag's *own* items, read through the existing `tag_entities()` RPC, so the sentence says what the tag covers on this site rather than what the word means in general. 97 of 98 tags described. `--dry-run` writes nothing, `--force` rewrites existing text and the default skips it, so a hand-written description is never clobbered; a tag with no items is skipped rather than described from nothing. The shared helper contains **no second Gemini fetch**: `src/lib/askTiers.js` already holds the provider registry and its `gemini` provider reads `GEMINI_API_KEY` off a plain `env` object, so the same ladder `/ask` answers with runs unchanged in node — the `workers-ai` rungs throw `no AI binding` there and the ladder falls through, which is the behaviour wanted rather than a branch to write.
- **A Draft button on long-text admin fields** (`functions/api/assist.js`, `src/pages/admin/FormField.js`): a field marked `aiDraft: true` in `resources.js` gets a button that fills it from the row as the form currently holds it, plus the three longest existing values of the same field as style examples. Owner-only, because `GEMINI_API_KEY` is a Cloudflare secret and cannot be reached from the page — the endpoint verifies the caller with the same `is_owner()` RPC the RLS policies use, then checks the switch, before a token is spent. The draft only ever lands in the input; nothing is saved until Save, which is why a bad draft costs a keystroke and needs no confirmation.
- **Tag suggestions on save** (`functions/api/assist.js`, `src/pages/admin/FormField.js`): a `tags` field marked `aiSuggest: true` gets a Suggest button — confident names are added to the input, plausible ones offered as dismissible chips. **A model cannot invent a tag here:** the answer is intersected with the live `tags` table and the *stored* spelling is returned, so a title-cased answer cannot create a duplicate and creating a tag stays something a person types on purpose. Writes are unchanged — `set_entity_tags` on Save, exactly as for a typed tag. On every tag field on the site: books, races, treks, projects, decks, photos, blog posts and micro-posts — the last of which needed its own wiring, because `MicroblogManager` keeps its own field list rather than a `resources.js` entry. Not on `techStack` or resume skill `category`, which are not central tags. The whole 98-name vocabulary goes into the prompt rather than an embedding shortlist: a few hundred tokens against an embedding call, a similarity query and a threshold to tune.
- **Alt text written at upload** (`functions/api/assist.js`, `src/pages/admin/FormField.js`, `src/components/Instagram/ImageSlider.js`): there was no alt-text story on the site at all — `ImageSlider` fell back to the caption, which is written for someone who can already see the picture. `slide_images` is jsonb, so `alt` lives beside `url` and `caption` with **no migration**. The sentence is written from the compressed bytes the browser already holds rather than by fetching the URL back, an existing sentence is never overwritten, and a failure is silent because the upload itself worked and the field is right there to type into. The task filters the ladder to Gemini rungs first: `askTiers` maps a multimodal part list down to its text, so a Workers AI rung would describe an image it never saw, just as confidently. Single-image fields (`cover_url`, `image`) are still bare — those are plain `text` columns and would each need a sibling.
- **Book metadata proposals** (`scripts/propose-books-metadata.mjs`): `npm run books:propose` slots in as step 2.5 of the existing `books:template` → `books:apply` pipeline, writing into the same template JSON so the human gate is unchanged. Aimed at what the API backfill cannot reach — the Marathi half of the shelf, which no book API indexes. It never proposes `cover_url`, because a hallucinated ISBN is visible in review while a hallucinated image URL is a 404 that `books:apply` would try to download, and an ISBN that is not 10 or 13 digits is dropped.
- **Micro-blog bulk auto-tagging** (`scripts/tag-microblog.mjs`): the Tumblr import only wrote tags "for posts that have them", so a large share of the 1,600+ rows carry none and are invisible to `/tags`, to the `?tags=` filter and to `microblog_tag_facets()` — machinery that is built and starved of data. `npm run microblog:tag` tags them against the central vocabulary through `set_entity_tags`. Reversible on purpose: every real run writes a journal of each row's tags before and after, and `--undo <file>` replays it backwards. Resumable too — a row that already has tags is skipped — which matters when ~15 requests a minute makes this a long run.
- **`docs/ai-features-status.md`**: which items from `ai-features-proposal.md` are built, which switch each one answers to, and the standing decisions behind them — Gemini is primary for new AI features (and already rung 1 of the `/ask` ladder), the judge ladder keeps Jev at rung 1 because `askJudge.js` thresholds against its calibrated probabilities, everything is batch or owner-only so nothing adds a model call on the visitor path, a model may never invent a tag, and generated text is always a draft a human approves. Hand-written; `docs:build` never touches it.
- **"On this day", but semantic** (`src/components/MicroBlog/OnThisDay.js`, `supabase/migrations/0025_microblog_kind_and_on_this_day.sql`): today's date in an earlier year, shown above the micro-blog list with its nearest echoes from the `/ask` index — "what you were thinking about the last time you wrote about this", not "a year ago today". **No model call anywhere**: `related_content_ranked()` reads vectors `npm run ask:index` already wrote, and the seed comes from one small RPC because PostgREST cannot express `extract(day from date)` as a filter. Hidden while a filter is on, and a date the archive is silent on renders nothing rather than an empty shelf. Echoes with no words are dropped — 59% of the Tumblr import is photo posts whose images never arrived, and their wordless chunks sit near-identically close to everything.
- **A 404 that suggests where you meant to go** (`src/pages/NotFound.js`): the path is turned into the words it was reaching for and run through `hybrid_search` with a **null embedding**, which the RPC has always accepted as its keyword-only degraded path. One anon call from the browser — no endpoint, no key, no quota, no model — offering the three nearest real pages. The page decodes before it splits, because tag URLs are URI-encoded rather than slugified and a Marathi path would otherwise be searched as `e0 a4 bf`.
- **Near-duplicate detection for the micro-blog** (`scripts/find-duplicate-microposts.mjs`): `npm run microblog:dupes` walks the archive through the same `related_content_ranked()` RPC and reports pairs above a cosine threshold. Report only — it writes a JSON to `knowledge_base/` and changes nothing, because deciding that two posts are the same thought is a judgement. Posts too short to compare are skipped rather than matched against each other.
- **Own thought, quote, reblog or link** (`supabase/migrations/0025_…`, `scripts/classify-microposts.mjs`, `src/pages/MicroBlog.js`): `CLAUDE.md` tells the `/ask` persona to warn *in prose* that a micro-post may be a reblog rather than a considered position — a warning a model has to remember to give. `microblog.post_kind` makes it structural: the card labels it, a filter narrows to the posts that are actually his, and the admin form can correct a wrong verdict in a dropdown. `npm run microblog:classify` fills it with Gemini JSON behind the `microblog_kind` switch, resumable, with `--dry-run`, `--limit N`, a journal of every value before and after and `--undo <file>`. An answer outside the four is dropped rather than coerced; the CHECK constraint is the backstop. Null means *not classified*, which is not one of the four. The kind filter **narrows** where the other axes widen — "only his own thoughts" is a lens over whatever else is selected, and OR-ing it would put the reblogs straight back.
- **The Atlas guide speaks** (`scripts/generate-guide-audio.mjs`, `src/atlas/audio/audioManager.js`): the four beats in `guideBeats.js` are fixed, few and English, so `npm run atlas:voice` has Workers AI say them once at build time and packs the takes into `public/audio/guide-voice.m4a` (161 KB, inside the same 200 KB budget every other audio file observes). The offsets file is **generated, not maintained** — `sfxMap.js` already carries a "MUST match" comment, and a second pair of files to keep in step by hand is a second pair to get wrong. The sprite loads on first use rather than with the SFX one: a visitor who never meets the guide should not pay 161 KB for it. Gated by the sound toggle that already exists, and only one voice ever plays — starting a beat stops whatever was speaking, including the browser's own synthesiser.
- **Read aloud, where there is a voice for it** (`src/components/ReadAloud.js`): Workers AI has **no Marathi voice at all** — Aura is English and Spanish, MeloTTS is EN/ES/FR/ZH/JA/KO — so half this archive cannot be pre-rendered. The browser's own `SpeechSynthesis` can, on most devices, and costs nothing. Marathi first, Hindi second, English otherwise; the control **renders nothing** when the device has no matching voice, so a Marathi reader never meets a button that does nothing. Atlas mode only, like every other sound on the site.
- **An answer cache on `/ask`** (`functions/api/ask.js`): the same question over the same retrieved chunks now serves a stored answer for ten minutes, keyed by the question, the picked chunk ids, the scope, the spoken-language hint and the settings row — so editing the persona or re-indexing is never masked by a reply the old one wrote. Starter chips are clicked far more often than they are varied, and every hit is a Gemini request not spent. Only for a first question, because a follow-up depends on a thread the key says nothing about; only a real tier's answer is stored, because caching a fallback would keep serving it after the model came back; and the quota is still counted, because the cache saves the call, not the rate limit. Behind the `answer_cache` switch.
- **Voice input on `/ask`** (`functions/api/transcribe.js`, `src/components/Ask/useVoiceCapture.js`, `supabase/migrations/0026_ask_voice_quota.sql`): a microphone beside the composer, Whisper on Workers AI, and the transcript lands **in the box — editable, and nothing sends until Ask is pressed**. A misheard Marathi question that sent itself would spend an answer, log a bad row, drag the judge's pass rate down and read as a broken feature rather than a misheard word. Three standing rules, decided before it shipped: **the audio is never stored** (it exists for one request and is written nowhere), **transcription has its own daily counter** — `ask_quota()` gained a `kind`, so a hot microphone cannot eat the day's answers — and the byte cap is the first gate of all, before the body is even read. Whisper's detected language rides along to the persona as an explicit hint, which is better evidence than the script the visitor typed in: romanised Marathi reads as English today and gets an English answer.
- **Cross-encoder reranking, off by default** (`functions/api/ask.js`, `src/lib/askRetrieval.js`): `@cf/baai/bge-reranker-base` scores *this question against this passage* directly, which is what the retrieval heuristics have been approximating. It sits between the over-fetch and those heuristics, so the chips, the per-type cap and the meta sink all still apply — to a better ordering. Capped at 800 ms and **failing open to today's ordering** on a timeout, an error or a malformed score list: this is the only model call on the visitor's latency path and it must never cost an answer. Behind the `rerank` switch because turning it on redefines what the judge grades, so the date it goes on is the date the grade history splits.
- **The log records reranking and cache hits** (`supabase/migrations/0027_ask_rerank_log.sql`): `ask_log()` explodes its timings blob into named int columns, so a key it does not know about is dropped in silence — the worker had been measuring `rerank_ms` and flagging `cached` and both went nowhere. Two columns on `ask_messages` and four lines of the function. The one feature whose entire purpose is "does this make answers better, and what does it cost" was invisible in the log that would answer it. Measured live: `embed 284 / retrieval 435 / rerank 357 / generation 1624 ms`, and a repeated question logs `generation 0` with `from_cache`.
- **Rerank timeout raised to 1200 ms** (`functions/api/ask.js`): measured against the live model at 24 passages of 700 characters, the call takes 333–898 ms, and latency barely moves with payload size — it is the round trip, not the work. A cap inside that spread spends the whole budget and returns nothing, so it now sits above the tail rather than in the middle of it.
- **Collapsible cards in the admin** (`src/pages/admin/ui/Card.js`): the Ask settings page is nine cards long and most edits touch one. Each is now collapsible, remembered per card so the section someone is working in is still open after a save reloads the page. Opt-in by prop, so every other admin page is unchanged.

### Changed

- **A keyword-only answer says so** (`src/components/Ask/AskChat.js`): when the embedding call fails, only the half of retrieval that matches words runs. The worker has always sent `keywordOnly`, and the admin log has always badged it; the reader was the only one not told.
- **Starter chips name what is newest even with an empty pool** (`functions/api/ask.js`): the two roster-derived chips were appended only when `question_pool` was non-empty — dropping them exactly when the fallback list is most stale.
- **A refusal offers somewhere to go** (`functions/api/ask.js`): with no sources there was nothing to build the browse row from, so the least useful answer was also the one with no next step. It now falls back to the types the question named.

---

## [v18.1.2] — 2026-09-20

### Fixed

- **Jev's provenance in the AI proposal** (`docs/ai-features-proposal.md`): the document named Jev twenty times and never once said whose model it is. `CLAUDE.md`, `docs/ask-evals.md` and this changelog all attribute it to **TypeSafe AI**, so the one doc a reader might open first was the one that did not. It now names TypeSafe AI and its "System One" model in both the capability table and the what-each-model-is-for section, and points at `docs/ask-evals.md` for the two routes — Vercel's AI Gateway, where the free credit is, and `api.typesafe.ai` direct, which is metered.

---

## [v18.1.1] — 2026-09-20

### Added

- **Voice input and output, and verified model ids** (`docs/ai-features-proposal.md`): eleven more candidates — five for speech in, six for speech out, six smaller ones — and the Workers AI catalogue checked rather than recalled. Two findings changed the ranking. **There is no Marathi voice on Workers AI**: Whisper is genuinely multilingual so speech *in* works in both languages, but Aura is English and Spanish and MeloTTS means EN/ES/FR/ZH/JA/KO, which on a site with 21 Marathi books and a persona instructed to answer in the language it was asked in is a design constraint, not a footnote — so the browser's own `SpeechSynthesis` is proposed as the disclosed fallback, shipped alongside pre-rendered audio rather than after it. And **the hard part of voice output is already built**: `src/atlas/audio/` has a WebAudio manager with crossfades, a buffer cache, visibility suspension and an SFX sprite map, gated by a toggle that is off by default and doubles as the autoplay-unlock gesture, with `sfxBus` a no-op until it registers so no audio byte loads for a visitor who never opts in. Giving the Atlas guide — which already speaks, in a bubble — an actual voice is therefore a build-time script and a few offsets in `sfxMap.js`, which moved it to second on the list.
- **`docs/ai-features-proposal.md`**: all three model providers on this deployment — Workers AI, Gemini and Jev — are used in exactly one place, `/ask`, and nothing AI-shaped touches authoring, the detail pages or media. This is the shortlist of what could change that: eighteen candidate features grouped by direction, each with the model that fits it, where the call would run, what it would cost and what it would break. It records the constraints any of them has to obey — nothing heavy at the edge, free by default with metered behind an explicit switch, a new route means a new share card — and ranks six of them by value per unit of risk. A proposal, not a plan of record: nothing in it is built.

---

## [v18.1.0] — 2026-09-20

### Added

- **A custom share card for every route** (`src/lib/og/`, `scripts/og-preview.mjs`, `public/og/`): 17 of the 20 routes in `pageMeta.js` unfurled with the same 400×400 `logo.png`, `/`, `/about` and `/resume` shared one 889×889 portrait, and `/tags/:name` was indistinguishable from `/tags` — all of it square, while the site declared `twitter:card=summary_large_image`, so every platform that crops to 1.91:1 letterboxed it.
  Every fixed route now has its own 1200×630 card, generated by `npm run og:fallbacks` and committed to `public/og/`. Each section gets a bespoke figure rather than a shared template, so a card is recognisable before its text is readable: a shelf of spines for books, a ridgeline hashed from fort names for treks, a distance dial and three personal bests for races, a swatch cloud coloured by each tag's own hue, a hundred-dot grid for the offload challenge, a contact sheet of real photos for Instagram and projects, and twelve months of real word counts for the writing ledger. The numbers come from the same `/api/stats` snapshot the `/stats` page renders, so a card cannot disagree with the page it summarises — and a stat with no value is omitted rather than rendered as `0`.
  A detail route unfurls with **the item's own photo** — the trek's, the race's, the project's cover, the micro-post's image — and with its section's card when the item has none, which is every book, blog post, deck, tag and shared conversation. Cards are built with a small `h()` hyperscript rather than JSX, and `og:image:width`/`height` are declared only for our own cards, never for a photo whose shape we do not know.
- **A guard that stops a route shipping without meta or a card** (`src/data/routeManifest.js`, `src/data/routeManifest.test.js`, `src/data/routeScrape.js`): one declarative entry per route, asserted by set equality against `src/App.js`, so adding *or deleting* a route without updating the manifest fails CI. It also checks that there is a committed PNG on disk behind every route — its own card for a fixed route, its section's for a detail route — and that no nav entry points at a route that does not exist. Jest with no network, deliberately: `docs:build` needs live Supabase credentials and so cannot run in CI, which is how `docs/routes.md` drifted out of date in the first place.
- **`docs/og-cards.md`**: how the cards are generated, why nothing renders at the edge, the WebP trap, the Devanagari limitation, and a machine-readable development-status block.
- **A judge for the second brain** (`supabase/migrations/0022_ask_auto_evals.sql`, `src/lib/askJudge.js`, `functions/api/ask-eval.js`, `src/pages/admin/AskConversations.js`): grading one answer honestly means re-reading the sources it was written from, which is why almost none of the log had ever been graded. `/admin/ask/conversations` now has a **Grade N** button that sends whatever the filters have selected — ungraded only, newest first, capped — to **Jev**, TypeSafe AI's System One model. It answers typed questions with calibrated probabilities and generates no prose at all, so it cannot hallucinate a verdict or return a type error, and it costs $0.042 per million input tokens with output free.
  Four dimensions: groundedness, retrieval quality, refusal appropriateness, and link and format compliance — except the last one never reaches a model. `sanitiseAnswer` already decides it exactly and for nothing, and the arithmetic in it is the one thing this model cannot do. The question that carries the most weight is a single four-way choice between answering with support, answering without it, refusing when the extracts held the answer, and refusing correctly: it separates the two failures that matter on an archive, and a choice is what this kind of model is best at. Nothing asks "how many" or compares dates, because it cannot count and reads dates as text — a test fails if such a phrase is reintroduced.
  **Groundedness is judged against chunk text re-fetched from `content_chunks`**, because `ask_log` only ever stored the source *cards* — the text the answering model actually read was never logged. Re-indexing may have moved it since, which is a real limit on an old row and is written down rather than papered over.
  Jev cannot explain itself, so `eval_notes` gets the per-dimension numbers and never an invented reason, and a second button escalates only the low-confidence rows to the free Gemini rung for one sentence appended underneath. Its confidence is genuinely calibrated where a language model's is not, so that is what the design leans on: the confident tails are acted on, and the middle band is always tagged `needs-review` rather than believed.
  **A grade you typed yourself is immutable**, and not by convention — the write is a PostgREST `PATCH … &evaluated_at=is.null`, so a row graded by hand between the select and the write does not match and nothing happens. When you later re-grade a row the judge did, its verdict survives in `eval_auto` instead of being overwritten, which is the only reason the new **Judge agreement** tile can exist. Finding out how often the machine agrees with you is the whole point of running it, and one set of columns cannot record a disagreement.
  Off by default (`ask_settings.auto_eval_enabled`, edited at `/admin/ask/settings`) behind gates that all fail closed: an owner proved by the existing `is_owner()` RPC called with their own access token, the flag, a key on the deployment, the row's state re-checked in the database, and a monthly token budget reserved *before* the call by `ask_eval_budget()` — reserve first and check second, the same shape as `ask_quota()`. An unreachable spend counter refuses the run, because an uncapped spender is worse than a broken button. The confirm dialog states the count, the tokens and the remaining budget first, from an estimate that reads the rows and calls nothing. A test asserts that no judge host is fetched on any refusal path.
  **The judge has a ladder of its own** (`src/lib/askJudgeTiers.js`), because Jev is metered and the gateway's free credit may not cover it: `jev` → Gemini's free tier → the Workers AI allowance, tried in order, same row shape as the answer ladder and edited in the same place. The two free rungs are language models answering the same rubric as JSON, and they need no new key at all — `/ask` already answers on both — so **grading costs nothing even with no Jev key on the deployment**. What that buys is worse than what it replaces and is labelled rather than hidden: only Jev returns calibrated probabilities, and the review threshold was chosen on that basis, so a grade from a fallback rung is tagged `judge-fallback` with `calibrated: false` recorded beside it.
  **`auto_eval_allow_metered` is off by default**, and that is what makes $0 a property of the code instead of a promise: a rung billed per token is filtered out of the ladder before anything runs, whether or not its key is present and whether or not its row says enabled. A test asserts it. When nothing usable can cost anything the monthly token budget is skipped as well, since a cap on free work only stops free work. Setting the metered rung loose is one switch, and then the numbers apply: about $0.0002 an answer, a penny for a full press, the whole back catalogue under a dollar, against a default cap of two million tokens (~$0.08) and a $5-per-30-days gateway credit worth about 119 million. Buying gateway credits would permanently end that free allowance, so nothing here can ever need a top-up.
  The gateway turns out not to be a drop-in either — Vercel serves evaluation through the AI SDK only, with `boolean` questions and index-keyed score probabilities where TypeSafe's own endpoint takes a plain POST with `noul` — so both dialects are implemented and normalised, and neither reports a confidence field, which is derived from how peaked the distribution is instead. A missing confidence must never quietly read as certainty.
- **Versioned grades, and a Re-grade button** (`src/lib/askJudge.js`, `functions/api/ask-eval.js`, `src/pages/admin/AskConversations.js`): a rubric is not a constant, and the first change to one made that concrete — every grade already recorded meant something slightly different from every grade after it, while a pass-rate chart pooled them silently. Each machine grade now carries the `rubric` and the `model` that produced it, and a grade made by either an older rubric or a rung that no longer answers is *stale*: there is a tile counting them, a filter for them, and a **Re-grade N** button whose label says how many of the current selection are out of date. The page holds no opinion of its own about what "current" means — the endpoint returns both halves — so the two can never disagree.
  Re-grading runs the whole filtered set rather than the stale part and ignores the per-press cap, because it is what you do after changing the rubric or adding a key and doing it fifty at a time would leave the corpus a mixture of two rubrics for as long as it took to finish. The browser still slices it into CPU-sized requests and sums the pre-flight estimate across the slices, so the dialog stays honest without inventing a second cap.
  **On a row you graded by hand it writes `eval_auto` and nothing else** — not the verdict, not the score, not the tags, notes or `evaluated_at`. That is not a concession, it is the point: a hand-graded answer the judge has never seen is the most valuable row in the log, because re-grading it puts a machine verdict beside yours without touching yours, and that is the only way the Judge agreement number is ever obtainable. Both write rules are PostgREST filters on the PATCH rather than branches in the endpoint, so Postgres refuses rather than the code remembering to, and the toast counts those rows separately so a re-grade cannot read as having overwritten anything of yours. The grade a re-grade replaces is kept in `eval_auto.history`, five deep, as a summary rather than a second copy of the record.

### Changed

- **The evals export carries an id** (`src/lib/api/askConversations.js`): every exported line was unjoinable to the row it came from, which is exactly what comparing a machine grade with a hand-written one needs. It now carries `message_id` and `message_uuid`, plus who graded it and the machine's own record.
- **`/tags/:name` finally has its own metadata** (`functions/_middleware.js`, `buildTagMeta`): it was only ever in the static-parent fallback list, so every tag page unfurled with `/tags`'s title, description and image. It now resolves the tag row and builds real meta — its own title, its own description, and the tags card as its image — with the URI-encoded, un-slugified name decoded before lookup so Devanagari tags resolve.
- **`og:type` is derived instead of hardcoded** (`src/data/pageMeta.js`, `functions/_middleware.js`, `src/components/Template/PageMeta.js`): both layers emitted `website` for every route on the site, including every article. Detail pages are now `article` and `/`, `/about`, `/resume` are `profile`.
- **`og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image:alt` are now emitted** by both meta layers. Without dimensions, platforms guess at the crop; without alt text a card is invisible to a screen reader. `og:site_name` is deliberately emitted by neither, because `index.html` already carries it and a second copy was appearing on every page.
- **`buildShareMeta` takes an image** (`src/data/pageMeta.js`): it had no `image` parameter at all and hardcoded the logo. Every builder now returns a complete `{ title, description, image, imageAlt, type }`, and each falls back to its own section card rather than to a generic logo — so a failed lookup still unfurls as the right section.
- **The middleware resolves an item's photo in one place** (`functions/_middleware.js`): the storage-URL string-building that was duplicated inline five times is gone, replaced by two shared helpers, and a project now prefers its cover over its first screenshot exactly as its page does. This layer also has its first test (`functions/_middleware.test.js`, 11 cases) — it is the only meta layer a crawler sees, since crawlers do not run JS, and it had none.
- **Cards are generated, not rendered at the edge** (`scripts/og-preview.mjs`, `functions/api/og/` removed): the first version of this rendered each card on request with satori and resvg inside a Pages Function, behind an edge cache. Workers Free allows 10 ms of CPU per request and a render costs ~400 ms, so production exceeded the budget and links unfurled with **no image at all** — worse than the logo it replaced. `wrangler pages dev` does not enforce the limit, which is why it passed locally. The endpoint, its 2.4 MB vendored wasm and the `OG_MODE` switch that existed to retreat from it are all gone; satori and resvg are devDependencies, the Pages Functions bundle is down to 104 KB, and the card fonts moved out of `public/` to `scripts/og-fonts/` since nothing serves them. Nine per-entity layouts are in git history if per-entity cards are ever wanted — pre-rendered under Node, not at the edge.
- **`seededRandom` is exported from `src/lib/generativeArt.js`** so card figures seed themselves the same way post art does, instead of shipping a second copy of the PRNG.
- **`docs/routes.md` is generated from the route manifest** and gains a share-card column; `scripts/build-docs.mjs` and the guard test now share one route scraper.
- **satori is pinned to 0.32.0, knowingly** (`package.json`): 0.33 added HarfBuzz and renders Marathi conjuncts correctly, but cannot run on Workers at all — its Emscripten glue resolves its own wasm from a script directory that does not exist there, and Workers prohibit compiling fetched wasm. The pin stays for now because no generated card carries Devanagari — all 23 are English — but the constraint that forced it is gone along with the endpoint, so the upgrade is open. `docs/og-cards.md` records it.

### Fixed

- **The judge could not see an over-refusal, which is the fault it was built to find** (`src/lib/askJudge.js`, rubric `r1` → `r2`): reading the 98 grades it had produced showed eleven answers that refused outright and were passed as "refused correctly", four of them unambiguously wrong — "which forts has he trekked" refused against a roster naming all twenty, "the latest micro-post" refused with `latest` sitting in the facts card. Each was correct *by the rubric* and wrong in fact, because the state carried only the extracts: what retrieval found, and nothing whatever about what it missed. From inside the extracts, a question this archive cannot answer and a question its search failed on are the same thing. The state now carries one line from `site_facts()` naming what the archive holds and which types it can enumerate completely, and a new question asks whether the archive holds the kind of thing being asked for; a refusal that contradicts it fails as `over-refusal` whatever the disposition said. One line and not the rosters themselves — every title would be thousands of tokens of the padding this model is worst with — and when `site_facts()` cannot be read the block is left out and the question stops counting, because a judge told nothing about the archive must not conclude the archive holds nothing. The documentation's claim that the extracts-only inference was "the one sound inference" was wrong and is retracted in place.
- **A double space was reported as an invented URL** (`src/lib/askJudge.js`): the free link check asked whether `sanitiseAnswer` changed the answer, but that function tidies whitespace on *every* answer, link or no link, as its last two steps. So any answer containing a double space or a trailing space differed from its sanitised form and was flagged `bad-link` — two of the first twelve flags, on answers carrying no URL at all. The comparison is now made against text that has already had the same tidy applied. The ten genuine catches stand, including an answer that linked the words "Ghangad Fort" to a book cover image, which is exactly the failure `askFormat.js`'s separate allow-lists for links and images exist to prevent.
- **The citation check was asked of a model that could do arithmetic instead** (`src/lib/askJudge.js`): across the same 98 answers the model agreed with a regex for a bare `[n]` 84% of the time, and every one of the sixteen disagreements was it missing a citation that was plainly there — which is what put a `formatting` tag on 36 rows. It is now computed, like the link check, and only where a citation was possible: a refusal has nothing to attribute and is no longer faulted for not attributing it.
- **A fallback rung's confidence was read as certainty** (`src/lib/askJudge.js`): 63 of the 98 grades came back at exactly 1.00 with a median of 1.00, so `needs-review` fired **once** and both the low-confidence filter and the Gemini escalation had nothing to work on. A number that is 1.00 two thirds of the time is a verbal tic rather than a measurement. On an uncalibrated rung only, a claimed confidence at or above 0.95 is now discarded as unstated and a margin stands in its place — how far each dimension that decided the verdict sits from the exact threshold it was compared against, weakest wins — so a grounding of 1.02 against a line at 1 reads as the coin toss it is. Jev's probabilities are calibrated and are still taken at face value, which is the whole reason it is the top rung.
- **A detailed answer could be graded as a wrongful refusal** (`src/lib/askJudge.js`): the same run applied "refused wrongly" to nine answers of which only three were refusals — one was a correct, cited answer about 51 books across ten categories. An answer that cites its extracts is not one refusing them, so when the classification and the text disagree it is now the classification that gets doubted: it stops deciding the verdict, confidence is capped, and the row goes to a human instead of carrying a confident wrong grade.
- **The judge said "nothing is ungraded" when it could not read the log at all** (`functions/api/ask-eval.js`): `restHeaders(..., { serviceRole: true })` falls back to the anon key when `SUPABASE_SERVICE_ROLE_KEY` is absent, and `ask_messages` is owner-only, so every candidate query came back `200 []` — indistinguishable from a selection where everything had already been graded, and it sent you looking in exactly the wrong place. The endpoint now refuses up front when that key is missing, the way `functions/api/share.js` always has, and an empty batch is diagnosed rather than guessed at: a second query without the filters decides between a log it cannot see, rows that are genuinely all graded, and ids that are questions rather than answers. The admin toast says which.

- **A card could render completely blank** (`src/lib/og/primitives.js`): `Frame`'s bleed slot was in normal flow, so a layout that passed a full-size `position: relative` element there consumed the frame's flex row and pushed the entire content column off the canvas. The slot is now always taken out of flow and sized to the card, so no layout has to remember.
- **`/stats` drew its sparklines on top of its numbers** (`src/lib/og/layouts/page.js`): the six-tile number wall was 1000px wide while the charts sat at `right: 64`, so the third column ran underneath them and "CERTS" was unreadable. The wall is constrained to the left column and the charts are narrower.
- **Two cards drew empty placeholders** (`src/lib/og/layouts/page.js`): `/instagram` and `/projects` padded their contact sheets out to six tiles whether or not there were six photos, so the cards whose whole subject is images showed rounded grey rectangles that read as a gallery which had failed to load. Only real photos get a tile now, and the generator fetches them — plus, `resvg` cannot decode WebP and `/admin` writes `.webp` whenever a source image has transparency, so it checks each image's content type and skips the ones that would silently draw nothing.
- **The books shelf read as a bar chart** (`src/lib/og/layouts/figures.js`): the live stats payload supplies eight genres where the fixture had fourteen titles, and eight spines that wide are a column chart. Short lists are expanded the way the ridgeline expands a single fort name, so the shelf is still derived from this library and still deterministic.
- **The tag cloud was one colour** (`src/lib/og/layouts/figures.js`): it read `tag.color`, and almost no tag has a colour stored, so all 44 swatches came out the same violet and the card lost the only thing it was drawing. It now goes through `colorForTag`, which hashes a hue from the name — the same resolution `/tags` and the micro-blog pinboard use. A last row holding one or two swatches is dropped, since it read as a stray dot below the block.
- **The writing-ledger card invented its own figures** (`src/lib/og/layouts/page.js`): it drew a hardcoded five-bar series on the one card whose entire subject is counting words. It now reads `public/data/writing-ledger.json` — the same file the ledger page fetches — for twelve real months, plus the real word, post and average counts.
- **`topBookTags` was read as objects** (`src/lib/og/model.js`): `/api/stats` returns `[name, count]` pairs, so `t.name || t` fell through to the pair itself and hashed a stable spine by accident rather than by design.
- **Every card-backed link unfurled with no image at all** (`src/lib/og/paths.js`, `functions/_middleware.js`, `src/components/Template/PageMeta.js`): `pageMeta.js` is import-free by contract, so it hard-codes `SITE_URL` and every card URL came out as `https://sankettambare.in/og/<slug>.png`. On a Cloudflare Pages preview that card exists on the preview but not yet in production — and a path with no file behind it does not 404, Pages answers it with the SPA shell as `200 text/html`. Scrapers fetched an HTML page where an image should be and showed nothing, which looks exactly like a broken card. Card URLs are now re-hosted onto the origin actually serving the request, so a preview advertises its own cards; `canonical` and `og:url` stay on the real site, and a row's own photo is left alone because a Supabase URL is correct from any host. Found by a real WhatsApp share, not by a test — every test passed because they all requested the production host, and they now request a preview host too.
- **The Writing Ledger still unfurled as the old square logo** (`public/writing-ledger.html`): its card was generated, reviewed and documented, but the page's hand-authored tags were never pointed at it. That page is invisible to the middleware — it early-returns on any path containing a dot — so nothing else could have fixed it. It now carries `/og/writing-ledger.png` with dimensions and alt text.
- **`.dev.vars` is now gitignored** — wrangler reads it for local Function environment variables and it can hold secrets, but nothing was stopping it being committed.
- **`wrangler` is a declared devDependency** — `npm run dev:ask` has always assumed it was installed without the repo ever saying so.

### Added

- **Share a whole conversation** (`supabase/migrations/0021_ask_shares.sql`, `functions/api/share.js`, `src/pages/AskShare.js`, `src/pages/admin/AskShares.js`): `/ask` could share one answer three ways but a conversation only as a screenshot. Pressing Share now snapshots the thread into `ask_shares` and returns an unlisted `/ask/s/<token>` link — the native share sheet on a phone, the clipboard everywhere else — rendering the questions, answers, source cards, the chips that were on and any thumbs the reader left. The per-answer permalink deliberately re-asks rather than freezing an answer, so a frozen conversation carries the date it was asked and a "Continue this yourself" button that re-asks the last question live. Links unfurl in chat apps with the opening question as the title (`buildShareMeta`, `functions/_middleware.js`). `/admin/ask/shares` lists every share with filters for date, length, status, views and signals, full-text search across the stored thread, a link to the live page, a detail modal, and revoke (reversible) alongside delete.
  `ask_shares` is owner-only RLS: reads go through the token-gated `get_ask_share` RPC, because an anon select policy would have let anyone enumerate every conversation ever shared. `create_ask_share` is service-role only, since a per-IP daily cap means nothing if the caller picks its own IP hash. Threads over 20 turns or 100KB are refused.

### Changed

- **Rotating starter questions on /ask** (`src/lib/askQuestions.js`, `supabase/migrations/0020_ask_question_pool.sql`, `src/components/Ask/AskChat.js`): the six fixed chips become a pool of 29 questions tagged by subject — reading, running, treks, writing, work, site — drawn fresh on every page load, one from each of four random categories. Stratified rather than shuffled: a flat draw of a pool weighted towards books keeps offering four book questions at once, and these chips are the only advertisement the archive's breadth gets. Four chips on `/ask`, three in the launcher panel, a "Try others ↻" link to re-roll without a reload, and three Marathi questions in the mix. Two chips are built from the facts roster at request time, so they name the newest trek and read without anyone editing them. The pool is edited at `/admin/ask/settings`; an empty one falls back to the six questions from `0019`.
- **/ask content-type chips now re-rank instead of scoping** (`src/lib/askRetrieval.js`, `functions/api/ask.js`, `src/components/Ask/AskChat.js`): the chips were passed to `hybrid_search` as `p_types`, which filtered before ranking, so a narrowed search always returned `match_count` items of that type however unrelated the question — "Which forts has he trekked?" with **Books** on came back with eight books and either a refusal or a fort linked to a book cover. The search now runs unscoped and wide and the chips pick from the result; when fewer than three in-scope items survive the answer comes from everything, with one quiet line saying so. `Clear` resets the chips, and clicking a follow-up clears them too, since follow-ups name things the last answer showed.
- **Retrieval floor and lighter payload** (`supabase/migrations/0019_ask_retrieval_and_prompt.sql`): `hybrid_search` takes a `min_similarity` cutoff (the new `semantic_floor` setting, editable at `/admin/ask/settings`) and returns `match_score` / `match_kind`. It no longer returns `embedding` or `fts` — 1024 floats and a tsvector per row that no caller read.
- **Rosters and latest items in the facts card** (`site_facts()`): every book, trek, race, project, deck and photo set as `{t,d,u}`, newest first, plus the latest micro post, blog post, essay and Now entry. Enumeration and recency are not retrievable by embedding — "which forts" never named more than three of twenty, and seven logged questions about the latest micro post all failed.
- **New system prompt and starter questions** (`ask_settings`, `src/data/askConfig.js`): answers now mirror the question's language, refuse only when the facts *and* the items both lack the answer, and treat the roster as linkable. The starter chips drop the two enumerations that retrieval could not serve and add thematic, personal-best and single-item questions.
- **Retrieval reads the conversation** (`src/lib/askRetrieval.js`): a short follow-up like "Tell me more about Skills" now searches with the previous question attached instead of on two words. Results are also capped per entity, so one long project can no longer fill every slot.
- **Steadier answers** (`src/lib/askTiers.js`): generation temperature 0.3 → 0.1. The same question was asked ten times and cited a different set of books each time.
- **Scoped questions are visible in the log** (`ask_log`, `src/pages/admin/AskConversations.js`): which chips were on is stored on the message, badged on the admin Conversations page and exported with the evals, so a bad answer to a scoped question can be told apart from a bad answer to an open one.
- **Tag audit** (Supabase `tags`): consolidated 216 tags into 167. Merged typo, spacing and plural variants plus same-meaning groups through `merge_tags` (e.g. `digitalwellbeing` / `digital well-being` → `digital wellbeing`, the travelogue variants → `travel`, the dream tags → `dream`), fixed misspellings (`digital technology`, `nda marathon`), and deleted junk tags (emoji-only, single letters, `no`, `me`, `only me`, `why?`). Marathi tags were kept separate from their English equivalents. Old `/tags/<name>` URLs for merged or renamed tags no longer resolve.
- **Single-use tag cleanup** (Supabase `tags`): deleted 69 tags that were used only once and were a common English or Marathi word or phrase (e.g. `mind`, `patience`, `घर`, `time is up`), leaving 98 tags. Places, named things and specific topics used once (e.g. `pegasus`, `three.js`, `kailasgad`) were kept.
- **Tag categories** (Supabase `tags.category`): every tag now has one of eleven categories (Running & Fitness, Travel & Outdoors, Books & Reading, Writing & Blogging, Technology & Data, Digital Life, Society & Ideas, Mind & Life, People & Feelings, Arts & Culture, Personal), which powers the category filter on `/tags`.
- **Docs + ask index** (`docs/tags.md`): regenerated with `npm run ask:index` so `/ask` chunks carry the new tag names.

### Fixed

- **An item's photo could be used as a link target** (`src/lib/askFormat.js`): links and images now check against separate allow-lists. One answer rendered "Ghangad Fort" as a link to a book cover.
- **Stray citations reaching readers** (`functions/api/ask.js`): `[Books]`, `[stats, 6]` and row ids like `[1641]` are dropped; only real item numbers survive.
- **Nonsense follow-up chips** (`functions/api/ask.js`): `stats`, `site` and `tag` chunks no longer become "Tell me more about Physical Endurance".
- **Duplicate race-distance labels** (Supabase `sports`): `10K` → `10 Kms` and `21K` → `21 Kms`. The two spellings split the half-marathon count across two keys in the facts block, which is why "how many marathons has he run?" answered differently every time.

---

## [v18.0.1] — 2026-09-14

### Fixed

- **Nightly ask refresh** (`scripts/blog-word-counts.mjs`): Substack's archive API returns 403 to GitHub Actions runners, which failed `npm run blogs:wordcount` and the whole job. A Substack failure now reuses the Substack posts from the last committed `writing-ledger.json` (bodies from the text cache) and emits a workflow warning; WordPress, the ledger and `ask:index` still refresh.

---

## [v18.0.0] — 2026-09-14

### Added

- **Presentations page** (`src/pages/Presentations.js`, `/presentations`): a card grid of HTML slide decks, each with a live, scaled-down iframe preview that loads lazily as it scrolls into view.
- **Presentation viewer** (`src/pages/PresentationPost.js`, `/presentations/:id`): the deck embedded full-width at 16:9, with Fullscreen, "Open original" and "All presentations" links, description, tags and related content.
- **Plug-and-play decks** (`src/lib/api/presentations.js`, `src/pages/admin/resources.js`): add a deck from `/admin/presentations` by pasting its https URL. Nothing is copied into the repo and no deploy is needed; the deck stays on its own host (GitHub Pages) and is embedded by URL.
- **Database** (`supabase/migrations/0018_presentations.sql`): `presentations` table with RLS, central-tag support (`presentation` entity type, `tag_names`, delete trigger, `tag_entities` arm), seeded with seven decks.
- **Ask source** (`scripts/ask-sources/presentation.mjs`): indexes each deck's metadata plus its slide text, fetched at index time, so `/ask` can answer from presentations.

### Changed

- **Site-wide wiring**: presentations join the Work nav, homepage Explore grid, Monthly Digest, `/stats` (count), `/tags` pages and tag analysis, the admin overview, share-card middleware, `sitemap.xml` and `llms.txt`.

---

## [v17.2.1] — 2026-09-14

### Fixed

- **Lint** (`src/pages/admin/AskConversations.js`, `src/lib/api/askConversations.js`): cleared the `jsx-a11y/label-has-associated-control` and `newline-per-chained-call` errors from the v17.2.0 eval form, so `npm run lint` passes again. Labels already point at their controls with `htmlFor`; the rule just can't see through the admin `Select`/`Input`/`Textarea`/`Checkbox` wrappers, so they use the same inline disable as the other admin forms.

---

## [v17.2.0] — 2026-09-14

### Added

- **Eval mode for Ask Conversations** (`src/pages/admin/AskConversations.js`, `src/lib/api/askConversations.js`): an "Eval mode" toggle (remembered per browser) opens an evaluation form under every answer — pass/fail verdict, 1–5 score, quick-pick and free issue tags, notes and an ideal answer — saved on click. Admin evaluations are stored apart from reader feedback, so neither overwrites the other. New Evaluation (evaluated / not evaluated / pass / fail) and Eval tag filters, Evaluated and Eval pass rate stats, an eval-tag breakdown, eval columns in CSV, and evaluated exchanges (with `ideal_answer`) in the evals JSONL export.
- **Database** (`supabase/migrations/0017_ask_evals.sql`): `eval_verdict`, `eval_score`, `eval_tags`, `eval_notes`, `eval_ideal_answer` and `evaluated_at` on `ask_messages`, written through the existing owner-only RLS policy.

---

## [v17.1.0] — 2026-09-13

### Added

- **Plug-in ask sources** (`scripts/ask-sources/`, `scripts/lib/registry.mjs`): every file in the folder is a source for the `/ask` index, so a new kind of content is one file rather than a code change and a migration. The nine existing builders moved there unchanged, and five new sources close the gaps found in the audit: the résumé, the full text of every Substack and WordPress post (`writing`), every figure on `/stats` (`stats`), tag descriptions (`tag`), and what each page is plus how to get in touch (`site`). A source that fails keeps its existing chunks instead of emptying them.
- **Incremental indexing** (`scripts/build-content-index.mjs`, `scripts/lib/chunking.mjs`): chunks are compared by content hash, not by timestamp. Unchanged rows are skipped, text that only moved reuses its stored vector (a new changelog entry no longer re-embeds the whole file), and only genuinely new text is sent to Workers AI. `--dry-run` prints the plan per type.
- **Hourly stats snapshot** (`functions/api/stats.js`, `src/lib/siteStats.js`, `src/lib/statsEndpoint.js`): every number on `/stats` is computed in one shared module and served from an edge cache refreshed at most once an hour. The Stats page, the `/ask` facts card and the index all read it, so the chatbot and the page can never disagree.
- **Links and pictures in answers** (`src/components/Ask/AnswerBody.js`, `src/lib/askFormat.js`): named items render as highlighted link chips, archive photos appear inline or as a strip under the answer, and source cards show a thumbnail. Any link or image whose URL did not come from a retrieved item is stripped, in the worker and in the page.
- **Answer feedback** (`src/components/Ask/AnswerActions.js`, `ask_feedback()` in `0016`): thumbs up or down, reason tags and an optional comment, stored on the answer's row in the conversation log as evals data.
- **Nightly refresh** (`.github/workflows/ask-refresh.yml`): re-counts the Writing Ledger, indexes new content and commits the ledger data only when a post changed.

### Fixed

- **Long micro posts half-embedded** (`scripts/ask-sources/microblog.mjs`): a micro post was always one chunk, and the embedding model only reads the first 4,000 characters, so the tail of the few very long posts was keyword-searchable but invisible to semantic search. Posts over 3,000 characters are now split on paragraphs like other prose.
- **Micro-blog activity undercount** (`src/lib/api/microblog.js`): the activity query was unpaged, so PostgREST's 1,000-row cap silently dropped every micro post after the first thousand — the Micro Blog activity strip and the Stats page pulse stopped in 2021. It now pages through all 1,600+ posts; `/stats` shows 2022–2024 again.

### Changed

- **Ask Conversations admin** (`src/pages/admin/AskConversations.js`, `src/lib/api/askConversations.js`): every chat is shown in full, newest first, with a browser's questions grouped until it goes quiet for 30 minutes. Filters for date range, search, feedback, reason, tier, model, provider, cited content type, degraded, keyword-only, errors, no sources and session; headline numbers for the filtered set (satisfaction, latency by stage, tiers, reasons, content cited, index coverage); CSV, JSON and evals JSONL export.
- **Writing Ledger** (`public/writing-ledger.html`, `scripts/blog-word-counts.mjs`): the page fetches `public/data/writing-ledger.json` instead of carrying its data inline, and recomputes month- and year-to-date for today. One command refreshes it; `build-blog-infographic.mjs` and its template are gone.
- **Stats page** (`src/components/Stats/`): both layouts render from the hourly snapshot in one request instead of seven collection fetches plus 1,600 micro-post dates. Personal facts moved to `src/data/stats/personalFacts.js`.
- **Ask facts card** (`functions/api/ask.js`, `scripts/build-docs.mjs`): now carries every `/stats` figure and the Writing Ledger totals, and tells the model that blog text is indexed.
- **Database** (`supabase/migrations/0016_ask_sources_and_feedback.sql`): open entity types, content and embedding hashes and an image column on `content_chunks`; résumé, micro-post-by-year, tag-category and index coverage in `site_facts()`; message id and feedback columns on `ask_messages`.

---

## [v17.0.2] — 2026-09-13

### Fixed

- **Ask verification failures** (`src/components/Ask/useTurnstile.js`, `src/components/Ask/AskChat.js`): suggestion chips, follow-up chips and `?q=` links sent the question before Turnstile had produced a token, so with verification switched on the chat bubble answered "verification failed". A question now waits up to 10 seconds for a fresh token. If verification still fails, whether the token is missing or rejected with a 403, the answer offers a **Verify and retry** button that resets the widget and re-asks in place of the failed exchange.
- **Clearer rejection** (`functions/api/ask.js`): the 403 now carries a `reason` and a readable `note` instead of a bare error string.

---

## [v17.0.1] — 2026-09-13

### Fixed

- **Ask streaming crash** (`wrangler.toml`): streaming answers from `/api/ask` failed in production with Cloudflare error 1101. The Pages project had no `compatibility_date`, so Functions ran on the oldest runtime defaults, where `new ReadableStream()` is disabled. Setting `compatibility_date = "2026-01-01"` enables the constructor. The non-streaming JSON path was never affected.

---

## [v17.0.0] — 2026-09-12

### Added

- **Ask the Archive** (`src/pages/Ask.js`, `src/components/Ask/`): a second brain over the whole site at `/ask`, plus a launcher that opens the same chat from any page. You ask in plain language — English or Marathi — and it answers from the same Supabase rows the pages render from, with source cards linking back to the book, race, trek, project or post the answer came from. The sources come from the retrieval step rather than from the model, so it cannot hallucinate a link. Both surfaces render one `AskChat` component; the launcher lazy-loads it, so visitors who never open the panel never download it.
- **Search index** (`supabase/migrations/0009_second_brain.sql`, `scripts/build-content-index.mjs`, `npm run ask:index`): `content_chunks` holds one embedded, searchable chunk per piece of content, polymorphic over every content table exactly like `tag_associations`. `hybrid_search()` fuses a keyword ranking (tsvector/GIN, `simple` config so Devanagari survives) with a semantic one (pgvector/HNSW, `@cf/baai/bge-m3` at 1024 dims) using Reciprocal Rank Fusion. The indexer is idempotent and incremental — it re-embeds only rows whose `updated_at` moved, skips hidden projects, and deletes chunks whose source row is gone.
- **Facts card** (`site_facts()` in `0009`): counts, date ranges and the top tags in one round trip, injected into every prompt. Counting questions ("how many books", "how many marathons") are answered from Postgres rather than from whatever retrieval happened to return, which is the one thing vector search is worst at. Falls back to the committed `docs/facts.json` when the RPC is unreachable.
- **Tiered model fallback** (`src/lib/askTiers.js`, `functions/ask.js`): Gemini 2.5 Flash-Lite, then Cloudflare Workers AI, then a third Workers AI rung, then **search-only** — which returns the matching pages with a short note instead of an error. Order, models, timeouts and enabled flags all live in the `ask_settings` row, so a retired model is a config change, not a deploy. Embeddings degrade the same way: if the neuron budget is spent, `hybrid_search` runs keyword-only through the same code path. The whole feature is built to run on free tiers and to fail closed rather than spill into a bill.
- **Abuse control** (`ask_quota()` in `0009`): per-visitor and global daily caps counted in Postgres and enforced by a `security definer` RPC, over a salted hash of the visitor's IP. Past the cap the endpoint answers with a note instead of calling a model; if the quota RPC itself is unreachable, the request is refused rather than run uncapped. Optional Turnstile verification is wired in and off by default.
- **Ask settings in the admin** (`src/pages/admin/AskSettingsEditor.js`, `src/lib/api/askSettings.js`): every limit, retrieval weight, model tier and canned reply is edited at `/admin/ask/settings` and live within a minute — no redeploy. The model ladder is a reorderable list; a usage panel shows the last fourteen days and which tier actually answered, so an all-fallback week is visible without reading Cloudflare logs.
- **`docs/` knowledge layer** (`docs/README.md`, `data-model.md`, `entities.md`, `routes.md`, `tags.md`, `chatbot-context.md`, `scripts/build-docs.mjs`, `npm run docs:build`): one folder, two readers. Coding agents get a table-by-table dictionary generated from the live schema — columns, constraints, row counts, client-side field renames — and a hand-written `entities.md` explaining what the content types *mean* (why `books.year` is the year read, why a micro post is a passing thought rather than a position). The chatbot reads only `chatbot-context.md`, a ~1,200-token card derived from the rest and pushed into `ask_settings.context_doc`. Generated blocks sit between markers; prose outside them survives regeneration.
- **Streaming answers, with a Stop button** (`functions/api/ask.js`, `src/lib/askTiers.js`): the endpoint speaks SSE. Source cards are flushed the moment retrieval finishes — about a second in — and the answer streams token by token after them, so the page is never a blank spinner. Stop aborts the request mid-sentence and keeps whatever had arrived. The tier ladder streams too: a tier that fails *before* its first token falls through to the next, one that fails *after* keeps what it already wrote rather than restarting the answer under a different model.
- **Conversation log** (`supabase/migrations/0012_ask_conversations.sql`, `src/pages/admin/AskConversations.js`): every exchange is written to `ask_conversations` / `ask_messages` through a `security definer` RPC — question, answer, which tier and model answered, per-stage timings (embed, retrieval, generation, total), source count and whether it ran degraded. Logging happens in `waitUntil()` after the response is already on its way, so it can never slow an answer down. `/admin/ask/conversations` lists the threads with 30-day headline stats (median and p95 latency, tier mix) and exports everything as CSV or JSON.
- **Answer craft** (`src/components/Ask/AnswerBody.js`, `AnswerActions.js`): markdown rendering through the existing `markdown-to-jsx`, inline `[1]`/`[2]` citation markers that become links to the numbered source cards, copy, a `?q=` permalink that re-asks the question (rather than serving a cached answer that the archive may have outgrown), and share-as-image through the site's existing share module via a new `ask` adapter in `shareCardConfig.js`.
- **Content-type filters and follow-ups** (`src/components/Ask/AskChat.js`): chips scope a question to books / micro posts / blog / projects / races / treks, passed to `hybrid_search` as `p_types`. Follow-up chips after each answer are built from the retrieved items rather than asked of the model — the model dropped them whenever an answer ran long, and every one it wrote cost output tokens.
- **Thread persistence** (`src/components/Ask/askStorage.js`): the conversation survives a reload for 24 hours in `localStorage`, with a Clear button. Per-browser, never sent anywhere; a day old and it is dropped rather than restored.
- **Related content from the same embeddings** (`supabase/migrations/0013`–`0014`, `src/components/Ask/RelatedContent.js`): a "more like this" strip on every book, trek, race, project, blog and micro-post page, from nearest neighbours of that item's own stored vector. No model call, no API key, no second index — the search index pays for itself twice.

### Changed

- **Endpoint moved to `/api/ask`** (`functions/api/ask.js`): a Pages Function at `functions/ask.js` would have shadowed the `/ask` *page* — Functions take precedence over the SPA fallback, so opening the page in a browser would have returned JSON. `vite.config.js` proxies `/api` to `wrangler pages dev` so the endpoint also works under `npm run dev` (alongside `npm run dev:ask`).
- **Prompt-injection posture** (`functions/ask.js`): retrieved rows are wrapped in delimiters and the system prompt states they are archive content, never instructions. The micro-blog table is a Tumblr import carrying reblogged third-party text, so this is not theoretical.
- **Retrieval, three rounds of fixes** (`supabase/migrations/0010`, `0011`, `0015`): keyword search ANDed every word of a question, so with no stopword list in the `simple` config, "which forts has he trekked?" matched nothing — the terms are ORed now and fused by rank. Question words were then out-ranking content words, so a short English stopword list is applied to the query (never to the indexed text, and never to Marathi). And because `simple` does not stem, "treks" never matched a chunk saying "Trek: Jivdhan" — every term now gets a prefix match. A type-filtered question that still finds nothing falls back to the newest rows of that type, because silence reads as "there are none" when there are twenty.
- **`wrangler.toml`**: adds the Workers AI binding. `GEMINI_API_KEY`, `ASK_IP_SALT` and the optional Turnstile secret are deployment secrets, never `[vars]`.

## [v16.0.0] — 2026-09-12

### Added

- **Books page, rebuilt** (`src/pages/Books.js`, `src/components/Books/`): `/books` is now four tabbed views sharing one filter bar — **Shelf** (cover-forward grid, six across on desktop and two on a phone), **Timeline** (grouped by reading year with sticky year headers), **Statistics** (per-year, per-category, per-language, per-decade and per-rating breakdowns) and **Table** (dense, sortable on title, author, category, pages, rating and date read). Filters and the active view both live in the URL, so any filtered shelf is a shareable link. Replaces `DigitalLibrary.js`, a single 394-line component with no cover art, no sort, no URL state and two references to a `link` field that never existed in the schema.
- **Book filters** (`src/components/Books/useBookFilters.js`, `BookFilters.js`): live search across title, author, translator, description and publisher, plus category / language / year / rating / reviewed selects and multi-select tag chips. **The axes combine with OR, not AND** — with eleven categories over fifty-one books, intersecting two axes almost always emptied the shelf, so each control you touch now adds books rather than removing them. The search box is the exception and still narrows.
- **Book metadata** (`supabase/migrations/0008_books_reborn.sql`, `src/lib/api/books.js`): `cover_url`, `isbn`, `page_count`, `publisher`, `first_published`, `rating`, `date_finished`, `date_precision`, `status`, `format`, `goodreads_url`, `quote` and `note`. `year` keeps its original meaning — the year the book was *read* — and the book's own publication year is the new `first_published`; the old single column conflated the two.
- **Metadata backfill script** (`scripts/backfill-books-metadata.mjs`, `npm run books:backfill`): resolves each book against Open Library, Google Books and BookGanga (the Marathi catalogue, which is the only one of the three with any Devanagari coverage), downloads the cover into the `media` bucket rather than hotlinking it, and lifts a pull-quote and a real finish date out of the Substack / WordPress / Blogger review where one exists. Idempotent — a column that already has a value is never overwritten, so a cover fixed by hand in `/admin` survives a re-run.
- **Cover component** (`src/components/Books/BookCover.js`): renders the fetched cover, or a seeded two-tone generative cover with the title set on it when there is none. A missing cover is the normal case rather than an error state — no cover API indexes Marathi titles, which is two fifths of the shelf.
- **Quick-look modal** (`src/components/Books/BookDetailsModal.js`): opens from any view with the cover, rating, pull-quote, personal note, the full bibliographic row and the review links, without losing your place. Traps focus, closes on Escape, returns focus to the card that opened it, and is a full-screen sheet below `sm`.
- **Shared stat primitives** (`src/components/common/StatBars.js`): the KPI tile and horizontal bar chart, lifted out of `ProjectsStatistics.js` so `/books` and `/projects` cannot drift apart visually.
- **Navigation, regrouped** (`src/data/routes.js`, `src/components/Template/Navigation.js`, `Hamburger.js`): the top bar is five entries — About, **Writing**, **Living**, **Work**, **Play** — instead of ten links plus a "More" bin. Seventeen flat links in a bar is a list, not navigation: nothing was findable because nothing was grouped. Each group is a verb, its dropdown holds its pages, and clicking a group heading lands on its most useful child. A group highlights when any of its children is the current page, so the bar still says where you are.
- **Footer site map** (`src/components/Template/Footer.js`): every route, in columns under the same headings as the nav, built from `data/routes.js` so the two cannot drift apart. Contact and Changelog live here rather than in the top bar. Replaces a footer that was one copyright line and four social links.
- **Writing Ledger is linked both ways** (`public/writing-ledger.html`, `src/data/routes.js`): the ledger now carries a link back to the site — it is served straight from `/public` and shared no chrome with the app, so it was a dead end with nothing on it saying where it came from — and it appears in the Writing group and the footer. Flagged `external: true` in the route data because React Router cannot navigate to a file in `/public`.

- **Manual metadata fill** (`scripts/make-books-template.mjs`, `scripts/apply-books-metadata.mjs`): `npm run books:template` writes a JSON file listing every book still missing bibliographic data, and only the fields actually blank for each one; `npm run books:apply` reads it back. No book API indexes Marathi titles, so most of the shelf was never going to be reachable by the API backfill — this is the path for the rest. Unlike the API backfill, values here overwrite: this is a human correcting the robot. Blanks are skipped, so a half-filled file can be applied and topped up repeatedly.

- **Filter hook tests** (`src/__tests__/components/useBookFilters.test.js`): covers the OR-across-axes behaviour, the search box still narrowing, tag OR-within-axis, the rating floor, and URL round-tripping.

### Changed

- **Micro-blog filters union instead of intersecting** (`src/lib/api/microblog.js`, `src/pages/MicroBlog.js`): tags, source, type and month now combine with OR, and tags OR *within* their own axis. Over 1,600 posts the axes barely overlap, so intersecting them emptied the page — `life` (19 posts) AND `youtube` (13 posts) returned **0**; they now return 32. Tags previously used `contains`, meaning a post had to carry *every* selected tag, so picking a second tag was almost always zero results. Free-text search still narrows. Implemented as a single PostgREST `or=(…)` so the filtering stays server-side and paginated.
- **Footer and sidebar links** (`src/components/Template/Footer.js`, `src/data/contact.js`): added Substack, WordPress, the digital card (`card.sankettambare.in`) and LinkTree; dropped the Instagram profile link. The `/instagram` page, which archives the posts, is unchanged and still sits under Play. The card link carries no `?bg=` — it reads the visitor's own theme rather than being pinned to one that would fight the site.
- **Writing Ledger shares the site's theme** (`public/writing-ledger.html`): the ledger kept its own `ledger-theme` localStorage key, so switching to dark on the site and then opening it started over from the OS preference. It now reads and writes the same `theme` key as `ThemeContext` — same origin, same `dark`/`light` values — and migrates any existing `ledger-theme` value across once. Applied by an inline script in `<head>` so arriving from a dark site never flashes light.

- **Book categories are a canonical list** (`supabase/migrations/0008_books_reborn.sql`): `category` was free text and had drifted into `Semi-counductor`, `Autography`, `Non-FIction`, `Social ` (trailing space) and `Story, FIction`. All 51 rows are remapped onto eleven values and a check constraint now enforces them. The specific secondary genres that were dropped (`privacy`, `surveillance`, `forts`, `oil`, `semiconductors`, `ai`…) were migrated into the central tag system rather than discarded; the generic ones were not, because they duplicated the category axis.
- **Books admin form** (`src/pages/admin/resources.js`): `category` is a select over the canonical list, and the form gained a cover uploader plus fields for every new column. The list table shows category and rating.
- **Book permalink** (`src/pages/BookPost.js`): renders the cover, rating, pull-quote, personal note, the bibliographic line and a Goodreads link.
- **Books sort newest-read first** (`src/lib/api/books.js`): was ascending by `id`.

### Fixed

- **Admin list tables scrolled the whole page** (`src/pages/admin/ui/DataTable.js`): on `/admin/books` and `/admin/projects` the row actions were unreachable — the table pushed the page sideways instead of scrolling inside its own box, and Edit sat past the right edge with no way to get to it. The card is a flex item of the resource column, so its default `min-width: auto` resolved to the table's min-content width: it grew past the viewport rather than shrinking, and the inner `overflow-x-auto` never engaged. Adding `min-w-0` restores it. The actions column is now also `sticky right-0`, so Edit and Delete stay on screen however far the other columns scroll.

- **Dead field references** (`src/components/Books/DigitalLibrary.js`, removed): the featured hero and the detail modal both read `book.link`, a field no migration or mapper ever defined, so the "View on Goodreads" button could never appear. There is now a real `goodreads_url`.
- **Migration history drift** (`supabase/migrations/`): `0005`, `0006` and `0007` had been applied by hand through the SQL editor and never recorded, so `supabase db push` would have re-run two files of `update public.projects set …` and overwritten every project edit made since v15.0.0. Repaired to `applied` before pushing `0008`.

---

## [v15.0.0] — 2026-09-11

### Added

- **Projects page, rebuilt** (`src/pages/Projects.js`, `src/components/Projects/`): `/projects` is now four tabbed views sharing one filter bar — **Showcase** (featured spotlight + masonry grid with hover screenshot previews), **Timeline** (grouped by year), **Statistics** (per-year, per-tech, per-category and per-status breakdowns), and **Table** (dense, sortable). Filters and the active view both live in the URL, so any filtered view is a shareable link. Replaces `ProjectGallery.js`, whose fixed `index % 6` layout meant a card changed shape whenever the list reordered.
- **Project filters** (`src/components/Projects/useProjectFilters.js`, `ProjectFilters.js`): live search across title, subtitle, description, organization and role, plus category / status / year selects and multi-select tech and tag chips. Tech and tags OR within their own axis and AND across axes. Central tags are finally surfaced on `/projects` — projects have carried them since v14.0.0 but the page never rendered them.
- **Quick-look modal** (`src/components/Projects/ProjectDetailsModal.js`): opens from any view with screenshots, stack, highlights, tags and links, without losing your place in the grid. Traps focus, closes on Escape, and returns focus to the card that opened it.
- **Project metadata** (`supabase/migrations/0005_projects_reborn.sql`, `src/lib/api/projects.js`): `category`, `status`, `role`, `org`, `featured`, `visible`, `highlights`, `problem`, `solution`, `outcome`, `tech_stack`, `slide_images` (screenshots) and `links` (custom links — GitHub repo, live demo, write-up).
- **Case-study detail page** (`src/pages/ProjectPost.js`): renders the date, status, organization, role, tech chips, highlights, a screenshot gallery and Problem / Solution / Outcome sections, alongside the custom-link buttons.
- **`linkList` form widget** (`src/pages/admin/FormField.js`): repeatable `{label, url}` rows with reorder and delete, modelled on the existing `slideImages` widget.
- **Pooled field autocomplete** (`src/pages/admin/FormField.js`, `ResourceManager.js`): a field can declare `suggestFrom` to autocomplete from values already used on its own resource rather than from the central tag list — how the tech-stack field suggests stacks you have used before.
- **Project metadata, backfilled from the live sites** (`supabase/migrations/0006_projects_metadata.sql`): every one of the 13 projects now carries a category, status, role, tech stack, highlights and Problem / Solution / Outcome, sourced by visiting each project's own site and repository rather than guessed. Organizations are attributed (YUNG Foundation, Antyodaya Punarvasan), repos and live demos are linked, and RunFolio, E20 ka Chakravyuha and the Nisarg school portal are pinned as featured. The tech vocabulary this produces — Astro, React, Supabase, Tailwind, Cloudflare Pages/Workers, Firebase, Next.js and the rest — is what the new filter chips actually filter on.
- **Field defaults in the admin form** (`src/pages/admin/ResourceManager.js`): a field can declare `default`, which `emptyForm` honours ahead of its type-based seed. Without it, `visible` would start false and every new project would be born hidden.

### Changed

- **Featured projects stay in the grid** (`src/components/Projects/ProjectsShowcase.js`, `ProjectCard.js`): the Showcase view used to remove a featured project from the masonry grid once it was in the spotlight, so a visitor scanning the list found it missing. Every project now appears in the grid, and a featured card carries a small ★ Featured marker so the repetition reads as deliberate. Timeline and Table already behaved this way, so all four views now agree.
- **Screenshots render in colour** (`src/components/Projects/ProjectCard.js`): cards no longer greyscale their image until hover. Screenshots are the point of a portfolio card — desaturating them by default hid the thing the visitor came to see. The hover zoom stays.
- **Project ordering** (`src/lib/api/projects.js`, `src/pages/admin/resources.js`): the hand-maintained `sort_order` column is gone — it was `0` on nine of thirteen rows. Projects now sort featured-first, then newest-first, and the visitor can re-sort by date, title or category.
- **Project dates** (`supabase/migrations/0005_projects_reborn.sql`, `src/lib/projectDate.js`): `date` was free text holding a mix of `2020-10-20` and `August 2026`, which could not be sorted or filtered. The migration normalizes every row to ISO and converts the column to a real Postgres `date`; the admin form now uses a date picker. The column is nullable, and undated projects sort last everywhere.
- **Cover images are optional** (`src/pages/admin/resources.js`, `src/components/Projects/projectMedia.js`): `image` is no longer required. A project falls back to its first screenshot, and to a placeholder when it has neither — previously a missing image rendered an empty tile, because a falsy `src` does not reliably fire `onError`.
- **Project visibility** (`supabase/migrations/0005_projects_reborn.sql`): a project can be toggled hidden in `/admin`. This is enforced in RLS (`visible or is_owner()`), not in React, so a draft never reaches an anonymous visitor's payload, its `/tags` pages, its share card, or the public project counts.
- **Social share tags** (`functions/_middleware.js`): the project OG image falls back to the first screenshot, matching what the page itself shows.

### Fixed

- **Restored a date the first cut of 0005 cleared** (`supabase/migrations/0007_restore_missing_project_dates.sql`): the `btrim` fix below landed one commit after 0005 was first published, so a database that applied the original version had already lost E20 ka Chakravyuha's date. 0007 restores any project left dateless by that bug. It only touches rows whose date is null, so it is idempotent and a no-op on a database that never ran the broken version.
- **A leading space that would have eaten a date** (`supabase/migrations/0005_projects_reborn.sql`): one project is stored as `" E20 ka Chakravyuha"`. Every `where title = …` in the date backfill missed it, so applying the migration as written would have dropped that row into the null safety net and cleared its date. Titles are now trimmed first and matched with `btrim`.
- **Six projects sharing one cover image** (`supabase/migrations/0006_projects_metadata.sql`): RunFolio, Visiting Card, E20, Antyodaya, CMS Site Planner and the Nisarg portal all pointed at the YUNG Foundation's logo, a placeholder that got reused. Cleared, so the new fallback shows a neutral placeholder instead of another organization's branding.
- **RunLog archived** (`supabase/migrations/0006_projects_metadata.sql`): its deployment returns 404 and RunFolio superseded it, so it is marked Archived and hidden rather than left on the page as a dead link.
- **Mind map project year** (`src/components/MindMap/MindMapDetailPanel.js`): the year chip read `project.date.slice(0, 4)`, which rendered "Augu" for a project dated "August 2026". It now uses `projectYear` and is omitted when there is no date. The panel also shows category, status and stack.
- **Tag suggestion keys** (`src/pages/admin/FormField.js`): suggestion rows keyed on `t.id`, which is undefined for a pooled (non-central-tag) source. Keys now fall back to the name.
- **`tag_entities` after the date change** (`supabase/migrations/0005_projects_reborn.sql`): the RPC declares `date text` and passed `projects.date` through raw, which only type-checked while that column was text. It is now cast, the same way the micro-blog arm already was.

---

## [v14.1.0] — 2026-09-11

### Added

- **Tag analysis** (`src/components/Stats/TagAnalysis.js`): The Stats page's Content Tags section is now an analysis of the central tag tables rather than three separate per-table tag lists. It shows headline numbers (themes in use, tag links, cross-content themes, share used only once), the 12 most-used themes as bars split by content type, "bridge" themes that span several content types, and a per-type table of theme counts and top themes. Every tag links to its `/tags/:name` page. Content-type colors come from the validated dataviz palette in separate light and dark steps. The challenge's `100_days_to_offload` marker tag is left out.

### Changed

- **Stats views** (`src/components/Stats/StatsAlmanac.js`, `StatsClassic.js`): Both render `TagAnalysis` in place of the old tag dump and no longer fetch micro-blog tag facets separately.

---

## [v14.0.0] — 2026-09-11

### Added

- **Centralized tags schema** (`supabase/migrations/0003_centralized_tags.sql`): A `tags` table (lowercase canonical `name`, `display_name`, `color`, `category`, `description`) plus a polymorphic `tag_associations` table linking tags to books, blogs, instagram, micro-posts, races, treks, and projects. Includes RLS (public read, owner write), an orphan-cleanup trigger on every content table, the `tag_names` computed field for reads, the atomic `set_entity_tags` RPC for writes, and the `tags_with_counts`, `tag_entities`, `merge_tags`, and `microblog_month_tags` RPCs.
- **Legacy tag migration** (`scripts/migrate-tags-to-central.mjs`, `npm run tags:migrate`): Copies the old `text[]` tag columns into the new tables through `set_entity_tags`, keeps the original casing as `display_name`, supports `--dry-run`, and finishes with a per-table verify step. `supabase/migrations/0004_drop_legacy_tag_columns.sql` drops the old columns once it passes.
- **Tags hub** (`src/pages/TagsHub.js`, `/tags`): Every tag across the archive, sorted by use, with category filters and search.
- **Tag pages** (`src/pages/TagDetail.js`, `/tags/:name`): Everything carrying one tag, grouped by content type, with links to each item.
- **Tag manager** (`src/pages/admin/TagManager.js`, `/admin/tags`): Edit a tag's color, display name, category, and description; rename; merge duplicates; delete; export/import tag metadata as JSON.
- **Tag autocomplete** (`src/pages/admin/FormField.js`): Tag fields marked `suggest: true` list matching existing tags with a color dot and usage count, with keyboard navigation.
- **Tags on races, treks, and projects** (`src/pages/admin/resources.js`, `src/lib/api/sports.js`, `treks.js`, `projects.js`): New tag fields in the admin, shown as links on their detail pages.
- **Micro-blog pinboard art** (`src/lib/generativeArt.js`, `src/components/MicroBlog/PinboardCard.js`): Each card gets seeded generative art drawn from its tags' colors, or from a palette seeded by the post id when it has no tags. Tag chips gain color dots.
- **Month river tag tints** (`src/components/MicroBlog/MonthRiver.js`): Tagged months are tinted with their top tag's color, and hovering a month lists its top tags.
- **Tag links** (`src/components/common/TagLinks.js`): Tag chips on book, blog, micro-post, race, trek, and project pages now link to their tag page.

### Changed

- **Content API layer** (`src/lib/api/_crud.js` and the per-table modules): Tagged resources read `tag_names` and save tags through `set_entity_tags` after the row itself. Components still read `.tags` / `.blog_tags`, so nothing downstream changed shape.
- **Micro-blog tag filter and facets** (`src/lib/api/microblog.js`): Filter by the `tag_names` computed field; facets now come from the central tables.
- **Tumblr importer** (`scripts/import-tumblr-microblog.mjs`): Writes export tags through `set_entity_tags` instead of a column.
- **Content context** (`src/context/ContentContext.js`): Adds `useTags`, `useTagColors`, `useContentRefresh`, and `useOptionalTags`.
- **Markdown importer removed** (`scripts/import-to-supabase.mjs`, `npm run data:import`): Its `src/cms-content/` source no longer exists, and it cleared tables and wrote the dropped tag columns. Docs now point at `microblog:import` / `tags:migrate`.
- **Git ignore** (`.gitignore`): Ignores `supabase/.temp/`, the Supabase CLI's local link state.

### Fixed

- **100 Days / Stats tag filtering** (`src/pages/OneHundredDays.js`, `src/components/Stats/StatsClassic.js`, `StatsAlmanac.js`): The challenge tag is now excluded case-insensitively, so lowercase tag names don't push `100_days_to_offload` into the topic lists.
- **Old micro-blog tag links** (`src/pages/MicroBlog.js`): `?tags=` values are lowercased, so old links with capitalized tags still match.

---

## [v13.2.5] — 2026-09-10

### Added

- **Writing Ledger refresh guide** (`docs/writing-ledger.md`): Documents how to manually refresh the blog word-count data — the `npm run blogs:wordcount` → `npm run blogs:infographic` order, what each script reads and writes, which output is committed vs gitignored, how to read the anomaly report, and troubleshooting for the common failures. Linked from the README docs index.

### Changed

- **The Writing Ledger** (`public/writing-ledger.html`): Regenerated from a fresh extract — 103 posts and 99,185 words across Substack and WordPress, current through 2026-09-10 (was 2026-09-01).

---

## [v13.2.4] — 2026-09-10

### Fixed

- **Lint compliance** (`functions/_middleware.js`, `src/data/pageMeta.js`): Reformatted the site-URL centralization changes to satisfy airbnb ESLint rules (`operator-linebreak`, `implicit-arrow-linebreak`, `function-paren-newline`, `no-confusing-arrow`) — 8 errors, no behaviour change.

---

## [v13.2.3] — 2026-08-23

### Changed

- **Site URL configuration** (`src/data/pageMeta.js`): Renamed the shared site-origin constant to `SITE_URL` and updated metadata, Cloudflare crawler middleware, and share-card configuration to consume it.

---

## [v13.2.2] — 2026-08-23

### Changed

- **Canonical site domain** (`src/data/pageMeta.js`, `public/`): Replaced all previous Pages-domain URL references with `sankettambare.in` across site metadata, crawler files, sitemap, AI-readable documentation, and the writing-ledger template.

---

## [v13.2.1] — 2026-08-21

### Fixed

- **Atlas event module renamed off a blocklisted filename** (`src/atlas/lib/atlasEvent.js`): Ad and tracker blockers match any request path ending in `analytics.js` and answer it with `ERR_BLOCKED_BY_CLIENT`. In dev, where Vite serves each module at its real source path, that blocked request took down every importer of the old `atlas/lib/analytics.js` — including the classic shell's "Enter the Atlas" toggle. The module is now `atlasEvent.js`, matching its default export; production builds were never affected because the name is bundled away.

---

## [v13.2.0] — 2026-08-21

### Changed

- **Classic is the default view again** (`src/config/featureFlags.js`, `src/atlas/useViewMode.js`): A visitor with no stored preference, no `?view=` param and no reduced-motion request now lands on the classic editorial homepage instead of the Wanderer's Atlas. The atlas itself is untouched and fully live — it still owns `/` as the world map, and is one click away through the "Enter the Atlas" toggle, `?view=atlas`, or a stored preference, which continues to win over the default. The landing choice moved out of the `ATLAS_LIVE` flag (which still governs atlas routing and labels) into its own `DEFAULT_VIEW` flag, so the two can be flipped independently; set it back to `"atlas"` to make the map the front door again.
## [v13.1.0] — 2026-08-09

### Added

- **Images compress themselves on upload** (`src/lib/imageCompress.js`): Every image on the site enters through one function in the admin's `image`/`slideImages` fields, and until now that function's entire contribution was to *refuse* anything over 300 KB and tell you to go run ImageMagick yourself. It now does the work instead. The file is decoded (honouring EXIF orientation, so portrait phone photos stop landing sideways), resized to the long edge the page actually needs — 1200px landscape, 900px portrait — and re-encoded down a quality ladder from 85% until the bytes fit under the 150 KB target. If quality alone can't get there, the dimensions step down too (1200 → 1000 → 800 → 640), so the 300 KB cap became a guarantee rather than a gate you had to satisfy. A 12 MB camera JPEG lands at ~150 KB. Output is `.jpeg`, except where the source genuinely has a transparent pixel, which is detected rather than assumed and encoded as `.webp` — a project logo with an alpha channel no longer gets a white box baked into it. Files already under the target and within bounds are passed through untouched instead of being re-encoded for nothing. No new dependency: `createImageBitmap` and `canvas.toBlob` were enough.
- **Progress bar** (`src/pages/admin/ui/ProgressBar.js`): The admin had no determinate progress anywhere — every wait was a pulse or a spinner. Compression is a known number of encode attempts, so it gets a real percentage; the Supabase upload that follows reports nothing, so that phase slides indeterminately rather than inventing a number to show you.

### Changed

- **Image fields say what they did** (`src/pages/admin/FormField.js`): A successful upload used to leave a thumbnail and a URL, which told you nothing about what actually reached the bucket — a 290 KB image squeaking under the cap looked identical to a 40 KB one. Each field now reports `4.2 MB → 118 KB · 97% smaller · 1200×900 · JPEG` after the upload, condensed to the before/after pair in the cramped slide rows, and shows the progress bar while the work is in flight. HEIC is still rejected, since no browser but Safari can decode it, but the message now carries the exact `convert` command. The readout is cleared when the URL is edited or cleared by hand, so it never describes a file the field no longer holds.
- **Uploads declare their content type** (`src/lib/api/storage.js`): The bucket inferred the MIME type from the file it was handed. Now that the bytes arriving are re-encoded rather than original, it is set explicitly so the stored object's type always matches its extension.
- **Compression docs describe the automatic path** (`CLAUDE.md`): The "Required Before Adding Any Images" section instructed a manual `sharp-cli`/ImageMagick pass before every upload. That is no longer true for anything added through `/admin`; the CLI recipes remain, scoped to the bulk `npm run images:upload` script, which is unchanged and still uploads raw bytes.

---

## [v13.0.0] — 2026-07-31

### Changed

- **Admin dashboard redesigned as a workspace** (`src/pages/admin/`): The public site went through a full redesign across v11–v12; the admin never did, and it still looked and behaved like the scaffolding it started as. It is now a purpose-built content tool, deliberately dressed differently from the site — plain Inter instead of Noto Serif headlines and uppercase Plus Jakarta overlines, and a scoped indigo accent (`admin` in `tailwind.config.js`) instead of the rust `secondary`, which stays untouched for every public page. The data layer's contract is unchanged: same `src/lib/api/*` mappers, same `toRow`/`fromRow` shapes, same schema and RLS.
- **Real routes and a grouped sidebar** (`src/pages/admin/AdminLayout.js`, `navigation.js`): Thirteen flat tabs driven by a `?tab=` query param become nested routes under a sidebar grouped into Overview · Content · Now · Résumé. `/admin/books` and `/admin/now/months` are deep-linkable and the back button works. The four résumé tables — nearly a third of the old nav — move behind one entry, with `ResumePage` rendering them as sub-tabs. Old `?tab=` bookmarks are translated to their new path and the history entry replaced, so they land where they used to rather than on the overview.
- **Lists became tables** (`src/pages/admin/ui/DataTable.js`, `resources.js`): The plain `<ul>` — one line per row, no columns, no search, no sorting — is now a table with configurable columns, client-side search, sortable headers, multi-select and bulk delete, plus a "View on site" link per row. Below `md` it renders one card per row instead. Sorting needed care where the stored format doesn't sort as text: treks store `DD-MM-YYYY`, which would otherwise order by day-of-month, so that column sorts on a derived key.
- **Two-column forms over a sticky action bar** (`src/pages/admin/ResourceManager.js`): Fields lay out in a responsive grid driven by an optional `span` on each field, with Save/Cancel/Delete pinned to the bottom instead of buried at the end of a long scroll.
- **Feedback moved in-app** (`src/pages/admin/ui/ToastContext.js`, `ConfirmDialog.js`): Every `window.alert` and `window.confirm` is gone. Error toasts persist until dismissed — a failed save isn't something to blink past — while everything else auto-dismisses.
- **Images show what they are** (`src/pages/admin/FormField.js`): The `image` and `slideImages` widgets rendered uploaded URLs as raw text in a text box, so a good upload and a 404 looked identical. Both now show a thumbnail, accept a drag-and-drop, flag a URL that fails to load, and reject files over the 300 KB cap before they reach the bucket. Slide rows can be reordered.
- **`_crud` exposes row timestamps** (`src/lib/api/_crud.js`): Every table carries trigger-maintained `created_at`/`updated_at` and the selects already pulled them, but most `fromRow` mappers dropped them. The factory re-attaches them once, so tables can sort by "recently touched" and the overview's activity feed has something to read. Read-only — `toRow` is untouched.

### Added

- **Admin UI primitives** (`src/pages/admin/ui/`): The same button class string had been copy-pasted across eight sites and `inputClass` declared three times in three files. There is now one module for the dashboard's chrome — Button, Input/Textarea/Select/Checkbox, Field, Card, Badge, DataTable, Modal, ConfirmDialog, toasts, PageHeader and the async states. `tokens.js` documents the radius trap the Tailwind config creates (`rounded-lg` is 4px and `rounded-xl` is 8px here, while `md` is left at the stock 6px), so the admin standard is `rounded-md` for controls and `rounded-xl` for cards.
- **Overview page** (`src/pages/admin/Overview.js`, `src/lib/api/adminStats.js`): A landing page with row counts for all twelve tables, a recently-updated feed merged across them, a Now-page status card reporting how many months behind the flagged month is with a one-click "Start next month", and quick-create shortcuts. Counts are head-only requests, so no rows cross the wire; a table that errors reports blank rather than failing the page.
- **Command palette** (`src/pages/admin/CommandPalette.js`): ⌘K / Ctrl+K to jump to any table or start a new entry. Hand-rolled subsequence matching, no dependency.
- **Date pickers for the free-text date columns** (`src/pages/admin/FormField.js`): Treks and 100 Days had hand-typed date boxes in front of columns every reader parses, which is how `blogs` id 45 came to hold `2026--07-09` — a value that produces a junk month bucket in the 100 Days chart and the Almanac's "busiest writing month". Both are pickers now, via a new `ddmmyyyy` field type for treks and the existing `isoDate` for blogs. The stored strings are byte-identical to before, so no reader changes and no migration; it simply stops being possible to type a malformed date. Projects keeps free text, since its `date` is a display label like "Summer 2024".
- **Required actually blocks a save** (`src/pages/admin/ResourceManager.js`): `required` used to render an asterisk in the label and never reach the input, so empty submits travelled to Postgres to fail there. It is now passed through, and the composite widgets that can't carry the attribute — tags, string lists, slides, JSON — are checked on submit and marked inline.
- **Unsaved-changes guard** (`src/pages/admin/ui/useUnsavedGuard.js`): Leaving a dirty form used to discard it silently. `beforeunload` covers closing the tab; in-app navigation is caught by a capture-phase click listener, since this app uses `BrowserRouter` and has no data router for `useBlocker`.
- **Structured editors for the Now · Meta JSON blobs** (`src/pages/admin/NowMetaEditor.js`): `daily_rituals` (an array of `{label, icon, description}`) and `inspired_by` (a `{name, url, nownownow}` object) were two raw-JSON textareas you had to hand-type braces into. Both have real fields now, reusing `RepeatableRows` for the array, with the JSON view kept behind an Advanced panel. Unknown keys are spread through on save, so a row carrying more than the spec knows about isn't silently trimmed.
- **Tests for the admin** (`src/__tests__/admin/`): There were none. Seventy-three cases now cover the date serialization (including that `2026--07-09` yields empty rather than a plausible wrong date), Modal's Escape/scroll-lock/Tab-wrap, toast persistence rules, DataTable's search and three-state sort, form validation and the unsaved guard, and every admin route including the résumé sub-tabs and each legacy `?tab=` redirect.

### Fixed

- **Modal opened with the wrong control focused** (`src/pages/admin/ui/Modal.js`): The header's close button comes first in DOM order, so a dialog with a search box or a form field — most visibly the command palette — landed focus on Close. It now focuses the first control in the dialog body.

---

## [v12.2.1] — 2026-07-31

### Fixed

- **Confetti burst crashed without a 2D canvas context** (`src/atlas/lib/confetti.js`): `canvas.getContext("2d")` returns `null` where 2D canvas isn't available — jsdom under test, or a browser that has run out of contexts — and the queued animation frame then threw `Cannot read properties of null (reading 'clearRect')`. Because the burst has no `cancelAnimationFrame` path, it threw on every frame for the full 2.4s. In CI this surfaced as an unrelated failure in whichever test was running when the frame fired (`AppAtlas.test.js › redirects /world to /`); it passed locally only because teardown won the race. The burst now bails and removes its canvas when there is no context.
- **Confetti loop outlived its host** (`src/atlas/lib/confetti.js`): Nothing stopped the animation when the host unmounted mid-burst — a route change or a dismissed toast left the loop drawing to a detached canvas until the duration elapsed. Each frame now stops if the canvas is no longer connected to the document.
- **Starfield had the same null-context crash** (`src/components/Index/globe/Starfield.js`): Identical `getContext` case, where the reduced-motion path would throw synchronously on its first `drawStatic()`. Guarded the same way.

### Added

- **Confetti regression tests** (`src/__tests__/confetti.test.js`): Cover the null-context bail, the unmount-mid-burst stop, and the normal draw-and-requeue path, so the flake cannot return silently.

---

## [v12.2.0] — 2026-07-31

### Added

- **Blog word-count extractor** (`scripts/blog-word-counts.mjs`): A read-only script — `npm run blogs:wordcount` — that answers "how much have I actually written?". It pages the Substack archive API, whose post objects carry a native `wordcount`, and the WordPress.com API, which has no such field and so gets its counts derived by stripping tags from the rendered body. Each post records which of the two methods produced its number, because Substack's counter and a whitespace split are not the same measurement and shouldn't be blended silently. Output is `knowledge_base/blog-word-counts.json`: per-post rows plus totals rolled up by month, year, platform and lifetime. Posts are bucketed by their own publish timestamp converted to IST, not by `blogs.blog_date`, so a late-evening post lands on the day the site says it did.
- **Coverage and anomaly reporting** (`scripts/blog-word-counts.mjs`): The script reads the `blogs` table to mark which published posts the site actually tracks, and reports the gap rather than papering over it — 43 of 93 posts (the 2021 explainer series, most book reviews, older WordPress writing) exist on a platform but have no row. It also flags rows whose `blog_date` isn't `YYYY-MM-DD`, which surfaced id 45 storing `2026--07-09`; that malformed value produces a junk month bucket in the 100 Days chart and the Almanac's "busiest writing month". Nothing is written back — the table is read with the publishable key, so no service-role secret is needed.
- **Month-to-date and year-to-date metrics** (`scripts/blog-word-counts.mjs`): A `currentPeriod` block reporting words, posts and words/day for the running month and year. The year-on-year comparison cuts last year at the same month and day rather than comparing a partial year against a whole one, which would flatter the current one every January.
- **The Writing Ledger page** (`public/writing-ledger.html`, built by `scripts/build-blog-infographic.mjs` from `scripts/infographic-template.html`): A standalone infographic served at `/writing-ledger.html` — hero total, stat tiles, month/year-to-date panel, a cumulative sparkline, and charts for words per year, every month on record, platform split, post-length distribution and day-of-week cadence, plus the longest ten posts and the recurring tags. It ships from `public/` so Vite copies it verbatim into `build/`; the dot in the filename means `functions/_middleware.js` skips it, so the page carries its own canonical and OG tags rather than having the SPA's meta injected over the top. `npm run blogs:infographic` inlines the JSON into the template, so the page is a single self-contained file with no fetch, no CORS and no external assets.
- **Filterable post ledger** (`scripts/infographic-template.html`): Every post in one collapsed table — search across titles, tags and sections, filter by platform, year and whether the site tracks the post, and sort on any column. Titles link out to the published piece. It stays collapsed by default because 93 rows would otherwise more than double the page height, and the summary reports how many posts the current filters match.
- **Light/dark theme toggle** (`scripts/infographic-template.html`): Follows the OS by default and remembers an explicit choice in `localStorage`. Chart marks are painted with `var(--…)` rather than a hex resolved once at load, so switching theme repaints the SVGs instead of stranding light-mode blues on a dark surface. The palette was checked with the data-viz validator and clears the lightness, chroma, CVD-separation, normal-vision and contrast gates in both modes.
- **Poster export** (`?capture=light` / `?capture=dark`): A capture mode that hides the interactive-only chrome so a headless-Chrome screenshot exports the infographic rather than an 8,000px table dump. Rendered to `knowledge_base/writing-ledger-{light,dark}.png` at 2× scale.

---

## [v12.1.0] — 2026-07-26

### Added

- **Now month editor** (`src/pages/admin/now/NowMonthEditor.js`): The admin's Now · Months tab is now its own editor instead of a row in the generic resource form. Every section of the month — blogs, running, books, events, projects, certificates, website, misc, stats — gets a real form with labelled fields and repeatable rows, so the nine differently-shaped sub-sections no longer have to be typed as raw JSON. Month is a dropdown of full English month names (free text quietly broke the Now page's sort order), and saving a month marked "current" clears the flag on the previous one, which used to be a second manual edit. The raw JSON survives behind an "Advanced" panel as an escape hatch.
- **Month auto-fill from the content tables** (`src/lib/nowAutofill.js`): A "Pull records for this month" button gathers every blog, race, book, trek and micro-post dated inside the month being edited and offers them as checkboxes — nothing is applied until you pick it, and records already in the section are filtered out. Races map into the running section (converting `"21 Kms"` to the bare `"21"` the card expects) and treks into events, since the Now page has no trek section. Date normalisation reuses `parseContentDate` from the monthly-digest helpers. Micro-posts are the one source not held in `ContentContext`, so they are fetched for just that month via `getMicroblogByMonth` and passed in pre-filtered; they de-duplicate on archive id rather than on text.
- **Micro posts on the Now page** (`src/components/Now/NowMicroSection.js`): A month can now carry its micro-blog scraps, rendered as a grid of small cards — type chip, date, optional photo, clamped text (quotes get typographic quote marks) and tags — each linking back to its archive permalink. Rows typed by hand in the admin have no id and render unlinked. The section is editable like any other, so a pulled post can be trimmed or removed before publishing.
- **Changelog highlights auto-fill** (`src/lib/changelogEntries.js`): A "Pull highlights from changelog" button on the Website Updates section parses this file, filters to versions released in that month, and offers each entry as an editable one-liner — the feature name plus its first sentence. Added entries come pre-checked; Changed, Fixed and Removed are listed unchecked.
- **Custom stat groups** (`src/components/Now/NowStatsSection.js`): Now-page stats are no longer limited to Strava and Substack. A month can carry any number of named groups of `{label, value, unit}` tiles, authored in the admin and rendered in a neutral tile style below the two branded groups.
- **`isoDate` form field** (`src/pages/admin/FormField.js`): A date picker that stores its own `YYYY-MM-DD` value verbatim, for real Postgres date columns and the Now JSON fields. The existing `date` type still writes the `"Month DD, YYYY"` string that Sports rows use.

### Changed

- **Micro-blog date defaults to today** (`src/pages/admin/MicroblogManager.js`): The date was a hand-typed text box with no default, in front of a `date NOT NULL` column that every reader assumes is exactly ten ISO characters. New posts now open with a "Today" toggle on and the date filled in; unchecking it reveals a date picker for backdating, and while the toggle is on the date is re-stamped at save time so a form left open across midnight still records the right day. Editing an existing post always opens with the toggle off.
- **Date helpers** (`src/lib/monthDigest.js`): Added `toIsoDate` / `todayIso`, built from local-time getters rather than `toISOString` — UTC would roll an IST evening back to the previous day.

---

## [v12.0.0] — 2026-07-20

### Added

- **Expedition Trail** (`src/components/OneHundredDays/ExpeditionTrail.js`): The 100 Days challenge drawn as a journey — an illustrated SVG route from Base Camp (post 0) to the Summit (post 100) across the writer region's ridge. One waypoint per post (published waypoints are inked, clickable, and open the post modal), tents mark the quarter camps, a pennant flag shows today's position with the pace delta as a margin note, and the walked segment draws itself in on first view (reduced-motion renders instantly). A steeper switchback route keeps it legible on phones. The classic ring + tiles band survives behind the new Trail/Classic toggle (`?layout=classic`).
- **Micro Blog pinboard view** (`src/components/MicroBlog/PinboardCard.js`): The archive's new default view renders results as paper pinned to the Scriptorium wall — sticky notes for text posts (warmer paper for Marathi), torn slips with a drop quotation mark for quotes, polaroids for photos — with deterministic tilts, pushpins, and the same chips, tags, permalinks and modal as the list. The classic list stays one toggle away (`?layout=list`); the choice is always recorded in the URL.
- **Month river strip** (`src/components/MicroBlog/MonthRiver.js`): One thin bar per month from the first Tumblr post to today (calendar gaps included), sitting under the search box as both a visualization of nine years of posting and a filter — clicking a month narrows the archive to it (`?month=YYYY-MM`), powered by a new `month` filter in `searchMicroblog` and a `getMicroblogActivity` helper (`src/lib/api/microblog.js`) that also computes the longest daily posting streak. The stats tab gains a posts-per-year chart from the same fetch.
- **Stats Almanac** (`src/components/Stats/StatsAlmanac.js`): The stats page's new default layout — the bento re-grouped into chapters (I Persona · II Mind · III Body · IV Lens · V Craft) under `ChapterRibbon` headers, opened by a highlights strip (busiest writing month, longest micro streak, top topic, kilometres raced). Numbers count up on first scroll (`src/components/Stats/CountUp.js`, reduced-motion safe), and new charts land where static digits were: 100-days posts per month, micro-blog posts per year, races per year. The previous layout is preserved verbatim as `StatsClassic.js` behind an Almanac/Classic toggle (`?layout=classic` — `view` is reserved by the shell switch).
- **Pune skyline** (`src/components/Stats/PuneSkyline.js`): An inline line-art skyline (fort wall, temple shikhara, towers, Sinhagad on the horizon) replacing the profile card's hot-linked Google-CDN photograph in the almanac view — one less external dependency that could vanish.

### Fixed

- **Modals stranded off-screen after arriving from the map** (`src/atlas/regions/RegionShell.js`): The map→region entrance animates `transform`, and its `fill-mode: both` kept the animation applied forever — which quietly made the page wrapper the containing block for every `position: fixed` descendant. Any modal opened after arriving from the map (blog cards, calendar squares, micro-blog posts) painted its backdrop over the whole document and centered its panel mid-document instead of mid-viewport, so the page dimmed and blurred with no modal in sight. Deep links were unaffected, which made it look random. The entrance class is now removed the moment the animation ends.
- **100 Days modal overflow and a11y** (`src/pages/OneHundredDays.js`): The post modal now caps at 85vh with internal scrolling (tall posts were clipped on phones), closes on Escape, locks the page scroll behind it while open, and its action row wraps instead of squeezing "Read full post" onto three lines. The micro-blog modal gains the same scroll lock (`src/components/MicroBlog/PostModal.js`).

---

## [v11.2.1] — 2026-07-18

### Added

- **Site dossier** (`docs/SITE_DOSSIER.md`): A complete feature and architecture reference for the whole site — the two-shell system, the Wanderer's Atlas (intro, map hub, HUD, gamification, audio, guide), the classic homepage and every public page, the share-image editor, design language, Supabase data architecture, admin CMS, and the Cloudflare delivery layer — written as the source document for a design presentation. Counts and version facts dated as of 2026-07-18.

---

## [v11.2.0] — 2026-07-13

### Added

- **Full share-image editor** (`src/components/share/ShareImageModal.js`, `src/components/share/ShareCard.js`): The "Share as image" popup grew from three backgrounds into a full editor, for every content type (micro-blog, 100-days blogs, books, treks, races, instagram). Seventeen themes in five families — Core (Light / Dark / Abstract), Editorial (Sepia / Ivory / Charcoal / Midnight), Gradient (Sunset / Ocean / Forest / Aurora), Texture (Notebook / Terminal / Blueprint / Newsprint) and Signature (Letterpress / Neon) — picked from a grouped swatch grid that previews each card background. New Square (1:1) and Story (9:16) shapes join Portrait and Auto. Text controls let you restyle the body as plain text, a serif quote, or a bold headline, switch the font (sans / serif / mono), size (Auto/S/M/L) and alignment; the Terminal theme defaults to mono and Letterpress to serif for Marathi quote posts. Toggles control inclusion of the timestamp, tags, and the handwritten signature on the exported card.
- **Designed Marathi & handwritten faces** (`src/components/share/shareFonts.js`, `ShareImageModal.js`, `ShareCard.js`): The editor gains eight display typefaces picked from live specimens — five Marathi/Devanagari faces (Tiro Devanagari Marathi, Yatra One, Modak, Kalam, Rozha One; each specimen renders "मराठी" in the face itself) and three English handwriting faces (Caveat, Dancing Script, Shadows Into Light). The Google Fonts stylesheet loads once, only when the editor opens, so regular page loads ship zero extra font bytes. Devanagari has no italics, so the quote style drops its synthetic italic whenever a display face is active.
- **Footer on atlas pages** (`src/atlas/regions/RegionShell.js`): Atlas-mode region pages now end with the same classic footer (copyright + Mail / GitHub / LinkedIn / Instagram) as the classic shell, so every content page closes the same way in both modes. The full-screen map hub stays footer-free.

### Fixed

- **Micro-blog photo posts never offered "Include image"** (`src/components/share/shareCardConfig.js`): The microblog share adapter read `image_url`, but API rows arrive camelCased as `imageUrl`, so the hero image (and its toggle) never appeared for photo posts. The adapter now accepts both shapes.

### Changed

- **Image size control** (`src/components/share/ShareImageModal.js`, `src/components/share/ShareCard.js`): When an item has a photo and "Include image" is on, a new S / M / L control sets the hero height per shape (e.g. 280 / 400 / 540 px on Portrait); the body's line budget hands back or gives up two lines in step, so text never overflows the frame.
- **Admin dashboard sheds atlas chrome** (`src/App.js`, `src/pages/admin/Dashboard.js`, `src/components/Template/FloatingToggle.js`): In atlas mode the world HUD (compass menu, return-to-map portal, passport, sound and day/night buttons) no longer mounts over `/admin`, and the admin's floating corner control now shows only the light/dark theme toggle — the "Enter the Atlas" button is gone there. `FloatingToggle` gained a `showAtlasSwitch` prop for this.
- **Share-model timestamps** (`src/components/share/shareCardConfig.js`): Date meta rows are now flagged `isDate`, which powers the editor's timestamp toggle across all content types.

---

## [v11.1.0] — 2026-07-11

### Added

- **Map zoom controls** (`src/atlas/map/MapControls.js`, `src/atlas/map/worldMap.css`): An on-screen zoom-in / zoom-out / reset cluster at the bottom-left of the map hub, so touch users and wheel-less pointer users get the affordances the wheel/pinch gestures assume. Reset flies the camera back to the resting view (the same target as the Escape key) — the escape hatch when a pinch strands the view. Fades out during a fly-in.
- **"Enter the Atlas" button** (`src/components/Template/FloatingToggle.js`): A floating action button in the classic shell that switches back to the Wanderer's Atlas — the mirror of the passport's "Switch to Classic". Previously classic view was a one-way trip: there was no in-app way back into the atlas once you left it. Setting the stored view outranks the reduced-motion default, so it works even for a visitor who was auto-routed to classic.
- **Stats placard on the map hub** (`src/atlas/map/StatsWidget.js`, `src/atlas/map/WorldMap.js`): A floating "Life in Numbers" card hangs in the sky above the Book Forest, showing headline counts (books · treks · races · micro-posts) from the hand-maintained `atlasStats.js`. Clicking or activating it jumps straight to the `/stats` page. It's a real `role="link"` element with keyboard (Enter/Space) and screen-reader support, lifts on hover/focus like the region plaques, and inherits the reader biome's accent so it reads as part of the world.

### Changed

- **Map hub fits every region on mobile** (`src/atlas/map/WorldMap.js`, `src/atlas/map/mapRegions.js`): The hub now rests on the whole map on every viewport instead of zooming ~1.6× onto the hometown on phones. Small screens switch the SVG from fill-and-crop (`slice`) to fit (`xMidYMid meet`), so all six worlds sit in one window — centered vertically, with sky filling evenly above and below; wider screens keep the immersive full-bleed slice. Removes the now-unused `HOME_VIEW`.
- **Instant orbit arrival, no cold-load API** (`src/atlas/intro/OrbitStage.js`, `src/data/atlasStats.js`): The atlas arrival (orbit) stage no longer waits on Supabase before it can paint. The teaser counts (races · treks · books · micro-posts) now read from hand-maintained numbers in the new `atlasStats.js`, and the arrival globe shows the six worlds as static markers built from the `DOMAINS` constant. This drops five list fetches plus a microblog COUNT query from the very first screen a visitor sees — the slow first paint on mobile networks. Live, per-item content still loads the moment the visitor enters the world.

---

## [v11.0.0] — 2026-07-10

**The Wanderer's Atlas.** The site is now an explorable illustrated world. You
arrive in orbit above a globe, dive through the clouds, and land on a hand-drawn
2.5D map whose six regions are the six things this site is about. Every page is
a place inside one of them. The old editorial layout is still here — one click
away, and automatic if you ask for reduced motion — but it is no longer the
front door.

Built as sixteen phases on a single branch behind an `ATLAS_LIVE` flag and a
hidden `/world` preview route; this entry is the whole story, landing at once.

### Added

- **The atlas homepage** (`src/atlas/AtlasHome.js`, `src/atlas/intro/`): an orbit → dive → map state machine. `OrbitStage` reuses the existing homepage globe through a new `mode="orbit"`, and `DiveSequence` + `CloudBloom` play a ~3.5s GSAP plunge through a whiteout into the map. The intro is skippable, remembered (`introSeen`), replayable from the passport, and reduced to a quiet fade under `prefers-reduced-motion`.
- **The map hub** (`src/atlas/map/`): a layered SVG world — sky, far backdrop, mid biomes, near props, easter eggs, labels — with pan/zoom/pinch, keyboard-navigable region hotspots with an offscreen screen-reader mirror, a pointer-parallax rig (`parallax.js`), and a fly-in that hands off to the router.
- **Six biomes as code** (`src/atlas/map/art/`): Book Forest, Coast, Ridge, Scriptorium, Workshop and Hometown Square, drawn as flat-vector SVG-in-JSX against a per-file size budget. Each has idle life (drifting clouds, turning gears, waves) and a night state — lit windows, stars, fireflies — driven entirely by CSS custom properties.
- **Region interiors** (`src/atlas/regions/`): `RegionShell` renders each content page inside its biome — themed header band, breadcrumb, parchment column, region accent tokens — from a single truth table (`registry.js`) that also feeds the compass menu. Page content is untouched between shells.
- **The world HUD** (`src/atlas/hud/`): compass menu (every page, grouped by region), passport, sound toggle, day/night sun-moon, and a return portal, mounted once outside the router so it survives navigation.
- **Gamification** (`src/atlas/gamification/`): a pure `questEngine` over Explorer/Collector quests, achievements, and five hidden easter eggs — two of them night-only. Progress lands as passport stamps with confetti and a reward toaster. Everything is local: no accounts, no server.
- **Persistent world state** (`src/atlas/world/`): an `atlas.v1` localStorage schema behind a reducer + debounced writer, with a pure, tested migration that seeds your passport from the old `globe-visited-worlds` key — so anyone who explored the globe already has stamps.
- **Day/night** (`src/atlas/theme/`): `--atlas-*` design tokens under `.atlas-root[data-time]`, coupled one-way to the existing `ThemeContext`, and set automatically from the visitor's local hour (19:00–06:00 → night) on first visit.
- **Ambient audio** (`src/atlas/audio/`, `public/audio/`): a hand-rolled ~150-line WebAudio manager — no library — that loads nothing until you turn sound on, then cross-fades a per-region bed. The seven loops and the SFX sprite are procedurally synthesised by `scripts/generate-atlas-audio.mjs` (filtered noise + sine partials), so the repo owns its audio outright. Off by default.
- **A guide** (`src/atlas/guide/`): a flat-vector mini Sanket who pops in with one line at a time — a welcome, a nudge toward the passport, a hint that sound exists. Each beat is acknowledged once, forever. Replaces the react-joyride tour.
- **Two-shell plumbing** (`src/atlas/PageShell.js`, `src/atlas/useViewMode.js`, `src/config/featureFlags.js`, `src/components/Template/PageMeta.js`): one route table, two shells. View mode resolves synchronously — `?view=` param, then stored choice, then reduced-motion, then the flag — so the first paint is never wrong. `PageMeta` is shared, so page metadata cannot fork between shells.
- **`src/styles/classic.css`**: bare-element defaults for the classic shell, scoped to `.classic-root` and wrapped in `:where()` so a utility class always wins. The counterpart to the `.atlas-root` reset.
- **Flip tests** (`src/__tests__/AppAtlas.test.js`): assert that `/` serves the map, that the classic nav is absent, and that `/world` redirects.

### Changed

- **`/` is the atlas** (`src/App.js`, `src/config/featureFlags.js`): `ATLAS_LIVE` is now `true`, and a new `HomeRoute` picks the world map or the editorial homepage per shell. Classic remains reachable via `?view=classic`, the passport's "Switch to Classic" kill switch, and `prefers-reduced-motion`.
- **`/world` redirects to `/`** (`src/App.js`, `functions/_middleware.js`): the preview route now 301s at the edge and `<Navigate>`s in-app; its `X-Robots-Tag: noindex` is gone, and the atlas homepage is indexed as `/`.
- **`GlobeRenderer`** (`src/components/Index/GlobeRenderer.js`): gained an `orbit` mode (chrome hidden, auto-rotating, imperative `plunge()` handle). three.js stays exactly as lazy as before — the atlas intro shares the homepage's chunk.
- **`usePanZoom` and `confetti` promoted** (`src/hooks/usePanZoom.js`, `src/atlas/lib/confetti.js`): moved out of MindMap/globe into shared homes, with re-export shims at the old paths.
- **Body base styles** (`src/tailwind.css`): the `body` rule finally applies — the legacy stylesheet loaded after Tailwind and had been silently winning — and now tracks the theme instead of pinning a near-black background.
- **`docs/architecture.md`**: styling section rewritten now that Tailwind is the only system.

### Removed

- **The HTML5UP theme** (`src/static/css/`, 28 files, ~3,960 lines of SCSS, and the `sass` devDependency): every class it defined was dead once the page waves finished migrating content to Tailwind, and its `!important` element globals only fought them. The entry stylesheet drops from **164.17 KB to 102.24 KB raw (25.90 → 15.85 KB gzipped)**.
- **react-joyride** and its tour system (`TourContext.js`, `TourGuide.js`, `TourMount.js`, `tourSteps.js`), plus the 28 now-inert `data-tour` attributes it left across 19 components. Dropping it (~40 KB) roughly paid for GSAP (~30 KB), which is confined to lazy atlas chunks. The entry bundle ends at **149.66 KB gzipped**, within the 5 KB budget set at the start.
- The `#wrapper`/`#main` ID styling hooks, the admin checkbox's inline-style workaround, and the `!important` marks in the `.atlas-root` reset — all of them scaffolding against the deleted stylesheet.

### Fixed

- **`rounded-full` was not round** (`tailwind.config.js`): it had been overridden to `0.75rem`. That looks correct only on elements short enough for the browser to clamp the radius to half their height — dots and progress bars — and had quietly squared off every avatar, icon button and tag pill on the site. Restored to `9999px`.
- **Markdown headings on `/changelog`**: the legacy `h1–h6 { text-transform: uppercase }` global was overriding the prose styles, shouting every version heading. Removed with the stylesheet.
- **Region header art** (`src/atlas/map/art/biomeLife.css`): headers reuse the biome components but never loaded the map's stylesheet, so their halos and light beams rendered at full daytime opacity regardless of the hour. The day/night switches now live in a stylesheet the art itself imports.

---

## [v10.4.0] — 2026-07-06

### Added
- **"My World" interactive 3D globe on homepage** (`src/components/Index/GlobeShowcase.js`, `src/components/Index/GlobeRenderer.js`, `src/components/Index/globe/`, `src/data/homeFeatures.js`): A new homepage section renders an abstract WebGL globe (react-globe.gl/three.js) with six themed "worlds" — Marathons, Treks, Writer, Reader, Creator, Person — each anchoring a spiral of clickable content pins (races, treks, blog posts, books, projects, site features), procedural hexagon terrain, a radar ring, and a cross-fading background artwork. Clicking a pin opens a rich detail card (extended MindMapDetailPanel with a new `feature` type). The globe and its three.js dependency are code-split via React.lazy and only mount once the section scrolls into view.
- **Globe exploration features** (`src/components/Index/GlobeRenderer.js`, `src/components/Index/globe/`): Always-visible domain legend chips with item counts (click to fly), an active-domain glass info card with a "View all" link, constellation arcs linking the active domain's pins, an auto-play mode that drifts world-to-world, a "Replay my journey" mode that rotates the globe through all six worlds in turn — round-robin, a few stops per world — with a comet arc and section-labelled captions, a dark-mode twinkling starfield, a gamified "worlds explored" tracker with a one-time confetti celebration, a first-visit "drag to explore" coach mark, and shareable deep links (`/?world=treks`).
- **Get Started site tour with per-page walkthroughs** (`src/components/Template/TourGuide.js`, `src/components/Template/TourMount.js`, `src/context/TourContext.js`, `src/data/tourSteps.js`, `src/components/Template/FloatingToggle.js`): A guided walkthrough (react-joyride, lazy-loaded only when started) launched from a new floating "Get Started" button above the dark-mode toggle. Each page has its own content-aware tour keyed by route — the homepage walks the whole menu bar (opening the "More" dropdown to reveal its items) plus the globe/stats/explore highlights, while every other page spotlights its own content (e.g. the Sports view tabs, the 100-Days progress map, the Micro Blog search). Steps whose targets aren't visible at the current breakpoint are filtered out, so desktop-nav vs. mobile-hamburger steps swap automatically. First-time visitors get a dismissible "take the tour?" prompt bubble.

### Changed
- **Homepage feature list hoisted** (`src/data/homeFeatures.js`, `src/pages/Index.js`): The 12-entry feature-grid array moved out of Index.js into a shared data module so both the feature grid and the new globe pins consume the same source of truth.
- **Globe scroll rotation refined** (`src/components/Index/GlobeRenderer.js`): Page scroll still drifts the globe between worlds, but gentler, and it pauses while dragging, while a detail card is open, when the section is off-screen, and under `prefers-reduced-motion`.
- **Globe accessibility & mobile** (`src/components/Index/GlobeRenderer.js`): Pins are keyboard-focusable (Enter/Space opens details), pin labels declutter to hover/zoom reveal, controls are always visible on touch devices, and all animated extras respect `prefers-reduced-motion`.
- **Globe image assets compressed** (`public/images/globe/`): Background artwork and globe textures converted from 0.6–1.2MB PNGs to ≤235KB JPEGs; six unused per-domain texture PNGs (~6.7MB), the unused earth day/night textures, and the obsolete `src/data/geo/placeCoordinates.js` lookup were removed.

## [v10.3.0] — 2026-07-02

### Added

- **Substack RSS Pages Function** (`functions/rss-feed.js`): New Cloudflare Pages Function that fetches the "The Wanderer's Technical Anecdotes" Substack feed server-side (Substack blocks CORS), parses the `<item>` blocks with a dependency-free regex parser, edge-caches the result for 30 minutes, and serves it as same-origin JSON at `/rss-feed`.
- **Latest Writing feed** (`src/components/Index/LatestPosts.js`): Homepage section that renders the live Substack feed in a scroll region, revealing 10 posts at a time as the reader scrolls (IntersectionObserver on a sentinel). Fails silently if the feed is unavailable.
- **Monthly Digest dashboard** (`src/components/Index/MonthlyDigest.js`): Auto-aggregating homepage dashboard that groups blogs, micro-posts, treks, marathons, and books by their content month, with a dropdown month picker (only months that have content), KPI count-tiles, and a capped list per type (~6 items, "View all →" to the section page). Sections are laid out in fixed rows — Blogs + Micro Posts, then Treks + Marathons, then Books. Items link to their internal detail routes. (Books have no month-precise date, so they bucket by `created_at`.)
- **Month/date helpers** (`src/lib/monthDigest.js`): Dependency-free `parseContentDate`/`monthKey`/`monthLabel`/`monthRange`/`itemMonthKey` that reconcile the three content date formats (blogs `YYYY-MM-DD`, treks `DD-MM-YYYY`, sports `Month DD, YYYY`) plus microblog ISO dates, falling back to `created_at`.
- **Microblog month queries** (`src/lib/api/microblog.js`): `getMicroblogMonths()` (distinct content months for the dropdown) and `getMicroblogByMonth()` (capped, counted month slice via the `date` index).

### Changed

- **Homepage** (`src/pages/Index.js`): Added the "Latest Writing" and "Monthly Digest" sections above "Explore".
- **Blogs/treks/sports read-mappers** (`src/lib/api/{blogs,treks,sports}.js`): Expose `created_at` from each row (read-only) so the digest's date fallback can use it.
- **Latest Writing feed default** (`src/components/Index/LatestPosts.js`, `src/pages/Index.js`): The RSS feed now shows 5 Substack posts initially (and reveals 5 more per scroll) instead of 10.
- **Project docs** (`CLAUDE.md`): Rewrote the stale content-pipeline instructions — the markdown/`cms:sync` CMS flow was removed, so the docs now describe Supabase as the single source of truth (admin dashboard, `src/lib/api/*`, `media` storage bucket) and note the new homepage RSS/digest sections.

---

## [v10.2.4] — 2026-06-30

### Fixed

- **"Is current month" toggle in the Now · Months admin editor** (`src/pages/admin/FormField.js`): The boolean checkbox was invisible and felt un-editable. The vendored HTML5UP form stylesheet (`src/static/css/components/_form.scss`) applies a global `input[type="checkbox"] { appearance: none; opacity: 0; float: left; }` rule (the skel pattern that hides the real box and draws a fake one via a paired `<label>`), and that attribute selector outranks the Tailwind utility classes on the admin checkbox. Restored native rendering with inline styles (which win over the no-`!important` legacy rule) so the toggle is visible and clickable again.

---

## [v10.2.3] — 2026-06-17

### Fixed

- **Share-as-image hero crop** (`src/components/share/ShareCard.js`): The included photo was forced into a full-width, fixed-height box with `object-cover`, cropping portrait/landscape images. The image now keeps the fixed height but takes a dynamic width from its natural aspect ratio and is centered, so the whole photo is shown un-cropped.

---

## [v10.2.2] — 2026-06-16

### Fixed

- **Dynamic metadata for individual micro-blog posts** (`functions/_middleware.js`, `src/pages/MicroBlogPost.js`): Per-post social/SEO metadata was effectively generic — the OG/page **title** was a bare date stamp (`Post · <date>`) instead of the post's content, the share **image** was always the site logo, and on any Supabase fetch miss a post fell back to the site-wide default meta (every other dynamic route degrades to its section listing). Posts now derive a content-based title, use the post's own `image_url` for `og:image` when present, and fall back to the **Micro Blog** section meta.
- **Crawler/client metadata drift on every detail route** (`functions/_middleware.js`, `src/pages/{TrekPost,SportPost,BookPost,BlogPost,ProjectPost}.js`): The Cloudflare middleware (what crawlers/social cards see) and the client-side react-helmet tags derived their `og:title` / `og:description` independently, with different wording — and the client pages didn't pass a per-item `og:image` at all, so the share image fell back to the section default while the crawler used the item's photo. Treks, sports, books, 100-Days blogs, and projects now all build their meta through one shared per-type helper used by both layers, so crawler and client tags are identical and the item image is used on both.

### Added

- **Shared per-type meta helpers** (`src/data/pageMeta.js`): Pure, import-free `buildMicroblogMeta`, `buildTrekMeta`, `buildSportMeta`, `buildBookMeta`, `buildBlogMeta`, and `buildProjectMeta` — each returns a bare `{ title, description, image }` and is consumed by BOTH the client detail page and the esbuild-bundled Cloudflare middleware so the two can never drift. Covered by `src/data/pageMeta.test.js`. (Instagram has no per-post detail route, so no per-post metadata applies there.)

---

## [v10.2.1] — 2026-06-15

### Fixed

- **Sidebar/content overlap at desktop widths on every page** (`src/static/css/layout/_wrapper.scss`, `src/layouts/Main.js`): The vendored HTML5UP `#wrapper` rule styled the layout container by **ID** (`display: flex; flex-direction: row-reverse`) and forced `display: block` at the skel `large` breakpoint (`≤1280px`), which outranks the Tailwind layout utilities on the same element. Between `lg` (1024px) and 1280px the sidebar (profile / about / résumé) and the main content collapsed into an overlapping block stack. Removed the legacy layout declarations and set `lg:flex-row-reverse` on the wrapper in `Main.js` so Tailwind owns the layout — the sidebar keeps its original right-hand column position across all desktop widths, without the overlap.

---

## [v10.2.0] — 2026-06-17

### Changed

- **Home page layout** (`src/pages/Index.js`): Reordered the page so the **Life in Numbers** stats band and a new **In 1 Minute** intro now sit directly under the hero, with the section-navigation cards moved below them under a new **Explore** header.
- **Life in Numbers** (`src/components/Index/LifeStats.js`): Expanded from 4 to 6 stat cards — added **Projects Built** and **Micro Posts** (live Supabase count) alongside Books, On Foot, Treks, and Posts. Cards use the compact single-row strip styling from the About page — 3-up on mobile, all six in one line on tablet/desktop.
- **Micro Blog post actions** (`src/components/MicroBlog/PostModal.js`, `src/pages/MicroBlogPost.js`): Added the new **Export as image** action alongside the existing Share/Copy/Permalink controls. Extracted the duplicated `typeColors`/`sourceLabels` maps from `PostModal.js`, `MicroBlogPost.js`, and `PostCard.js` into a shared `src/components/MicroBlog/constants.js`.
- **Unified micro-blog image export** (`src/components/MicroBlog/ExportImageButton.js`): Now delegates to the shared `ShareImageButton` (`kind="microblog"`) instead of its own bespoke template, so micro-blog exports share one code path with every other content type and gain the customization popup, the three backgrounds, and native share.
- **"Share as image" across content** (`src/components/Sports/MarathonDetailsModal.js`, `src/components/Treks/TrekDetailsModal.js`, `src/components/Books/DigitalLibrary.js`, `src/pages/OneHundredDays.js`, `src/components/Instagram/Post.js`): Added an **Image** action alongside the existing Share/Copy/Permalink controls (inline on each Instagram post, which has no modal). The same **Image** action also sits in the header of the standalone detail pages (`src/pages/{BookPost,BlogPost,SportPost,TrekPost}.js`) next to their Share control, so an item can be exported straight from its permalink.
- **Admin multi-tag input** (`src/pages/admin/FormField.js`): Replaced the comma-separated `type: "tags"` text box with a chip editor — type and press Enter or comma to add, ×/Backspace to remove, with case-insensitive dedupe. The value stays a `string[]`, so books, 100-Days blogs, Instagram, micro-blog, and résumé skills all benefit unchanged.

### Added

- **`OneMinuteIntro`** (`src/components/common/OneMinuteIntro.js`): Shared "In 1 Minute" intro blurb, now rendered on both the home page and the About page (`src/components/About/AboutDocument.js`) so the two never drift.
- **`getMicroblogCount()`** (`src/lib/api/microblog.js`): Lightweight head-only Supabase count of micro-blog posts, used by the home-page stats band.
- **`ExportImageButton`** (`src/components/MicroBlog/ExportImageButton.js`): Exports a single micro-blog post as a branded PNG card (via `html-to-image`). Renders an off-screen, fixed light-theme template — site branding, date, type badge, full post text (with quote styling), tags, source, and a permalink watermark — then downloads it as `microblog-<id>.png`. Available from both the list-view modal and the single-post page.
- **Shared "Share as image" module** (`src/components/share/`): A reusable exporter that turns any content item — micro-blog, book, 100-Days blog, Instagram post, marathon, or trek — into a branded PNG via `html-to-image`. `ShareImageButton` opens a customization popup (`ShareImageModal`) with a live preview offering **Light / Dark / Abstract** backgrounds, **Portrait (1080×1350)** or **Auto-height**, an optional hero image, and **Download** or native **Share**. One presentational `ShareCard` renders every type through per-type adapters in `shareCardConfig.js`; the card carries theme-aware brand marks — logo and signature variants in `public/images/brand/` chosen to match each background — and hides any that are missing. The logo PNGs are downscaled to 500 px (~75 KB, from ~600 KB) so they stay light when `html-to-image` embeds them into each export.

---

## [v10.1.2] — 2026-06-14

### Added
- **`sitemap.xml`** (`public/sitemap.xml`): Static XML sitemap covering all 17 public routes with priorities and change frequencies, served at the site root for search engine discovery.
- **`agents.md`** (`public/agents.md`): AI-agent discovery file (llms.txt-style) with rich context about Sanket Tambare — professional background, site sections, social links, tech stack, and content inventory.
- **`llms.txt`** (`public/llms.txt`): Standard llms.txt file following the llmstxt.org spec — H1 title, blockquote summary, and markdown link sections covering About, Content, Meta, and an optional pointer to agents.md for extended context.

### Changed
- **`robots.txt`** (`public/robots.txt`): Added `Disallow: /admin/`, explicit AI-crawler Allow blocks (GPTBot, Claude-Web, CCBot, anthropic-ai, PerplexityBot), and a `Sitemap:` directive pointing to the new sitemap.xml.

---

## [v10.1.1] — 2026-06-13

### Changed

- **Admin Dashboard** (`src/pages/admin/Dashboard.js`): Active tab is now synced to the URL via `?tab=<key>` query param using `useSearchParams`. Deep-linking to a specific tab (e.g. `/admin?tab=__microblog`) now works correctly, and the browser back/forward buttons navigate between tabs.

### Added

- **Share, Copy, and Permalink in detail modals** (`src/components/Treks/TrekDetailsModal.js`, `src/components/Sports/MarathonDetailsModal.js`, `src/components/Books/DigitalLibrary.js`, `src/pages/OneHundredDays.js`, `src/components/MicroBlog/PostModal.js`): Every detail modal footer now has three actions — **Share** (Web Share API on mobile, clipboard fallback on desktop), **Copy** (always clipboard), and **Permalink ↗** (opens the dedicated detail page). All show a 2-second confirmation on success.

---

## [v10.1.0] — 2026-06-13

### Added

- **Micro Blog tabs** (`src/pages/MicroBlog.js`): Split the page into a **Posts** tab (existing search/filter UI) and a **Stats** tab showing total post count, date range, unique tag count, post-type breakdown (text/quote/photo) with percentage bars, source breakdown, and top 15 tags ranked by post count.
- **Sort controls** (`src/pages/MicroBlog.js`, `src/lib/api/microblog.js`): Added **Newest / Oldest / Shuffle** sort options to the Posts tab. Date sorts are server-side (Postgres `ORDER BY date`); Shuffle does a client-side Fisher-Yates randomisation — clicking Shuffle again re-shuffles without a new network request.
- **`getMicroblogStats()`** (`src/lib/api/microblog.js`): New API function that fires 8 parallel Supabase queries to build the Stats panel data.
- **Micro Blog post permalinks** (`src/pages/MicroBlogPost.js`, `src/App.js`): Added `/micro-blog/:id` as a dedicated page for individual posts — full text, all tags, source info, and a back link to the archive.
- **Per-post OG meta** (`functions/_middleware.js`): The Cloudflare Pages middleware now detects `/micro-blog/:id`, fetches the post from Supabase REST at the edge (using `SUPABASE_URL` + `SUPABASE_ANON_KEY` env vars set in the CF Pages dashboard), and injects per-post title and description into OG/Twitter meta tags for correct social-share previews.
- **Permalink links** (`src/components/MicroBlog/PostCard.js`, `src/components/MicroBlog/PostModal.js`): Each post card now shows a subtle ↗ permalink; the detail modal shows a "Permalink ↗" link in the footer.
- **Detail pages for all content types** (`src/pages/TrekPost.js`, `SportPost.js`, `BookPost.js`, `ProjectPost.js`, `BlogPost.js`): Added individual permalink pages for treks (`/treks/:id`), races (`/sports/:id`), books (`/books/:id`), projects (`/projects/:id`), and 100-days posts (`/100-days-to-offload/:id`). Each page has a share button (Web Share API / clipboard fallback), full item details, and a back link. Permalink ↗ links added to all corresponding card/list components.
- **Share button** (`src/pages/MicroBlogPost.js`, and all new detail pages): Share button in the top-right of every detail page — uses `navigator.share()` on mobile, falls back to clipboard copy with "Copied!" confirmation.
- **Content Tags section** (`src/pages/Stats.js`): New full-width bento card on the Stats page showing all book tags, all 100-days blog tags, and top-40 microblog tags — each with post counts, loaded from their respective data sources.

---

## [v10.0.0] — 2026-06-13

### Added

- **Micro Blog page** (`src/pages/MicroBlog.js`, `src/components/MicroBlog/`): New `/micro-blog` page — a searchable, paginated archive of short posts imported from Tumblr (1,600+ posts). Server-side full-text search (Postgres `tsvector`), tag/source/type filters, load-more pagination, and a detail modal. Added to the main nav (`src/data/routes.js`) and per-route meta (`src/data/pageMeta.js`).
- **`microblog` table** (`supabase/migrations/0002_microblog.sql`): New Supabase table with a generated `search_tsv` full-text index (GIN), tags/date indexes, RLS (public read / owner write), and a `microblog_tag_facets()` RPC for the filter UI. Carries a `source` column so Instagram can be added later.
- **Tumblr importer** (`scripts/import-tumblr-microblog.mjs`, `npm run microblog:import`): Re-runnable script that cleans the Tumblr export (`knowledge_base/tumblr_posts.json`) and upserts on `(source, source_id)` — idempotent and non-destructive to admin-authored posts.
- **Micro Blog data API** (`src/lib/api/microblog.js`): `searchMicroblog()` (server-side full-text search + tag/source/type filters + pagination), `getMicroblogTagFacets()`, and CRUD via the shared `createResource` factory.
- **Admin Micro Blog manager** (`src/pages/admin/MicroblogManager.js`, `src/pages/admin/Dashboard.js`): New admin tab with a server-side searched/paginated list and a create/edit/delete form for adding posts manually.
- **Shareable filters** (`src/pages/MicroBlog.js`): The search query, tags, source, and type filters are mirrored into the URL query string (`?q=&tags=&source=&type=`) and initialise from it, so filtered views are bookmarkable and survive a reload.

---

## [v9.1.6] — 2026-06-13

### Fixed

- **SideBar** (`src/components/Template/SideBar.js`): Profile photo was broken on the deployed site because `const { PUBLIC_URL } = process.env` is not replaced by Vite's `define` (only the literal `process.env.PUBLIC_URL` token is). Replaced with a plain `/images/me.jpg` root-relative path.

---

## [v9.1.5] — 2026-06-13

### Added

- **Admin dark mode toggle** (`src/pages/admin/Dashboard.js`): Added `FloatingToggle` to the admin dashboard so the dark/light mode toggle is available on `/admin` pages, consistent with the rest of the site.

---

## [v9.1.4] — 2026-06-13

### Changed

- **Sports admin form** (`src/pages/admin/resources.js`, `src/pages/admin/FormField.js`): Date field now uses a native date picker (`input[type="date"]`) with automatic conversion between the stored `"Month DD, YYYY"` format and the browser's `YYYY-MM-DD` input format. Distance field replaced with a select dropdown (10 Kms, 21 Kms, 35 Kms, 42 Kms, 50 Kms) plus an "Other" option that reveals a free-text input for custom values.

---

## [v9.1.3] — 2026-06-13

### Added

- **Wrangler config** (`wrangler.toml`): Added Cloudflare Pages wrangler config with `[vars]` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Service role key stays out of the file and must be set as a secret via `wrangler pages secret put`.

---

## [v9.1.2] — 2026-06-13

### Changed

- **Docs** (`docs/`): Removed 6 obsolete documents (`cms-data-flow.md`, `cms-github-oauth-setup.md`, `customization.md`, `improvement-plan.md`, `supabase-migration-plan.md`, `features.md`). Rewrote `architecture.md`, `deployment.md`, and `setup_guide.md` to reflect the current Supabase-backed stack. Kept `contributing.md` unchanged.

---

## [v9.1.1] — 2026-06-13

### Changed

- **Static image assets** (`public/images/`): Deleted `sports/`, `treks/`, `insta_posts/`, `projects/`, and `nirman_story/` subdirectories (205 files). All images are now served from Supabase Storage via `toStorageUrl`; the local copies were redundant. Kept `favicon/`, `me.jpg`, `logo.png`, and `logo.svg` which are still referenced in static code.

---

## [v9.1.0] — 2026-06-13

### Added

- **Supabase Storage URL helper** (`src/lib/supabaseClient.js`): `toStorageUrl(path)` and `toStorageImages(slideImages)` convert relative `/images/…` paths stored in the DB to full Supabase Storage public URLs at read time. Paths that already begin with `http` are returned unchanged, keeping admin-uploaded images and legacy paths coexistent.
- **Bulk image upload script** (`scripts/upload-images-to-supabase.mjs`, `npm run images:upload`): Walks `public/images/` (skipping `favicon/`) and uploads all 205 images to the `media` Storage bucket, preserving the existing subfolder structure. Re-runnable via upsert.

### Changed

- **Image API mappers** (`src/lib/api/sports.js`, `treks.js`, `instagram.js`, `projects.js`): `fromRow` now applies `toStorageImages` / `toStorageUrl` so every image served by these APIs resolves to the Supabase Storage CDN URL automatically.
- **Interactive Me tab synced to URL query param** (`src/pages/InteractiveMe.js`): Active tab (Sports / Treks) is now reflected in `?tab=sports` / `?tab=treks`. Navigating directly to either URL pre-selects the correct tab; the Share button copies the full URL so recipients land on the same view. Invalid or missing `tab` param defaults to Sports.
- **CMS pipeline removed** (`public/cms/`, `src/cms-content/`, `src/data/{books,sports,treks,projects,instagram,100DaysToOffload}.js`, `src/data/resume/`, `scripts/sync-cms-to-data.js`, `scripts/seed-cms-content.js`): Decap CMS config, all canonical markdown, and generated JS data files deleted now that Supabase is the source of truth. Removed `prebuild`/`cms:sync`/`cms:seed`/`cms:server` npm scripts, the CI data-drift check, and `scripts` from the ESLint pattern (remaining scripts are `.mjs`).
- **Aggregation pages fully migrated to Supabase** (`src/pages/Stats.js`, `src/pages/MindMap.js`, `src/components/About/AboutDocument.js`, `src/components/Index/LifeStats.js`, `src/components/InteractiveMe/InteractiveMeTimeline.js`): Removed all remaining static `src/data/*.js` imports from these consumers; switched to `useBooks`/`useSports`/`useTreks`/`useBlogs`/`useProjects`/`useInstagram`/`useResume` hooks. Stats shows a full-page loading state until all 6 collections resolve; About, LifeStats, and InteractiveMe degrade gracefully (zeros/empty) while loading. MindMap `categories` array moved inside component as a `useMemo`. All `useMemo` dep arrays updated to include the data variables.

---

## [v9.0.0] — 2026-06-13

### Added

- **Supabase backend integration** (`supabase/migrations/0001_initial_schema.sql`, `src/lib/supabaseClient.js`, `src/lib/api/*`): Postgres schema for all dynamic content (books, sports, treks, projects, blogs, instagram, resume sub-collections, now months + meta) with `updated_at` triggers, Row-Level Security (public read, owner-only writes via `is_owner()`), and a public `media` storage bucket. Added `@supabase/supabase-js` and a per-entity data-access layer that maps DB rows to existing component shapes.
- **Content provider + live data hooks** (`src/context/ContentContext.js`, `src/hooks/useCollection.js`): Lazy, cached per-collection fetching exposed via `useBooks`/`useSports`/`useTreks`/`useProjects`/`useBlogs`/`useInstagram`/`useResume`/`useNowMeta`/`useNowMonths`; shared loading/error/empty UI in `src/components/common/AsyncStates.js`.
- **Admin editor** (`src/pages/admin/*`, route `/admin`): Email+password login (Supabase Auth), session guard, and a schema-driven CRUD dashboard for every content type with image upload to Supabase Storage and a dedicated Now-meta editor.
- **One-time import script** (`scripts/import-to-supabase.mjs`, `npm run data:import`): Seeds the canonical `src/cms-content/**` markdown into Supabase using the service-role key (run locally once).

### Changed

- **Public content pages now fetch live from Supabase** (`src/pages/{Books,Projects,Resume,Now,OneHundredDays,Sports,Treks}.js`, `src/components/{Instagram/Posts,Sports/*,Treks/*}.js`): Switched from static `src/data/*.js` imports to the content hooks, with loading/error states and corrected `useMemo` dependencies. Aggregation/visualization pages (Stats, About, Index, MindMap, InteractiveMe) still read the static data files and will migrate in a follow-up before those files are removed.

### Notes

- Requires provisioning a Supabase project and setting `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`). Without them the public pages render a graceful error state and `/admin` shows a configuration notice. See [docs/supabase-migration-plan.md](../../docs/supabase-migration-plan.md) for setup steps.

---

## [v8.0.1] — 2026-06-13

### Added

- **Supabase migration plan** (`docs/supabase-migration-plan.md`): Design document for moving dynamic content (books, sports, treks, projects, 100-days blogs, instagram, resume, now-page) from the static markdown pipeline to a Supabase/Postgres backend with a custom in-app `/admin` editor. Recommends a single repository, live runtime fetch via `@supabase/supabase-js` with Row-Level Security, email+password auth, and a phased migration with verification steps. Planning only — no app code or dependencies changed.

---

## [v8.0.0] — 2026-06-13

### Changed

- **Build system: Create React App → Vite** (`vite.config.js`, `package.json`, `index.html`): `react-scripts` (EOL, unmaintained) replaced with Vite 6. `index.html` moved to the project root with `%PUBLIC_URL%` placeholders resolved; `process.env.PUBLIC_URL` shimmed via `define` so the generated data files keep working unmodified; an esbuild loader shim lets JSX stay in `.js` files; build output remains `build/` so the Cloudflare Pages config is untouched. Production build now completes in ~4s and `npm audit` drops from 67 findings to 19 (0 critical).
- **Now page data loading** (`src/utils/parseNowCms.js`): webpack's `require.context` replaced with Vite's `import.meta.glob` for the month/meta markdown files; jest maps the module to a stub (`parseNowCms.jest-stub.js`) since the CJS test runtime cannot evaluate `import.meta`.
- **Changelog page** (`src/pages/Changelog.js`): markdown fetched via Vite's `?url` import suffix.
- **Tooling** (`package.json`, `jest.config.js`, `.eslintrc`): `jest` and `jest-environment-jsdom` became explicit devDependencies (previously transitive via react-scripts); `import/no-unresolved` taught to ignore Vite's `?url` suffix.

---

## [v7.1.0] — 2026-06-13

### Added

- **Race stats util** (`src/utils/raceStats.js`): Personal-best selection and race-time parsing/formatting extracted from the Stats page into pure, unit-tested helpers (11 jest tests).
- **Shared page meta module** (`src/data/pageMeta.js`): Single source of truth for per-route title, description, and OG image — consumed by both the client layout (Helmet) and the Cloudflare crawler middleware. Adds previously missing `/interactive-me` and `/mindmap` entries.

### Changed

- **Meta tags** (`src/layouts/Main.js`, `functions/_middleware.js`, `src/pages/*`): Helmet and the crawler middleware now read the same `PAGE_META` by pathname; pages no longer pass duplicated title/description props, and drifted copies (About, Resume, 100 Days) were reconciled.
- **Image loading** (`src/components/Instagram/ImageSlider.js` and gallery/timeline components): Slider slides are real `<img>` elements with `object-fit: contain` instead of CSS `background-image`, so the browser can lazy-load and async-decode them; Sports/Treks cards, Interactive Me timeline, and Projects gallery images now use `loading="lazy"` + `decoding="async"`.
- **ESLint** (`.eslintrc`): Re-enabled `no-trailing-spaces`, `react/self-closing-comp`, `no-nested-ternary`, `react/no-unused-prop-types`, and `react/jsx-no-useless-fragment`; fixed all remaining violations so lint stays clean.
- **About Page** (`src/components/About/AboutDocument.js`, `src/pages/About.js`): Replaced static markdown render with a structured three-section layout — "In 1 Minute" (bio + animated stat grid), "More Details" (six activity pillar cards with concise data-driven chips), and "Connect with me" (social links). Stats computed dynamically from data files.
- **About Page** (`src/components/About/AboutDocument.js`): Enriched bio and pillar chips with researched details — Substack newsletter name (*The Wanderer's Technical Anecdotes*), *Dare Write's* podcast, Chronicles of Wandering Mind series, education (B.Tech CS RIT Sangli 2021, Tech & Policy Takshashila 2024), and design tools.
- **Now Page** (`src/pages/Now.js`, `src/components/Now/NowDocument.js`, `src/components/Now/MonthSection.js`): Complete redesign — an interactive month-timeline pill switcher replaces the long scroll of stacked month cards; each month renders as a bento grid of section cards; daily rituals restyled as compact icon cards.
- **100 Days To Offload Page** (`src/pages/OneHundredDays.js`): Interactive redesign — animated progress ring with pace tracking (target vs. ahead/behind), clickable calendar heatmap that opens posts, posts-per-month bar chart that filters the list, search plus tag/platform filter chips, and a responsive post-card grid. Removed the decorative SVG logo.

---

## [v7.0.0] — 2026-06-12

### Added

- **CI drift gate** (`.github/workflows/node.js.yml`): CI now runs `cms:sync` and fails if `src/data/*.js` disagrees with the CMS markdown, making `src/cms-content/` the enforced single source of truth.
- **Prebuild sync** (`package.json`): `npm run build` regenerates `src/data/*.js` from markdown via a `prebuild` hook, so deploys always reflect CMS content.
- **Improvement Plan** (`docs/improvement-plan.md`): Full repository audit, owner decisions, and milestone-based task plan with statuses.

### Changed

- **Content pipeline**: Removed the `/admin` panel (pages, editors, hooks, layouts) and the deprecated `src/data/now-data.js`; Decap CMS at `/cms/` is now the only editing UI and markdown the only content source.
- **Images** (`public/images/`): Compressed the entire library from 114MB to 37MB with a 300KB-per-file hard cap; converted PNG photos to JPEG and updated all references.
- **Docs**: README, CLAUDE.md, and architecture/data-flow docs aligned with the markdown-first pipeline; changelog header now states the semver rules; `package.json` version and Node engine requirement brought up to date.

### Fixed

- **CI** (`.github/workflows/node.js.yml`): Workflow targeted the retired `ubuntu-20.04` runner, so no run had completed since March; now runs on `ubuntu-latest` with actions v4 and npm caching.
- **Test suite** (`src/__tests__/App.test.js`, `jest.setup.js`, `jest.config.js`): All 7 tests failed after dark mode shipped — renders now wrap in `ThemeProvider`, jsdom gets `matchMedia`/`IntersectionObserver` stubs, and jest-dom matchers are registered.
- **Lint** (`package.json`): `eslint **/*.js` only matched ~5 files; the script now lints `src`, `scripts`, and `functions` entirely.
- **Content drift**: 12 blog posts, 4 books, and 1 trek that existed only in `src/data/*.js` were backfilled into `src/cms-content/`, so syncing no longer deletes them.
- **Broken images**: 53 `.heic` files (invisible in Chrome/Firefox/Edge) converted to JPEG with all references updated, restoring the Instagram gallery and the first Sports slideshow.

---

## [v6.6.0] — 2026-06-11

### Added

- **Mind Map Page** (`src/pages/MindMap.js`, `src/components/MindMap/`): New `/mindmap` route with an interactive radial SVG mindmap. A central "Me" bubble has five category branches (Books, Marathons, Treks, Projects, Blogs); clicking a category animates a zoom into it and fans out all of its items in collision-free concentric rings with staggered entrance animations; clicking any item opens a detail panel reusing the existing modal pattern. The canvas supports drag-to-pan, scroll-wheel and pinch zoom (`usePanZoom.js`), hover effects, native tooltips, a category legend, and zoom/reset controls. Built with pure React + SVG (no external graph library). Added to navbar dropdown (`src/data/routes.js`).
- **Sports Page URL params** (`src/pages/Sports.js`): Active tab is now synced to a `?view=` URL query parameter (`statistics`, `interactive`, `default`). Navigating directly to a URL with a `?view=` param opens the correct tab on load; switching tabs updates the URL in place via `replaceState`. The Share button automatically copies the param-inclusive URL.
- **100 Days to Offload entries** (`src/data/100DaysToOffload.js`): Added 6 new posts (ids 31–36) from June 2026 — Bharat Ek Khoj Konkan (Marathi, WordPress), Maintaining rhythm in the chaos, Life: An Odyssey of Purpose, What's with all this exploration?, Chronicles of Wandering Mind S2-E02, and Digital Nomad's hustling trails.
- **Homepage feature cards** (`src/pages/Index.js`): Added a Mind Map card to the homepage features grid, linking to `/mindmap` with a description of the interactive radial visualisation.

---

## [v6.5.0] — 2026-05-31

### Added

- **Interactive Me Page** (`src/pages/InteractiveMe.js`, `src/components/InteractiveMe/`): New `/interactive-me` page with image-first vertical timeline. Images from Sports and Treks data are shuffled on mount, displayed as alternating left/right cards connected by SVG bezier curves, and the page auto-scrolls (pauses on hover). Includes SPORTS and TREKS sub-tabs. Added to navbar "More" dropdown (`src/data/routes.js`) and homepage feature grid (`src/pages/Index.js`).

---

## [v6.4.6] — 2026-05-31

### Fixed

- **SportsDefault, SportsInteractive, TreksDefault** (`src/components/Sports/`, `src/components/Treks/`): Removed default `grayscale` filter from card images so photos display in full colour.

---

## [v6.4.5] — 2026-05-31

### Changed

- **Now Page Data** (`src/data/now-data.js`): Filled in May 2026 blogs (6 entries) and books (3 entries) for the current month section.

---

## [v6.4.4] — 2026-04-26

### Changed

- **CI workflow** (`.github/workflows/node.js.yml`): Updated build step from `npm run predeploy` to `npm run build`; renamed step label from "Build and Statically Render" to "Build".
- **docs/deployment.md**: Full rewrite to document Cloudflare Pages deployment (build command, output dir, dashboard settings, env vars). Removed outdated GitHub Pages / `gh-pages` instructions.
- **docs/architecture.md**: Major rewrite to reflect current codebase — updated directory structure (added `hooks/`, `context/`, `utils/`, `cms-content/`), all 16 routes, CMS data flow, and known data inconsistencies table.
- **docs/features.md**: Full rewrite covering all current pages (Treks, Books, Admin CMS, Changelog, dark mode, etc.) and accurate technical notes.
- **CLAUDE.md**: Updated Treks Page instructions to use `slideImages` field name (was `photos`).

### Removed

- **GitHub Pages workflow** (`.github/workflows/github-pages.yml`): Deleted — site is on Cloudflare Pages; this workflow was deploying to a `gh-pages` branch that is no longer used.
- **`predeploy` / `deploy` scripts** (`package.json`): Removed — both scripts depend on `gh-pages` and `react-snap`, neither of which applies to Cloudflare Pages.
- **`gh-pages`** (`package.json` dependency): Removed unused GitHub Pages deploy package.
- **`react-snap`** (`package.json` devDependency): Removed — pre-rendering step only used in the now-deleted `predeploy` script.
- **`react-ga`** (`package.json` dependency): Removed — Google Analytics package with zero imports anywhere in `src/`.
- **`react-burger-menu`** (`package.json` dependency): Removed — replaced by a custom hamburger drawer component; package was never imported.
- **`yaml`** (`package.json` dependency): Removed — no imports found across `src/`.
- **`src/components/Sports/SportsV2.js`**: Deleted dead component — replaced by the tabbed Sports interface (SportsStatistics + SportsInteractive + SportsDefault).
- **`src/components/Sports/SportV2.js`**: Deleted dead component — only referenced by the deleted SportsV2.js.
- **`src/components/Challenges/Dashboard.js`**: Deleted dead component — built but never imported by `Challenges.js`.
- **`src/data/now.md`**: Deleted orphaned file — the original flat-markdown Now page, superseded by the Decap CMS approach in v6.4.0; had zero imports anywhere.
- **`photos` field** (`src/data/treks.js` and Treks components): Renamed to `slideImages` to match the field name used in Sports and Instagram. Updated `TreksDefault.js`, `TrekDetailsModal.js`, `TreksTimeline.js`, and `TreksEditor.js`.

---

## [v6.4.3] — 2026-04-26

### Fixed

- **parseNowCms** (`src/utils/parseNowCms.js`): Updated `parseFrontMatter` regex from `/^---\n/` to `/^---\r?\n/` so it matches Windows-style CRLF line endings; previously returned `{}` on Windows, causing `nowMeta.dailyRituals` to be undefined.
- **Now** (`src/pages/Now.js`): Guarded Daily Rituals section with `nowMeta?.dailyRituals?.length > 0` to prevent crash if meta parse fails or `dailyRituals` is absent.

---

## [v6.4.2] — 2026-04-26

### Fixed

- **Now CMS data** (`src/cms-content/now/months/2026-April.md`): Fixed invalid YAML — list items missing 2-space indent before `-`, sub-properties mis-indented causing parse failure, and URLs wrapped in `< >` angle brackets. Also quoted values with colons to prevent parse errors.
- **Now CMS data** (`src/cms-content/now/months/2026-May.md`): Fixed wrong `month: April` value and missing closing `---`, both of which caused YAML parse errors that silently broke the entire Now page data load.

---

## [v6.4.1] — 2026-04-26

### Fixed

- **Changelog** (`src/pages/Changelog.js`): Collapsed multi-line arrow function in `.then()` chain to satisfy `implicit-arrow-linebreak` and `function-paren-newline` ESLint rules that blocked the production build.
- **parseNowCms** (`src/utils/parseNowCms.js`): Replaced `for...of` loop with `Array.reduce` to satisfy `no-restricted-syntax` rule; added `global-require` disable comment on the webpack `require()` call inside `loadNowMeta`.

---

## [v6.4.0] — 2026-04-26

### Added

- **parseNowCms** (`src/utils/parseNowCms.js`): New utility that reads `src/cms-content/now/meta.md` and all `src/cms-content/now/months/*.md` files directly, parses YAML front matter via the `yaml` package, re-nests flat CMS section fields under the `sections` key that components expect, and sorts months (current first, then newest-first). This makes the CMS files the single source of truth for the Now page — no sync step needed.

### Changed

- **Now page** (`src/pages/Now.js`): Replaced synchronous `import { nowData, nowMeta } from 'now-data'` with async loading via `parseNowCms`. Now uses `useState`/`useEffect` to fetch and parse CMS markdown files at runtime. Daily Rituals section renders conditionally after meta loads.

### Deprecated

- **`now-data.js`** (`src/data/now-data.js`): No longer imported by any page. Retained as a fallback reference until CMS-driven page is verified; safe to delete afterwards.
- **`now.md`** (`src/data/now.md`): Archival file, never imported. Safe to delete.

---

## [v6.3.4] — 2026-04-26

### Added

- **Decap CMS — Changelog** (`public/cms/config.yml`): Added `changelog` files collection pointing to `src/data/changelog.md` with a `markdown` body widget, making the changelog editable through the CMS editor.
- **`changelog.md`** (`src/data/changelog.md`): Added empty YAML front matter (`---\n---`) so Decap CMS's parser can identify the body field; without it the editor rendered empty.
- **`cms:server` script** (`package.json`): Added `npx netlify-cms-proxy-server` script; run it alongside `npm run dev` so Decap CMS reads real seeded data from `src/cms-content/` instead of starting empty.

### Fixed

- **Decap CMS backend** (`public/cms/config.yml`): Switched default local backend from `test-repo` (in-memory, always empty) to `proxy` (`http://localhost:8081/api/v1`) so all seeded collections are visible in the editor. `test-repo` is retained as a commented fallback.
- **Changelog page** (`src/pages/Changelog.js`): Strips front matter (`/^---[\s\S]*?---\s*\n/`) before passing text to `<Markdown>` so the added front matter block does not appear in the rendered page.

---

## [v6.3.3] — 2026-04-26

### Fixed

- **Changelog page** (`src/pages/Changelog.js`): Replaced incorrect `NowDocument` usage (which expects a `months` array) with a direct `markdown-to-jsx` render inside a `prose` article wrapper — the same pattern used by `AboutDocument`. Markdown was loading correctly but rendering nothing due to the component mismatch.

---

## [v6.3.2] — 2026-04-25

### Added

- **CMS seed script** (`scripts/seed-cms-content.js`): One-time script (`npm run cms:seed`) that converts all existing `src/data/*.js` files into Decap CMS markdown files under `src/cms-content/`. Seeds all 12 CMS collections — Now Meta, Now Months, Books, 100 Days, Sports, Treks, Projects, Instagram, and all four Resume sub-collections. Populates CMS editors with existing data so records are visible immediately.

---

## [v6.3.1] — 2026-04-25

### Fixed

- **Decap CMS backend config** (`public/cms/config.yml`): Uncommented `auth_endpoint: auth` (required for Sveltia CMS Auth Cloudflare Worker to handle the OAuth redirect) and removed `squash_merges: true` which requires `publish_mode: editorial_workflow` — without it Decap CMS v3 throws an initialization error that prevents the CMS page from loading.

## [v6.3.0] — 2026-04-25

### Added

- **NowEditor** (`src/components/Admin/Editors/NowEditor.js`): Full admin editor for the Now page with all 9 section types (Blogs, Running, Books, Events, Projects, Website Updates, Stats, Certificates, Misc). Includes a "Page Meta" tab for editing introStory, dailyRituals, categoryLabels, and inspiredBy. Enforced monthly rotation via "Rotate Month →" button — promotes the previous current month to archive and prepends a new blank current month. Custom export panel generates the full `now-data.js` with both named exports.
- **Image upload — Sports** (`src/components/Admin/Editors/SportsEditor.js`): File picker with live thumbnail preview on each slide. Auto-suggests a filename following the `initials_YYYY_N.jpeg` naming convention and provides a download button that saves the file with the correct name. Auto-fills the image path field on selection.
- **Image upload — Treks** (`src/components/Admin/Editors/TreksEditor.js`): Same image upload capability for trek photos following the `fort_name_N.jpg` convention.
- **Decap CMS — Now Meta** (`public/cms/config.yml`): New `now_meta` collection (single-file) for editing Now page metadata.
- **Decap CMS — Now Months** (`public/cms/config.yml`): New `now_months` collection (one file per month) covering all 9 section types as nested lists.
- **Decap CMS — Sports, Treks** (`public/cms/config.yml`): New collections with native `image` widget for slideImages/photos — uploads go directly to `public/images/sports/` and `public/images/treks/`.
- **Decap CMS — Projects, Instagram, Resume** (`public/cms/config.yml`): Added collections for all remaining data types (Projects, Instagram, Resume Positions, Degrees, Skills, Certifications).
- **GitHub backend instructions** (`public/cms/config.yml`): Detailed step-by-step comments for switching from `test-repo` to the GitHub backend with Netlify OAuth proxy, including OAuth App setup and commit message templates.
- **CMS sync — all collections** (`scripts/sync-cms-to-data.js`): Extended sync script to handle all 12 data sources. Now page sync re-nests section fields under `sections`, sorts months newest-first, and enforces a single `isCurrent: true` entry. Sports and Treks use the custom JS serializer to preserve `PUBLIC_URL` template literals for image paths.

### Changed

- **Admin Dashboard** (`src/components/Admin/AdminDashboard.js`): Added "Now Page" card (cyan) showing the count of monthly entries with draft indicator.
- **Admin Nav** (`src/components/Admin/AdminNav.js`): Added `now → 'Now Page'` label.
- **Admin page** (`src/pages/Admin.js`): Registered `NowEditor` under the `now` key with lazy loading.

---

## [v6.2.0] — 2026-04-22

### Added

- **now-data.js** (`src/data/now-data.js`): Structured JS data file replacing `now.md` as the source of truth. Exports `nowMeta` (page metadata, daily rituals, intro story) and `nowData` (typed array of monthly entries Oct 2025–Apr 2026 with section keys: blogs, running, books, events, projects, stats, website, certificates, misc).
- **MonthSection** (`src/components/Now/MonthSection.js`): Per-month card that renders all available section types in a consistent order with a divider between them.
- **NowSectionHeader** (`src/components/Now/NowSectionHeader.js`): Shared label pill with icon, reused by all section components.
- **Section components** (`src/components/Now/`): NowBlogsSection (platform badges, WIP indicator), NowRunningSection (distance/time stat badges), NowBooksSection (review link), NowEventsSection (left-border card), NowProjectsSection (2-col grid with arrow link), NowStatsSection (Strava 4-col + Substack 2-col stat tiles with approximate prefix), NowWebsiteSection, NowCertificatesSection, NowMiscSection.

### Changed

- **NowDocument** (`src/components/Now/NowDocument.js`): Rewritten to accept `months` prop array; splits current vs archived months with an "Archives" label divider; renders `<MonthSection>` per entry.
- **Now page** (`src/pages/Now.js`): Removed async markdown fetch (`useState`, `useEffect`, `now.md` import). Now imports synchronously from `now-data.js`. Daily Rituals driven from `nowMeta.dailyRituals`. Hero `lastUpdated` derived from the current month entry instead of `new Date()`.

### Deprecated

- `src/data/now.md`: Content migrated to `now-data.js`. File retained for reference but no longer imported or rendered.

---

## [v6.1.0] — 2026-04-21

### Added

- **Skip-to-content link** (`src/layouts/Main.js`): Visible-on-focus skip link added as first focusable element for keyboard users.
- **Global focus ring** (`src/tailwind.css`): `*:focus-visible` rule applies a 2px `secondary`-coloured outline site-wide so keyboard navigation is always visible.
- **Mobile contact section** (`src/components/Template/Hamburger.js`): Social icon links and Resume PDF download button added to the bottom of the mobile drawer, closing the gap left by the desktop-only sidebar.

### Changed

- **Navigation** (`src/components/Template/Navigation.js`): Desktop dropdowns now respond to keyboard focus (`onFocus`/`onBlur`) and close on `Escape`; `aria-haspopup` + `aria-expanded` added to the More button. Inactive link contrast bumped from `stone-400` to `stone-500`.
- **Footer** (`src/components/Template/Footer.js`): Hover colour changed from `orange-700` to `secondary` to match design system; body text contrast raised from `stone-500` to `stone-600` in light mode.
- **Sports page** (`src/pages/Sports.js`): Active tab colour unified to `text-secondary` across all three tabs; share button changed from `indigo-500` to `stone-900/stone-100` to match primary button style.
- **DigitalLibrary** (`src/components/Books/DigitalLibrary.js`): Search input debounced at 300 ms to prevent lag with large lists; book grid `gap-y-16` reduced to `gap-y-8`.
- **LifeStats** (`src/components/Index/LifeStats.js`): Counters show `—` placeholder before the IntersectionObserver fires instead of "0", preventing a false empty-state appearance.
- **ProjectGallery** (`src/components/Projects/ProjectGallery.js`): Broken images now render a `broken_image` icon placeholder via `ImageWithFallback` component instead of silently hiding.
- **TopSummaryCards** (`src/components/Sports/TopSummaryCards.js`): Replaced blue/purple/green card colours with red/secondary/amber to reduce accent-colour sprawl.
- **SportsStatistics** (`src/components/Sports/SportsStatistics.js`): Sub-summary cards unified to amber/red/secondary/stone; distance bar, personal records, pace, and city count highlights all consolidated to `secondary` and `red-400`.

### Changed

- **SportsDefault** (`src/components/Sports/SportsDefault.js`): Redesigned DEFAULT VIEW cards to image-first. Cards now lead with the first `slideImages` entry in a 16:9 container with grayscale-to-color hover transition and overlay. Distance and BIB promoted to image corner badges; footer retains title, date, place, and finish time.
- **TreksDefault** (`src/components/Treks/TreksDefault.js`): Redesigned DEFAULT VIEW cards to image-first. Cards lead with the first `photos` entry in a 4:3 container with same hover effect. Difficulty and photo count promoted to image corner badges; footer retains fort name, date, trek time, and blog link. Placeholder shown for entries with no images.
- **SportsInteractive** (`src/components/Sports/SportsInteractive.js`): Redesigned INTERACTIVE VIEW cards to image-first. Cards now lead with the first `slideImages` entry using the same grayscale hover pattern. BIB badge overlaid on image; footer retains title, date, and place/time/distance stats row.

---

## [v6.0.0] — 2026-04-17

### Added

- **Admin Panel** (`src/pages/Admin.js`): New password-protected `/admin` page providing a full CMS interface for managing all site data locally. Authentication uses SHA-256 password hashing via the browser's SubtleCrypto API with credentials stored in `localStorage`.
- **AdminLayout + AdminNav** (`src/layouts/AdminLayout.js`, `src/components/Admin/AdminNav.js`): Standalone admin shell with top navigation bar, section breadcrumb, and logout button — separate from the site's `Main.js` layout.
- **AuthGate** (`src/components/Admin/AuthGate.js`): Password gate component rendered before the admin panel; hashes input and compares against a hardcoded SHA-256 constant.
- **AdminDashboard** (`src/components/Admin/AdminDashboard.js`): Overview grid showing entry counts for all 10 data types with draft indicators and quick-navigate cards.
- **Data Editors** (`src/components/Admin/Editors/`): CRUD editors for all data types — Books, Sports, Treks, Projects, 100 Days To Offload, Instagram, Resume Positions, Degrees, Skills, and Certifications. Each editor loads from static data, persists drafts to `localStorage`, and exports valid JS via a copy-to-clipboard panel.
- **Shared Admin UI Primitives** (`src/components/Admin/`): `FormField`, `TextInput`, `TagsInput` (pill-based), `ArrayItemEditor` (for nested arrays like `slideImages`), and `ExportPanel` (expandable code block with clipboard export).
- **IntegrationsPanel** (`src/components/Admin/IntegrationsPanel.js`): CMS provider selection UI with cards for Decap CMS (recommended, free), Contentful (external), Sanity (external), and Custom API (DIY). Each card includes a collapsible setup guide and status indicator.
- **Decap CMS** (`public/cms/index.html`, `public/cms/config.yml`): Free, open-source Git-based CMS available at `/cms/`. Uses `test-repo` backend by default (no OAuth needed locally). Configured for Books and 100 Days To Offload collections.
- **CMS Sync Script** (`scripts/sync-cms-to-data.js`): Node.js script that reads Decap CMS markdown frontmatter from `src/cms-content/` and writes back to `src/data/*.js`. Run via `npm run cms:sync`.
- **Hooks** (`src/hooks/useDraftStore.js`, `src/hooks/useExportGenerator.js`, `src/hooks/useCMSStatus.js`): Shared hooks for draft persistence, JS export generation, and CMS provider status checking.
- **jsSerialize utility** (`src/components/Admin/utils/jsSerialize.js`): Custom serializer that correctly outputs `${process.env.PUBLIC_URL}/images/...` template literals for image URL fields in sports, treks, and instagram data exports.

---

## [v5.1.8] — 2026-04-15

### Fixed

- **Cloudflare middleware** (`functions/_middleware.js`): Removed the `Accept: text/html` request-header guard that caused the middleware to skip injection for every scraper or tool that sends `Accept: */*` (including opengraph.xyz). The response `Content-Type` check is the correct and sufficient gate; the request Accept header is unreliable for this purpose. Replaced the Accept guard with a file-extension check that skips static asset requests (`*.js`, `*.css`, `*.png`, etc.) before calling `next()`.

---

## [v5.1.7] — 2026-04-15

### Fixed

- **Cloudflare middleware** (`functions/_middleware.js`): Rewrote `HTMLRewriter` strategy from updating existing elements to appending tags into `<head>`. The previous commit removed all static OG/Twitter/canonical tags from `index.html` to prevent first-match conflicts — but the middleware was selecting those same elements to mutate them. With nothing to select, every route served identical bare metadata. The new approach uses a `HeadInjector` handler that appends the full per-route tag block to `<head>` and a `TitleRewriter` that updates the existing `<title>` element. Unknown paths now fall back to a generic `DEFAULT_META` rather than returning no metadata.

---

## [v5.1.6] — 2026-04-15

### Fixed

- **Static HTML shell** (`public/index.html`): Removed all Helmet-managed meta tags (`description`, `og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `twitter:*`, `canonical`) from the static shell. The OG spec uses first-match semantics — having hardcoded homepage values appear before Helmet's `data-rh="true"` tags meant every non-root route (e.g. `/now`, `/sports`) served the wrong social metadata to any parser. Helmet now exclusively owns these tags; only `og:site_name` (static, same for all pages) and the initial `<title>` fallback remain.

---

## [v5.1.5] — 2026-04-15

### Fixed

- **App root** (`src/App.js`): Moved `HelmetProvider` from inside `Main` to the app root so all pages share a single Helmet context — previously each page mount created an isolated provider, which could cause stale/default metadata to linger between route transitions.
- **Main layout** (`src/layouts/Main.js`): Added missing `<link rel="canonical">` tag to the Helmet block; `canonicalUrl` was already computed and used for `og:url` but was never emitted as a canonical link element, leaving search engines without a per-page canonical signal.
- **404 page** (`src/pages/NotFound.js`): Rewrote to use the `Main` layout — previously it rendered a bare `<div>` with its own isolated `HelmetProvider`, missing site navigation, OG tags, Twitter cards, and a canonical link.

---

## [v5.1.4] — 2026-04-05

### Added

- **Logo PNG** (`public/images/logo.png`): Rasterised 400×400 PNG exported from the illustrated SVG via cairosvg — used as the OG/Twitter card image for broad social crawler compatibility.

### Changed

- **Main layout** (`src/layouts/Main.js`): Default OG image updated from `logo.svg` to `logo.png`.
- **Static OG tags** (`public/index.html`): Fallback `og:image` and `twitter:image` updated to `logo.png`.

---

## [v5.1.3] — 2026-04-05

### Changed

- **Main layout** (`src/layouts/Main.js`): Added optional `image` prop for per-page OG/Twitter card image. Defaults to the illustrated logo SVG (`/images/logo.svg`); homepage, About, and Resume override to `me.jpg` as they are person-centric pages.
- **Static OG tags** (`public/index.html`): Updated `og:image` and `twitter:image` fallback from `me.jpg` to the illustrated logo SVG.

---

## [v5.1.2] — 2026-04-05

### Changed

- **Logo SVG** (`public/images/logo.svg`): Replaced the plain "ST" monogram with a full illustrated SVG logo — dark gradient background, open book, pen/quill with ink drop, film strip, running shoe, flowing wave ribbon, and teal curly braces, matching the personal-site visual identity.
- **Logo component** (`src/components/Template/Logo.js`): Switched from inline SVG to an `<img>` element referencing the illustrated `logo.svg`, so the nav mark stays in sync with the standalone logo file.

---

## [v5.1.1] — 2026-04-05

### Changed

- **CLAUDE.md**: Added update instructions for Now, Books, Sports, and Treks pages including data schemas, question prompts, image naming conventions, and image compression guidelines.
- **CLAUDE.md** (versioning rules): Replaced patch/minor/major tiers with major-or-minor only; introduced weekly minor version cap — at most one minor bump per week, with same-week changes appended to the existing entry. Patch tier restored for bug fixes; patch versions exempt from the weekly cap.

---

## [v5.1.0] — 2026-04-05

### Added

- **Treks Page** (`/treks`): New page documenting Maharashtra fort and mountain trek history with two views — *Statistics* and *Default View*.
- **TreksStatistics Component**: Highlights total treks, years active, difficulty distribution (Easy/Medium/Hard), yearly breakdown bar chart, and an interactive animated trek timeline.
- **TreksDefault Component**: Card grid of all treks with filters by difficulty, year, and blog presence, plus sort controls by date or trek duration.
- **TrekDetailsModal Component**: Click-through modal with a photo slider and blog post link for each trek entry.
- **TreksTimeline Component**: Animated vertical timeline — nodes stagger in on page load, clicking a node expands trek details inline (duration, photo count, blog link) with smooth transition.
- **Stats Page — Trek Log Card**: New full-width bento card surfacing key trek metrics: total treks, hard treks, blog posts written, years active, and latest trek name.
- **Treks Route**: Added `/treks` to `routes.js` and `App.js` with lazy loading.
- **Open Graph & Twitter Card metadata** (`public/index.html`, `src/layouts/Main.js`): Added static OG and Twitter Card meta tags to `index.html` so social crawlers (which don't execute JS) generate rich link previews on LinkedIn, Slack, Twitter/X, iMessage, and WhatsApp. Also added dynamic tags via `react-helmet-async` in `Main.js` so per-page titles and descriptions are reflected in previews.
- **CLAUDE.md** (`CLAUDE.md`): Added Claude Code instruction file documenting project stack, key file locations, and a mandatory changelog update rule with format guidance.
- **Logo component** (`src/components/Template/Logo.js`): New SVG monogram mark — a rust-red square (`#b22200`) with white "ST" initials in Noto Serif 900. Used in the navigation bar alongside the site name.
- **Static logo SVG** (`public/images/logo.svg`): Standalone 200×200 SVG version of the logo using system serif font fallback, for future use in favicons or social assets.
- **LifeStats component** (`src/components/Index/LifeStats.js`): New "Life in Numbers" section on the homepage showing animated count-up stats for Books Read, Km on Foot, Treks Done, and Blog Posts. Each card links to the relevant page and animates on scroll into view.
- **Homepage LifeStats section** (`src/pages/Index.js`): Inserted the LifeStats component between the feature card grid and the CTA section.

### Changed

- **Per-page OG metadata** (all `src/pages/*.js`): Enhanced `title` and `description` props on every page to accurately reflect page content. These feed into Open Graph and Twitter Card tags for better link preview quality on social platforms.
- **Resume page title** (`src/pages/Resume.js`): Renamed from "Technical Skills" to "Resume" to reflect the full page scope (experience, education, certifications, skills).
- **Dynamic `og:url`** (`src/layouts/Main.js`): Added `useLocation` hook to inject the current page path as `og:url`, so each page gets its own canonical URL in link previews.
- **Navigation brand link** (`src/components/Template/Navigation.js`): Updated to show the Logo mark before the "Sanket Tambare" text, with hover effect applied to both as a group.

### Fixed

- **Layout Overflow** (`Main.js`): Added `min-w-0` to the `<main>` flex item, preventing `flex-grow` content from overflowing into the sidebar when headings use large font sizes.
- **`treks.js` Data File**: Added missing `const { PUBLIC_URL }`, `const` declaration, and `export default treks`.
- **Difficulty Normalization** (`treks.js`): Standardized `endurance_level` to three values — `Easy`, `Medium`, `Hard` (removed `High` variant on Katraj To Sinhgad entry).
- **LifeStats ESLint errors** (`src/components/Index/LifeStats.js`): Replaced `Math.pow` with `**` operator, fixed `consistent-return` in `useEffect`, and corrected JSX prop/bracket formatting.

### Added (2026-04-05)

- **100 Days to Offload — Entry #19** (`src/data/100DaysToOffload.js`): Added new blog post "Sadagi in the Digital World" — exploring oneness in the entangled digital world, published on Substack.
- **Cloudflare Pages middleware** (`functions/_middleware.js`): Edge function that rewrites OG/Twitter meta tags and `<title>` per page path for all HTML requests. Fixes the issue where social link previews (Slack, iMessage, Twitter/X, WhatsApp) always showed the generic homepage metadata because crawlers don't execute JavaScript. Maps all 14 routes to their correct title, description, and image before the HTML is delivered.

---

## [v5.0.0] — 2026-03-28 🚀 Major Release

### Added

- **Changelog Page** (`/changelog`): New website page that renders this `CHANGELOG.md` file with a hero section, version quick-nav badges, and full markdown rendering. Added to the "More" dropdown in the nav bar.
- **Sports Page — Tabbed Interface**: Restructured the Sports page with three distinct tabs — *Statistics*, *Interactive View*, and *Default View* — inspired by the run-folio reference design.
- **SportsStatistics Component**: New component showing total races, total distance, average pace/race, distance distribution, personal records, city/year breakdowns, and yearly progress bars.
- **SportsInteractive Component**: Groups races by distance category with BIB number prominently displayed; races sorted by fastest time.
- **SportsDefault Component**: Chronological grid of all races with full filter & sort controls (by Year, City, Distance) and a toggle for ascending/descending order.
- **MarathonDetailsModal Component**: Reusable modal displaying race description, image slider, and a link to the official timing certificate, triggered on card click.
- **Share Button**: Clicking the Share button on the Sports page copies the current URL to clipboard and shows a "Copied!" confirmation.
- **Stats Page Enhancements**: Added five new bento grid cards:
  - *Reading Intelligence* — English vs Marathi book split, books with reviews count, and top interest tag cloud.
  - *Books Per Year* — bar chart of reading velocity from 2019–2026.
  - *Blog Intelligence* — English/Marathi post split with top writing topics derived from 100DaysToOffload tags.
  - *Education & Projects* — clickable education timeline (degrees) and project count with quick links.
- **Sports Data (sports.js)**: Added explicit `bibNumber` field to all 19 race entries (IDs 1–19).
- **Dynamic Distance Grouping**: Both `SportsStatistics` and `SportsInteractive` now derive unique distances dynamically from the data (no hardcoded list), supporting future distances automatically.
- **Dark Mode Fixes**: Added missing `dark:` Tailwind variants across `SportsStatistics`, `SportsDefault`, `SportsInteractive`, `TopSummaryCards`, and `MarathonDetailsModal`.

### Changed

- `Sports.js` — Replaced the legacy marathon log with the new tabbed layout managed via `activeTab` state.
- `SportsDefault.js` — Fully rewritten with filter dropdowns, multi-key sort, asc/desc toggle, results count label, and empty-state UI.
- `SportsInteractive.js` — Races within each distance group now sort by fastest time ascending (best first).

### Fixed

- **Mobile Hamburger Menu** — Rewrote `Hamburger.js` to use `ReactDOM.createPortal`, rendering the drawer and backdrop directly into `document.body`. This escapes the header's `backdrop-filter` CSS containing block which was capping the drawer height to ~70px instead of the full viewport.
- **SideBar Mobile Overlay** — `SideBar.js` now uses `hidden md:flex` so it is hidden on mobile/tablet viewports, preventing it from covering content on the Sports page and other content-heavy pages.
- **SideBar Reactivity** — Replaced raw `window.location.pathname` with `useLocation()` hook for proper React Router reactivity on route changes.

---

## [v4.0.0] — 2026-03 (Major Redesign)

### Added

- Complete visual redesign of the website — new typography system, dark mode improvements, and design coherency across pages.
- Dark mode toggle repositioned and refined.
- New **Challenges** page tab.
- Revamped **Now** page with timeline-style content.
- **100 Days to Offload** challenge tracking system with blog data (`100DaysToOffload.js`).
- Added books reading data for 2025–2026 batch (IDs ≥ 36, including *टाटायन*, *एका तेलियाने*).
- Added blog entries (posts 15–18) for March 2026 including Marathi blog posts.

### Changed

- Stats page updated with new metrics: certifications, Instagram stats, skills arsenal, physical endurance PBs.
- Removed videos data from the Instagram/gallery section.

---

## [v3.5.0] — 2025-11 (Feature Release)

### Added

- **SportV2 Component**: New individual race card component with image slider support (`SportV2.js`, `SportsV2.js`).
- **DarkModeToggle Component**: Standalone toggle component for switching between light and dark themes.
- **Personal Statistics Data** (`stats/personal.js`): Structured personal info for the Stats page.
- **Books Page** with `BookModal` and `FeaturedBook` components, comprehensive styling with category filters.
- **Project Documentation**: Added `docs/` folder with architecture and setup notes.
- New certifications added: Bridgenext role, updated Emtec Inc. entries.
- New skills added: Snowflake, Tableau, Kafka, DORA metrics, SnowSQL, Gemini API, Cursor.

### Changed

- Updated resume positions (`positions.js`) with Bridgenext role.
- Refined About page content and layout.

---

## [v3.0.0] — 2025-08 (Polish & Improvements)

### Added

- AI Workshop entry added to the experience / activities section.
- Additional now page details.

### Changed

- Dark mode toggle position updated on the webpage.
- Styling improvements across multiple components.
- Updated README with current project state.

---

## [v2.5.0] — 2025-05 (Responsiveness & Interactions)

### Fixed

- Fixed responsiveness issues across multiple pages.
- Fixed responsive images rendering on mobile viewports.

### Added

- New interactive features and micro-animations built with Cursor AI assistance.

---

## [v2.0.0] — 2025-03 (Sports Page Launch)

### Added

- **Sports Page** (`/sports`): First version of the physical endurance log.
- Marathon data added for 2023–2024 race events (IDs 1–12).
- CI/CD pipeline fix for GitHub Pages deployment.

---

## [v1.5.0] — 2024-08 (Strava & Media)

### Added

- Strava activity embeds on the sports/activity section.
- Lint fixes and code cleanup.

---

## [v1.2.0] — 2024-05 (Instagram & Videos)

### Added

- **Instagram Page** (`/instagram`): Grid display of curated Instagram posts with `instagram.js` data source.
- **Videos Page**: Initial version with embedded video content.
- Updated About tab with revised personal summary.

### Changed

- Major code refactor for cleaner component structure.

---

## [v1.0.0] — 2023-03 (Personal Fork & Initial Setup)

### Added

- Forked from [mldangelo/personal-site](https://github.com/mldangelo/personal-site) template.
- Personalised all data: name, resume positions, degrees, certifications, contact links.
- Stats page initial version with basic metrics.
- Custom routing and navigation tailored to personal content.
- Added education entry: B.Tech Computer Science, RIT Sangali (2021).
- PR-01 and PR-02 feature branches merged: code refactoring, education update.
- GitHub Actions workflow for GitHub Pages deployment (`jekyll-gh-pages.yml`).

### Changed

- Replaced template placeholder content with real resume data.
- Refactored component structure for maintainability.

---

*This changelog is maintained manually. For the full commit history, run `git log --oneline`.*
