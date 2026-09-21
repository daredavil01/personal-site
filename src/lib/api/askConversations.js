import { supabase } from "../supabaseClient";
import { typesNamed } from "../askRetrieval";

// The /ask conversation log, for the admin Conversations page. Owner-only
// (RLS) — visitors write it through the ask_log() RPC and rate answers through
// ask_feedback(), and can never read it back.
//
// The page loads every message in a date range once and does the rest here, in
// pure functions: pairing questions with answers, splitting a browser session
// into separate chats, filtering, and the headline numbers. At this volume
// that is instant, and every filter combination stays a click away.

const PAGE = 1000;
// A session id lives in localStorage for as long as the browser keeps it, so one
// "conversation" can span weeks. A pause longer than this starts a new chat.
export const CHAT_GAP_MS = 30 * 60 * 1000;

function messageFromRow(r) {
  const conv = r.ask_conversations || {};
  return {
    id: r.id,
    conversationId: r.conversation_id,
    turnIndex: r.turn_index,
    role: r.role,
    content: r.content,
    tier: r.tier,
    provider: r.provider,
    model: r.model,
    degraded: !!r.degraded,
    keywordOnly: !!r.keyword_only,
    streamed: !!r.streamed,
    embedMs: r.embed_ms,
    retrievalMs: r.retrieval_ms,
    generationMs: r.generation_ms,
    totalMs: r.total_ms,
    sourceCount: r.source_count ?? 0,
    sources: r.sources || [],
    // Which content-type chips were on. A bad answer to a scoped question is a
    // different bug from a bad answer to an open one, and without this the log
    // cannot tell them apart.
    types: r.types || [],
    tierErrors: r.tier_errors || [],
    messageUuid: r.message_uuid || null,
    feedback: r.feedback ?? null,
    feedbackTags: r.feedback_tags || [],
    feedbackComment: r.feedback_comment || null,
    feedbackAt: r.feedback_at || null,
    evalVerdict: r.eval_verdict || null,
    evalScore: r.eval_score ?? null,
    evalTags: r.eval_tags || [],
    evalNotes: r.eval_notes || null,
    evalIdealAnswer: r.eval_ideal_answer || null,
    // Who graded it: "human" or "auto" (migration 0022). Null on rows graded
    // before that migration existed, which it backfills.
    evalSource: r.eval_source || null,
    // The judge's own record, kept even after a hand grade replaces the verdict
    // above — the only thing that makes judge-vs-human agreement measurable.
    evalAuto: r.eval_auto || {},
    evaluatedAt: r.evaluated_at || null,
    createdAt: r.created_at,
    sessionId: conv.session_id || null,
    userAgent: conv.user_agent || null,
    referer: conv.referer || null,
  };
}

