// The rubric the automatic evaluator grades /ask answers against, and the
// mapping from a decision model's typed answers onto the eval_* columns that
// 0017 gave the owner for grading by hand.
//
// Lives in src/ for the same reason as askTiers.js and askFormat.js: Pages
// routes every file under functions/, so a helper placed there would become a
// public endpoint. Dependency-free apart from askFormat, and pure — every
// decision in here is unit-testable with a recorded judge response and no key.
//
// The judge is Jev (TypeSafe AI), a "System One" model: it takes unstructured
// state plus typed questions and returns typed decisions — a `choice` with per
// option probabilities, a `score` on an ordered spectrum, a `noul` (a 0-1
// probability on a statement) — in one pass. It writes no prose at all, which
// shapes two things here:
//
//   1. eval_notes can only ever hold numbers. It gets one compact line naming
//      the model and every dimension, so a verdict is auditable. A sentence
//      explaining the verdict has to come from somewhere else, which is what
//      the Gemini escalation in functions/api/ask-eval.js is for.
//   2. The questions are written for a model that reads literally, cannot count
//      and cannot order dates. Nothing below asks "how many" or "which is
//      earlier", and every criterion is a plain description of one state of
//      affairs rather than a rule with exceptions.

import { sanitiseAnswer } from "./askFormat";

// The criteria strings below ARE the judge's behaviour: reword one and every
// grade recorded after it means something different from every grade before it,
// while a pass-rate chart pools them silently. Stamped onto each row so a
// rubric change is visible rather than retroactive — and it is what isStaleGrade
// reads to decide a stored grade needs running again.
//
// r1 → r2, after reading 98 grades the r1 rubric produced:
//   * the state carries an archive summary, so "could this have been answered?"
//     is a question the judge can see the evidence for. Under r1 it could not:
//     the extracts were all it had, so an answer refusing a question the roster
//     plainly answers was scored refused_correctly, correctly by the rubric and
//     wrongly in fact. Over-refusal was structurally undetectable.
//   * citations is computed here instead of asked, like the link check.
//   * a refusal that cites its extracts is treated as a classification the judge
//     got wrong rather than as a verdict.
export const JUDGE_RUBRIC_VERSION = "r2";

// What one judged answer may send. The judge's accuracy degrades when the state
// is padded with material the questions do not bear on, so this is deliberately
// tight — and it keeps a request an order of magnitude under the 32k-token limit
// for state plus the longest question.
export const STATE_LIMITS = {
  question: 500, // max_message_chars; a longer question was never accepted
  answer: 4000, // answers are capped at ~200 words by the system prompt
  extract: 1200,
  extracts: 8, // match_count
  archive: 600, // one line of what the archive holds — see buildArchiveNote
};

// Ordered level descriptions: a `score` answer comes back as a position on this
// spectrum, 0 for the first level, so `grounding` is 0..2 with 2 the best.
const GROUNDING_LEVELS = [
  "A central claim of the answer appears nowhere in the extracts",
  "The answer's main point is in the extracts but a specific detail is not",
  "Every claim in the answer traces to an extract, allowing for paraphrase",
];

const RETRIEVAL_LEVELS = [
  "The extracts are about a different subject than the question",
  "The extracts are related to the question but do not contain what it asks for",
  "The extracts contain what the question asks for",
];

// The two refusal options name both kinds of evidence from r2 on. Under r1 they
// named the extracts alone, which made every refusal of a question the archive
// can answer from its rosters — "which forts has he trekked", "the latest
// micro-post" — come back as refused_correctly.
export const DISPOSITIONS = {
  answered_supported: "Gave an answer, and the extracts support it",
  answered_unsupported: "Gave an answer the extracts do not support",
  refused_wrongly:
    "Said it could not find the answer, although the extracts or the archive "
    + "summary show the archive holds it",
  refused_correctly:
    "Said it could not find the answer, and neither the extracts nor the archive "
    + "summary show the archive holds it",
};

