# Automatic evals for /ask

How logged `/ask` answers get graded without anyone reading them, what the grades
mean, and why the whole thing cannot quietly cost money.

Read this before rewording a criterion. The criteria strings **are** the judge's
behaviour: change one and every grade recorded afterwards means something
different from every grade before it, while the pass-rate tile pools them
silently. That is what `JUDGE_RUBRIC_VERSION` in `src/lib/askJudge.js` is for —
bump it when the rubric changes, and it lands on every row in `eval_auto.rubric`.

## What the judge is

**Jev**, TypeSafe AI's "System One" model. It takes unstructured `state` plus
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
| Link & format compliance | **In JS, free.** `sanitiseAnswer` from `src/lib/askFormat.js` already decides it: if it changes the answer, the answer carried a link or image the archive never supplied. Exact where a probability would not be. |
| Groundedness | `grounding` (score, 3 rungs) + `contradiction` (yes/no) |
| Retrieval quality | `retrieval` (score, 3 rungs) |
| Refusal appropriateness | `disposition` (choice, 4 options) |

`disposition` is the load-bearing question. A single choice over four mutually
exclusive outcomes is what this class of model is best at, and it separates the
two failures that matter most on this archive: answering confidently past the end
of what was retrieved, and refusing something the retrieved text plainly
contains.

The questions are written around the model's stated weaknesses. It reads
literally, so no instruction contains a negation. It cannot count and cannot order
dates, so nothing asks "how many" or "which is earlier" — a test in
`src/lib/askJudge.test.js` fails if such a phrase is reintroduced. Its accuracy
degrades when the state is padded, so the state carries the question, the answer
and the extracts, and nothing else.

### What the judge is deliberately not shown

Ids, urls, timings, the tier and model that answered, the user agent, the
`degraded` and `keyword_only` flags — and, most importantly, **the reader's
feedback and the owner's own grade**. Letting either into the state would make the
agreement number below circular and worthless.

### Verdict, score, tags

`eval_verdict` is `fail` when grounding is low, a contradiction is likely, the
disposition is `answered_unsupported` or `refused_wrongly`, or the free link check
failed. The column allows only `pass` and `fail`, so an unsure row still gets one
— plus a `needs-review` tag, which is how it is found again.

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

**"Missed source" is not fully measurable.** Knowing what was *not* retrieved needs
the un-retrieved archive in the state, which is both a token-limit violation and
exactly the padding that costs accuracy. What is measured is whether the extracts
are on-subject and whether they contain what was asked. The one sound inference —
the extracts answered it and the answer refused anyway — is tagged `over-refusal`.

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

## The two routes, which are not the same API

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
2. `wrangler pages secret put AI_GATEWAY_API_KEY` (or `TYPESAFE_API_KEY`).
3. At `/admin/ask/settings` → **Automatic evaluation**, pick the route and switch
   it on. Start with a small **Answers per press**.
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
- **Unverified:** the gateway route has never been run against a real key — the
  wire shapes come from Vercel's and TypeSafe's published docs, not from a call.
  `src/lib/askJudge.js` is where an adjustment would go, and its fixtures are one
  file.
- **Not built:** replaying a question to compare prompt versions, and any
  scheduled grading. Grading is on demand, by design.
