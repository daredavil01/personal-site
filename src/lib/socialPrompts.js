// The Social kit's prompt templates — the only place they live.
//
// The site never calls a model for this. /admin/social pulls a post into one
// form (title, subtitle, text) and these functions fill researched templates
// with it; the owner pastes each prompt into ChatGPT. Pure and dependency-free
// apart from identity and the card palette, so the tests read the same text the
// page shows.
//
// Every rule below traces to a source; the table is in docs/social-kit.md.
// Changing a rule changes every kit made after it, so bump TEMPLATE_VERSION —
// it is stored on each saved kit.
//
// Sources (re-read 2026-10-23):
//   Substack Notes — writebuildscale.substack.com/p/i-analyzed-27-million-substack-notes
//     (Bestseller median ~172 chars; a direct, low-effort question that names
//     its answer format drew the most comments per like), writebuildscale
//     "ultimate guide" (short single-line sentences, white space),
//     levelupwithai.substack.com (one standalone idea per Note, mixed lengths,
//     no rhetorical questions or generic motivational endings).
//   LinkedIn — contentin.io/glossary/line-break-formatting (~140 chars before
//     "see more" on mobile, ~210 on desktop; the composer strips bold, so line
//     breaks and emoji carry the layout), savvysnack.substack.com (ask ChatGPT
//     for "headline" and "subheading", not "hook"/"rehook"; one-line
//     sentences), tryordinal.com link-penalty study and oktopost.com (links
//     in the body cost reach in most 2025 data; first-comment placement is
//     "directionally positive" — mixed evidence, so it is an option).
//   Threads — buffer.com/resources/threads-content-ideas (500 chars; open-ended
//     questions are the main engagement format; links hurt reach).
//   WhatsApp — timelines.ai (700-char text Status; keep it brief), WhatsApp
//     auto-links a pasted URL and shows *asterisk* text bold.
//   Images — developers.openai.com/cookbook image-gen prompting guides
//     (scene → subject → details → constraints, labelled segments, state the
//     use, literal text in quotes, "exactly once", call out placement, no tiny
//     text, explicit exclusions), runware.ai GPT Image 2 guide (lock text with
//     quotes plus "verbatim"; canvas size), Wikipedia/ChatGPT (non-Latin text
//     renders noticeably worse).
// Owner's brief, on top: concise, interactive, with emoji, in the post's language.

import { IDENTITY } from "../data/identity";
import { COLORS } from "./og/tokens";

export const TEMPLATE_VERSION = 1;

// Text prompts carry the post up to this many characters, cut at a paragraph.
export const MAX_CONTENT_CHARS = 12000;
// Image prompts carry only an excerpt: enough for a metaphor, not an essay.
export const MAX_EXCERPT_CHARS = 600;
const MAX_HEADLINE_WORDS = 6;

// The banner is one image at a size the owner picks; the rest are checkboxes.
export const BANNER_PRESETS = [
  { key: "substack", label: "Substack cover · 1456×1048 (14:10)", w: 1456, h: 1048, ratio: "14:10", use: "Cover image for the post and its Substack social preview" },
  { key: "wide", label: "Widescreen header · 1600×900 (16:9)", w: 1600, h: 900, ratio: "16:9", use: "Header banner for the post" },
  { key: "card", label: "Link card · 1200×630 (1.91:1)", w: 1200, h: 630, ratio: "1.91:1", use: "Featured image and link-preview card for the post" },
  { key: "custom", label: "Custom size", w: null, h: null, ratio: null, use: "Banner for the post" },
];

export const IMAGE_SIZES = [
  { key: "portrait", label: "Portrait 4:5 · 1080×1350", w: 1080, h: 1350, ratio: "4:5", use: "Feed image for LinkedIn, Facebook and Threads" },
  { key: "story", label: "Story 9:16 · 1080×1920", w: 1080, h: 1920, ratio: "9:16", use: "Story image for WhatsApp status and Facebook stories", story: true },
  { key: "landscape", label: "Landscape 1.91:1 · 1200×628", w: 1200, h: 628, ratio: "1.91:1", use: "Link-share image for LinkedIn and Facebook" },
];