/**
 * The judge's questions, sent verbatim with every request.
 *
 * `disposition` is the load-bearing one. A single choice over four mutually
 * exclusive outcomes is exactly what this class of model is good at, and it
 * separates the two failures that matter most on this archive: answering
 * confidently past the end of what was retrieved, and refusing something the
 * retrieved text plainly contains.
 *
 * `answerable` exists to cross-check the refusal half of that choice against
 * the archive summary rather than the extracts. Retrieval missing something the
 * archive holds is the single most common real fault in this log, and it looks
 * identical to a correct refusal from inside the extracts.
 *
 * Link and image compliance is NOT here, and since r2 neither is the citation
 * habit. Both are decidable exactly, in JS, for free — see deterministicFindings
 * and citationScore — so spending tokens on a probability would be worse as well
 * as dearer.
 */
export const JUDGE_QUESTIONS = {
  grounding: {
    type: "score",
    instructions: "How well the answer's factual claims are supported by the extracts",
    criteria: GROUNDING_LEVELS,
  },
  contradiction: {
    type: "bool",
    instructions: "The answer states something that an extract directly contradicts",
  },
  retrieval: {
    type: "score",
    instructions: "Whether the extracts contain what is needed to answer the question",
    criteria: RETRIEVAL_LEVELS,
  },
  disposition: {
    type: "choice",
    instructions: "What the answer did, given the extracts and the archive summary",
    criteria: DISPOSITIONS,
  },
  answerable: {
    type: "bool",
    instructions:
      "The archive summary shows this archive holds the kind of thing the question asks for",
  },
};

// The same rubric in two dialects, because the two ways to reach this model are
// not the same API.
//
// TypeSafe's own endpoint calls a yes/no question a `noul` and answers it with
// {noul: p}. Vercel's AI Gateway calls it a `boolean` with true/false criteria
// and answers {type: "boolean", probability: p}; its score probabilities arrive
// index-keyed rather than as an array. Sending one shape to the other route does
// not fail loudly — it comes back with fields we never read, which would mean
// nothing was ever flagged for review. Hence an adapter each way, and a
// normaliser that accepts both.

/** TypeSafe's api.typesafe.ai/v1/systemone shape. */
export function toNativeQuestions(spec = JUDGE_QUESTIONS) {
  return Object.fromEntries(Object.entries(spec).map(([name, q]) => [
    name,
    q.type === "bool"
      ? { type: "noul", instructions: q.instructions }
      : { ...q },
  ]));
}

/** Vercel AI Gateway's experimental_evaluate shape. */
export function toGatewayQuestions(spec = JUDGE_QUESTIONS) {
  return Object.fromEntries(Object.entries(spec).map(([name, q]) => [
    name,
    q.type === "bool"
      ? {
        type: "boolean",
        instructions: q.instructions,
        criteria: { true: "the statement holds", false: "the statement does not hold" },
      }
      : { ...q },
  ]));
}

// Tags the judge may add, beyond the hand-grading vocabulary in
// src/lib/api/askConversations.js that it reuses wherever one already fits.
export const JUDGE_TAGS = ["auto", "needs-review", "over-refusal", "contradiction"];

