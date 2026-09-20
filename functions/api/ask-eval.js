// Cloudflare Pages Function — automatic evaluation of logged /ask answers.
// Endpoint: POST and GET /api/ask-eval.
//
// Named ask-eval rather than sitting at functions/api/ask/eval.js so that it
// cannot shadow or be shadowed by /api/ask, which Pages routes from ask.js.
//
// Why an endpoint at all, rather than a script or the browser calling Supabase
// directly: the judge's key is a secret, so it can be neither in the bundle nor
// in a repo script the browser can reach — and the monthly spend cap is only
// meaningful if the caller cannot choose whether to count against it.
//
// Nothing here spends a token until ALL of these hold:
//
//   1. the caller proved they are the site owner (is_owner(), with their JWT),
//   2. ask_settings.auto_eval_enabled is true,
//   3. a rung of the judge ladder can actually run here — and a rung billed per
//      token is not one of them unless auto_eval_allow_metered says so,
//   4. every target row is an assistant answer the caller's mode may write to,
//   5. ask_eval_budget() reserved the estimate inside the monthly cap.
//
// Gate 5 is skipped when no usable rung can cost anything, because a token budget
// on a free rung would only stop free work. It applies the moment a rung that
// draws on credit or bills per token becomes usable.
//
// Gate 4 is re-checked here against the database rather than trusted from the
// request, which is what makes "a hand-written evaluation is never overwritten"
// an invariant instead of a habit of the admin page. mode "regrade" widens the
// rows it will look at to every answer, and narrows what it will write instead:
// on a row the owner graded, only eval_auto moves. Both halves are PostgREST
// filters on the PATCH, so Postgres refuses rather than this file remembering to.
//
// The browser sends the batch in slices (auto_eval_request_batch). Workers Free
// allows about 10ms of CPU per request — the limit that took edge OG rendering
// off this site — and awaiting fetch is not CPU, but JSON-building fifty rows
// with their extracts is. Slices keep each request's CPU trivial and give the
// admin page an honest progress bar for nothing.

import { DEFAULT_ASK_SETTINGS } from "../../src/data/askConfig";
import {
  buildJudgeState, citationScore, deterministicFindings, estimateTokens,
  JUDGE_RUBRIC_VERSION, mapJudgeAnswers, STATE_LIMITS, withHistory,
} from "../../src/lib/askJudge";
import { runJudgeTiers, usableRungs } from "../../src/lib/askJudgeTiers";
import { json, restHeaders, rpc } from "../../src/lib/askServer";
import { runTiers } from "../../src/lib/askTiers";

// Extracts are not stored on the log row, so they are re-read from the index at
// grading time. Two chunks per cited item is what the answering worker itself
// allows (selectChunks' perEntity), so this matches what it could have seen.
const CHUNKS_PER_ENTITY = 2;
// Rough per-extract allowance for the pre-flight estimate, which deliberately
// does not read chunk bodies: the dialog needs an order of magnitude, not a
// number, and the reservation that actually guards the cap is exact.
const ESTIMATE_TOKENS_PER_EXTRACT = 320;

async function loadSettings(env) {
  try {
    const res = await fetch(
      `${env.VITE_SUPABASE_URL}/rest/v1/ask_settings?id=eq.1&select=*&limit=1`,
      { headers: restHeaders(env) },
    );
    if (!res.ok) throw new Error(`ask_settings ${res.status}`);
    const rows = await res.json();
    return { ...DEFAULT_ASK_SETTINGS, ...(rows?.[0] || {}) };
  } catch (_) {
    // A Supabase blip must not turn the judge on: the fallback has the flag off.
    return DEFAULT_ASK_SETTINGS;
  }
}

/**
 * The rungs that could grade something on this deployment right now, cheapest
 * first — the ladder minus anything unconfigured, minus anything billed per token
 * unless that has been explicitly allowed.
 */
const rungsFor = (env, settings) => usableRungs(settings.auto_eval_tiers, env, {
  allowMetered: !!settings.auto_eval_allow_metered,
});

