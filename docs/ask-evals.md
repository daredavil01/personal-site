# Automatic evals for /ask

How logged `/ask` answers get graded without anyone reading them, what the grades
mean, and why the whole thing cannot quietly cost money.

Read this before rewording a criterion. The criteria strings **are** the judge's
behaviour: change one and every grade recorded afterwards means something
different from every grade before it, while the pass-rate tile pools them
silently. That is what `JUDGE_RUBRIC_VERSION` in `src/lib/askJudge.js` is for —
bump it when the rubric changes, and it lands on every row in `eval_auto.rubric`.

## What the judge is

**Jev**, from **TypeSafe AI** — a "System One" model. It takes unstructured `state` plus
*typed questions* and answers them in one parallel pass:

- a **choice** — one option from a named set, with a probability for each,
- a **score** — a fractional position on an ordered spectrum of 2–10 rungs,
- a **yes/no** — a single probability on a statement.

It generates no prose at all, so it cannot hallucinate a verdict or return a type
error. It costs **$0.042 per million input tokens with output free**, answers in
70–500 ms, and its confidence is calibrated: the very low and very high bands can
be acted on, and the middle band is the genuinely ambiguous slice. Its raw
accuracy is a little below a frontier LLM judge, which is exactly why the middle
band is always flagged rather than believed.

**Why not an LLM judge.** The answers being graded are already short, and what is
wanted from a grade is a number that can be counted, filtered and compared —
not a paragraph. An LLM judge returns prose plus an overconfident score; this
returns a distribution and no prose. The missing prose is a real loss, which is
what the Gemini escalation below is for.

## The four dimensions, and the two that never reach a model

| dimension | how it is decided |
|---|---|
| Link & format compliance | **In JS, free.** `sanitiseAnswer` from `src/lib/askFormat.js` already decides it: if it changes the answer, the answer carried a link or image the archive never supplied. Exact where a probability would not be. Compared against text that has already had `sanitiseAnswer`'s own whitespace tidy applied, or every answer containing a double space reads as having invented a URL. |
| Citation habit | **In JS, free, since r2.** A regex for a bare `[n]` pointing at an extract the judge was shown. Asked of the model under r1; across 98 graded answers it agreed with the regex 84% of the time and every one of the sixteen disagreements was the model missing a citation that was plainly there. |
| Groundedness | `grounding` (score, 3 rungs) + `contradiction` (yes/no) |
| Retrieval quality | `retrieval` (score, 3 rungs) |
| Refusal appropriateness | `disposition` (choice, 4 options) + `answerable` (yes/no, against the archive summary) |

`disposition` is the load-bearing question. A single choice over four mutually
exclusive outcomes is what this class of model is best at, and it separates the
two failures that matter most on this archive: answering confidently past the end
of what was retrieved, and refusing something the retrieved text plainly
contains.

The questions are written around the model's stated weaknesses. It reads
literally, so no instruction contains a negation. It cannot count and cannot order
dates, so nothing asks "how many" or "which is earlier" — a test in
`src/lib/askJudge.test.js` fails if such a phrase is reintroduced. Its accuracy
degrades when the state is padded, so the state carries the question, the answer,
the extracts and one line about the archive, and nothing else.

### The archive summary, and why r2 added it

The extracts say what retrieval found and **nothing about what retrieval missed**.
A judge shown only the extracts cannot tell a question this archive cannot answer
from a question its search failed on — and the second is a bug in `/ask` while the
first is correct behaviour.

Under r1 it could not, and it showed. Of 98 grades, eleven answers refusing
outright were all passed as `refused_correctly`, four of them unambiguously wrong:
"which forts has he trekked" refused against a roster naming all twenty, "latest
micro-post" refused with `latest` sitting in the facts card. Each was correct *by
the r1 rubric* and wrong in fact.

So `buildArchiveNote` puts one line from `site_facts()` into the state — the
counts, and which types have a roster the archive can enumerate completely — and
`answerable` asks whether the archive holds the kind of thing the question wants.
A refusal with `answerable` high is `over-refusal` and a fail, whatever the
disposition said.