const clip = (value, max) => {
  const s = String(value || "").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

const num = (value, fallback = null) => (Number.isFinite(value) ? value : fallback);

/**
 * One line naming what the archive holds, built from site_facts().
 *
 * This is the r2 addition, and the reason for it is worth stating plainly: the
 * extracts say what retrieval found, and nothing at all about what retrieval
 * missed. A judge given only the extracts cannot tell a question the archive
 * cannot answer from a question retrieval failed on — and the second is a bug in
 * /ask while the first is correct behaviour.
 *
 * The rosters, not the counts, carry the weight: a type with a roster is one
 * site_facts() can enumerate completely, so a refusal to name its members is
 * always wrong. Deliberately a sentence rather than the roster itself — every
 * title would be thousands of tokens of padding, and padding is what this class
 * of model is worst with.
 */
export function buildArchiveNote(facts) {
  if (!facts || typeof facts !== "object") return null;
  const counts = facts.counts && typeof facts.counts === "object" ? facts.counts : {};
  const roster = facts.roster && typeof facts.roster === "object" ? facts.roster : {};

  const named = Object.entries(roster)
    .filter(([, rows]) => Array.isArray(rows) && rows.length)
    .map(([type, rows]) => `${type} (${rows.length}, every one of them named)`);
  const namedTypes = new Set(Object.keys(roster));
  const counted = Object.entries(counts)
    .filter(([type, n]) => !namedTypes.has(type) && Number(n) > 0)
    .map(([type, n]) => `${type} (${n})`);

  const parts = [...named, ...counted];
  if (!parts.length) return null;
  return clip(
    `The archive holds ${parts.join(", ")}. Where a type says every one of them is `
    + "named, the archive can list all of them, so it is able to answer a question "
    + "asking which ones there are or which is the most recent.",
    STATE_LIMITS.archive,
  );
}

/**
 * The state for one answer. Question, answer, the text of the items it was
 * given, and since r2 one line on what the archive holds.
 *
 * Deliberately absent: ids, urls, timings, tier and model names, the user
 * agent, and the degraded / keyword_only flags. None of them bear on whether an
 * answer is grounded in its extracts, and each one is padding that costs
 * accuracy. The admin page's badges already show them to a human.
 */
export function buildJudgeState({ question, answer, extracts, scoped, facts } = {}) {
  const state = {
    question: clip(question, STATE_LIMITS.question),
    answer: clip(answer, STATE_LIMITS.answer),
    extracts: (extracts || []).slice(0, STATE_LIMITS.extracts).map((e, i) => ({
      n: i + 1,
      type: String(e?.type || "").slice(0, 40),
      title: clip(e?.title, 200),
      text: clip(e?.text, STATE_LIMITS.extract),
    })),
  };
  // Best-effort: when site_facts() could not be read the block is left out
  // rather than guessed at, and mapJudgeAnswers stops treating `answerable` as
  // evidence — a judge told nothing about the archive must not conclude the
  // archive holds nothing.
  const archive = buildArchiveNote(facts);
  if (archive) state.archive = archive;
  // Only when it changes how the extracts should be read: with chips on, a
  // narrow set of extracts is the reader's doing, not a retrieval failure.
  if (scoped) state.note = `The reader had these content types selected: ${scoped}.`;
  return state;
}

// ---------------------------------------------------------------------------
// The same rubric for a model that only writes text
// ---------------------------------------------------------------------------
//
// Jev is metered, and the free-credit route may not cover it. Gemini's free tier
// and the Workers AI allowance cost nothing at all, so they stand behind it as
// fallback judges — which means the rubric has to be answerable in prose-shaped
// JSON as well as by typed questions.
//
// The honest caveat, and the reason a fallback grade is tagged: a language model's
// self-reported confidence is not calibrated. Jev's is, and the needs-review
// threshold was chosen on that basis. A number from a fallback rung is a hint,
// not a probability — see SELF_REPORT_CEILING for what is done about it.

export const JUDGE_JSON_SYSTEM = [
  "You are grading one answer produced by a personal archive's question-answering feature.",
  "You are given the question, the answer, the archive extracts the answer was written from,",
  "and a summary of what the whole archive holds.",
  "Reply with JSON only. No prose, no markdown, no code fence.",
  "",
  "Reply with exactly this shape:",
  "{",
  '  "grounding": {"score": 0|1|2, "confidence": 0.0-1.0},',
  '  "contradiction": {"probability": 0.0-1.0},',
  '  "retrieval": {"score": 0|1|2, "confidence": 0.0-1.0},',
  '  "disposition": {"choice": "<one option below>", "confidence": 0.0-1.0},',
  '  "answerable": {"probability": 0.0-1.0}',
  "}",
  "",
  `grounding — 0: ${GROUNDING_LEVELS[0]}. 1: ${GROUNDING_LEVELS[1]}. 2: ${GROUNDING_LEVELS[2]}.`,
  "contradiction — the probability that the answer states something an extract directly contradicts.",
  `retrieval — 0: ${RETRIEVAL_LEVELS[0]}. 1: ${RETRIEVAL_LEVELS[1]}. 2: ${RETRIEVAL_LEVELS[2]}.`,
  `disposition — one of: ${Object.entries(DISPOSITIONS).map(([k, v]) => `${k} (${v})`).join("; ")}.`,
  "answerable — the probability that the ARCHIVE section shows this archive holds the kind of",
  "thing the question asks for. Judge this from the archive summary alone, not from the extracts:",
  "it is what tells apart a question this archive cannot answer from one its search missed.",
  "",
  "Judge only what is in front of you. Do not use anything you know about the subject.",
  "confidence is how sure you are of that one judgement, not how good the answer is.",
  "Report a confidence below 1.0 unless the evidence in front of you leaves no room to differ.",
].join("\n");

/** The state as text, for a model that cannot take a typed state. */
export function buildJudgePrompt(state) {
  const s = state || {};
  return [
    `QUESTION: ${s.question || "(missing)"}`,
    `ANSWER: ${s.answer || "(empty)"}`,
    "EXTRACTS:",
    (s.extracts || []).length
      ? s.extracts.map((e) => `<<<${e.n} | ${e.type} | ${e.title}>>>\n${e.text}`).join("\n\n")
      : "(nothing was retrieved)",
    s.archive ? `ARCHIVE: ${s.archive}` : null,
    s.note ? `NOTE: ${s.note}` : null,
  ].filter(Boolean).join("\n\n");
}

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v)));
const clampScore = (v, max) => Math.max(0, Math.min(max, Number(v)));