/** The caller's bearer token, which is a Supabase session token or nothing. */
function bearer(request) {
  const header = request.headers.get("Authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/**
 * Whether the caller is the site owner, answered by the same SQL that every RLS
 * policy on this database uses. A second definition of "owner" living at the
 * edge is a second thing to get wrong.
 */
async function isOwner(env, request) {
  const token = bearer(request);
  if (!token) return { ok: false };
  try {
    return { ok: (await rpc(env, "is_owner", {}, { token })) === true };
  } catch (_) {
    // Refused either way, but said differently: an unreachable database is not
    // the same answer as "you are not the owner", and grading is the only place
    // that distinction costs someone an afternoon of debugging.
    return { ok: false, unavailable: true };
  }
}

const notOwner = (verdict) => (verdict.unavailable
  ? json({ error: "unavailable", note: "Could not check who is calling." }, 503)
  : json({ error: "forbidden" }, 403));

async function select(env, path) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${path}`, {
    headers: restHeaders(env, { serviceRole: true }),
  });
  if (!res.ok) throw new Error(`select ${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
}

/**
 * The write, with the rule that protects a hand-written grade built into the
 * filter rather than checked beforehand.
 *
 * `guard` is appended to the PATCH's own query, so Postgres decides: a row that
 * someone graded by hand between the select above and this write simply does not
 * match, nothing is updated, and the empty response body says so. A client-side
 * `if` could not close that window.
 */
async function patchMessage(env, id, row, guard = "&evaluated_at=is.null") {
  const res = await fetch(
    `${env.VITE_SUPABASE_URL}/rest/v1/ask_messages?id=eq.${encodeURIComponent(id)}${guard}`,
    {
      method: "PATCH",
      headers: { ...restHeaders(env, { serviceRole: true }), Prefer: "return=representation" },
      body: JSON.stringify(row),
    },
  );
  if (!res.ok) throw new Error(`patch ${res.status} ${await res.text().catch(() => "")}`);
  const rows = await res.json();
  return rows?.[0] || null;
}

const orPairs = (pairs) => `(${pairs.map(
  ([type, id]) => `and(entity_type.eq.${type},entity_id.eq.${id})`,
).join(",")})`;

const CANDIDATE_COLUMNS = "&select=id,conversation_id,turn_index,content,sources,types,"
  + "source_count,eval_source,evaluated_at,eval_auto";

/**
 * Answers the judge is allowed to grade. The id list is a suggestion; this is
 * the decision.
 *
 * Two rules, not one. A grading run takes only rows nobody has graded, which is
 * what has always made "a hand grade is never overwritten" an invariant rather
 * than a habit of the admin page. A re-grading run takes every answer — but what
 * it may WRITE still differs by row, and that is decided at the PATCH below,
 * where Postgres enforces it, rather than here.
 */
async function loadCandidates(env, ids, { regrade = false } = {}) {
  const list = ids.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  if (!list.length) return [];
  const ungraded = regrade ? "" : "&evaluated_at=is.null";
  return select(
    env,
    `ask_messages?id=in.(${list.join(",")})&role=eq.assistant${ungraded}${CANDIDATE_COLUMNS}`,
  );
}

/** A row the owner graded themselves, whose verdict is not the judge's to move. */
const isHandGraded = (row) => !!row.evaluated_at && row.eval_source !== "auto";

// The two writes a re-grade may make, as PostgREST filters so that the database
// decides and not this file.
//
// A hand-graded row gets its eval_auto refreshed and NOTHING else: no verdict, no
// score, no tags, no notes, no evaluated_at. That is what lets the judge be
// measured against the owner on rows the owner has already ruled on — the
// agreement number is unobtainable any other way — without the measurement
// changing what it measures.
const AUTO_GUARD = `&or=${encodeURIComponent("(eval_source.eq.auto,evaluated_at.is.null)")}`;
const HUMAN_GUARD = "&evaluated_at=not.is.null"
  + `&or=${encodeURIComponent("(eval_source.is.null,eval_source.neq.auto)")}`;

/** The question each answer was answering: the row before it in the same chat. */
async function loadQuestions(env, rows) {
  if (!rows.length) return new Map();
  const or = `(${rows.map(
    (r) => `and(conversation_id.eq.${r.conversation_id},turn_index.eq.${r.turn_index - 1})`,
  ).join(",")})`;
  const found = await select(
    env,
    `ask_messages?role=eq.user&select=conversation_id,turn_index,content&or=${encodeURIComponent(or)}`,
  );
  const map = new Map();
  (found || []).forEach((q) => map.set(`${q.conversation_id}:${q.turn_index}`, q.content));
  return map;
}

/**
 * The text behind the cards. ask_log stores source metadata only, so the body
 * the answering model saw is not in the log and has to be read back from the
 * index. Re-indexing may have moved it since; eval_auto records the model and
 * the date, so a stale verdict is at least identifiable as one.
 */
async function loadExtracts(env, rows) {
  const pairs = new Map();
  rows.forEach((r) => {
    (r.sources || []).forEach((s) => {
      if (s?.entity_type && Number.isInteger(Number(s.entity_id))) {
        pairs.set(`${s.entity_type}:${s.entity_id}`, [s.entity_type, Number(s.entity_id)]);
      }
    });
  });
  if (!pairs.size) return new Map();
  const found = await select(
    env,
    `content_chunks?select=entity_type,entity_id,chunk_index,title,body&or=${
      encodeURIComponent(orPairs([...pairs.values()]))
    }&order=entity_type,entity_id,chunk_index`,
  );
  const byEntity = new Map();
  (found || []).forEach((c) => {
    const key = `${c.entity_type}:${c.entity_id}`;
    const list = byEntity.get(key) || [];
    if (list.length < CHUNKS_PER_ENTITY) list.push(c);
    byEntity.set(key, list);
  });
  return byEntity;
}

/**
 * site_facts(), which this endpoint needs twice over.
 *
 * Its roster urls are sanitiseAnswer's extra allow-list in the worker, so the
 * link check has to see them too or it flags every legitimate roster link as
 * invented. And since r2 its counts and rosters go into the judge's state, which
 * is what lets a refusal be weighed against what the archive actually holds.
 *
 * Best-effort, and the caller degrades rather than guesses when it fails: the
 * link check is skipped, and `answerable` stops counting as evidence.
 */
async function loadFacts(env) {
  try {
    const facts = await rpc(env, "site_facts", {}, { serviceRole: true });
    const urls = Object.values(facts?.roster || {}).flat().map((r) => r?.u).filter(Boolean);
    return { ok: true, urls, facts };
  } catch (_) {
    return { ok: false, urls: [], facts: null };
  }
}

function extractsFor(row, byEntity) {
  const out = [];
  (row.sources || []).forEach((s) => {
    (byEntity.get(`${s?.entity_type}:${s?.entity_id}`) || []).forEach((c) => {
      out.push({ type: c.entity_type, title: c.title || s?.title || "", text: c.body || "" });
    });
  });
  return out;
}

/**
 * The machine's record, carrying whatever it supersedes.
 *
 * `rubric` and `model` on it are not decoration: isStaleGrade reads exactly
 * those two to decide a stored grade was made by something other than what would
 * grade it now, which is what the re-grade button is pointed at.
 */
const autoRecord = (mapped, judged, previous) => withHistory({
  ...mapped.auto,
  // Which rung graded it, and whether its probabilities are the calibrated
  // kind. Without this a Gemini guess and a Jev measurement look identical.
  tier: judged.tier,
  provider: judged.provider,
  model: judged.model,
  cost: judged.cost,
  calibrated: !!judged.calibrated,
}, previous);

const evalRow = (mapped, judged, previous) => ({
  eval_verdict: mapped.verdict,
  eval_score: mapped.score,
  eval_tags: mapped.tags,
  eval_notes: mapped.notes,
  eval_source: "auto",
  eval_auto: autoRecord(mapped, judged, previous),
  evaluated_at: new Date().toISOString(),
  // eval_ideal_answer is deliberately untouched: it is the owner's reference
  // text, and a model with no prose to offer has nothing to put in it.
});

const savedShape = (r) => ({
  id: r.id,
  evalVerdict: r.eval_verdict || null,
  evalScore: r.eval_score ?? null,
  evalTags: r.eval_tags || [],
  evalNotes: r.eval_notes || null,
  evalIdealAnswer: r.eval_ideal_answer || null,
  evalSource: r.eval_source || null,
  evalAuto: r.eval_auto || {},
  evaluatedAt: r.evaluated_at || null,
});

/**
 * Why a batch came back empty.
 *
 * Worth a second query, because the two causes look identical from the outside
 * and lead opposite ways: rows nobody can read return `200 []` under RLS exactly
 * as rows that are simply all graded do, and "nothing here is ungraded" is a
 * badly wrong thing to say when the truth is that the log is unreadable.
 */
async function diagnoseEmpty(env, ids, { regrade = false } = {}) {
  const list = ids.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  if (!list.length) return { reason: "no-ids" };
  try {
    const seen = await select(
      env,
      `ask_messages?id=in.(${list.join(",")})&select=id,role,evaluated_at`,
    );
    if (!seen.length) return { reason: "unreadable" };
    if (!regrade && seen.every((r) => r.evaluated_at)) return { reason: "already-evaluated" };
    if (!seen.some((r) => r.role === "assistant")) return { reason: "not-answers" };
    return { reason: "unknown" };
  } catch (err) {
    return { reason: "unreadable", detail: String(err.message || err) };
  }
}

const EMPTY_NOTES = {
  unreadable: "The judge cannot read the conversation log. This deployment is missing "
    + "SUPABASE_SERVICE_ROLE_KEY, or migration 0022 has not been applied.",
  "already-evaluated": "Every answer here has already been graded.",
  "not-answers": "Those rows are questions, not answers.",
  "no-ids": "No answers were named.",
  unknown: "No answer in this selection could be graded.",
};

async function budget(env, estimate) {
  // Fails closed exactly as /api/ask does when ask_quota is unreachable: an
  // uncapped spender is worse than a button that does not work.
  try {
    return await rpc(env, "ask_eval_budget", { p_estimate: estimate }, { serviceRole: true });
  } catch (_) {
    return { allowed: false, reason: "unavailable" };
  }
}

// ---------------------------------------------------------------------------
// GET — what the admin page needs to decide whether to show the button.
// ---------------------------------------------------------------------------

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.VITE_SUPABASE_URL) return json({ error: "not configured" }, 503);
  const owner = await isOwner(env, request);
  if (!owner.ok) return notOwner(owner);

  // Said plainly rather than failing as a wrong answer: without the service role
  // key every read below falls back to the anon key, RLS returns an empty list,
  // and an unreadable log is indistinguishable from a fully graded one.
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({
      error: "not configured",
      note: "The judge needs SUPABASE_SERVICE_ROLE_KEY on this deployment to read the log.",
    }, 503);
  }

  const settings = await loadSettings(env);
  const rungs = rungsFor(env, settings);
  let used = 0;
  try {
    const rows = await select(
      env,
      "ask_eval_usage?select=input_tokens,graded&order=month.desc&limit=1",
    );
    used = Number(rows?.[0]?.input_tokens || 0);
  } catch (_) {
    used = 0;
  }
  const cap = settings.auto_eval_monthly_token_cap;
  return json({
    enabled: !!settings.auto_eval_enabled,
    configured: rungs.length > 0,
    // Every rung the admin page can show, so a misconfigured ladder is visible
    // there instead of only in a failed run.
    rungs: rungs.map(({ tier, status }) => ({
      name: tier.name || tier.provider,
      provider: tier.provider,
      model: tier.model,
      cost: status.cost,
    })),
    allowMetered: !!settings.auto_eval_allow_metered,
    // The two halves of "was this graded by what would grade it now". The admin
    // page needs both to count stale rows without asking the server about each
    // one: a stored grade naming an older rubric OR a different rung is out of
    // date, and after a run with no Jev key configured every row is the second
    // kind without the rubric having moved at all.
    rubric: JUDGE_RUBRIC_VERSION,
    judgeModel: rungs[0]?.tier?.model || null,
    batchCap: settings.auto_eval_batch_cap,
    requestBatch: settings.auto_eval_request_batch,
    minConfidence: settings.auto_eval_min_confidence,
    explainEnabled: !!settings.auto_eval_explain_enabled,
    budget: { cap, used, remaining: Math.max(0, cap - used) },
  });
}