export const IMAGE_STYLES = [
  { key: "editorial", label: "Editorial illustration", text: "a modern editorial illustration — flat shapes with subtle grain, the kind of art that runs beside a magazine essay" },
  { key: "photo", label: "Photographic", text: "a cinematic photograph — natural light, shallow depth of field, real textures, no stock-photo staging" },
  { key: "typographic", label: "Minimal typographic", text: "a minimal typographic poster — the words are the design, with one small symbolic shape and generous empty space" },
  { key: "sketch", label: "Hand-drawn sketch", text: "a hand-drawn ink and watercolour sketch on off-white paper, loose lines, like a page from a travel journal" },
];

export const PALETTES = [
  {
    key: "brand",
    label: "Site colours",
    text: `the site's own colours — a deep ink background (${COLORS.ink}), off-white text (${COLORS.text}), and one accent from its violet ${COLORS.violet} → teal ${COLORS.teal} → blue ${COLORS.blue} ribbon`,
  },
  {
    key: "post",
    label: "From the post",
    text: "colours drawn from the post's own setting and mood, with strong contrast between the text and what sits behind it",
  },
];

export const LINKEDIN_LINK = [
  { key: "comment", label: "First comment" },
  { key: "post", label: "In the post" },
];

const DEVANAGARI = /[ऀ-ॿ]/;
export const hasDevanagari = (text) => DEVANAGARI.test(String(text || ""));

const words = (text) => String(text || "").trim().split(/\s+/).filter(Boolean);

/** A headline over the limit, for the form's warning. */
export const headlineTooLong = (text) => words(text).length > MAX_HEADLINE_WORDS;

/**
 * Text cut at a paragraph (or, for a single long paragraph, a sentence)
 * boundary so a prompt never ends mid-thought. `truncated` says whether
 * anything was dropped.
 */
export function clampText(text, max) {
  const clean = String(text || "").replace(/\r\n?/g, "\n").trim();
  if (clean.length <= max) return { text: clean, truncated: false };
  const paras = clean.split(/\n{2,}/);
  const kept = [];
  let used = 0;
  for (let i = 0; i < paras.length; i += 1) {
    const add = paras[i].length + (kept.length ? 2 : 0);
    if (used + add > max) break;
    kept.push(paras[i]);
    used += add;
  }
  if (kept.length) return { text: kept.join("\n\n"), truncated: true };
  // One paragraph longer than the budget: cut at the last sentence end.
  const head = clean.slice(0, max);
  const stop = Math.max(head.lastIndexOf(". "), head.lastIndexOf("। "), head.lastIndexOf("? "), head.lastIndexOf("! "));
  return { text: stop > max / 2 ? head.slice(0, stop + 1) : `${head.replace(/\s+\S*$/, "")}…`, truncated: true };
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_) {
    return null;
  }
};

const lines = (...parts) => parts.flat().filter((p) => p !== null && p !== undefined && p !== false).join("\n");

// --- the shared frame ---------------------------------------------------------

function languageLine(language) {
  return /marathi/i.test(language || "")
    ? "Write in Marathi, in Devanagari script — the same language as the post. Hashtags may be in English."
    : "Write in English — the same language as the post.";
}

function postBlock({ title, subtitle, url, content }) {
  const body = clampText(content, MAX_CONTENT_CHARS);
  return lines(
    "THE POST",
    `Title: "${title}"`,
    subtitle ? `Subtitle: "${subtitle}"` : null,
    `Link: ${url}`,
    '"""',
    body.text,
    body.truncated ? "[The post continues; this is its first part.]" : null,
    '"""',
  );
}

function frame(input) {
  const host = hostOf(input.url);
  return lines(
    `You are a social media editor helping ${IDENTITY.name} share a new blog post${host ? ` published at ${host}` : ""}.`,
    "",
    "LANGUAGE",
    languageLine(input.language),
    "",
    "VOICE",
    "- First person, as the author: warm, plain and specific.",
    "- Reuse the author's own phrases and images from the post where they work.",
    "- Use only facts, names, places and numbers that appear in the post. Never invent one.",
    "- Concise: every line earns its place. No filler and no clichés (\"game-changer\", \"dive in\", \"unlock\", \"in today's world\").",
    "- Emoji: a few relevant ones, each marking a line or standing in for a word — never a row of them.",
    "",
    postBlock(input),
  );
}