/**
 * A text model's reply, in the same shape normaliseAnswers reads.
 *
 * Tolerant on the way in — a fenced block or a sentence of preamble is common and
 * is not worth failing a whole batch over — and strict on the way out: anything
 * missing or out of range becomes null rather than a number that looks measured.
 */
export function parseJudgeJson(text) {
  const raw = String(text || "").trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("the judge did not return JSON");
  const parsed = JSON.parse(raw.slice(start, end + 1));

  const score = (q, levels) => {
    const value = Number(q?.score);
    if (!Number.isFinite(value)) return {};
    return {
      score: clampScore(value, levels - 1),
      confidence: Number.isFinite(Number(q?.confidence)) ? clamp01(q.confidence) : null,
      // Length alone tells normaliseAnswers how many rungs this question had.
      probabilities: new Array(levels).fill(null),
    };
  };
  const bool = (q) => {
    const value = Number(q?.probability ?? q?.noul);
    return Number.isFinite(value) ? { probability: clamp01(value) } : {};
  };

  const choice = DISPOSITIONS[parsed?.disposition?.choice]
    ? parsed.disposition.choice
    : null;
  const confidence = Number.isFinite(Number(parsed?.disposition?.confidence))
    ? clamp01(parsed.disposition.confidence)
    : null;

  return {
    grounding: score(parsed?.grounding, GROUNDING_LEVELS.length),
    retrieval: score(parsed?.retrieval, RETRIEVAL_LEVELS.length),
    contradiction: bool(parsed?.contradiction),
    answerable: bool(parsed?.answerable),
    disposition: {
      choice,
      confidence,
      // So the notes line reads the same whichever rung answered.
      probabilities: choice && confidence !== null ? { [choice]: confidence } : {},
    },
  };
}

const QUESTIONS_CHARS = JSON.stringify(JUDGE_QUESTIONS).length;

/** Rough input-token count for one request, for the pre-flight estimate. */
export function estimateTokens(state) {
  return Math.ceil((JSON.stringify(state || {}).length + QUESTIONS_CHARS) / 4);
}

// sanitiseAnswer's last two steps tidy the whitespace a removed link leaves
// behind, and they run over every answer whether or not anything was removed.
// So the comparison below has to be made against text that has already had them
// applied, or an answer that merely contains a double space is reported as
// having invented a URL. Two of the first twelve bad-link flags on this log were
// exactly that, on answers containing no URL at all.
const squashSpaces = (text) => String(text || "")
  .replace(/[ \t]{2,}/g, " ")
  .replace(/[ \t]+$/gm, "");

const CITATION_RE = /\[(\d{1,2})\]/g;