// ---------------------------------------------------------------------------
// POST — estimate, run, explain.
// ---------------------------------------------------------------------------

async function runBatch(context, settings, ids, { regrade = false } = {}) {
  const { env } = context;
  const rows = await loadCandidates(env, ids, { regrade });
  const skipped = ids.length - rows.length;
  if (!rows.length) {
    const { reason, detail } = await diagnoseEmpty(env, ids, { regrade });
    return {
      results: [], skipped, failed: [], graded: 0, reason, note: EMPTY_NOTES[reason], detail,
    };
  }

  const [questions, byEntity, facts] = await Promise.all([
    loadQuestions(env, rows),
    loadExtracts(env, rows),
    loadFacts(env),
  ]);

  const jobs = rows.map((row) => {
    const extracts = extractsFor(row, byEntity);
    const state = buildJudgeState({
      question: questions.get(`${row.conversation_id}:${row.turn_index - 1}`) || "",
      answer: row.content,
      extracts,
      scoped: (row.types || []).join(", ") || null,
      facts: facts.facts,
    });
    return {
      row,
      state,
      findings: deterministicFindings({
        answer: row.content,
        sources: row.sources || [],
        linkable: facts.urls,
        checkLinks: facts.ok,
      }),
      // Computed, never asked, and counted against the source cards the reader
      // saw — the numbering the answer itself uses.
      citations: citationScore({ answer: row.content, count: (row.sources || []).length }),
    };
  });

  // Only reserve against the cap if something here could actually be charged for.
  // With a free-only ladder there is nothing to ration, and a cap would just stop
  // grading that costs nothing.
  const spends = rungsFor(env, settings).some(({ status }) => status.cost !== "free");
  const reserved = spends ? jobs.reduce((sum, j) => sum + estimateTokens(j.state), 0) : 0;
  const allowance = spends
    ? await budget(env, reserved)
    : { allowed: true, free: true };
  if (!allowance?.allowed) {
    return { error: "budget", reason: allowance?.reason || "token_cap", budget: allowance };
  }

  const settled = await Promise.all(jobs.map(async (job) => {
    try {
      const out = await runJudgeTiers({
        tiers: settings.auto_eval_tiers,
        state: job.state,
        env,
        allowMetered: !!settings.auto_eval_allow_metered,
      });
      if (!out?.answers) {
        throw new Error(out?.errors?.join("; ") || "no judge rung answered");
      }
      const mapped = mapJudgeAnswers(out.answers, {
        minConfidence: settings.auto_eval_min_confidence,
        model: out.model,
        findings: job.findings,
        citations: job.citations,
        // Turns on the ceiling over a self-reported confidence and the margin
        // that stands in for it. A language model's confidence is not calibrated
        // the way the decision model's is, and the review threshold was chosen on
        // the latter.
        calibrated: !!out.calibrated,
        // Without site_facts() there is no archive summary in the state, so
        // `answerable` is an answer to a question the judge was never shown.
        hasArchive: facts.ok,
        // Said on the row too, rather than letting the two look alike.
        extraTags: out.calibrated ? [] : ["judge-fallback"],
      });
      const previous = job.row.eval_auto || null;
      // The owner's verdict is never the judge's to move, so on a row they graded
      // only eval_auto is written — and the filter, not this branch, is what
      // enforces it.
      const handGraded = isHandGraded(job.row);
      const saved = handGraded
        ? await patchMessage(
          env,
          job.row.id,
          { eval_auto: autoRecord(mapped, out, previous) },
          HUMAN_GUARD,
        )
        : await patchMessage(
          env,
          job.row.id,
          evalRow(mapped, out, previous),
          regrade ? AUTO_GUARD : "&evaluated_at=is.null",
        );
      // No row came back: someone graded it by hand in the last second, and the
      // PATCH's own filter refused. Their verdict stands.
      if (!saved) {
        return { ok: false, id: job.row.id, skipped: "already-evaluated", tokens: out.inputTokens };
      }
      return {
        ok: true, id: job.row.id, saved, tokens: out.inputTokens, autoOnly: handGraded,
      };
    } catch (err) {
      return { ok: false, id: job.row.id, error: String(err.message || err) };
    }
  }));

  const done = settled.filter((s) => s.ok);
  const actual = settled.reduce((sum, s) => sum + Number(s.tokens || 0), 0);
  // Swap the reservation for what the judge actually billed. Best-effort: the
  // grading already happened, and a failure here only leaves the month's
  // counter reading high, which errs towards spending less.
  if (spends || done.length) {
    context.waitUntil(
      rpc(env, "ask_eval_record", {
        p_reserved: reserved, p_actual: spends ? actual : 0, p_graded: done.length,
      }, { serviceRole: true }).catch(() => {}),
    );
  }

  return {
    results: done.map((s) => savedShape(s.saved)).filter((r) => r.id),
    graded: done.length,
    // Hand-graded rows the judge measured itself against without touching their
    // verdict. Counted apart so a re-grade run cannot read as having overwritten
    // anything of the owner's.
    measuredOnly: done.filter((s) => s.autoOnly).length,
    // Rows nobody could grade: already graded when the batch was assembled, plus
    // any that were graded by hand while it ran.
    skipped: skipped + settled.filter((s) => s.skipped).length,
    failed: settled.filter((s) => !s.ok && !s.skipped).map((s) => ({ id: s.id, error: s.error })),
    tokens: actual,
    budget: allowance,
  };
}

