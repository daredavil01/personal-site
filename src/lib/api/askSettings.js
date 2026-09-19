import { supabase } from "../supabaseClient";

// The /ask runtime config: one row, id = 1, same singleton shape as now_meta.
// Not a createResource — there is no list, no tags, and exactly one row.
//
// Everything the Pages Function reads at request time lives here, so a limit or
// a model tier changes without a redeploy. API keys are NOT here; they are
// Cloudflare Pages secrets.

function fromRow(r) {
  if (!r) return null;
  return {
    enabled: !!r.enabled,
    turnstileRequired: !!r.turnstile_required,
    dailyGlobalCap: r.daily_global_cap ?? 300,
    dailyIpCap: r.daily_ip_cap ?? 15,
    maxMessageChars: r.max_message_chars ?? 500,
    maxHistoryTurns: r.max_history_turns ?? 8,
    matchCount: r.match_count ?? 8,
    fullTextWeight: r.full_text_weight ?? 1,
    semanticWeight: r.semantic_weight ?? 1,
    semanticFloor: r.semantic_floor ?? 0.35,
    tiers: Array.isArray(r.tiers) ? r.tiers : [],
    systemPersona: r.system_persona ?? "",
    refusalNote: r.refusal_note ?? "",
    disabledNote: r.disabled_note ?? "",
    quotaNote: r.quota_note ?? "",
    suggestedQuestions: r.suggested_questions ?? [],
    questionPool: Array.isArray(r.question_pool) ? r.question_pool : [],
    contextDoc: r.context_doc ?? "",
    contextDocUpdatedAt: r.context_doc_updated_at ?? null,
    autoEvalEnabled: !!r.auto_eval_enabled,
    autoEvalTiers: Array.isArray(r.auto_eval_tiers) ? r.auto_eval_tiers : [],
    autoEvalAllowMetered: !!r.auto_eval_allow_metered,
    autoEvalBatchCap: r.auto_eval_batch_cap ?? 50,
    autoEvalRequestBatch: r.auto_eval_request_batch ?? 8,
    autoEvalMinConfidence: r.auto_eval_min_confidence ?? 0.7,
    autoEvalMonthlyTokenCap: r.auto_eval_monthly_token_cap ?? 2000000,
    autoEvalExplainEnabled: !!r.auto_eval_explain_enabled,
  };
}

function toRow(v) {
  return {
    id: 1,
    enabled: !!v.enabled,
    turnstile_required: !!v.turnstileRequired,
    daily_global_cap: Number(v.dailyGlobalCap) || 0,
    daily_ip_cap: Number(v.dailyIpCap) || 0,
    max_message_chars: Number(v.maxMessageChars) || 500,
    max_history_turns: Number(v.maxHistoryTurns) || 8,
    match_count: Number(v.matchCount) || 8,
    full_text_weight: Number(v.fullTextWeight) || 0,
    semantic_weight: Number(v.semanticWeight) || 0,
    // 0 is a legitimate value (no floor), so this cannot use `|| default`.
    semantic_floor: Number.isFinite(Number(v.semanticFloor)) ? Number(v.semanticFloor) : 0.35,
    tiers: Array.isArray(v.tiers) ? v.tiers : [],
    system_persona: v.systemPersona ?? "",
    refusal_note: v.refusalNote ?? "",
    disabled_note: v.disabledNote ?? "",
    quota_note: v.quotaNote ?? "",
    suggested_questions: v.suggestedQuestions ?? [],
    // Rows with no question text are half-finished edits, not content. An
    // unset category is kept as "" rather than guessed at: pickQuestions treats
    // uncategorised questions as their own group, which beats filing them under
    // a subject they are not about.
    question_pool: (Array.isArray(v.questionPool) ? v.questionPool : [])
      .filter((row) => row?.q?.trim())
      .map((row) => ({ q: row.q.trim(), c: row.c || "" })),
    auto_eval_enabled: !!v.autoEvalEnabled,
    auto_eval_tiers: Array.isArray(v.autoEvalTiers) ? v.autoEvalTiers : [],
    auto_eval_allow_metered: !!v.autoEvalAllowMetered,
    auto_eval_batch_cap: Number(v.autoEvalBatchCap) || 50,
    auto_eval_request_batch: Number(v.autoEvalRequestBatch) || 8,
    // 0 is a legitimate value (flag nothing for review), so not `|| default`.
    auto_eval_min_confidence: Number.isFinite(Number(v.autoEvalMinConfidence))
      ? Number(v.autoEvalMinConfidence) : 0.7,
    // 0 is legitimate too, and it means "grade nothing" — a second off switch.
    auto_eval_monthly_token_cap: Number.isFinite(Number(v.autoEvalMonthlyTokenCap))
      ? Math.max(0, Math.round(Number(v.autoEvalMonthlyTokenCap))) : 2000000,
    auto_eval_explain_enabled: !!v.autoEvalExplainEnabled,
  };
}

export async function getAskSettings() {
  const { data, error } = await supabase
    .from("ask_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return fromRow(data);
}

export async function updateAskSettings(values) {
  // context_doc is deliberately not written here — `npm run docs:build` owns it.
  const { data, error } = await supabase
    .from("ask_settings")
    .upsert(toRow(values))
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

/**
 * What the judge has spent this month. Owner-only (RLS); the counters themselves
 * are moved by the endpoint's service-role RPCs, never from here.
 */
export async function getAskEvalUsage(months = 3) {
  const since = new Date(Date.now() - months * 31 * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("ask_eval_usage")
    .select("month, input_tokens, graded, runs")
    .gte("month", since)
    .order("month", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    month: r.month,
    inputTokens: Number(r.input_tokens || 0),
    graded: r.graded ?? 0,
    runs: r.runs ?? 0,
  }));
}

// Owner-only (RLS). The '' ip_hash row is the global counter for that day.
export async function getAskUsage(days = 14) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("ask_usage")
    .select("day, ip_hash, count, tier_mix")
    .gte("day", since)
    .order("day", { ascending: false });
  if (error) throw error;

  const byDay = new Map();
  (data || []).forEach((row) => {
    const entry = byDay.get(row.day) || {
      day: row.day, total: 0, visitors: 0, tiers: {},
    };
    if (row.ip_hash === "") {
      entry.total = row.count;
      entry.tiers = row.tier_mix || {};
    } else {
      entry.visitors += 1;
    }
    byDay.set(row.day, entry);
  });
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
}