/**
 * Whether the answer cites the items it was given, by their bare number.
 *
 * Asked of the judge under r1 and computed here since, for the same reason the
 * link check never went to a model: a regex decides it exactly. Measured against
 * 98 graded answers the model agreed with this regex 84% of the time, and every
 * one of the sixteen disagreements was the model missing a citation that was
 * plainly there.
 *
 * @returns 1, 0, or null when the question does not arise — nothing was
 *   retrieved, so there is nothing to cite and nothing to fault.
 */
export function citationScore({ answer, extracts } = {}) {
  const total = (extracts || []).length;
  const text = String(answer || "");
  if (!total || !text) return null;
  const cited = [...text.matchAll(CITATION_RE)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 1 && n <= total);
  return cited.length ? 1 : 0;
}

/**
 * The part of the rubric that needs no model at all.
 *
 * sanitiseAnswer is what the worker and the UI already run over every answer,
 * so if it changes the text then the answer carried a link or an image the
 * archive never supplied. That is exact where a probability would not be, and
 * it costs nothing.
 */
export function deterministicFindings({
  answer, sources, linkable, checkLinks = true,
} = {}) {
  const text = String(answer || "");
  const findings = [];
  // `linkable` is the facts roster, which names every book, trek, race and
  // project whether or not retrieval surfaced it — the same extra allow-list the
  // worker passes. Without it every legitimate roster link reads as a bad one,
  // so when the roster could not be loaded the check is skipped rather than
  // guessed at: a false accusation of hallucination is worse than a missed one.
  if (checkLinks && text && sanitiseAnswer(text, sources, linkable) !== squashSpaces(text)) {
    findings.push("bad-link");
  }
  if (text && !(sources || []).length) findings.push("no-sources");
  return findings;
}

// A yes/no answer is a probability, not a verdict: 0.5 is "no idea" and either
// end is confident. This is the equivalent of the confidence a choice or a score
// reports directly.
const fromHalf = (p) => (Number.isFinite(p) ? Math.abs(p - 0.5) * 2 : null);

const probabilityList = (probabilities) => {
  if (Array.isArray(probabilities)) return probabilities.filter(Number.isFinite);
  if (probabilities && typeof probabilities === "object") {
    return Object.values(probabilities).filter(Number.isFinite);
  }
  return [];
};

const yesNo = (answer) => {
  if (!answer || typeof answer !== "object") return null;
  // `noul` on TypeSafe's own endpoint, `probability` through the AI Gateway.
  if (Number.isFinite(answer.noul)) return answer.noul;
  if (Number.isFinite(answer.probability)) return answer.probability;
  return null;
};

/**
 * One judge response, whichever route it came back from, in one shape.
 *
 * Confidence is taken from the model when it reports one and derived from the
 * distribution when it does not — the gateway's documented answer shapes carry
 * no confidence field, and a missing confidence must not quietly mean "certain".
 * Deriving it from how peaked the distribution is says the same thing in the
 * same units, and it is what makes needs-review work on both routes.
 */
export function normaliseAnswers(answers) {
  const a = answers || {};
  const score = (q) => {
    const list = probabilityList(q?.probabilities);
    // A fallback rung sends an array of nulls purely to say how many rungs the
    // question had, so the rung count comes from the array and the confidence
    // from the model, never from an empty distribution.
    const rungs = Array.isArray(q?.probabilities)
      ? q.probabilities.length
      : Object.keys(q?.probabilities || {}).length;
    return {
      score: num(q?.score),
      levels: rungs || null,
      confidence: num(q?.confidence, list.length ? Math.max(...list) : null),
    };
  };
  const bool = (q) => {
    const p = yesNo(q);
    return { probability: num(p), confidence: num(q?.confidence, fromHalf(p)) };
  };
  const choice = a.disposition?.choice || null;
  const chosen = num(a.disposition?.probabilities?.[choice]);
  return {
    grounding: score(a.grounding),
    retrieval: score(a.retrieval),
    disposition: {
      choice,
      probability: chosen,
      confidence: num(a.disposition?.confidence, chosen),
    },
    contradiction: bool(a.contradiction),
    answerable: bool(a.answerable),
  };
}

