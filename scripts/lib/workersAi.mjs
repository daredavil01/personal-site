// Workers AI from node.
//
// The Functions get an `AI` binding; a script does not, so it goes through the
// REST endpoint with CF_ACCOUNT_ID / CF_API_TOKEN — the same pair the nightly
// workflow already sets for embeddings. This is that one call, lifted out of
// build-content-index.mjs so the text models and the audio models share it.
//
// Both allowances are the same 10,000 neurons a day, which is the whole budget
// these features are designed around.

const ENDPOINT = "https://api.cloudflare.com/client/v4/accounts";

/**
 * One Workers AI call.
 *
 * `raw: true` returns a Buffer instead of parsed JSON — the speech models
 * answer with audio/mpeg bytes, not a JSON envelope.
 */
export async function runWorkersAi(model, body, { raw = false } = {}) {
  const { CF_ACCOUNT_ID, CF_API_TOKEN } = process.env;
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    throw new Error("Missing CF_ACCOUNT_ID / CF_API_TOKEN in .env (Workers AI).");
  }

  const res = await fetch(`${ENDPOINT}/${CF_ACCOUNT_ID}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Workers AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  if (raw) return Buffer.from(await res.arrayBuffer());
  return res.json();
}

/**
 * Embeddings, with the shape check the caller would otherwise repeat: a short
 * vector list is a silent corruption of the index, not a failed request.
 */
export async function embedTexts(model, texts) {
  const out = await runWorkersAi(model, { text: texts });
  const vectors = out?.result?.data;
  if (!Array.isArray(vectors) || vectors.length !== texts.length) {
    throw new Error(`Workers AI returned ${vectors?.length ?? "no"} vectors for ${texts.length} texts`);
  }
  return vectors;
}
