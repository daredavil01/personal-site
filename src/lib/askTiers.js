// The /ask model ladder.
//
// Lives in src/ rather than functions/ because Cloudflare Pages turns every
// file under functions/ into a route, and this is a helper, not an endpoint —
// the same reason functions/_middleware.js imports src/data/pageMeta.js.
// Dependency-free by contract: esbuild bundles it into the worker.
//
// One registry of providers; the ORDER, models, enabled flags and timeouts all
// come from ask_settings.tiers, so the ladder is reordered in /admin, not here.
// Model ids are config, not code — when a provider retires a model, change the
// row, not this file.

const PROVIDERS = {
  // Free tier: ~15 RPM / ~1,000-1,500 requests per day. Best quality of the
  // three, so it goes first by default.
  gemini: async ({ model, system, user, env, signal }) => {
    const key = env.GEMINI_API_KEY;
    if (!key) throw new Error("no GEMINI_API_KEY");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: user,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
        }),
      },
    );
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim();
    if (!text) throw new Error("gemini returned no text");
    return text;
  },

  // Free tier: 10,000 neurons/day, no key, no egress — the same pool the query
  // embeddings draw from, which is why it sits below Gemini by default.
  "workers-ai": async ({ model, system, user, env }) => {
    if (!env.AI) throw new Error("no AI binding");
    const messages = [
      { role: "system", content: system },
      ...user.map((turn) => ({
        role: turn.role === "model" ? "assistant" : "user",
        content: turn.parts.map((p) => p.text).join(""),
      })),
    ];
    const out = await env.AI.run(model, { messages, max_tokens: 1000 });
    const text = (out?.response || "").trim();
    if (!text) throw new Error("workers-ai returned no text");
    return text;
  },
};

function withTimeout(promise, ms, controller) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      if (controller) controller.abort();
      reject(new Error(`timeout after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function runOne(tier, { system, user, env }) {
  const provider = PROVIDERS[tier.provider];
  if (!provider) throw new Error(`unknown provider ${tier.provider}`);
  const controller = new AbortController();
  return withTimeout(
    provider({ model: tier.model, system, user, env, signal: controller.signal }),
    tier.timeout_ms || 8000,
    controller,
  );
}

/**
 * Walks the configured ladder until one tier answers.
 *
 * Returns { tier, answer } on success, or { tier: null, errors } when every
 * tier failed — the caller then serves the retrieved sources on their own,
 * which is a degraded answer rather than an error page.
 *
 * The awaits are deliberately sequential: a fallback ladder that fired every
 * tier at once would burn three free quotas to answer one question.
 */
export async function runTiers({ tiers, system, user, env }) {
  const ladder = (tiers || []).filter((t) => t?.enabled);
  const errors = [];

  for (let i = 0; i < ladder.length; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const answer = await runOne(ladder[i], { system, user, env });
      return { tier: ladder[i].name, answer, errors };
    } catch (err) {
      errors.push(`${ladder[i].name}: ${err.message || err}`);
    }
  }
  return { tier: null, answer: null, errors };
}

export const ASK_PROVIDER_NAMES = Object.keys(PROVIDERS);

// --- streaming ---------------------------------------------------------------
//
// The rules disabled below are the airbnb no-generators / no-await-in-loop
// pair. Both are the point here: an SSE body is an async iterator, and reading
// it is inherently a sequential loop. Rewriting it as array iteration is not
// possible — there is no array, only a socket.
/* eslint-disable no-restricted-syntax, no-await-in-loop */
//
// Same ladder, but yielding text as it arrives. A tier only counts as "working"
// once it produces its first chunk: fail before that and the next tier takes
// over, fail after and we keep what was already shown rather than restarting a
// half-written answer under a different model.

async function* sseLines(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data:")) yield trimmed.slice(5).trim();
    }
  }
}

const STREAMERS = {
  gemini: async function* stream({ model, system, user, env, signal }) {
    const key = env.GEMINI_API_KEY;
    if (!key) throw new Error("no GEMINI_API_KEY");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: user,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
        }),
      },
    );
    if (!res.ok || !res.body) throw new Error(`gemini ${res.status}`);
    for await (const data of sseLines(res.body)) {
      if (data === "[DONE]") return;
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch (_) {
        parsed = null;
      }
      const text = parsed?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("");
      if (text) yield text;
    }
  },

  "workers-ai": async function* stream({ model, system, user, env }) {
    if (!env.AI) throw new Error("no AI binding");
    const messages = [
      { role: "system", content: system },
      ...user.map((turn) => ({
        role: turn.role === "model" ? "assistant" : "user",
        content: turn.parts.map((p) => p.text).join(""),
      })),
    ];
    const body = await env.AI.run(model, { messages, max_tokens: 1000, stream: true });
    for await (const data of sseLines(body)) {
      if (data === "[DONE]") return;
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch (_) {
        parsed = null;
      }
      if (parsed?.response) yield parsed.response;
    }
  },
};

/**
 * Walks the ladder, streaming. Calls `onDelta(text)` for each chunk and returns
 * { tier, text, errors } — tier null when nothing answered, so the caller can
 * fall back to the sources-only reply.
 */
export async function streamTiers({ tiers, system, user, env, onDelta, signal }) {
  const ladder = (tiers || []).filter((t) => t?.enabled);
  const errors = [];

  for (let i = 0; i < ladder.length; i += 1) {
    const tier = ladder[i];
    const streamer = STREAMERS[tier.provider];
    if (!streamer) {
      errors.push(`${tier.name}: unknown provider ${tier.provider}`);
      // eslint-disable-next-line no-continue
      continue;
    }
    let text = "";
    try {
      const iterator = streamer({
        model: tier.model,
        system,
        user,
        env,
        signal,
      });
      // eslint-disable-next-line no-restricted-syntax
      for await (const chunk of iterator) {
        text += chunk;
        onDelta(chunk);
      }
      if (!text.trim()) throw new Error("empty response");
      return { tier: tier.name, text, errors };
    } catch (err) {
      errors.push(`${tier.name}: ${err.message || err}`);
      // Something already reached the reader — do not restart under another
      // model, that would rewrite the answer mid-sentence.
      if (text) return { tier: tier.name, text, errors };
    }
  }
  return { tier: null, text: "", errors };
}