const lowest = (values) => {
  const real = values.filter((v) => Number.isFinite(v));
  return real.length ? Math.min(...real) : null;
};

const fixed = (value, places = 2) => (Number.isFinite(value) ? value.toFixed(places) : "—");

// The lines a verdict is decided on. Named because marginConfidence measures
// distance from these exact numbers, so the two can never drift apart.
const GROUNDING_FAILS_BELOW = 1;
const CONTRADICTION_HIGH = 0.6;
const ANSWERABLE_HIGH = 0.6;
// Four options, so a choice carries no information at all until it beats chance.
const CHOICE_FLOOR = 0.25;

// A self-reported confidence at or above this is treated as unstated rather than
// as near-certainty, on an uncalibrated rung only.
//
// Not a guess: across 98 answers graded by the fallback rung, 63 came back at
// exactly 1.00 and the median was 1.00, so needs-review fired once. A number that
// is 1.00 two thirds of the time is a verbal tic, not a measurement, and reading
// it as certainty is what left the low-confidence escalation with nothing to do.
export const SELF_REPORT_CEILING = 0.95;

/** How far a value sits from the line it is judged against, in 0-1. */
const margin = (value, threshold, lo, hi) => {
  if (!Number.isFinite(value)) return null;
  const span = value < threshold ? threshold - lo : hi - threshold;
  return span > 0 ? Math.min(1, Math.abs(value - threshold) / span) : 0;
};

/**
 * Confidence measured from the answers themselves rather than claimed.
 *
 * Every dimension that decided anything contributes how far it sits from the
 * threshold it was compared against; the weakest one wins, because a row is only
 * as settled as its least settled input. A grounding of exactly 1 with a
 * contradiction of 0.58 is a coin toss however sure the model says it is, and
 * that is precisely the row worth a human's minute.
 */
function marginConfidence(n, levels) {
  return lowest([
    margin(n.grounding.score, GROUNDING_FAILS_BELOW, 0, levels),
    margin(n.contradiction.probability, CONTRADICTION_HIGH, 0, 1),
    Number.isFinite(n.disposition.probability)
      ? Math.max(0, (n.disposition.probability - CHOICE_FLOOR) / (1 - CHOICE_FLOOR))
      : null,
  ]);
}

/**
 * Turn one judge response into the fields the eval_* columns take. Accepts
 * either route's shape.
 *
 * Thresholds live here rather than in settings on purpose: they are part of the
 * rubric, and moving one silently changes what every stored verdict meant. The
 * one exception is minConfidence, which only decides whether a row is flagged
 * for a human and changes nothing about the verdict itself.
 *
 * @param {object} answers the judge's typed answers, either route's shape
 * @param {object} options
 * @param {number} options.citations 1, 0 or null from citationScore — computed,
 *   never asked
 * @param {boolean} options.calibrated false for a language-model rung, which
 *   turns on SELF_REPORT_CEILING and the margin fallback
 * @param {boolean} options.hasArchive false when site_facts() could not be read,
 *   which makes `answerable` inadmissible rather than merely weak
 * @returns {{verdict, score, tags, notes, confidence, auto}}
 */
