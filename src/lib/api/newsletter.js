// Newsletter reader feedback. Writes go through /api/newsletter-feedback (the
// edge hashes the IP for the daily cap); counts are read straight from the
// newsletter_feedback_summary RPC, which never returns a reply. The owner reads
// replies under RLS, from /admin.

import { supabase } from "../supabaseClient";

export async function getFeedbackSummary(issueId) {
  const { data, error } = await supabase.rpc("newsletter_feedback_summary", { p_issue: issueId });
  if (error) throw error;
  return data || {};
}

export async function sendFeedback({
  issueId, kind, section, value, message, name, turnstileToken,
}) {
  const res = await fetch("/api/newsletter-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      issueId, kind, section, value, message, name, turnstileToken,
    }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    body = null;
  }
  if (!res.ok) throw new Error(body?.note || "Could not send that — try again later.");
  return body.summary || {};
}

// Owner only (RLS): every reply, newest first.
export async function listReplies(issueId) {
  const { data, error } = await supabase
    .from("newsletter_feedback")
    .select("id, message, name, created_at")
    .eq("issue_id", issueId)
    .eq("kind", "reply")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