Deliberately a sentence and not the roster itself: every title would be thousands
of tokens of padding, and padding is what this class of model is worst with. When
`site_facts()` cannot be read the block is **left out** and `answerable` stops
counting as evidence — a judge told nothing about the archive must not conclude
the archive holds nothing.

### A refusal that cites its extracts is a misclassification

The same run applied `refused_wrongly` to nine answers of which only three were
refusals; one was a correct, detailed answer about 51 books. An answer citing the
extracts is not one refusing them, so when the disposition says refusal and
`citationScore` says the answer cited, the *classification* is doubted rather than
the answer: it stops deciding the verdict, confidence is capped at 0.5, and the row
goes to a human. `eval_auto.incoherent` records it.

### What the judge is deliberately not shown

Ids, urls, timings, the tier and model that answered, the user agent, the
`degraded` and `keyword_only` flags — and, most importantly, **the reader's
feedback and the owner's own grade**. Letting either into the state would make the
agreement number below circular and worthless.

### Verdict, score, tags

`eval_verdict` is `fail` when grounding is low, a contradiction is likely, the
disposition is `answered_unsupported` or `refused_wrongly`, the answer refused
something `answerable` says the archive holds, or the free link check failed. The
column allows only `pass` and `fail`, so an unsure row still gets one — plus a
`needs-review` tag, which is how it is found again.

### Confidence, and why a fallback rung's is not taken at face value

Jev's probabilities are calibrated; a language model's self-report is not. On the
98 grades the Gemini rung produced, 63 came back at **exactly 1.00**, the median
was 1.00, and `needs-review` fired **once**. A number that is 1.00 two thirds of
the time is a verbal tic, and reading it as certainty left the low-confidence
filter and the Gemini escalation with nothing to work on.

So on an uncalibrated rung — and only there — a claimed confidence at or above
`SELF_REPORT_CEILING` (0.95) is discarded as unstated, and a **margin** stands in
its place: how far each dimension that decided the verdict sits from the exact
threshold it was compared against, weakest wins. A grounding of 1.02 with the line
at 1 is a coin toss however sure the model says it is, and that is the row worth a
minute of yours.

`eval_score` is 1–5, weighted towards grounding, clamped so a fractional score can
never round to 0 and violate the column's CHECK. `eval_notes` gets one line of
numbers and never an invented reason. `eval_ideal_answer` is **never written by the
judge**: it is the owner's reference text and there is no automated substitute.

## Two limitations worth knowing

**Groundedness is judged against re-fetched text.** `ask_log` stores source *cards*
only — `{entity_type, entity_id, title, url, date, tags, image}` — so the chunk
body the answering model actually read was never logged. Grading re-reads it from
`content_chunks`, and `npm run ask:index` runs nightly, so for an older row that
text may have moved since. Good enough to catch hallucination and over-refusal;
not evidence in a dispute about an old answer.

