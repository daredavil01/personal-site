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
//   3. a judge credential exists on this deployment,
//   4. every target row is an assistant answer with evaluated_at still null,
//   5. ask_eval_budget() reserved the estimate inside the monthly cap.
//
// Gate 4 is re-checked here against the database rather than trusted from the
// request, which is what makes "a hand-written evaluation is never overwritten"
// an invariant instead of a habit of the admin page.
//
// The browser sends the batch in slices (auto_eval_request_batch). Workers Free
// allows about 10ms of CPU per request — the limit that took edge OG rendering
// off this site — and awaiting fetch is not CPU, but JSON-building fifty rows
// with their extracts is. Slices keep each request's CPU trivial and give the
// admin page an honest progress bar for nothing.

import { DEFAULT_ASK_SETTINGS } from "../../src/data/askConfig";
import {
  buildJudgeState, deterministicFindings, estimateTokens, mapJudgeAnswers,
  STATE_LIMITS, toGatewayQuestions, toNativeQuestions,
} from "../../src/lib/askJudge";
import { json, restHeaders, rpc } from "../../src/lib/askServer";
import { runTiers } from "../../src/lib/askTiers";

const TYPESAFE_URL = "https://api.typesafe.ai";
const JUDGE_TIMEOUT_MS = 10000;
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
 * Which way to reach the judge, and with what.
 *
 * The gateway first by default, because that is the route that runs for nothing:
 * a Vercel team gets AI Gateway credit every thirty days, so the feature never
 * reaches a card. A direct TypeSafe key is the fallback and IS metered — pennies
 * at this volume, but not zero, which is why the route is recorded on every row.
 */
function judgeRoute(env, settings) {
  const gateway = env.AI_GATEWAY_API_KEY
    ? { route: "gateway", key: env.AI_GATEWAY_API_KEY, baseURL: env.AI_GATEWAY_URL || null }
    : null;
  const direct = env.TYPESAFE_API_KEY
    ? { route: "typesafe", key: env.TYPESAFE_API_KEY, url: `${TYPESAFE_URL}/v1/systemone` }
    : null;
  if ((settings.auto_eval_route || "gateway") === "typesafe") return direct || gateway;
  return gateway || direct;
}

/**
 * The same model is named differently on the two routes, so a route change alone
 * would otherwise 404. Forgiving rather than strict: a mismatched id is a typo in
 * a settings field, not a reason to refuse to grade anything.
 */
function modelForRoute(route, model) {
  const id = String(model || "").trim();
  if (route === "gateway") return id.includes("/") ? id : "typesafe-ai/jev";
  return id.includes("/") ? "jev-latest" : id || "jev-latest";
}

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

/**
 * Answers the judge is allowed to grade: assistant rows that nobody has graded.
 * The id list is a suggestion; this is the decision.
 */
async function loadCandidates(env, ids) {
  const list = ids.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  if (!list.length) return [];
  return select(
    env,
    `ask_messages?id=in.(${list.join(",")})&role=eq.assistant&evaluated_at=is.null`
    + "&select=id,conversation_id,turn_index,content,sources,types,source_count",
  );
}

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
 * Every url the facts rosters name. sanitiseAnswer takes these as its extra
 * allow-list in the worker, so the link check has to see them too or it flags
 * every legitimate roster link as invented. Best-effort, and the caller skips the
 * check rather than guessing when this fails.
 */
