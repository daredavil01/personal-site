// Cloudflare Pages Function — authoring assistance for /admin.
// Endpoint: POST /api/assist.
//
// Named assist.js at functions/api/ rather than under functions/api/ask/ for
// the same reason as ask-eval.js: Pages routes every file under functions/, and
// anything inside an ask/ folder risks shadowing /api/ask.
//
// Why an endpoint rather than a browser call: GEMINI_API_KEY is a secret, so it
// can be neither in the bundle nor reachable from the page. And the answer is
// only ever a draft — it fills a form field, and nothing is saved until the
// author presses Save, so a bad draft costs a keystroke.
//
// Owner-only, checked the way every other owner surface on this site is checked:
// the is_owner() RPC called with the CALLER'S own access token, so the answer
// comes from the same SQL the RLS policies use. Nothing is spent before it.
//
// The model ladder is ask_settings.tiers — the same one /ask answers with, so
// Gemini is rung 1 here too and a retired model stays an /admin edit rather
// than a deploy.
//
// Two tasks:
//   draft  one long-text field, returned as text
//   tags   tag names for a row, returned as JSON and then intersected with the
//          central tag list, so this can only ever propose tags that exist —
//          creating one stays a deliberate act in the form.
//   alt    one sentence describing an uploaded image. Gemini rungs only: the
//          Workers AI rungs of this ladder are text models, and askTiers maps a
//          multimodal part list down to its text, so they would confidently
//          describe an image they never saw.

import { DEFAULT_ASK_SETTINGS, aiFeatureOn } from "../../src/data/askConfig";
import { json, restHeaders, rpc } from "../../src/lib/askServer";
import { runTiers } from "../../src/lib/askTiers";

// Trust boundary: the caller is the owner, but a form can still hold a pasted
// essay, and the prompt is billed by length. Clamp rather than reject.
const MAX_FIELD_CHARS = 2000;
const MAX_CONTEXT_FIELDS = 12;
const MAX_EXAMPLES = 3;
const MAX_EXAMPLE_CHARS = 600;

const SYSTEM = [
  "You draft short prose for the admin forms of Sanket Tambare's personal website.",
  "The site covers books, running and trekking, software projects, blog posts and short micro-posts.",
  "You are given one field to write, the other values already filled in on the same row, and up to three examples of how that field reads on other rows.",
  "Write only that field's value. Match the length and tone of the examples.",
  "Plain English, first person only where the examples are. No marketing tone, no rhetorical questions, no emoji.",
  "Use only the facts you are given — never invent a date, a number, a place or an award.",
  "Return the text alone: no heading, no label, no quotation marks, no markdown.",
].join(" ");

/** The caller's bearer token, which is a Supabase session token or nothing. */
function bearer(request) {
  const match = /^Bearer\s+(.+)$/i.exec((request.headers.get("Authorization") || "").trim());
  return match ? match[1] : null;
}

async function isOwner(env, request) {
  const token = bearer(request);
  if (!token) return { ok: false };
  try {
    return { ok: (await rpc(env, "is_owner", {}, { token })) === true };
  } catch (_) {
    // An unreachable database is not the same answer as "you are not the owner".
    return { ok: false, unavailable: true };
  }
}

/**
 * The ladder and the switchboard in one read.
 *
 * A failed read falls back to DEFAULT_ASK_SETTINGS, where ai_features is empty
 * — so an unreachable database turns this off rather than on, the same bargain
 * the judge makes with auto_eval_enabled.
 */
async function loadSettings(env) {
  try {
    const res = await fetch(
      `${env.VITE_SUPABASE_URL}/rest/v1/ask_settings?id=eq.1&select=tiers,ai_features&limit=1`,
      { headers: restHeaders(env) },
    );
    if (!res.ok) throw new Error(`ask_settings ${res.status}`);
    const rows = await res.json();
    return { ...DEFAULT_ASK_SETTINGS, ...(rows?.[0] || {}) };
  } catch (_) {
    return DEFAULT_ASK_SETTINGS;
  }
}

const clamp = (v, max) => String(v ?? "").slice(0, max).trim();

/**
 * One prompt from whatever the form happens to hold.
 *
 * Deliberately shape-agnostic: it reads the row's own values rather than
 * knowing anything about books or treks, so adding `aiDraft: true` to a new
 * field in resources.js needs no change here.
 */
