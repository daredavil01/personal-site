// Shared /ask conversations.
//
// Not a createResource: reads go through a token-gated RPC rather than a table
// select. The ask_shares table is owner-only on purpose — an anon select policy
// would let anyone enumerate every conversation ever shared, and "unlisted"
// would mean nothing.

import { supabase } from "../supabaseClient";

const ENDPOINT = "/api/share";

export class ShareError extends Error {
  constructor(message, { status, reason } = {}) {
    super(message);
    this.name = "ShareError";
    this.status = status;
    this.reason = reason;
  }
}

/** Creates a share. Goes through the worker, which hashes the IP for the cap. */
export async function createShare({ turns, types = [], turnstileToken } = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turns, types, turnstileToken }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    body = null;
  }
  if (!res.ok) {
    throw new ShareError(
      body?.note || body?.error || "Could not share this conversation.",
      { status: res.status, reason: body?.error },
    );
  }
  return body;
}

/** Null for an unknown or revoked token — the page says the same thing for both. */
export async function getShare(token) {
  const { data, error } = await supabase.rpc("get_ask_share", { p_token: token });
  if (error) throw error;
  return data || null;
}

/** Fire-and-forget: a failed count must never break the page. */
export function bumpShareView(token) {
  supabase.rpc("bump_ask_share_view", { p_token: token }).then(
    () => {},
    () => {},
  );
}

// --- owner only (RLS) ------------------------------------------------------

function fromRow(r) {
  return {
    id: r.id,
    token: r.token,
    thread: r.thread || [],
    linkable: r.linkable || [],
    title: r.title || "",
    summary: r.summary || "",
    turnCount: r.turn_count ?? 0,
    types: r.types || [],
    hasDownvote: !!r.has_downvote,
    hasRefusal: !!r.has_refusal,
    noSources: !!r.no_sources,
    viewCount: r.view_count ?? 0,
    lastViewedAt: r.last_viewed_at,
    revoked: !!r.revoked,
    ipHash: r.ip_hash,
    userAgent: r.user_agent,
    createdAt: r.created_at,
  };
}

/**
 * Owner listing. A search term goes through the generated tsvector rather than
 * being filtered in the browser: the whole conversation text lives in the row,
 * and shipping every one of them to filter client-side stops scaling long
 * before the GIN index does.
 */
export async function listShares({ search = "" } = {}) {
  let query = supabase.from("ask_shares").select("*");
  const term = search.trim();
  if (term) {
    query = query.textSearch("search_tsv", term, { type: "websearch", config: "simple" });
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

/** Revoking is reversible and keeps the record; deleting is not and does not. */
export async function setShareRevoked(id, revoked) {
  const { error } = await supabase.from("ask_shares").update({ revoked }).eq("id", id);
  if (error) throw error;
}

export async function deleteShare(id) {
  const { error } = await supabase.from("ask_shares").delete().eq("id", id);
  if (error) throw error;
}