async function loadRosterUrls(env) {
  try {
    const facts = await rpc(env, "site_facts", {}, { serviceRole: true });
    const urls = Object.values(facts?.roster || {}).flat().map((r) => r?.u).filter(Boolean);
    return { ok: true, urls };
  } catch (_) {
    return { ok: false, urls: [] };
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

function withTimeout(promise, ms, onTimeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (onTimeout) onTimeout();
      reject(new Error(`judge timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/**
 * TypeSafe's own endpoint. A plain POST, `noul` for the yes/no questions, usage
 * as input_tokens / output_tokens.
 */
async function askJudgeDirect({ url, key, model, state }) {
  const controller = new AbortController();
  const res = await withTimeout(fetch(url, {
    method: "POST",
    signal: controller.signal,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, state, questions: toNativeQuestions() }),
  }), JUDGE_TIMEOUT_MS, () => controller.abort());
  if (!res.ok) throw new Error(`judge ${res.status} ${await res.text().catch(() => "")}`);
  const body = await res.json();
  return {
    answers: body?.answers,
    model: body?.model || model,
    inputTokens: Number(body?.usage?.input_tokens || 0),
  };
}

/**
 * The AI Gateway, which is NOT the same API: Vercel's docs are explicit that the
 * evaluation modality "is available through the AI SDK only. It is not supported
 * through the OpenAI-compatible, Anthropic-compatible, or Cohere-compatible
 * endpoints", and it wants AI SDK 7 or later. So this route cannot be a forwarded
 * POST — it goes through experimental_evaluate, with `boolean` questions instead
 * of `noul` and camelCase usage. Imported dynamically so that the direct route,
 * and every refusal above, never pay for loading the SDK.
 */
async function askJudgeGateway({ key, baseURL, model, state }) {
  const [{ experimental_evaluate: evaluate }, { createGateway }] = await Promise.all([
    import("ai"),
    import("@ai-sdk/gateway"),
  ]);
  const gateway = createGateway({ apiKey: key, ...(baseURL ? { baseURL } : {}) });
  const result = await withTimeout(evaluate({
    model: gateway.evaluationModel(model),
    state,
    questions: toGatewayQuestions(),
  }), JUDGE_TIMEOUT_MS);
  return {
    answers: result?.answers,
    model,
    inputTokens: Number(result?.usage?.inputTokens || 0),
  };
}

const askJudge = (credentials, model, state) => (
  credentials.route === "gateway"
    ? askJudgeGateway({ ...credentials, model, state })
    : askJudgeDirect({ ...credentials, model, state })
);

const evalRow = (mapped, model, route) => ({
  eval_verdict: mapped.verdict,
  eval_score: mapped.score,
  eval_tags: mapped.tags,
  eval_notes: mapped.notes,
  eval_source: "auto",
  eval_auto: { ...mapped.auto, model, route },
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

  const settings = await loadSettings(env);
  const credentials = judgeRoute(env, settings);
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
    configured: !!credentials,
    route: credentials?.route || null,
    model: credentials ? modelForRoute(credentials.route, settings.auto_eval_model) : null,
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

async function runBatch(context, settings, credentials, ids) {
  const { env } = context;
  const rows = await loadCandidates(env, ids);
  const skipped = ids.length - rows.length;
  if (!rows.length) return { results: [], skipped, failed: [], graded: 0 };

  const [questions, byEntity, roster] = await Promise.all([
    loadQuestions(env, rows),
    loadExtracts(env, rows),
    loadRosterUrls(env),
  ]);

  const jobs = rows.map((row) => {
    const state = buildJudgeState({
      question: questions.get(`${row.conversation_id}:${row.turn_index - 1}`) || "",
      answer: row.content,
      extracts: extractsFor(row, byEntity),
      scoped: (row.types || []).join(", ") || null,
    });
    return {
      row,
      state,
      findings: deterministicFindings({
        answer: row.content,
        sources: row.sources || [],
        linkable: roster.urls,
        checkLinks: roster.ok,
      }),
    };
  });

  const reserved = jobs.reduce((sum, j) => sum + estimateTokens(j.state), 0);
  const allowance = await budget(env, reserved);
  if (!allowance?.allowed) {
    return { error: "budget", reason: allowance?.reason || "token_cap", budget: allowance };
  }

  const model = modelForRoute(credentials.route, settings.auto_eval_model);
  const settled = await Promise.all(jobs.map(async (job) => {
    try {
      const out = await askJudge(credentials, model, job.state);
      if (!out?.answers) throw new Error("the judge returned no answers");
      const mapped = mapJudgeAnswers(out.answers, {
        minConfidence: settings.auto_eval_min_confidence,
        model: out.model || model,
        findings: job.findings,
      });
      const row = evalRow(mapped, out.model || model, credentials.route);
      const saved = await patchMessage(env, job.row.id, row);
      // No row came back: someone graded it by hand in the last second, and the
      // PATCH's own filter refused. Their verdict stands.
      if (!saved) {
        return { ok: false, id: job.row.id, skipped: "already-evaluated", tokens: out.inputTokens };
      }
      return { ok: true, id: job.row.id, saved, tokens: out.inputTokens };
    } catch (err) {
      return { ok: false, id: job.row.id, error: String(err.message || err) };
    }
  }));

  const done = settled.filter((s) => s.ok);
  const actual = settled.reduce((sum, s) => sum + Number(s.tokens || 0), 0);
  // Swap the reservation for what the judge actually billed. Best-effort: the
  // grading already happened, and a failure here only leaves the month's
  // counter reading high, which errs towards spending less.
  context.waitUntil(
    rpc(env, "ask_eval_record", {
      p_reserved: reserved, p_actual: actual, p_graded: done.length,
    }, { serviceRole: true }).catch(() => {}),
  );

  return {
    results: done.map((s) => savedShape(s.saved)).filter((r) => r.id),
    graded: done.length,
    route: credentials.route,
    model,
    // Rows nobody could grade: already graded when the batch was assembled, plus
    // any that were graded by hand while it ran.
    skipped: skipped + settled.filter((s) => s.skipped).length,
    failed: settled.filter((s) => !s.ok && !s.skipped).map((s) => ({ id: s.id, error: s.error })),
    tokens: actual,
    budget: allowance,
  };
}

async function estimateBatch(env, settings, ids) {
  const rows = await loadCandidates(env, ids);
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
  return {
    count: rows.length,
    skipped: ids.length - rows.length,
    tokens,
    model: settings.auto_eval_model,
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
  const credentials = judgeRoute(env, settings);
  if (!credentials) {
    return json({
      error: "not configured",
      note: "No judge key on this deployment (AI_GATEWAY_API_KEY or TYPESAFE_API_KEY).",
    }, 503);
  }

  if (mode === "estimate") {
    if (ids.length > settings.auto_eval_batch_cap) {
      return json({ error: "too many", note: `At most ${settings.auto_eval_batch_cap} per run.` }, 400);
    }
    try {
      // Reads rows and counts characters. Spends nothing.
      return json(await estimateBatch(env, settings, ids));
    } catch (err) {
      return json({ error: "unavailable", note: String(err.message || err) }, 503);
    }
  }

  if (ids.length > settings.auto_eval_request_batch) {
    return json({
      error: "too many",
      note: `At most ${settings.auto_eval_request_batch} answers per request.`,
    }, 400);
  }

  try {
    const out = await runBatch(context, settings, credentials, ids);
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
