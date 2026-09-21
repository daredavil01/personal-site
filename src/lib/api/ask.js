// Client for the /api/ask Pages Function.
//
// The endpoint is /api/ask, not /ask: Pages Functions take precedence over the
// SPA's static routes, so a function at /ask would shadow the /ask PAGE and
// serve JSON to anyone who opened it in a browser.
//
// Not a createResource — there is no table behind it. The worker holds the API
// keys, enforces the quota and does the retrieval; the browser only asks.

import { supabase } from "../supabaseClient";

const ENDPOINT = "/api/ask";
const TRANSCRIBE_ENDPOINT = "/api/transcribe";
const SESSION_KEY = "ask.sessionId";

// Stable per-browser id so the admin log can group a back-and-forth into one
// conversation. It identifies a session, not a person — nothing else is stored
// against it, and a cleared browser is a new session.
export function sessionId() {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = (
      window.crypto?.randomUUID?.() || `s${Date.now()}${Math.random()}`
    )
      .replace(/[^a-zA-Z0-9-]/g, "")
      .slice(0, 64);
    window.localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch (_) {
    // Private mode, or storage blocked. The exchange is still logged, just not
    // grouped with the rest of the session.
    return "";
  }
}

export class AskError extends Error {
  constructor(message, { status, reason } = {}) {
    super(message);
    this.name = "AskError";
    this.status = status;
    this.reason = reason;
  }
}

// A generic "something went wrong" hides the two failures that actually happen
// here, and both have a specific fix. Name them.
function errorFor(res, body) {
  if (body?.note || body?.error) {
    return new AskError(body.note || body.error, {
      status: res.status,
      reason: body.reason || body.error,
    });
  }
  // Cloudflare Access guards preview deployments: the endpoint answers with a
  // cross-origin redirect to its login, which fetch cannot follow, so the
  // response arrives opaque or as HTML rather than JSON.
  if (res.redirected || res.type === "opaqueredirect" || res.status === 302) {
    return new AskError(
      "This preview deployment is behind Cloudflare Access, so the chat endpoint is not reachable from the browser. The live site works normally.",
      { status: res.status, reason: "access" },
    );
  }
  return new AskError(
    `The chat endpoint returned ${res.status}. If this is a preview deployment, it is probably behind Cloudflare Access.`,
    { status: res.status },
  );
}

/**
 * Rates one answer. Only this browser's session can rate it (ask_feedback checks
 * the session id against the log). Calling again replaces the rating; a null
 * rating with no tags or comment clears it.
 *
 * Resolves true once stored. The worker writes the log row just after the answer
 * is sent, so a very quick click can arrive first — retried once after 2s.
 */
export async function sendAskFeedback({
  messageId, rating = null, tags = [], comment = "",
}) {
  const args = {
    p_message_uuid: messageId,
    p_session: sessionId(),
    p_rating: rating,
    p_tags: tags,
    p_comment: comment || null,
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase.rpc("ask_feedback", args);
    if (error) throw new AskError(error.message);
    if (data) return true;
    // eslint-disable-next-line no-await-in-loop
    if (attempt === 0) await new Promise((resolve) => { setTimeout(resolve, 2000); });
  }
  return false;
}

/** Limits, suggested questions and the on/off switch, for the empty state. */
export async function getAskInfo() {
  const res = await fetch(ENDPOINT, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new AskError("Ask is unavailable", { status: res.status });
  return res.json();
}

/**
 * `history` is [{ role: "user" | "assistant", content }] — the worker trims it
 * to the configured number of turns, so sending the whole thread is fine.
 */
export async function askQuestion({
  message,
  history = [],
  turnstileToken,
} = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history,
      turnstileToken,
      sessionId: sessionId(),
    }),
  });

  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    body = null;
  }

  if (!res.ok) throw errorFor(res, body);
  return body;
}

/**
 * Streaming ask. Sources arrive first (retrieval finishes about a second in),
 * then the answer in chunks, so the page is never a blank spinner.
 *
 * `signal` is an AbortSignal — aborting it is the Stop button. Resolves with
 * the final `done` payload, or with what was received when stopped.
 */
export async function askQuestionStream({
  message,
  history = [],
  types = [],
  spokenLanguage = null,
  turnstileToken,
  signal,
  onSources = () => {},
  onDelta = () => {},
} = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message,
      history,
      types,
      // Whisper's detected language when the question was spoken. Better
      // evidence than the script it is typed in, which reads romanised Marathi
      // as English and answers it in English.
      spokenLanguage,
      turnstileToken,
      stream: true,
      sessionId: sessionId(),
    }),
  });

  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch (_) {
      body = null;
    }
    throw errorFor(res, body);
  }
  if (!res.body) throw new AskError("Streaming is not supported here.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = {};

  const handle = (block) => {
    const eventLine = block.split("\n").find((l) => l.startsWith("event:"));
    const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
    if (!eventLine || !dataLine) return;
    const event = eventLine.slice(6).trim();
    let data;
    try {
      data = JSON.parse(dataLine.slice(5).trim());
    } catch (_) {
      return;
    }
    if (event === "sources") onSources(data);
    else if (event === "delta") onDelta(data.text || "");
    else if (event === "done") result = data;
  };

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";
    blocks.forEach(handle);
  }
  if (buffer.trim()) handle(buffer);
  return result;
}

/**
 * Speech to text for the composer.
 *
 * The audio goes to /api/transcribe and nowhere else, is never stored, and the
 * transcript comes straight back to the question box — editable, and never
 * sent as a question by itself.
 */
export async function transcribeAudio(blob, turnstileToken) {
  const res = await fetch(TRANSCRIBE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
      ...(turnstileToken ? { "X-Turnstile-Token": turnstileToken } : {}),
    },
    body: blob,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.note || body.error || `transcribe ${res.status}`);
  return { text: String(body.text || ""), language: body.language || null };
}
