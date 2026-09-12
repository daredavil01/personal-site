import { supabase } from "../supabaseClient";

// The /ask conversation log. Owner-only (RLS) — visitors write it through the
// ask_log() RPC and can never read it back.

export async function getAskStats(days = 30) {
  const { data, error } = await supabase.rpc("ask_message_stats", { p_days: days });
  if (error) throw error;
  return data || {};
}

export async function listAskConversations({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc("ask_conversation_list", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    startedAt: r.started_at,
    lastAt: r.last_at,
    exchanges: r.exchanges,
    firstQuestion: r.first_question,
    tiers: r.tiers || [],
    avgTotalMs: r.avg_total_ms,
    degradedCount: r.degraded_count,
    userAgent: r.user_agent,
  }));
}

function messageFromRow(r) {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    turnIndex: r.turn_index,
    role: r.role,
    content: r.content,
    tier: r.tier,
    provider: r.provider,
    model: r.model,
    degraded: r.degraded,
    keywordOnly: r.keyword_only,
    streamed: r.streamed,
    embedMs: r.embed_ms,
    retrievalMs: r.retrieval_ms,
    generationMs: r.generation_ms,
    totalMs: r.total_ms,
    sourceCount: r.source_count,
    sources: r.sources || [],
    tierErrors: r.tier_errors || [],
    createdAt: r.created_at,
  };
}

export async function getAskMessages(conversationId) {
  const { data, error } = await supabase
    .from("ask_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("turn_index", { ascending: true });
  if (error) throw error;
  return (data || []).map(messageFromRow);
}

/** Every message, newest first — the export feed. Paginated to stay under the
 *  PostgREST row cap, which silently truncates an unbounded select at 1000. */
export async function getAllAskMessages({ pageSize = 1000, max = 20000 } = {}) {
  const rows = [];
  for (let from = 0; from < max; from += pageSize) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("ask_messages")
      .select("*, ask_conversations(session_id, started_at, user_agent)")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows.map((r) => ({
    ...messageFromRow(r),
    sessionId: r.ask_conversations?.session_id || null,
  }));
}

const CSV_COLUMNS = [
  "conversationId", "sessionId", "turnIndex", "role", "content", "tier",
  "provider", "model", "degraded", "keywordOnly", "streamed", "embedMs",
  "retrievalMs", "generationMs", "totalMs", "sourceCount", "createdAt",
];

export function toCsv(messages) {
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    CSV_COLUMNS.join(","),
    ...messages.map((m) => CSV_COLUMNS.map((c) => escape(m[c])).join(",")),
  ].join("\n");
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