async function estimateBatch(env, settings, ids, { regrade = false } = {}) {
  const rows = await loadCandidates(env, ids, { regrade });
  const questionChars = settings.max_message_chars || 500;
  const tokens = rows.reduce((sum, row) => {
    // The answer's real length, plus the question at its worst case — the
    // extracts are not read here, so they get a flat allowance each. An upper
    // bound, said as "at most" in the dialog rather than dressed up as a figure.
    const chars = String(row.content || "").length + questionChars;
    const extracts = Math.min(Number(row.source_count || 0), STATE_LIMITS.extracts)
      * CHUNKS_PER_ENTITY;
    return sum + Math.ceil(chars / 4) + extracts * ESTIMATE_TOKENS_PER_EXTRACT;
  }, 0);
  if (!rows.length) {
    const { reason, detail } = await diagnoseEmpty(env, ids, { regrade });
    return { count: 0, skipped: ids.length, tokens: 0, reason, note: EMPTY_NOTES[reason], detail };
  }
  return {
    count: rows.length,
    skipped: ids.length - rows.length,
    tokens,
    handGraded: rows.filter(isHandGraded).length,
  };
}

/**
 * The reason a low-confidence verdict got there, which the judge cannot give:
 * it returns probabilities, not prose. This is the only part of the feature that
 * calls a language model, and it reuses the ladder /ask already answers on — the
 * free Gemini rung first — so it adds no key and no cost of its own.
 */
