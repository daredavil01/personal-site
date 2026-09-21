// Gemini for batch scripts.
//
// There is no second Gemini fetch here on purpose: src/lib/askTiers.js already
// holds the provider registry, and its `gemini` provider reads GEMINI_API_KEY
// off a plain `env` object, so the same ladder /ask answers with works in node.
// The `workers-ai` rungs below it throw "no AI binding" in node and the ladder
// falls through to the next one — correct behaviour, not a bug to branch around.
//
// Order, model ids and timeouts stay config: they come from ask_settings.tiers,
// and DEFAULT_ASK_SETTINGS is the fallback when the table cannot be read.

import { runTiers } from "../../src/lib/askTiers.js";
import { AI_FEATURES, DEFAULT_ASK_SETTINGS, aiFeatureOn } from "../../src/data/askConfig.js";

// Free tier is ~15 requests per minute. 4.5s between calls keeps a long batch
// under that without a token bucket.
// ponytail: fixed sleep, swap for a real limiter if a script ever runs concurrently.
const MIN_GAP_MS = 4500;

let lastCall = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Reads the live ladder, falling back to the compiled-in default. */
export async function loadTiers(supabase) {
  const { data, error } = await supabase
    .from("ask_settings")
    .select("tiers")
    .limit(1)
    .maybeSingle();
  const tiers = !error && Array.isArray(data?.tiers) && data.tiers.length
    ? data.tiers
    : DEFAULT_ASK_SETTINGS.tiers;
  return tiers;
}

/**
 * The ladder, but only if this feature is switched on at /admin/ask/settings.
 *
 * A script is the same spend as the endpoint and answers to the same switch —
 * otherwise turning a feature off would stop the button and leave the nightly
 * batch running. Exits rather than throws: this is the top of a script, and a
 * stack trace would suggest something broke.
 */
export async function tiersForFeature(supabase, key) {
  if (!AI_FEATURES.some((f) => f.key === key)) {
    throw new Error(`unknown AI feature "${key}" — add it to AI_FEATURES in src/data/askConfig.js`);
  }
  const { data, error } = await supabase
    .from("ask_settings")
    .select("tiers, ai_features")
    .limit(1)
    .maybeSingle();
  const settings = error || !data ? DEFAULT_ASK_SETTINGS : data;

  if (!aiFeatureOn(settings, key)) {
    console.error(
      `"${key}" is switched off.\n`
      + "Turn it on under AI features in /admin/ask/settings — the master switch too.",
    );
    process.exit(1);
  }
  return Array.isArray(settings.tiers) && settings.tiers.length
    ? settings.tiers
    : DEFAULT_ASK_SETTINGS.tiers;
}

/**
 * One prompt, one answer, paced for the free tier.
 *
 * Returns the answer text, or throws when every rung failed — the caller
 * decides whether that skips a row or aborts the run.
 */
export async function askGemini({ tiers, system, prompt }) {
  const wait = MIN_GAP_MS - (Date.now() - lastCall);
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();

  const { tier, answer, errors } = await runTiers({
    tiers,
    system,
    user: [{ role: "user", parts: [{ text: prompt }] }],
    env: { GEMINI_API_KEY: process.env.GEMINI_API_KEY },
  });
  if (!tier) throw new Error(`every rung failed: ${errors.join("; ")}`);
  return answer;
}

/** Pulls the first JSON object or array out of a model answer. */
export function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) throw new Error(`no JSON in answer: ${text.slice(0, 120)}`);
  return JSON.parse(m[0]);
}