export function mapJudgeAnswers(answers, {
  minConfidence = 0.7,
  model = null,
  findings = [],
  extraTags = [],
  citations = null,
  calibrated = true,
  hasArchive = true,
} = {}) {
  const n = normaliseAnswers(answers);
  const grounding = n.grounding.score;
  const retrieval = n.retrieval.score;
  const contradiction = n.contradiction.probability;
  const disposition = n.disposition.choice;
  const answerable = hasArchive ? n.answerable.probability : null;
  const levels = (n.grounding.levels || 3) - 1;
  const retrievalLevels = (n.retrieval.levels || 3) - 1;

  const refusalClaimed = String(disposition || "").startsWith("refused");

  // A refusal does not cite the items it says it could not find. When the
  // disposition says one thing and the text says the other, the disposition is
  // the thing to doubt — so it stops deciding the verdict by itself and the row
  // goes to a human instead. Six of the nine refused_wrongly verdicts in the
  // first run were on answers that were not refusals at all.
  const incoherent = refusalClaimed && citations === 1;

  // Retrieval missed something the archive holds. Invisible before r2: from
  // inside the extracts this is indistinguishable from a question the archive
  // cannot answer, and it was scored refused_correctly every time.
  const overRefusal = !incoherent && refusalClaimed
    && Number.isFinite(answerable) && answerable >= ANSWERABLE_HIGH;

  // Why this answer failed, in the order a reader would care about, so that
  // `confidence` below is the confidence of the dimension that actually decided
  // it rather than the weakest of five unrelated numbers.
  let reason = null;
  if (findings.includes("bad-link")) reason = "link";
  else if (disposition === "answered_unsupported") reason = "disposition";
  else if (Number.isFinite(grounding) && grounding < GROUNDING_FAILS_BELOW) reason = "grounding";
  else if (Number.isFinite(contradiction) && contradiction >= CONTRADICTION_HIGH) {
    reason = "contradiction";
  } else if (overRefusal) reason = "over-refusal";
  else if (disposition === "refused_wrongly" && !incoherent) reason = "disposition";

  const verdict = reason ? "fail" : "pass";

  const confidenceFor = {
    // A deterministic finding is not a probability — it is the text itself.
    link: 1,
    disposition: n.disposition.confidence,
    "over-refusal": lowest([n.disposition.confidence, n.answerable.confidence]),
    grounding: n.grounding.confidence,
    contradiction: n.contradiction.confidence,
  };
  const claimed = reason
    ? confidenceFor[reason]
    : lowest([n.grounding.confidence, n.disposition.confidence]);
  // On an uncalibrated rung a claimed near-certainty is discarded and the margin
  // stands in its place; on Jev, whose probabilities are the calibrated kind the
  // review threshold was chosen against, the claim is taken at face value.
  const reported = !calibrated && Number.isFinite(claimed) && claimed >= SELF_REPORT_CEILING
    ? null
    : claimed;
  const measured = calibrated ? null : marginConfidence(n, levels);
  let confidence = calibrated ? reported : lowest([reported, measured]);
  // Nothing here is settled if the classification itself is in question.
  if (incoherent && Number.isFinite(confidence)) confidence = Math.min(confidence, 0.5);
  else if (incoherent) confidence = 0.5;

  // 1-5, because that is the scale the hand-grading form uses and the column's
  // CHECK constraint allows nothing else. Weighted towards grounding, which is
  // the thing an archive answer is for; retrieval counts for less because a poor
  // answer over good extracts is a different bug from bad retrieval, and the
  // tags say which.
  const parts = [
    [0.45, Number.isFinite(grounding) ? grounding / levels : 0.5],
    [0.2, Number.isFinite(retrieval) ? retrieval / retrievalLevels : 0.5],
    [0.25, { answered_supported: 1, refused_correctly: 1, refused_wrongly: 0.3 }[disposition] ?? 0],
    [0.1, Number.isFinite(citations) ? citations : 0.5],
  ];
  const weighted = parts.reduce((sum, [w, v]) => sum + w * v, 0)
    - (Number.isFinite(contradiction) ? contradiction * 0.25 : 0)
    - (findings.includes("bad-link") ? 0.15 : 0)
    // A refusal the archive could have answered is the failure this rubric was
    // rewritten to see, so it costs as much as a contradiction does.
    - (overRefusal ? 0.25 : 0);
  // Never 0: the column allows 1-5 and a rejected write would lose the verdict.
  const score = Math.max(1, Math.min(5, Math.round(1 + 4 * Math.max(0, Math.min(1, weighted)))));

  const tags = new Set(["auto"]);
  if (Number.isFinite(grounding) && grounding < levels * 0.75) tags.add("hallucination");
  if (Number.isFinite(contradiction) && contradiction >= CONTRADICTION_HIGH) {
    tags.add("contradiction");
  }
  if (Number.isFinite(retrieval) && retrieval < retrievalLevels * 0.25) tags.add("wrong-source");
  else if (Number.isFinite(retrieval) && retrieval < retrievalLevels * 0.75) {
    tags.add("missed-source");
  }
  if (disposition === "refused_wrongly" && !incoherent) tags.add("over-refusal");
  if (overRefusal) tags.add("over-refusal");
  if (disposition === "answered_unsupported") tags.add("hallucination");
  // Only where a citation was possible and the answer had something to cite. A
  // refusal has nothing to attribute, and faulting it for that is how thirty-six
  // rows picked up a formatting tag they had not earned.
  if (citations === 0 && !refusalClaimed) tags.add("formatting");
  findings.forEach((f) => tags.add(f));
  extraTags.forEach((t) => tags.add(t));
  // Flagged, never withheld: eval_verdict allows only pass and fail, so an
  // unsure row still gets one, and this tag is how a human finds it again.
  if (!Number.isFinite(confidence) || confidence < minConfidence) tags.add("needs-review");

  const notes = [
    model || "auto",
    `rubric ${JUDGE_RUBRIC_VERSION}`,
    `grounding ${fixed(grounding, 1)}/${levels}`,
    `retrieval ${fixed(retrieval, 1)}/${retrievalLevels}`,
    `${disposition || "?"} p${fixed(n.disposition.probability)}`,
    `contradiction p${fixed(contradiction)}`,
    hasArchive ? `answerable p${fixed(answerable)}` : "answerable — (no archive summary)",
    `citations ${citations === null ? "—" : citations}`,
    `confidence ${fixed(confidence)}`,
    incoherent ? "note: refusal verdict on an answer that cites its extracts" : null,
    findings.length ? `checks: ${findings.join(", ")}` : null,
  ].filter(Boolean).join(" · ");

  return {
    verdict,
    score,
    tags: [...tags],
    notes,
    confidence: num(confidence),
    // Kept as its own column so that a later hand-written verdict does not
    // destroy the machine's, which is the only way agreement can be measured.
    auto: {
      model,
      rubric: JUDGE_RUBRIC_VERSION,
      verdict,
      score,
      confidence: num(confidence),
      reason,
      at: new Date().toISOString(),
      dims: n,
      citations,
      checks: findings,
      // Kept because they are the two places this rubric overrides what the
      // judge said, and a stored grade should show its own workings.
      incoherent,
      overRefusal,
    },
  };
}