**"Missed source" is measured against a summary, not the archive.** Knowing
exactly what was *not* retrieved would need the un-retrieved archive in the state,
which is both a token-limit violation and exactly the padding that costs accuracy.
Since r2 the judge gets the next best thing — one line naming what the archive
holds and which types it can enumerate — so `over-refusal` covers a refusal the
rosters contradict as well as one the extracts do. A question the archive holds
but whose specific *value* is not in any roster (a book's page count, say) is still
beyond it: `answerable` will read low and the refusal will pass, correctly.

Under r1 this section claimed the extracts-only inference was "the one sound
inference". That was wrong, and the eleven false passes above are the evidence.

## A hand grade is immutable

Enforced by Postgres, not by an `if`. The write is a PostgREST
`PATCH … &evaluated_at=is.null`, so a row someone graded between the select and the
write simply does not match, nothing is updated, and the empty response body says
so. The explain pass carries `&eval_source=eq.auto` for the same reason.

And when the owner later re-grades a row the judge did, the judge's verdict is
**not** destroyed: it lives in `eval_auto`, which `saveEvaluation` leaves alone.
That is what makes the **Judge agreement** tile possible, and agreement is the
only thing that says whether the judge is worth running. Clearing an evaluation
does reset both, because a cleared row is genuinely ungraded and eligible again.

## Versions, and re-grading

Every machine grade carries the `rubric` and the `model` that made it. Both are
load-bearing:

- **`JUDGE_RUBRIC_VERSION`** (`src/lib/askJudge.js`) is stamped on each row.
  Rewording a criterion redefines every grade after it while a pass-rate chart
  pools them silently, so the version is what keeps the two tellable apart.
- **`model`** matters for a reason that is not hypothetical. The first 98 grades
  on this log came from the Gemini fallback because no Jev key was configured.
  Adding one later has to be able to say "these are out of date" without the
  rubric having moved at all.

A grade is **stale** when either has changed. `GET /api/ask-eval` returns
`rubric` and `judgeModel` — the rung that would answer now — and the admin page
counts stale rows from those two alone, so the page and the endpoint can never
disagree about what current means. There is an **Out-of-date grades** tile and a
**Grade version** filter.

**Re-grade N** runs the whole filtered set, not just the stale part and not
capped at `auto_eval_batch_cap`: re-grading is what you do after changing the
rubric or adding a key, and doing it fifty at a time would leave the corpus a
mixture of two rubrics for as long as it took to finish. The browser still slices
it into `auto_eval_request_batch`-sized requests for the CPU budget, and sums the
pre-flight estimate across slices so the dialog stays honest without a second cap.

It writes two different things, and the difference is enforced by PostgREST
filters rather than by a branch in the endpoint:

| row | guard | what moves |
|---|---|---|
| auto-graded, or never graded | `&or=(eval_source.eq.auto,evaluated_at.is.null)` | verdict, score, tags, notes, `eval_auto`, `evaluated_at` |
| **graded by hand** | `&evaluated_at=not.is.null&or=(eval_source.is.null,eval_source.neq.auto)` | **`eval_auto` only** |

That second row is the point, not a concession. A hand-graded answer the judge has
never seen is the most valuable row in the log: re-grading it puts a machine
verdict beside the owner's without touching the owner's, and that is the only way
the **Judge agreement** number is ever obtainable. The toast counts those rows
separately so a re-grade cannot read as having overwritten anything of yours.

The grade a re-grade replaces is kept in `eval_auto.history`, newest first,
capped at `HISTORY_LIMIT` (5) — the summary (`rubric`, `model`, `verdict`,
`score`, `confidence`, `reason`, `at`), not the whole record, because the point is
to see a verdict move rather than to re-derive it. It rides along in the evals
JSONL, and the CSV gains `evalAutoModel` and `evalRegrades`.

## Every gate before a token is spent

In order, all failing closed:

1. `Authorization: Bearer <supabase access token>` present, and `is_owner()`
   returns `true` when called **with that token**. The same SQL every RLS policy
   on this database uses; a second definition of "owner" at the edge is a second
   thing to get wrong. An unreachable check is a 503, never an assumed yes.
2. `ask_settings.auto_eval_enabled`. Off by default, and off in
   `DEFAULT_ASK_SETTINGS` too — so a Supabase blip switches the judge **off**,
   the opposite polarity to `enabled` in the same object.
3. A judge key exists on the deployment (`AI_GATEWAY_API_KEY` or
   `TYPESAFE_API_KEY`), said plainly rather than failing generically.
4. Every target row is an assistant answer with `evaluated_at` still null,
   re-checked against the database rather than trusted from the request.
5. `ask_eval_budget()` reserves the estimate inside the monthly token cap —
   reserve first, check second, the `ask_quota()` pattern. **If that RPC is
   unreachable the request is refused**: an uncapped spender is worse than a
   broken button.

`mode: "estimate"` stops after gate 4, reads the rows, counts characters and
returns the number the confirm dialog shows. It spends nothing. A test asserts
that no judge host is fetched on any refusal path, because a refusal that still
calls the model is the one bug in here that costs real credit.

## The ladder: how this stays at $0

Jev is metered per token, and the AI Gateway's free credit may or may not cover
it. So the judge has a ladder of its own, in `ask_settings.auto_eval_tiers`, tried
in order until one rung answers — the same shape and the same reasoning as the
answer ladder in `askTiers.js`, for a different purpose. That one exists so a
visitor always gets an answer; this one exists so grading can be free.

| rung | cost | needs |
|---|---|---|
| `jev` via `gateway` | the free AI Gateway credit ($5/30 days) | `AI_GATEWAY_API_KEY` |
| `gemini` | **free** — ~15 RPM, ~1,000–1,500/day | `GEMINI_API_KEY`, already set for `/ask` |
| `workers-ai` | **free** — 10,000 neurons/day | the `AI` binding, no key at all |
| `jev` via `typesafe` | **metered**, ~$0.0002/answer | `TYPESAFE_API_KEY` |

**`auto_eval_allow_metered` is off by default, and that is what makes $0 a
property of the code rather than a promise.** With it off, a rung billed per token
is filtered out of the ladder before anything runs — even if its key is present
and its row says `enabled: true`. A test asserts exactly that.

And when nothing in the usable ladder can cost anything, the monthly token budget
is skipped: a cap on free work would only stop free work. It applies again the
moment a credit or metered rung becomes usable.

So the zero-cost configuration is: **no `TYPESAFE_API_KEY` needed, no gateway key
needed.** Gemini and Workers AI alone will grade everything, and both are already
configured on this deployment because `/ask` answers on them.

### The honest cost of the free rungs

Only Jev returns *calibrated* probabilities. Gemini and Workers AI are language
models answering the same rubric as JSON (`JUDGE_JSON_SYSTEM` and
`parseJudgeJson` in `src/lib/askJudge.js`), and a language model's self-reported
confidence is **not** calibrated — while `auto_eval_min_confidence` was chosen on
the assumption that it is. So every grade from a fallback rung is tagged
**`judge-fallback`**, and `eval_auto` records the rung, the provider and
`calibrated: false`. Filter on that tag before drawing conclusions from a batch.

Two practical limits of the free rungs:

- **Gemini's rate limit is per minute.** A run fires a slice of requests in
  parallel, so a long run can trip ~15 RPM; that rung 429s and the next one takes
  the row. Lower `auto_eval_request_batch` if it happens a lot.
- **Workers AI's 10,000 neurons/day is the same pool `/ask` embeds queries
  from.** A big grading run can eat into what visitors' searches need. It is last
  in the ladder for that reason.

## The two Jev routes, which are not the same API

| | `gateway` | `typesafe` |
|---|---|---|
| reached by | AI SDK `experimental_evaluate` | `POST https://api.typesafe.ai/v1/systemone` |
| yes/no question | `boolean` + true/false criteria | `noul` |
| yes/no answer | `{type, probability}` | `{noul}` |
| score probabilities | index-keyed object | array |
| usage | `inputTokens` | `input_tokens` |
| model id | `typesafe-ai/jev` | `jev-latest` |
| cost | the free monthly gateway credit | metered per token |

Vercel's docs are explicit that the evaluation modality "is available through the
AI SDK only. It is not supported through the OpenAI-compatible,
Anthropic-compatible, or Cohere-compatible endpoints", and wants AI SDK 7+. So the
gateway route cannot be a forwarded POST — hence `toGatewayQuestions` /
`toNativeQuestions` and a normaliser that reads either shape. Sending one dialect
to the other route would not fail loudly; it would come back with fields nothing
reads, and **nothing would ever be flagged for review**.

Neither route reports a confidence field on the documented answer shapes, so
confidence is derived from how peaked the distribution is when the model does not
report one. A missing confidence must never quietly mean "certain".

### The bundle cost of the gateway route

`ai` + `@ai-sdk/gateway` take the Pages Functions bundle from **30 KB to 278 KB
gzipped** (105 KB to 1.45 MB raw). That is well inside the 1 MB gzipped Worker
limit, but Pages compiles every Function into one Worker, so `/api/ask` now ships
it too. The import is dynamic, so the modules are not initialised unless a grading
request arrives — but the parse cost is paid by every Function. If that ever shows
up as a startup problem, the fix is to delete the gateway branch and run the
direct route: two functions in `functions/api/ask-eval.js`, and the bundle goes
back to 30 KB.

## Cost arithmetic

A judged answer sends roughly 3–6k input tokens. At $0.042/M that is about
**$0.0002 per answer**, **$0.01** for a full 50-answer press, and under **$1** for
the entire historical log. The default `auto_eval_monthly_token_cap` of 2,000,000
tokens is about **$0.08**. A Vercel team's AI Gateway credit is $5 per 30 days
≈ 119M input tokens, so the cap is under 2% of it.

**Buying gateway credits permanently ends the free monthly allowance**, so nothing
here may ever require a top-up. That is why the cap fails closed rather than
warning.

One thing to confirm in the dashboard before switching the flag on: the AI Gateway
free tier covers a *subset* of the catalogue, and the public model list does not
say which. If `typesafe-ai/jev` is not in the free subset, the credit cannot buy
it and the honest choice is the metered direct route — pennies, but not zero.

## Using it

1. Apply `supabase/migrations/0022_ask_auto_evals.sql`.
2. Nothing, for the free path — `GEMINI_API_KEY` and the `AI` binding are already
   on this deployment. Only for Jev:
   `wrangler pages secret put AI_GATEWAY_API_KEY` (or `TYPESAFE_API_KEY`, which is
   metered and also needs **Allow rungs that cost money** switched on).
3. At `/admin/ask/settings` → **Automatic evaluation**, switch it on and check the
   **Judge ladder**. Leave **Allow rungs that cost money** off unless you mean it.
   Start with a small **Answers per press**.
4. At `/admin/ask/conversations`, filter to what you want graded and press
   **Grade N**. The dialog states the count, the tokens and the remaining budget
   before anything is spent.
5. **Calibrate before trusting it.** Grade about twenty answers the judge already
   graded, read the **Judge agreement** tile, and only then move
   `auto_eval_min_confidence`. The calibrated middle band has to be measured on
   this archive, not assumed.
6. Optional: switch on **Let Gemini explain low-confidence grades** and press
   **Explain N**. It uses the free rung `/ask` already answers on, appends one
   sentence under the numbers, and never replaces them.
7. After a rubric change or a new key, press **Re-grade N**. The button's label
   says how many of the set are out of date; the dialog says what will move on a
   row you graded yourself, which is `eval_auto` and nothing else.

## When "Grade N" says nothing could be graded

The button counts ungraded answers in the browser; the endpoint decides again
against the database, and it will tell you which of three things happened:

| the toast says | what it means |
|---|---|
| cannot read the conversation log | `SUPABASE_SERVICE_ROLE_KEY` is not set on this deployment, or migration 0022 has not been applied. The endpoint now refuses before this point, so you should see that message instead. |
| already been graded | Genuinely nothing left in this filter. Widen the date range, or clear the **Graded by** filter. |
| questions, not answers | Should not happen from the UI; it means the ids sent were `role = 'user'` rows. |

The first one used to be silent, which was the worst of the three: an unreadable
log and a fully graded one both come back from PostgREST as `200 []`.

## Turning it off

Clear **Grade answers automatically** at `/admin/ask/settings` — live within a
minute, no redeploy. Setting the monthly token cap to 0 is a second switch. To
undo a run:

```sql
update public.ask_messages
   set eval_verdict = null, eval_score = null, eval_tags = '{}', eval_notes = null,
       eval_source = null, eval_auto = '{}'::jsonb, evaluated_at = null
 where eval_source = 'auto';
```

That touches no hand-written grade, because those are `eval_source = 'human'`.

## Development status

- **Shipped:** the rubric, both routes, the endpoint and its gates, the admin
  buttons, the filters, the agreement tile, 39 unit tests.
- **Unverified:** neither Jev rung has been run against a real key — the wire
  shapes come from Vercel's and TypeSafe's published docs, not from a call.
  `src/lib/askJudge.js` is where an adjustment would go, and its fixtures are one
  file. The free Gemini and Workers AI rungs are ordinary calls to providers this
  site already uses, so they are the safer place to start.
- **Not built:** replaying a question to compare prompt versions, and any
  scheduled grading. Grading is on demand, by design.
