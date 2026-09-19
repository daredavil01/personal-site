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
// rubric change is visible rather than retroactive.
export const JUDGE_RUBRIC_VERSION = "r1";

// What one judged answer may send. The judge's accuracy degrades when the state
// is padded with material the questions do not bear on, so this is deliberately
// tight — and it keeps a request an order of magnitude under the 32k-token limit
// for state plus the longest question.
export const STATE_LIMITS = {
  question: 500, // max_message_chars; a longer question was never accepted
  answer: 4000, // answers are capped at ~200 words by the system prompt
  extract: 1200,
  extracts: 8, // match_count
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

export const DISPOSITIONS = {
  answered_supported: "Gave an answer, and the extracts support it",
  answered_unsupported: "Gave an answer the extracts do not support",
  refused_wrongly:
    "Said it could not find the answer, although the extracts do contain it",
  refused_correctly:
    "Said it could not find the answer, and the extracts do not contain it",
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
 * Link and image compliance is NOT here. It is decidable exactly, in JS, for
 * free — see deterministicFindings — so spending tokens on a probability would
 * be worse as well as dearer. Only the citation habit is asked, as a statement
 * rather than a count.
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
    instructions: "What the answer did, given the extracts",
    criteria: DISPOSITIONS,
  },
  citations: {
    type: "bool",
    instructions: "Statements taken from the extracts are followed by a bare item number",
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
 * The state for one answer. Question, answer, and the text of the items it was
 * given — nothing else.
 *
 * Deliberately absent: ids, urls, timings, tier and model names, the user
 * agent, and the degraded / keyword_only flags. None of them bear on whether an
 * answer is grounded in its extracts, and each one is padding that costs
 * accuracy. The admin page's badges already show them to a human.
 */
export function buildJudgeState({ question, answer, extracts, scoped } = {}) {
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
  // Only when it changes how the extracts should be read: with chips on, a
  // narrow set of extracts is the reader's doing, not a retrieval failure.
  if (scoped) state.note = `The reader had these content types selected: ${scoped}.`;
  return state;
}

const QUESTIONS_CHARS = JSON.stringify(JUDGE_QUESTIONS).length;

/** Rough input-token count for one request, for the pre-flight estimate. */
export function estimateTokens(state) {
  return Math.ceil((JSON.stringify(state || {}).length + QUESTIONS_CHARS) / 4);
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
  if (checkLinks && text && sanitiseAnswer(text, sources, linkable) !== text) {
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
    return {
      score: num(q?.score),
      levels: list.length || null,
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
    citations: bool(a.citations),
  };
}

const lowest = (values) => {
  const real = values.filter((v) => Number.isFinite(v));
  return real.length ? Math.min(...real) : null;
};

const fixed = (value, places = 2) => (Number.isFinite(value) ? value.toFixed(places) : "\u2014");

/**
 * Turn one judge response into the fields the eval_* columns take. Accepts
 * either route's shape.
 *
 * Thresholds live here rather than in settings on purpose: they are part of the
 * rubric, and moving one silently changes what every stored verdict meant. The
 * one exception is minConfidence, which only decides whether a row is flagged
 * for a human and changes nothing about the verdict itself.
 *
 * @returns {{verdict, score, tags, notes, confidence, auto}}
 */
export function mapJudgeAnswers(answers, { minConfidence = 0.7, model = null, findings = [] } = {}) {
  const n = normaliseAnswers(answers);
  const grounding = n.grounding.score;
  const retrieval = n.retrieval.score;
  const contradiction = n.contradiction.probability;
  const citations = n.citations.probability;
  const disposition = n.disposition.choice;

  // Why this answer failed, in the order a reader would care about, so that
  // `confidence` below is the confidence of the dimension that actually decided
  // it rather than the weakest of five unrelated numbers.
  let reason = null;
  if (findings.includes("bad-link")) reason = "link";
  else if (disposition === "answered_unsupported") reason = "disposition";
  else if (Number.isFinite(grounding) && grounding < 1) reason = "grounding";
  else if (Number.isFinite(contradiction) && contradiction >= 0.6) reason = "contradiction";
  else if (disposition === "refused_wrongly") reason = "disposition";

  const verdict = reason ? "fail" : "pass";

  const confidenceFor = {
    // A deterministic finding is not a probability — it is the text itself.
    link: 1,
    disposition: n.disposition.confidence,
    grounding: n.grounding.confidence,
    contradiction: n.contradiction.confidence,
  };
  const confidence = reason
    ? confidenceFor[reason]
    : lowest([n.grounding.confidence, n.disposition.confidence]);

  // 1-5, because that is the scale the hand-grading form uses and the column's
  // CHECK constraint allows nothing else. Weighted towards grounding, which is
  // the thing an archive answer is for; retrieval counts for less because a poor
  // answer over good extracts is a different bug from bad retrieval, and the
  // tags say which.
  const levels = (n.grounding.levels || 3) - 1;
  const retrievalLevels = (n.retrieval.levels || 3) - 1;
  const parts = [
    [0.45, Number.isFinite(grounding) ? grounding / levels : 0.5],
    [0.2, Number.isFinite(retrieval) ? retrieval / retrievalLevels : 0.5],
    [0.25, { answered_supported: 1, refused_correctly: 1, refused_wrongly: 0.3 }[disposition] ?? 0],
    [0.1, Number.isFinite(citations) ? citations : 0.5],
  ];
  const weighted = parts.reduce((sum, [w, v]) => sum + w * v, 0)
    - (Number.isFinite(contradiction) ? contradiction * 0.25 : 0)
    - (findings.includes("bad-link") ? 0.15 : 0);
  // Never 0: the column allows 1-5 and a rejected write would lose the verdict.
  const score = Math.max(1, Math.min(5, Math.round(1 + 4 * Math.max(0, Math.min(1, weighted)))));

  const tags = new Set(["auto"]);
  if (Number.isFinite(grounding) && grounding < levels * 0.75) tags.add("hallucination");
  if (Number.isFinite(contradiction) && contradiction >= 0.6) tags.add("contradiction");
  if (Number.isFinite(retrieval) && retrieval < retrievalLevels * 0.25) tags.add("wrong-source");
  else if (Number.isFinite(retrieval) && retrieval < retrievalLevels * 0.75) tags.add("missed-source");
  if (disposition === "refused_wrongly") tags.add("over-refusal");
  if (disposition === "answered_unsupported") tags.add("hallucination");
  if (Number.isFinite(citations) && citations < 0.4) tags.add("formatting");
  findings.forEach((f) => tags.add(f));
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
    `citations p${fixed(citations)}`,
    `confidence ${fixed(confidence)}`,
    findings.length ? `checks: ${findings.join(", ")}` : null,
  ].filter(Boolean).join(" \u00b7 ");

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
      checks: findings,
    },
  };
}
