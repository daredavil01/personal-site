// AI design suggestions for the share studio — the prompt, the Jev question set
// and the answer parser for /api/assist `task: "share_design"`. Pure, tested in
// shareSuggest.test.js, and in src/ because Pages routes every file under
// functions/.
//
// Owner-only by construction: the endpoint checks is_owner() before anything
// here runs. Visitors get localSuggestions() (src/components/share/presets.js),
// which needs no network.
//
// The model picks only from designCatalogue(): every id in the answer is checked
// against the real registries, so an AI pick is always something the studio can
// draw, and a Latin-only font on a Marathi post is swapped, not trusted.

import {
  PRESET_BY_ID, PRESETS, designCatalogue, isKnown, pairingForLang, presetDesign,
} from "../components/share/presets";

export const MAX_SUGGESTIONS = 4;
const MAX_TEXT = 1500;
const MAX_WHY = 140;
const JEV_AT = 0.4;

export const SHARE_SYSTEM = [
  "You are a graphic designer choosing how a piece of writing should look as a 1080px social-media image.",
  "You are given the text, what kind of entry it is, its language, whether it has a photo and its tags, then a catalogue of named presets, themes, layouts and font pairings.",
  "Choose only ids from the catalogue. Never invent one.",
  "Read the mood of the text — reflective, celebratory, technical, late-night, nostalgic, funny — and match it. Prefer four genuinely different directions over four variations of one.",
  "Marathi text must use a pairing marked (Marathi + English).",
  "A polaroid layout needs a photo; a ticket layout needs race or trek numbers.",
  'Return JSON: {"designs": [{"preset": id or null, "theme": id, "layout": id, "pairing": id, "accent": "#rrggbb" or null, "why": "under 14 words", "excerpt": "one sentence copied exactly from the text, or null"}]}.',
  `At most ${MAX_SUGGESTIONS} designs. Use excerpt only when one sentence carries the post better than the whole.`,
  "Return the JSON object alone, with no prose and no code fence.",
].join(" ");

const clamp = (v, n) => String(v == null ? "" : v).slice(0, n);
const lines = (list) => list.map((x) => `- ${x.id}: ${x.note}`).join("\n");

/** The user turn: the post, then the whole catalogue. */
export function buildSharePrompt({
  kind, title, text, lang, hasImage, tags, stats,
}) {
  const cat = designCatalogue();
  return [
    `Entry kind: ${clamp(kind, 40) || "post"}`,
    `Language: ${lang === "mr" ? "Marathi" : "English"}`,
    `Has photo: ${hasImage ? "yes" : "no"}`,
    (stats || []).length ? `Numbers: ${(stats || []).slice(0, 4).map((s) => `${clamp(s.label, 30)} ${clamp(s.value, 30)}`).join(", ")}` : "",
    (tags || []).length ? `Tags: ${(tags || []).slice(0, 12).map((t) => clamp(t, 40)).join(", ")}` : "",
    title ? `Title: ${clamp(title, 200)}` : "",
    `\nText:\n${clamp(text, MAX_TEXT) || "(none)"}`,
    `\nPresets:\n${lines(cat.presets)}`,
    `\nThemes:\n${lines(cat.themes)}`,
    `\nLayouts:\n${lines(cat.layouts)}`,
    `\nPairings:\n${lines(cat.pairings)}`,
  ].filter(Boolean).join("\n");
}

const isHex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim());

/**
 * The model's answer → at most four drawable designs:
 * [{ id, label, why, design, excerpt? }]. Unknown ids are dropped (a design
 * with no valid theme or preset is dropped whole), pairings are made to fit the
 * language, an excerpt must appear in the text verbatim, and duplicates go.
 */
export function parseShareSuggestions(parsed, { text = "", lang = "en", hasImage = false } = {}) {
  let raw = [];
  if (Array.isArray(parsed?.designs)) raw = parsed.designs;
  else if (Array.isArray(parsed)) raw = parsed;
  const seen = new Set();
  const out = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object" || out.length >= MAX_SUGGESTIONS) return;
    const preset = isKnown.preset(item.preset) ? PRESET_BY_ID[item.preset] : null;
    const design = preset ? presetDesign(preset, lang) : {};
    if (isKnown.theme(item.theme)) design.theme = item.theme;
    if (isKnown.layout(item.layout)) design.layout = item.layout;
    if (isKnown.pairing(item.pairing)) design.pairing = pairingForLang(item.pairing, lang);
    if (!design.theme) return;
    if (!design.layout) design.layout = "editorial";
    if (!design.pairing) design.pairing = pairingForLang("site", lang);
    if (design.layout === "polaroid" && !hasImage) design.layout = "editorial";
    if (isHex(item.accent)) design.accent = item.accent.trim().toLowerCase();
    const key = `${design.theme}|${design.layout}|${design.pairing}`;
    if (seen.has(key)) return;
    seen.add(key);
    const excerpt = typeof item.excerpt === "string" && item.excerpt.trim().length > 3 && text.includes(item.excerpt.trim())
      ? item.excerpt.trim()
      : null;
    out.push({
      id: `ai-${i}`,
      label: preset ? preset.label : "AI pick",
      why: clamp(String(item.why || "").trim(), MAX_WHY) || (preset ? preset.note : ""),
      design,
      excerpt,
    });
  });
  return out;
}

// ---- Jev: one calibrated yes/no per preset --------------------------------

/** Positional keys (`p0`…) as in assistTags: question keys are identifiers. */
export function shareQuestions() {
  const spec = {};
  const names = {};
  PRESETS.forEach((p, i) => {
    spec[`p${i}`] = { type: "bool", instructions: `This visual style suits the post: ${p.label} — ${p.note}` };
    names[`p${i}`] = p.id;
  });
  return { spec, names };
}

export const shareState = ({
  kind, title, text, lang, hasImage, tags,
}) => ({
  content_type: clamp(kind, 40) || "post",
  language: lang === "mr" ? "Marathi" : "English",
  has_photo: Boolean(hasImage),
  title: clamp(title, 200),
  text: clamp(text, MAX_TEXT),
  tags: (tags || []).slice(0, 12).map((t) => clamp(t, 40)).join(", "),
});

const prob = (answer) => {
  const p = Number(answer?.noul ?? answer?.probability);
  return Number.isFinite(p) ? p : null;
};

/** Jev's answers → the top presets as designs, with the fit as the reason. */
export function pickShareFromJev(answers, names, { lang = "en", hasImage = false } = {}) {
  return Object.entries(names || {})
    .map(([key, id]) => ({ id, p: prob(answers?.[key]) }))
    .filter(({ id, p }) => p !== null && p >= JEV_AT && (hasImage || PRESET_BY_ID[id].design.layout !== "polaroid"))
    .sort((a, b) => b.p - a.p)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ id, p }) => ({
      id: `jev-${id}`,
      label: PRESET_BY_ID[id].label,
      why: `${Math.round(p * 100)}% fit — ${PRESET_BY_ID[id].note}`,
      design: presetDesign(PRESET_BY_ID[id], lang),
      excerpt: null,
    }));
}