const OUTPUT_PLAIN = "Return only what is asked, ready to paste: no preamble, no explanations, no Markdown, no quotation marks around the text.";

// --- one task per platform -----------------------------------------------------

function notesTask({ url }) {
  return lines(
    "SUBSTACK NOTES",
    "Write 3 Substack Notes that make people want to read the post. Each Note carries ONE idea from the post and stands on its own in the feed.",
    "- NOTE 1, micro (under 150 characters): the single most striking line or idea in the post.",
    "- NOTE 2, short (150–300 characters): one small moment or detail from the post, told so it lands.",
    `- NOTE 3, medium (300–600 characters): the post's main takeaway, with the link (${url}) alone on its last line.`,
    "Rules for every Note:",
    "- The first line is a hook that works on its own.",
    "- Short lines, with a blank line between them.",
    "- 1–2 emoji.",
    "- End with a direct question that is easy to answer and says how to answer it (\"Reply with one word: …\", \"A or B?\", \"Yes or no:\"). No rhetorical questions, no generic motivational endings.",
    "- Only Note 3 includes the link.",
    "Label them NOTE 1:, NOTE 2:, NOTE 3:, each followed by its text.",
  );
}

function linkedinTask({ url, linkedinLink = "comment" }) {
  const inComment = linkedinLink !== "post";
  return lines(
    "LINKEDIN POST",
    "Write one LinkedIn post about the blog post.",
    "- Line 1 is a headline under 140 characters — about all LinkedIn shows on a phone before \"…see more\". Make it a specific, surprising detail, a bold claim the post supports, or a concrete moment. Not a question to the reader.",
    "- Line 2 is a subheading that raises the stakes or turns the idea.",
    "- Then 3–5 short paragraphs of 1–3 lines with a blank line between them, one idea each. Keep sentences short enough to fit on one line.",
    "- If the post has lessons, list 3–5 of them, each line starting with ✅ or 👉.",
    "- At most 2 other emoji in the whole post.",
    "- Close with one specific question that invites people to share their own experience.",
    "- Last line: 3–5 relevant hashtags.",
    "- 900–1,300 characters in total.",
    "- Plain text only: no Markdown, no Unicode bold or italic letters (screen readers spell them out and search cannot find them).",
    inComment
      ? "- Do not put the link in the post. End the body with \"🔗 Link in the first comment.\""
      : `- Put the link (${url}) on its own line just before the hashtags.`,
    "Return it as:",
    "POST: the post.",
    inComment ? `FIRST COMMENT: one line that gives a reason to click, then ${url}` : null,
    "ALTERNATIVE HEADLINES: three other first lines, one per line.",
  );
}

function shareTask({ url }) {
  return lines(
    "WHATSAPP / FACEBOOK / THREADS",
    "Write a short share message for each app.",
    `- WHATSAPP (status or a group): at most 300 characters. A friendly opener, one line on why it is worth reading, and the link (${url}) alone on the last line so WhatsApp shows its preview. You may wrap one key phrase in *asterisks*, which WhatsApp shows in bold. 1–3 emoji.`,
    `- FACEBOOK: at most 400 characters. Conversational, ending with a question that invites comments, then the link (${url}). 1–3 emoji.`,
    "- THREADS: at most 500 characters and WITHOUT the link (links cut a post's reach on Threads). End on an open-ended question. 1–3 emoji.",
    `- THREADS REPLY: one line to post as the first reply, with the link (${url}).`,
    "Label them WHATSAPP:, FACEBOOK:, THREADS:, THREADS REPLY:, each followed by its text.",
  );
}

// --- images -----------------------------------------------------------------

function layoutFor({ w, h, story }) {
  if (story) return { subject: "in the lower half", text: "in the upper third" };
  if (h > w) return { subject: "in the lower two-thirds", text: "across the top third" };
  return { subject: "on the right two-thirds", text: "on the left third" };
}

