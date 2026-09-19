// The judge's model ladder: who grades an answer, and in what order.
//
// Same shape and same reasoning as the answer ladder in askTiers.js — ordered
// rows in ask_settings, tried one at a time, each with its own timeout — but for
// a different reason. The answer ladder exists so a visitor always gets an
// answer. This one exists so grading can be free.
//
// Only one rung is a purpose-built decision model. The rest are language models
// answering the same rubric as JSON, which is worse and is marked as such:
//
//   jev         typed decisions, calibrated probabilities, no prose. Metered
//               per token, unless the gateway's free monthly credit covers it.
//   gemini      free tier, ~15 RPM and ~1,000-1,500 requests a day. Already
//               keyed on this deployment, because /ask answers on it.
//   workers-ai  free allowance, 10,000 neurons a day, no key at all. The same
//               pool the query embeddings draw from, so it goes last.
//
// A rung that costs money is skipped entirely unless allowMetered says otherwise,
// which is what makes "this cannot bill me" a property of the code rather than a
// promise. The default is off.
//
// In src/ rather than functions/ for the usual reason: Pages routes every file
// under functions/.

import {
  buildJudgePrompt, JUDGE_JSON_SYSTEM, parseJudgeJson, toGatewayQuestions, toNativeQuestions,
} from "./askJudge";

const TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone";

/** Whether a rung can be reached on this deployment, and what it would cost. */
export function rungStatus(tier, env) {
  const provider = tier?.provider;
  if (provider === "jev") {
    const gateway = (tier.route || "gateway") === "gateway";
    if (gateway) {
      return env.AI_GATEWAY_API_KEY
        ? { ready: true, cost: "credit" }
        : { ready: false, cost: "credit", why: "no AI_GATEWAY_API_KEY" };
    }
    return env.TYPESAFE_API_KEY
      ? { ready: true, cost: "metered" }
      : { ready: false, cost: "metered", why: "no TYPESAFE_API_KEY" };
  }
  if (provider === "gemini") {
    return env.GEMINI_API_KEY
      ? { ready: true, cost: "free" }
      : { ready: false, cost: "free", why: "no GEMINI_API_KEY" };
  }
  if (provider === "workers-ai") {
    return env.AI ? { ready: true, cost: "free" } : { ready: false, cost: "free", why: "no AI binding" };
  }
  return { ready: false, cost: "unknown", why: `unknown provider ${provider}` };
}

const PROVIDERS = {
  /**
   * The one rung that is not a language model. Two dialects, because the gateway
   * and TypeSafe's own endpoint are not the same API — see askJudge.js.
   */
  jev: async ({ tier, state, env, signal }) => {
    if ((tier.route || "gateway") === "gateway") {
      // The AI SDK, not a POST: Vercel serves the evaluation modality through the
      // SDK only. Imported here so nothing else pays to load it.
      const [{ experimental_evaluate: evaluate }, { createGateway }] = await Promise.all([
        import("ai"),
        import("@ai-sdk/gateway"),
      ]);
      const gateway = createGateway({
        apiKey: env.AI_GATEWAY_API_KEY,
        ...(env.AI_GATEWAY_URL ? { baseURL: env.AI_GATEWAY_URL } : {}),
      });
      const result = await evaluate({
        model: gateway.evaluationModel(tier.model || "typesafe-ai/jev"),
        state,
        questions: toGatewayQuestions(),
      });
      if (!result?.answers) throw new Error("jev returned no answers");
      return {
        answers: result.answers,
        inputTokens: Number(result.usage?.inputTokens || 0),
        calibrated: true,
      };
    }
    const res = await fetch(TYPESAFE_URL, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: tier.model || "jev-latest",
        state,
        questions: toNativeQuestions(),
      }),
    });
    if (!res.ok) throw new Error(`jev ${res.status}`);
    const body = await res.json();
    if (!body?.answers) throw new Error("jev returned no answers");
    return {
      answers: body.answers,
      inputTokens: Number(body.usage?.input_tokens || 0),
      calibrated: true,
    };
  },

  gemini: async ({ tier, state, env, signal }) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${tier.model}:generateContent`,
      {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: JUDGE_JSON_SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: buildJudgePrompt(state) }] }],
          // Grading is not creative writing, and the reply is a fixed object.
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 400,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
    if (!text) throw new Error("gemini returned no text");
    return {
      answers: parseJudgeJson(text),
      inputTokens: Number(json?.usageMetadata?.promptTokenCount || 0),
      calibrated: false,
    };
  },

  "workers-ai": async ({ tier, state, env }) => {
    const out = await env.AI.run(tier.model, {
      messages: [
        { role: "system", content: JUDGE_JSON_SYSTEM },
        { role: "user", content: buildJudgePrompt(state) },
      ],
      max_tokens: 400,
      temperature: 0,
    });
    const text = (out?.response || "").trim();
    if (!text) throw new Error("workers-ai returned no text");
    return { answers: parseJudgeJson(text), inputTokens: 0, calibrated: false };
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

/** The rungs that could actually run, in order, with the metered ones filtered. */
export function usableRungs(tiers, env, { allowMetered = false } = {}) {
  return (tiers || [])
    .filter((t) => t?.enabled)
    .map((tier) => ({ tier, status: rungStatus(tier, env) }))
    .filter(({ status }) => status.ready && (allowMetered || status.cost !== "metered"));
}

/**
 * Walk the ladder until one rung answers.
 *
 * Sequential, like runTiers and for the same reason: firing every rung at once
 * would spend three quotas to grade one answer. A rung that throws is recorded
 * and the next one tries; when none answers the caller gets the errors, which is
 * the difference between "this answer is unratable" and "the judge is misconfigured".
 */
export async function runJudgeTiers({ tiers, state, env, allowMetered = false }) {
  const rungs = usableRungs(tiers, env, { allowMetered });
  const errors = [];

  for (let i = 0; i < rungs.length; i += 1) {
    const { tier, status } = rungs[i];
    const controller = new AbortController();
    try {
      // eslint-disable-next-line no-await-in-loop
      const out = await withTimeout(
        PROVIDERS[tier.provider]({ tier, state, env, signal: controller.signal }),
        tier.timeout_ms || 12000,
        controller,
      );
      return {
        ...out,
        tier: tier.name || tier.provider,
        provider: tier.provider,
        model: tier.model,
        cost: status.cost,
        errors,
      };
    } catch (err) {
      errors.push(`${tier.name || tier.provider}: ${err.message}`);
    }
  }
  return { answers: null, tier: null, provider: null, errors };
}