/** Every message created in [from, to), oldest first. Paginated past the 1000-row cap. */
export async function listAskMessages({ from, to, max = 20000 } = {}) {
  const rows = [];
  for (let offset = 0; offset < max; offset += PAGE) {
    let q = supabase
      .from("ask_messages")
      .select("*, ask_conversations(session_id, started_at, user_agent, referer)")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lt("created_at", to);
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await q.range(offset, offset + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows.map(messageFromRow);
}

// Quick-pick reasons in eval mode; any other tag can be typed in. The last
// three are the automatic judge's own additions (src/lib/askJudge.js), listed
// here so a hand grade can use the same words the machine does.
export const EVAL_TAGS = [
  "hallucination", "wrong-source", "missed-source", "incomplete",
  "off-topic", "bad-link", "formatting", "too-slow", "great",
  "needs-review", "over-refusal", "contradiction",
];

// Mirrors auto_eval_min_confidence's default. The page overrides it from the
// endpoint's readiness payload; this is what the filters fall back to.
export const LOW_CONFIDENCE = 0.7;

/** The confidence the judge recorded for a row, if a judge graded it. */
export const autoConfidence = (answer) => {
  const value = Number(answer?.evalAuto?.confidence);
  return Number.isFinite(value) ? value : null;
};

/**
 * The admin's evaluation of one answer (separate from reader feedback). An
 * evaluation with nothing in it clears evaluated_at, so it counts as not
 * evaluated. Returns the saved fields in messageFromRow's shape.
 */
export async function saveEvaluation(messageId, { verdict, score, tags, notes, idealAnswer }) {
  const clean = (s) => (s || "").trim() || null;
  const row = {
    eval_verdict: verdict || null,
    eval_score: score ? Number(score) : null,
    eval_tags: [...new Set((tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean))],
    eval_notes: clean(notes),
    eval_ideal_answer: clean(idealAnswer),
  };
  const empty = !row.eval_verdict && !row.eval_score && !row.eval_tags.length
    && !row.eval_notes && !row.eval_ideal_answer;
  row.evaluated_at = empty ? null : new Date().toISOString();
  // Saving by hand claims the row, but deliberately does NOT clear eval_auto:
  // comparing your verdict with the machine's is the whole reason to run one, and
  // there is nowhere else that record survives. Clearing an evaluation does reset
  // it, because a cleared row is genuinely ungraded and eligible again.
  row.eval_source = empty ? null : "human";
  if (empty) row.eval_auto = {};

  const { data, error } = await supabase
    .from("ask_messages")
    .update(row)
    .eq("id", messageId)
    .select()
    .single();
  if (error) throw error;
  const saved = messageFromRow(data);
  return {
    evalVerdict: saved.evalVerdict,
    evalScore: saved.evalScore,
    evalTags: saved.evalTags,
    evalNotes: saved.evalNotes,
    evalIdealAnswer: saved.evalIdealAnswer,
    evalSource: saved.evalSource,
    evalAuto: saved.evalAuto,
    evaluatedAt: saved.evaluatedAt,
  };
}

// ---------------------------------------------------------------------------
// The automatic judge (functions/api/ask-eval.js)
// ---------------------------------------------------------------------------
//
// The judge's key is a Cloudflare secret, so grading cannot happen in the
// browser. This is the only place that reads the session token and hands it to
// the endpoint, which verifies it with is_owner() before spending anything.

async function askEval(path, init = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Signed out — sign in again to grade answers.");
  const res = await fetch(`/api/ask-eval${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.note || body.error || `ask-eval ${res.status}`);
    err.status = res.status;
    err.reason = body.error;
    err.budget = body.budget;
    throw err;
  }
  return body;
}

/** Whether grading is switched on and configured, and what it has spent. */
export const getJudgeStatus = () => askEval("");

/**
 * Grade, estimate or explain. `mode: "estimate"` reads the rows and counts
 * characters without calling the judge, which is what fills the confirm dialog.
 */
export const runJudge = ({ messageIds, mode = "run", regrade = false }) => askEval("", {
  method: "POST",
  body: JSON.stringify({ messageIds, mode, regrade }),
});

/** What is worth sending: answers in this set that nobody has graded yet. */
export const ungradedIds = (exchanges, cap) => exchanges
  .filter((e) => !e.answer.evaluatedAt)
  .sort((a, b) => b.askedAt.localeCompare(a.askedAt))
  .slice(0, cap)
  .map((e) => e.answer.id);

/**
 * Whether a stored grade was made by something other than what would grade the
 * row now — an older rubric, or a rung that is no longer the one that answers.
 *
 * Kept here rather than imported so the admin page does not pull the rubric
 * module into the client bundle for one comparison; the server sends both halves
 * on the readiness call, and disagreeing about them is not possible when neither
 * side holds an opinion of its own.
 */
export const isStaleGrade = (answer, { rubric, model } = {}) => {
  const auto = answer?.evalAuto;
  if (!auto?.verdict) return false;
  if (rubric && (auto.rubric || null) !== rubric) return true;
  return !!model && (auto.model || null) !== model;
};

/**
 * Everything a re-grade would look at, newest first.
 *
 * Deliberately not only the stale rows. A hand-graded answer the judge has never
 * seen is the most valuable row in the set — re-grading it writes eval_auto and
 * nothing else, which is the only way the judge is ever measured against the
 * owner — and it carries no stored grade to be stale.
 */
export const regradeIds = (exchanges) => exchanges
  .filter((e) => e.answer.id)
  .sort((a, b) => b.askedAt.localeCompare(a.askedAt))
  .map((e) => e.answer.id);

/** Rows the judge was unsure about, which a human or Gemini can settle. */
export const lowConfidenceIds = (exchanges, threshold = LOW_CONFIDENCE) => exchanges
  .filter((e) => {
    const c = autoConfidence(e.answer);
    return e.answer.evalSource === "auto" && c !== null && c < threshold;
  })
  .map((e) => e.answer.id);

/** Split a list into slices the endpoint will accept in one request. */
export const sliceBatches = (ids, size) => {
  const out = [];
  for (let i = 0; i < ids.length; i += Math.max(1, size)) out.push(ids.slice(i, i + Math.max(1, size)));
  return out;
};

/** What the index holds, per content type (from site_facts). */
export async function getIndexCoverage() {
  const { data, error } = await supabase.rpc("site_facts");
  if (error) throw error;
  return data?.index_by_type || {};
}

export const dayKey = (iso) => new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD, local

/** One exchange per assistant message, with the question that preceded it. */
export function toExchanges(messages) {
  const byConversation = new Map();
  (messages || []).forEach((m) => {
    const list = byConversation.get(m.conversationId) || [];
    list.push(m);
    byConversation.set(m.conversationId, list);
  });

  const exchanges = [];
  byConversation.forEach((list) => {
    list.sort((a, b) => a.turnIndex - b.turnIndex);
    list.forEach((m, i) => {
      if (m.role !== "assistant") return;
      const question = list[i - 1]?.role === "user" ? list[i - 1] : null;
      exchanges.push({
        id: m.id,
        conversationId: m.conversationId,
        sessionId: m.sessionId,
        userAgent: m.userAgent,
        question: question?.content || "",
        askedAt: question?.createdAt || m.createdAt,
        answer: m,
      });
    });
  });
  return exchanges.sort((a, b) => a.askedAt.localeCompare(b.askedAt));
}

/**
 * Chats: a session's exchanges split wherever it went quiet for longer than
 * `gapMs`. Newest chat first; exchanges inside a chat in the order they happened.
 */
export function toChats(exchanges, gapMs = CHAT_GAP_MS) {
  const bySession = new Map();
  exchanges.forEach((e) => {
    const key = e.conversationId;
    bySession.set(key, [...(bySession.get(key) || []), e]);
  });

  const chats = [];
  bySession.forEach((list) => {
    const sorted = [...list].sort((a, b) => a.askedAt.localeCompare(b.askedAt));
    let current = null;
    sorted.forEach((e) => {
      const gap = current ? Date.parse(e.askedAt) - Date.parse(current.lastAt) : Infinity;
      if (!current || gap > gapMs) {
        current = {
          id: `${e.conversationId}:${e.id}`,
          conversationId: e.conversationId,
          sessionId: e.sessionId,
          userAgent: e.userAgent,
          startedAt: e.askedAt,
          lastAt: e.askedAt,
          exchanges: [],
        };
        chats.push(current);
      }
      current.exchanges.push(e);
      current.lastAt = e.answer.createdAt || e.askedAt;
    });
  });
  return chats.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

const tally = (keys) => keys.reduce((acc, k) => {
  if (k !== null && k !== undefined && k !== "") acc[k] = (acc[k] || 0) + 1;
  return acc;
}, {});

/** Distinct values present in the data, for the filter dropdowns. */
export function filterOptions(exchanges) {
  const values = (fn) => [...new Set(exchanges.flatMap(fn).filter(Boolean))].sort();
  return {
    tiers: values((e) => [e.answer.tier]),
    providers: values((e) => [e.answer.provider]),
    models: values((e) => [e.answer.model]),
    sourceTypes: values((e) => e.answer.sources.map((s) => s.entity_type)),
    feedbackTags: values((e) => e.answer.feedbackTags),
    evalTags: values((e) => e.answer.evalTags),
  };
}

export const EMPTY_FILTERS = {
  search: "",
  tier: "",
  provider: "",
  model: "",
  sourceType: "",
  feedback: "", // liked | disliked | commented | rated | unrated
  feedbackTag: "",
  evaluation: "", // evaluated | unevaluated | pass | fail | disagreed
  evalTag: "",
  evalSource: "", // human | auto
  stale: "", // yes | no — graded by an older rubric, or by a rung that no longer answers
  confidence: "", // low | high — the judge's own, for rows it graded
  degraded: "", // yes | no
  keywordOnly: "",
  errors: "",
  noSources: "",
  offTopic: "", // yes | no — the question named a type none of its sources were
  session: "",
};

/**
 * The question named a content type and retrieval returned none of it.
 *
 * This is the shape the whole retrieval bug had: "Which forts has he trekked?"
 * answered from eight book chunks, "How many marathons has he run?" from eight
 * more. It was invisible in this log for a month because nothing here compared
 * the question's subject against what came back.
 */
export function missedNamedType(exchange) {
  const asked = typesNamed(exchange?.question);
  if (!asked.length) return false;
  const got = new Set((exchange?.answer?.sources || []).map((s) => s.entity_type));
  return !asked.some((t) => got.has(t));
}

const yesNo = (want, value) => !want || (want === "yes" ? value : !value);

/**
 * @param {object} version {rubric, model} from the readiness call, so "stale"
 *   means the same thing here as it does at the endpoint. Absent, the stale
 *   filter matches nothing rather than guessing — a page that has not heard from
 *   the judge does not know what current is.
 */
export function applyFilters(exchanges, f, version = {}) {
  const needle = (f.search || "").trim().toLowerCase();
  return exchanges.filter((e) => {
    const a = e.answer;
    if (needle && ![e.question, a.content, a.feedbackComment || "", a.evalNotes || ""]
      .some((text) => text.toLowerCase().includes(needle))) return false;
    if (f.evaluation === "evaluated" && !a.evaluatedAt) return false;
    if (f.evaluation === "unevaluated" && a.evaluatedAt) return false;
    if ((f.evaluation === "pass" || f.evaluation === "fail") && a.evalVerdict !== f.evaluation) return false;
    // Rows where you and the judge reached different verdicts on the same answer:
    // the short list worth reading before trusting any of its other grades.
    if (f.evaluation === "disagreed"
      && !(a.evalSource === "human" && a.evalAuto?.verdict && a.evalAuto.verdict !== a.evalVerdict)) {
      return false;
    }
    if (f.evalTag && !a.evalTags.includes(f.evalTag)) return false;
    if (f.evalSource && a.evalSource !== f.evalSource) return false;
    if (f.stale && !yesNo(f.stale, isStaleGrade(a, version))) return false;
    if (f.confidence) {
      const c = autoConfidence(a);
      if (c === null) return false;
      if (f.confidence === "low" && c >= LOW_CONFIDENCE) return false;
      if (f.confidence === "high" && c < LOW_CONFIDENCE) return false;
    }
    if (f.tier && a.tier !== f.tier) return false;
    if (f.provider && a.provider !== f.provider) return false;
    if (f.model && a.model !== f.model) return false;
    if (f.sourceType && !a.sources.some((s) => s.entity_type === f.sourceType)) return false;
    if (f.feedbackTag && !a.feedbackTags.includes(f.feedbackTag)) return false;
    if (f.session && e.sessionId !== f.session) return false;
    if (f.feedback === "liked" && a.feedback !== 1) return false;
    if (f.feedback === "disliked" && a.feedback !== -1) return false;
    if (f.feedback === "commented" && !a.feedbackComment) return false;
    if (f.feedback === "rated" && a.feedback === null) return false;
    if (f.feedback === "unrated" && a.feedback !== null) return false;
    if (!yesNo(f.degraded, a.degraded)) return false;
    if (!yesNo(f.keywordOnly, a.keywordOnly)) return false;
    if (!yesNo(f.errors, a.tierErrors.length > 0)) return false;
    if (!yesNo(f.noSources, !a.sourceCount)) return false;
    if (f.offTopic && !yesNo(f.offTopic, missedNamedType(e))) return false;
    return true;
  });
}

/** Headline numbers for whatever is currently filtered. */
export function summariseExchanges(exchanges, version = {}) {
  const answers = exchanges.map((e) => e.answer);
  const count = (fn) => answers.filter(fn).length;
  const latencies = answers.map((a) => a.totalMs).filter(Number.isFinite).sort((x, y) => x - y);
  const percentile = (q) => (latencies.length
    ? latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))]
    : null);
  const average = (key) => {
    const list = answers.map((a) => a[key]).filter(Number.isFinite);
    return list.length ? Math.round(list.reduce((n, v) => n + v, 0) / list.length) : null;
  };
  const liked = count((a) => a.feedback === 1);
  const disliked = count((a) => a.feedback === -1);
  const passed = count((a) => a.evalVerdict === "pass");
  const failed = count((a) => a.evalVerdict === "fail");

  return {
    questions: exchanges.length,
    chats: toChats(exchanges).length,
    sessions: new Set(exchanges.map((e) => e.conversationId)).size,
    liked,
    disliked,
    commented: count((a) => !!a.feedbackComment),
    satisfaction: liked + disliked ? Math.round((liked / (liked + disliked)) * 100) : null,
    evaluated: count((a) => !!a.evaluatedAt),
    evaluatedByHand: count((a) => a.evalSource === "human" || (a.evaluatedAt && !a.evalSource)),
    evaluatedAuto: count((a) => a.evalSource === "auto"),
    lowConfidence: count((a) => {
      const c = autoConfidence(a);
      return c !== null && c < LOW_CONFIDENCE;
    }),
    // Grades that a re-grade would move, because the rubric or the rung that
    // made them is no longer the one in force. Distinct from "not evaluated":
    // these rows have a verdict, it is just one that meant something else.
    stale: count((a) => isStaleGrade(a, version)),
    // How often your own verdict matched the judge's on the same answer. The
    // number that decides whether the judge is worth running; null until you
    // have re-graded something it graded.
    agreement: (() => {
      const both = answers.filter(
        (a) => a.evalSource === "human" && !!a.evalAuto?.verdict,
      );
      const agreed = both.filter((a) => a.evalAuto.verdict === a.evalVerdict).length;
      return both.length
        ? { n: both.length, agreed, rate: Math.round((agreed / both.length) * 100) }
        : null;
    })(),
    passed,
    failed,
    passRate: passed + failed ? Math.round((passed / (passed + failed)) * 100) : null,
    avgScore: (() => {
      const scores = answers.map((a) => a.evalScore).filter(Number.isFinite);
      return scores.length ? Math.round((scores.reduce((n, v) => n + v, 0) / scores.length) * 10) / 10 : null;
    })(),
    evalTags: tally(answers.flatMap((a) => a.evalTags)),
    degraded: count((a) => a.degraded),
    keywordOnly: count((a) => a.keywordOnly),
    withErrors: count((a) => a.tierErrors.length > 0),
    noSources: count((a) => !a.sourceCount),
    latency: { p50: percentile(0.5), p95: percentile(0.95), max: latencies.at(-1) ?? null },
    stages: {
      embed: average("embedMs"),
      retrieval: average("retrievalMs"),
      generation: average("generationMs"),
    },
    byTier: tally(answers.map((a) => a.tier || "unknown")),
    byModel: tally(answers.map((a) => a.model)),
    feedbackTags: tally(answers.flatMap((a) => a.feedbackTags)),
    sourceTypes: tally(answers.flatMap((a) => a.sources.map((s) => s.entity_type))),
    perDay: tally(exchanges.map((e) => dayKey(e.askedAt))),
  };
}

const CSV_COLUMNS = [
  ["askedAt", (e) => e.askedAt],
  ["sessionId", (e) => e.sessionId],
  ["question", (e) => e.question],
  ["answer", (e) => e.answer.content],
  ["tier", (e) => e.answer.tier],
  ["provider", (e) => e.answer.provider],
  ["model", (e) => e.answer.model],
  ["degraded", (e) => e.answer.degraded],
  ["keywordOnly", (e) => e.answer.keywordOnly],
  ["streamed", (e) => e.answer.streamed],
  ["embedMs", (e) => e.answer.embedMs],
  ["retrievalMs", (e) => e.answer.retrievalMs],
  ["generationMs", (e) => e.answer.generationMs],
  ["totalMs", (e) => e.answer.totalMs],
  ["sourceCount", (e) => e.answer.sourceCount],
  ["sourceTypes", (e) => [...new Set(e.answer.sources.map((s) => s.entity_type))].join("|")],
  ["filterTypes", (e) => (e.answer.types || []).join("|")],
  ["feedback", (e) => e.answer.feedback],
  ["feedbackTags", (e) => e.answer.feedbackTags.join("|")],
  ["feedbackComment", (e) => e.answer.feedbackComment],
  ["tierErrors", (e) => e.answer.tierErrors.join(" | ")],
  ["evalVerdict", (e) => e.answer.evalVerdict],
  ["evalScore", (e) => e.answer.evalScore],
  ["evalTags", (e) => e.answer.evalTags.join("|")],
  ["evalNotes", (e) => e.answer.evalNotes],
  ["evalIdealAnswer", (e) => e.answer.evalIdealAnswer],
  ["evalSource", (e) => e.answer.evalSource],
  ["evalAutoVerdict", (e) => e.answer.evalAuto?.verdict ?? null],
  ["evalAutoScore", (e) => e.answer.evalAuto?.score ?? null],
  ["evalConfidence", (e) => autoConfidence(e.answer)],
  ["evalRubric", (e) => e.answer.evalAuto?.rubric ?? null],
  ["evalAutoModel", (e) => e.answer.evalAuto?.model ?? null],
  ["evalRegrades", (e) => (e.answer.evalAuto?.history || []).length],
  ["evaluatedAt", (e) => e.answer.evaluatedAt],
];

export function toCsv(exchanges) {
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    CSV_COLUMNS.map(([name]) => name).join(","),
    ...exchanges.map((e) => CSV_COLUMNS.map(([, get]) => escape(get(e))).join(",")),
  ].join("\n");
}

/**
 * Evals: one JSON object per line for every exchange a reader rated or commented
 * on, or the admin evaluated — the input for tuning the system prompt and
 * deciding what to ingest next. `ideal_answer` is the reference when present.
 */
export function toEvalsJsonl(exchanges) {
  return exchanges
    .filter((e) => e.answer.feedback !== null || e.answer.feedbackComment || e.answer.evaluatedAt)
    .map((e) => JSON.stringify({
      // Without an id an exported line cannot be joined back to the row it came
      // from, which is exactly what comparing a judge against a hand grade needs.
      message_id: e.answer.id,
      message_uuid: e.answer.messageUuid,
      question: e.question,
      answer: e.answer.content,
      sources: e.answer.sources,
      filter_types: e.answer.types || [],
      tier: e.answer.tier,
      model: e.answer.model,
      keyword_only: e.answer.keywordOnly,
      degraded: e.answer.degraded,
      rating: e.answer.feedback,
      tags: e.answer.feedbackTags,
      comment: e.answer.feedbackComment,
      eval_verdict: e.answer.evalVerdict,
      eval_score: e.answer.evalScore,
      eval_tags: e.answer.evalTags,
      eval_notes: e.answer.evalNotes,
      eval_source: e.answer.evalSource,
      eval_auto: e.answer.evalAuto,
      ideal_answer: e.answer.evalIdealAnswer,
      asked_at: e.askedAt,
    }))
    .join("\n");
}

export function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