function imagePrompt(input, size) {
  const style = IMAGE_STYLES.find((s) => s.key === input.style) || IMAGE_STYLES[0];
  const palette = PALETTES.find((p) => p.key === input.palette) || PALETTES[0];
  const excerpt = clampText([input.subtitle, input.content].filter(Boolean).join("\n\n"), MAX_EXCERPT_CHARS);
  const layout = layoutFor(size);
  const headline = String(input.headline || input.title || "").trim();
  const subhead = String(input.subhead ?? "").trim();
  const orientation = size.h > size.w ? "portrait" : "landscape";
  const margin = Math.round(Math.min(size.w, size.h) * 0.06);
  return lines(
    "Create an image.",
    "",
    `USE: ${size.use}, promoting the blog post "${input.title}". ${size.w}×${size.h} pixels, ${size.ratio} ${orientation}. If that exact ratio is not available, use the closest canvas and keep all text and the subject inside a centred ${size.ratio} area so it can be cropped to size.`,
    "",
    `STYLE: ${style.text}.`,
    `PALETTE: ${palette.text}.`,
    "",
    "SCENE: one clear visual metaphor for the post's central idea, built from its own imagery. Read this excerpt for it:",
    '"""',
    excerpt.text,
    '"""',
    `Place the subject ${layout.subject}, with clean negative space ${layout.text} for the text.`,
    "",
    "TEXT — render EXACTLY as written, verbatim, each line exactly once:",
    `Headline: "${headline}"`,
    subhead ? `Subhead: "${subhead}"` : null,
    hasDevanagari(`${headline} ${subhead}`)
      ? "The text is in Marathi (Devanagari script). Reproduce every letter and vowel sign exactly; do not substitute similar-looking characters."
      : null,
    "",
    `TYPOGRAPHY: the headline in a large, bold sans-serif with strong contrast, ${layout.text}${subhead ? "; the subhead smaller, directly beneath it" : ""}. Keep every letter at least ${margin} px from the edges${size.story ? ", and clear of the top 250 px and bottom 300 px, where the app's buttons sit" : ""}.`,
    "",
    "AVOID: any other text, extra words or letters, watermarks, logos, URLs, tiny text, clip art, and a stock-photo look.",
  );
}

/** The banner size the form describes: a preset, or a custom W×H. */
export function bannerSize({ banner = "substack", customW, customH } = {}) {
  const preset = BANNER_PRESETS.find((b) => b.key === banner) || BANNER_PRESETS[0];
  if (preset.key !== "custom") return { key: "banner", ...preset };
  const w = Math.round(Number(customW));
  const h = Math.round(Number(customH));
  if (!(w >= 200 && h >= 200 && w <= 4096 && h <= 4096)) return null;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const g = gcd(w, h);
  return {
    ...preset, key: "banner", w, h, ratio: `${w / g}:${h / g}`,
  };
}

/**
 * Every prompt for one post.
 *
 * input: { url, title, subtitle, content, language, headline, subhead, style,
 *          palette, banner, customW, customH, sizes: string[], linkedinLink }
 * Returns { notes, linkedin, share, combined, images: { banner?, <size>... } }.
 */
export function buildSocialPrompts(input) {
  const head = frame(input);
  const tasks = {
    notes: notesTask(input),
    linkedin: linkedinTask(input),
    share: shareTask(input),
  };
  const single = (task) => lines(head, "", "TASK", task, "", "OUTPUT", OUTPUT_PLAIN);

  const images = {};
  const banner = bannerSize(input);
  if (banner) images.banner = imagePrompt(input, banner);
  IMAGE_SIZES
    .filter((size) => (input.sizes || []).includes(size.key))
    .forEach((size) => { images[size.key] = imagePrompt(input, size); });

  return {
    notes: single(tasks.notes),
    linkedin: single(tasks.linkedin),
    share: single(tasks.share),
    combined: lines(
      head,
      "",
      "TASK",
      "Write all three of the following, in this order, each under its own heading line (=== SUBSTACK NOTES ===, === LINKEDIN ===, === WHATSAPP / FACEBOOK / THREADS ===). Keep every section's own rules.",
      "",
      tasks.notes,
      "",
      tasks.linkedin,
      "",
      tasks.share,
      "",
      "OUTPUT",
      OUTPUT_PLAIN,
    ),
    images,
  };
}
