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
    tiers: Array.isArray(r.tiers) ? r.tiers : [],
    systemPersona: r.system_persona ?? "",
    refusalNote: r.refusal_note ?? "",
    disabledNote: r.disabled_note ?? "",
    quotaNote: r.quota_note ?? "",
    suggestedQuestions: r.suggested_questions ?? [],
    contextDoc: r.context_doc ?? "",
    contextDocUpdatedAt: r.context_doc_updated_at ?? null,
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
    tiers: Array.isArray(v.tiers) ? v.tiers : [],
    system_persona: v.systemPersona ?? "",
    refusal_note: v.refusalNote ?? "",
    disabled_note: v.disabledNote ?? "",
    quota_note: v.quotaNote ?? "",
    suggested_questions: v.suggestedQuestions ?? [],
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