async function explainBatch(context, settings, ids) {
  const { env } = context;
  const list = ids.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  if (!list.length) return { results: [], explained: 0, failed: [] };
  const rows = await select(
    env,
    `ask_messages?id=in.(${list.join(",")})&eval_source=eq.auto`
    + "&select=id,conversation_id,turn_index,content,sources,eval_notes,eval_tags,eval_auto",
  );
  if (!rows.length) return { results: [], explained: 0, failed: [], skipped: ids.length };

  const [questions, byEntity] = await Promise.all([
    loadQuestions(env, rows),
    loadExtracts(env, rows),
  ]);

  const system = "You are reviewing an automated evaluation of one answer from a personal "
    + "archive's question-answering feature. A decision model has already graded it and "
    + "returned probabilities but no reasoning. In at most 60 words, say what is actually "
    + "wrong with the answer given the extracts, or say it looks correct. Be specific and "
    + "concrete. Do not restate the numbers and do not suggest a rewrite.";

  const settled = await Promise.all(rows.map(async (row) => {
    try {
      const extracts = extractsFor(row, byEntity)
        .map((e, i) => `<<<extract ${i + 1} | ${e.type} | ${e.title}>>>\n${e.text.slice(0, 1200)}`)
        .join("\n\n");
      const text = [
        `QUESTION: ${questions.get(`${row.conversation_id}:${row.turn_index - 1}`) || "(missing)"}`,
        `ANSWER: ${row.content}`,
        `EXTRACTS:\n${extracts || "(none retrieved)"}`,
        `JUDGE: ${row.eval_notes || ""}`,
      ].join("\n\n");
      const out = await runTiers({
        tiers: settings.tiers,
        system,
        user: [{ role: "user", parts: [{ text }] }],
        env,
      });
      if (!out?.answer) throw new Error(out?.errors?.join("; ") || "no tier answered");
      const why = String(out.answer).trim().slice(0, 1200);
      // Appended, never replacing: the judge's line is the machine record.
      const base = (row.eval_notes || "").split("\n\nWhy: ")[0];
      const tags = [...new Set([...(row.eval_tags || []), "explained"])];
      // eval_source=eq.auto in the filter, for the same reason the grading write
      // carries evaluated_at=is.null: if the owner replaced this grade with their
      // own while the batch ran, nothing is appended to their note.
      const notes = `${base}\n\nWhy: ${why}`.slice(0, 4000);
      const guard = "&eval_source=eq.auto";
      const saved = await patchMessage(env, row.id, { eval_notes: notes, eval_tags: tags }, guard);
      if (!saved) return { ok: false, id: row.id, skipped: "graded-by-hand" };
      return { ok: true, id: row.id, saved };
    } catch (err) {
      return { ok: false, id: row.id, error: String(err.message || err) };
    }
  }));

  const done = settled.filter((s) => s.ok);
  return {
    results: done.map((s) => savedShape(s.saved)).filter((r) => r.id),
    explained: done.length,
    skipped: (ids.length - rows.length) + settled.filter((s) => s.skipped).length,
    failed: settled.filter((s) => !s.ok && !s.skipped).map((s) => ({ id: s.id, error: s.error })),
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.VITE_SUPABASE_URL) return json({ error: "not configured" }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ error: "bad request" }, 400);
  }

  // The security boundary, checked before anything that could read the log or
  // spend a token.
  const owner = await isOwner(env, request);
  if (!owner.ok) return notOwner(owner);

  // Said plainly rather than failing as a wrong answer: without the service role
  // key every read below falls back to the anon key, RLS returns an empty list,
  // and an unreadable log is indistinguishable from a fully graded one.
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({
      error: "not configured",
      note: "The judge needs SUPABASE_SERVICE_ROLE_KEY on this deployment to read the log.",
    }, 503);
  }

  const settings = await loadSettings(env);
  if (!settings.auto_eval_enabled) {
    return json({
      error: "disabled",
      note: "Automatic evaluation is switched off in /admin/ask/settings.",
    }, 503);
  }

  const ids = Array.isArray(payload?.messageIds) ? payload.messageIds : [];
  if (!ids.length) return json({ error: "bad request", note: "No answers named." }, 400);
  const mode = payload?.mode || "run";
  // A re-grade reads rows a plain run would refuse, so it is a mode of its own
  // rather than a flag on one — nothing can reach the wider row set by accident.
  const regrade = mode === "regrade";

  if (mode === "explain") {
    if (!settings.auto_eval_explain_enabled) {
      return json({
        error: "disabled",
        note: "Explaining low-confidence verdicts is switched off in /admin/ask/settings.",
      }, 503);
    }
    if (ids.length > settings.auto_eval_request_batch) {
      return json({ error: "too many", note: `At most ${settings.auto_eval_request_batch} at a time.` }, 400);
    }
    try {
      return json(await explainBatch(context, settings, ids));
    } catch (err) {
      return json({ error: "unavailable", note: String(err.message || err) }, 503);
    }
  }

  // Said plainly rather than failing as a generic error: with no judge key this
  // endpoint cannot grade anything, and retrying will not help.
  // Not "is there a key" any more: is there a rung that can run at all, once the
  // unconfigured and the metered ones are taken out.
  const rungs = rungsFor(env, settings);
  if (!rungs.length) {
    return json({
      error: "not configured",
      note: settings.auto_eval_allow_metered
        ? "No judge rung is usable: check the ladder in /admin/ask/settings and its keys."
        : "No free judge rung is usable. Gemini needs GEMINI_API_KEY, Workers AI needs the "
          + "AI binding, and the metered rung is off because spending is not allowed.",
    }, 503);
  }

  if (mode === "estimate") {
    if (ids.length > settings.auto_eval_batch_cap) {
      return json({ error: "too many", note: `At most ${settings.auto_eval_batch_cap} per run.` }, 400);
    }
    try {
      // Reads rows and counts characters. Spends nothing. The browser sums
      // several of these for a re-grade, which is why the cap here is per call
      // and not per press.
      return json({
        ...await estimateBatch(env, settings, ids, { regrade: !!payload?.regrade }),
        rungs: rungs.length,
      });
    } catch (err) {
      return json({ error: "unavailable", note: String(err.message || err) }, 503);
    }
  }

  if (mode !== "run" && !regrade) {
    return json({ error: "bad request", note: `Unknown mode: ${mode}.` }, 400);
  }

  if (ids.length > settings.auto_eval_request_batch) {
    return json({
      error: "too many",
      note: `At most ${settings.auto_eval_request_batch} answers per request.`,
    }, 400);
  }

  try {
    const out = await runBatch(context, settings, ids, { regrade });
    if (out.error === "budget") {
      const unreachable = out.reason === "unavailable";
      return json({
        error: unreachable ? "unavailable" : "budget",
        reason: out.reason,
        note: unreachable
          ? "Could not reach the spend counter, so nothing was graded."
          : "This month's judge token budget is used up.",
        budget: out.budget,
      }, unreachable ? 503 : 429);
    }
    return json(out);
  } catch (err) {
    return json({ error: "unavailable", note: String(err.message || err) }, 503);
  }
}