// ---------------------------------------------------------------------------
// Versioning: what a stored grade was made by, and what it replaced
// ---------------------------------------------------------------------------

/** How many superseded grades a row keeps. Enough to see a trend, not a log. */
export const HISTORY_LIMIT = 5;

/**
 * The new grade, carrying the one it replaced.
 *
 * Re-grading without this would silently rewrite the past: a pass-rate that
 * moved after a rubric change would be indistinguishable from one that moved
 * because the answers changed. The entries are deliberately the summary and not
 * the whole record — dims and checks are large and the point of the history is
 * to see a verdict move, not to re-derive it.
 */
export function withHistory(auto, previous, limit = HISTORY_LIMIT) {
  const prior = previous && previous.verdict
    ? [{
      rubric: previous.rubric || null,
      model: previous.model || null,
      verdict: previous.verdict,
      score: previous.score ?? null,
      confidence: previous.confidence ?? null,
      reason: previous.reason || null,
      at: previous.at || null,
    }]
    : [];
  const older = Array.isArray(previous?.history) ? previous.history : [];
  return { ...auto, history: [...prior, ...older].slice(0, limit) };
}

/**
 * Whether a stored grade was made by something other than what would grade it
 * now — a different rubric, or a different rung of the ladder.
 *
 * The model half is not pedantry. Every grade in the first run came from the
 * uncalibrated fallback because no Jev key was set; adding one later has to be
 * able to say "these are out of date" without the rubric having moved at all.
 */
export function isStaleGrade(auto, { rubric = JUDGE_RUBRIC_VERSION, model = null } = {}) {
  if (!auto || !auto.verdict) return true;
  if ((auto.rubric || null) !== rubric) return true;
  return !!model && (auto.model || null) !== model;
}