function buildPrompt({ resource, label, values, examples }) {
  const context = Object.entries(values || {})
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
    .concat(
      Object.entries(values || {})
        .filter(([, v]) => Array.isArray(v) && v.length)
        .map(([k, v]) => [k, v.join(", ")]),
    )
    .slice(0, MAX_CONTEXT_FIELDS)
    .map(([k, v]) => `- ${k}: ${clamp(v, MAX_FIELD_CHARS)}`)
    .filter((line) => line.length > 4);

  const samples = (Array.isArray(examples) ? examples : [])
    .map((e) => clamp(e, MAX_EXAMPLE_CHARS))
    .filter(Boolean)
    .slice(0, MAX_EXAMPLES);

  return [
    `Content type: ${clamp(resource, 60) || "entry"}`,
    `Field to write: ${clamp(label, 80) || "description"}`,
    context.length ? `\nThe row so far:\n${context.join("\n")}` : "\nThe row is otherwise empty.",
    samples.length
      ? `\nHow this field reads on other rows:\n${samples.map((s) => `---\n${s}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");
}

// Alt text, not a caption: what is in the picture, for someone who cannot see it.
const ALT_SYSTEM = [
  "You write alt text for images on a personal website about running, trekking, books and software.",
  "Describe what is actually visible in one sentence, under 20 words.",
  "Lead with the subject. Say where it is only if the image shows it.",
  "Never start with 'Image of' or 'Photo of'. Never guess a place name, a date, a race or a person's identity.",
  "Return the sentence alone, with no quotation marks and no markdown.",
].join(" ");

const TAGS_SYSTEM = [
  "You file entries on a personal website under tags that already exist.",
  "You are given the entry and the site's full tag vocabulary.",
  "Choose only from that vocabulary. Never invent a tag, never translate one, never change its spelling.",
  'Return JSON: {"suggested": [names you are confident about], "maybe": [names that are plausible]}.',
  "At most 5 in suggested and 5 in maybe. Prefer few and right over many.",
  "Marathi tag names are expected and are returned exactly as given.",
  "Return the JSON object alone, with no prose and no code fence.",
].join(" ");

/**
 * The central tag vocabulary.
 *
 * All of it, deliberately: 98 names is a few hundred tokens, and shortlisting
 * by embedding first would mean an embedding call, a similarity query and a
 * threshold to tune for a prompt that is already small.
 * ponytail: send-them-all, shortlist by embedding if the vocabulary grows past a few hundred.
 */
async function loadTagNames(env) {
  const res = await fetch(
    `${env.VITE_SUPABASE_URL}/rest/v1/tags?select=name&order=name`,
    { headers: restHeaders(env) },
  );
  if (!res.ok) throw new Error(`tags ${res.status}`);
  return (await res.json()).map((r) => r.name).filter(Boolean);
}

/**
 * Keeps only names that actually exist, compared case-insensitively because
 * tag names are stored lowercase — and returns the STORED spelling, so a model
 * that title-cased something cannot create a duplicate tag through the form.
 */
function knownOnly(names, vocabulary, exclude) {
  const bySlug = new Map(vocabulary.map((n) => [n.toLowerCase(), n]));
  const taken = new Set((exclude || []).map((n) => String(n).toLowerCase()));
  const out = [];
  (Array.isArray(names) ? names : []).forEach((raw) => {
    const key = String(raw || "").trim().toLowerCase();
    const real = bySlug.get(key);
    if (!real || taken.has(key) || out.includes(real)) return;
    out.push(real);
  });
  return out.slice(0, 5);
}

// A model told to return bare text sometimes returns it fenced or quoted.
function tidy(text) {
  return String(text || "")
    .replace(/^```[a-z]*\n?|```$/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

/** The row, as lines, plus the whole vocabulary to choose from. */
function buildTagPrompt({ resource, values }, vocabulary) {
  const context = Object.entries(values || {})
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
    .slice(0, MAX_CONTEXT_FIELDS)
    .map(([k, v]) => `- ${k}: ${clamp(v, MAX_FIELD_CHARS)}`);

  return [
    `Content type: ${clamp(resource, 60) || "entry"}`,
    `\nThe entry:\n${context.join("\n") || "(empty)"}`,
    `\nThe tag vocabulary (${vocabulary.length}):\n${vocabulary.join(", ")}`,
  ].join("\n");
}

// What the vision task will accept. An image it cannot read is refused rather
// than described from its filename.
const VISION_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * The image, inline, plus what it is a picture of.
 *
 * Validated here rather than trusted: the caller is the owner, but a 20 MB PDF
 * posted as an image would be billed as one.
 */
function buildAltParts({ mimeType, data, context: what }) {
  const type = String(mimeType || "").toLowerCase();
  if (!VISION_TYPES.has(type)) {
    const err = new Error(`Cannot read ${type || "that file"} — JPEG, PNG, GIF or WebP only.`);
    err.code = "bad_request";
    throw err;
  }
  const base64 = String(data || "");
  // base64 is 4 characters per 3 bytes.
  if (!base64 || (base64.length * 3) / 4 > MAX_IMAGE_BYTES) {
    const err = new Error("Image missing or too large.");
    err.code = "bad_request";
    throw err;
  }
  return [
    { text: what ? `This image belongs to: ${clamp(what, 200)}` : "Describe this image." },
    { inlineData: { mimeType: type, data: base64 } },
  ];
}

// What each task is allowed to do, and which switch allows it.
const TASKS = {
  draft: {
    feature: "draft_fields",
    system: SYSTEM,
    offNote: "Drafting is switched off. Turn it on under AI features in Ask · Settings.",
  },
  tags: {
    feature: "tag_suggest",
    system: TAGS_SYSTEM,
    offNote: "Tag suggestions are switched off. Turn them on under AI features in Ask · Settings.",
  },
  alt: {
    feature: "image_alt",
    system: ALT_SYSTEM,
    offNote: "Alt text is switched off. Turn it on under AI features in Ask · Settings.",
    // Vision is a Gemini-only capability on this ladder; see the header.
    vision: true,
  },
};

/** The first JSON object in an answer, or null. */
function parseJson(text) {
  const match = String(text || "").match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (_) {
    return null;
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const owner = await isOwner(env, request);
  if (!owner.ok) {
    return owner.unavailable
      ? json({ error: "unavailable", note: "Could not check who is calling." }, 503)
      : json({ error: "forbidden" }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: "bad_request", note: "Expected a JSON body." }, 400);
  }

  const task = TASKS[body?.task];
  if (!task) {
    return json({ error: "bad_request", note: `Unknown task ${body?.task || ""}`.trim() }, 400);
  }

  // The switchboard is checked before the prompt is built, not after: nothing
  // is spent, and nothing is even assembled, for a feature that is switched off.
  const settings = await loadSettings(env);
  if (!aiFeatureOn(settings, task.feature)) {
    return json({ error: "disabled", note: task.offNote }, 403);
  }

  let parts;
  let vocabulary = null;
  try {
    if (body.task === "alt") {
      parts = buildAltParts(body);
    } else if (body.task === "tags") {
      vocabulary = await loadTagNames(env);
      parts = [{ text: buildTagPrompt(body, vocabulary) }];
    } else {
      parts = [{ text: buildPrompt(body) }];
    }
  } catch (err) {
    return json({ error: err.code || "unavailable", note: err.message }, err.code ? 400 : 503);
  }

  const configured = Array.isArray(settings.tiers) && settings.tiers.length
    ? settings.tiers
    : DEFAULT_ASK_SETTINGS.tiers;
  // A vision task keeps only the rungs that can actually see: a text rung would
  // answer from the prompt alone and sound just as sure.
  const tiers = task.vision ? configured.filter((t) => t.provider === "gemini") : configured;
  if (!tiers.length) {
    return json({ error: "no_model", note: "No vision-capable rung is enabled." }, 502);
  }

  const { tier, answer, errors } = await runTiers({
    tiers,
    system: task.system,
    user: [{ role: "user", parts }],
    env,
  });

  if (!tier) return json({ error: "no_model", note: errors.join("; ") }, 502);

  if (body.task === "tags") {
    const parsed = parseJson(answer);
    if (!parsed) return json({ error: "empty", note: `${tier} returned no JSON.` }, 502);
    const suggested = knownOnly(parsed.suggested, vocabulary, body.values?.[body.field]);
    return json({
      suggested,
      maybe: knownOnly(parsed.maybe, vocabulary, [...(body.values?.[body.field] || []), ...suggested]),
      tier,
    });
  }

  const draft = tidy(answer);
  if (!draft) return json({ error: "empty", note: `${tier} returned nothing usable.` }, 502);

  return body.task === "alt" ? json({ alt: draft, tier }) : json({ draft, tier });
}
