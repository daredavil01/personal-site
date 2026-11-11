// The share studio's design model, as pure functions (tested in
// shareDesign.test.js). A "design" is every choice the studio offers. The card
// renders from `model` (what the post says, built by shareCardConfig.js) plus
// one design, and nothing else.
//
// No React and nothing browser-only: the assist endpoint bundles the layout and
// aspect lists from here.

import { isMarathi, splitSentences } from "../../lib/logbook";
import { ALL_THEME_IDS, THEME_BY_ID } from "./themes";
import { PAIRING_BY_ID, pairingSupports } from "./typography";

// Card is always 1080 px wide. `auto` grows with the content.
export const ASPECTS = [
  { id: "portrait", label: "4:5", note: "Instagram, LinkedIn feed", h: 1350 },
  { id: "square", label: "1:1", note: "any feed", h: 1080 },
  { id: "story", label: "9:16", note: "Stories, Status, Reels", h: 1920 },
  { id: "landscape", label: "1.91:1", note: "X, LinkedIn link size", h: 566 },
  { id: "wide", label: "16:9", note: "slides, YouTube community", h: 608 },
  { id: "auto", label: "Fit", note: "as tall as the text", h: null },
];
export const ASPECT_BY_ID = Object.fromEntries(ASPECTS.map((a) => [a.id, a]));
export const CARD_W = 1080;

// Layouts are compositions, not colours. `suits` puts the right ones first for
// each kind; any layout can draw any kind.
export const LAYOUTS = [
  { id: "editorial", label: "Editorial", note: "masthead, title, body, tags", suits: ["microblog", "blog", "book", "ask", "instagram", "sport", "trek", "newsletter", "newsletter-section"] },
  { id: "pullquote", label: "Pull quote", note: "giant quote marks and an accent rule", suits: ["microblog", "book", "blog", "ask"] },
  { id: "poster", label: "Poster", note: "oversized type filling the frame", suits: ["microblog", "blog", "newsletter", "sport"] },
  { id: "polaroid", label: "Polaroid", note: "photo first, caption under it", suits: ["trek", "sport", "instagram", "microblog"] },
  { id: "note", label: "Note", note: "a post card with avatar, name and date", suits: ["microblog", "ask", "blog", "instagram"] },
  { id: "column", label: "Column", note: "magazine column with a drop cap", suits: ["blog", "newsletter", "newsletter-section", "book", "ask"] },
  { id: "minimal", label: "Minimal", note: "just the words, lots of air", suits: ["microblog", "book", "blog"] },
  { id: "ticket", label: "Ticket", note: "race/trek stub with big numbers", suits: ["sport", "trek"] },
  { id: "index", label: "Index card", note: "library card with a coloured spine", suits: ["book", "newsletter-section"] },
  { id: "letter", label: "Letter", note: "dateline, letter body, signature", suits: ["newsletter", "blog", "microblog"] },
];
export const LAYOUT_BY_ID = Object.fromEntries(LAYOUTS.map((l) => [l.id, l]));

export const OPTIONS = {
  align: [
    { id: "left", label: "Left", icon: "format_align_left" },
    { id: "center", label: "Centre", icon: "format_align_center" },
    { id: "right", label: "Right", icon: "format_align_right" },
    { id: "justify", label: "Justify", icon: "format_align_justify" },
  ],
  valign: [
    { id: "top", label: "Top", icon: "vertical_align_top" },
    { id: "middle", label: "Middle", icon: "vertical_align_center" },
    { id: "bottom", label: "Bottom", icon: "vertical_align_bottom" },
  ],
  size: [
    { id: "auto", label: "Fit" }, { id: "s", label: "S" }, { id: "m", label: "M" }, { id: "l", label: "L" }, { id: "xl", label: "XL" },
  ],
  leading: [{ id: "tight", label: "Tight" }, { id: "normal", label: "Normal" }, { id: "loose", label: "Loose" }],
  tracking: [{ id: "tight", label: "Tight" }, { id: "normal", label: "Normal" }, { id: "wide", label: "Wide" }],
  textCase: [
    { id: "none", label: "As written" }, { id: "upper", label: "UPPER" }, { id: "lower", label: "lower" }, { id: "title", label: "Title" },
  ],
  weight: [{ id: "regular", label: "Regular" }, { id: "bold", label: "Bold" }],
  bodyFace: [{ id: "body", label: "Body face" }, { id: "display", label: "Display face" }],
  quoteMarks: [
    { id: "curly", label: "“ ”" }, { id: "guillemet", label: "« »" }, { id: "low", label: "„ “" }, { id: "corner", label: "「 」" }, { id: "none", label: "None" },
  ],
  highlightStyle: [{ id: "marker", label: "Marker" }, { id: "underline", label: "Underline" }, { id: "ink", label: "Accent ink" }],
  frame: [
    { id: "none", label: "None" }, { id: "hairline", label: "Hairline" }, { id: "double", label: "Double" },
    { id: "mat", label: "Mat" }, { id: "rounded", label: "Rounded" },
  ],
  padding: [{ id: "s", label: "Snug" }, { id: "m", label: "Normal" }, { id: "l", label: "Airy" }],
  imageSize: [{ id: "full", label: "Full" }, { id: "s", label: "S" }, { id: "m", label: "M" }, { id: "l", label: "L" }],
  imageFit: [{ id: "contain", label: "Whole" }, { id: "cover", label: "Fill" }],
};

const VALID = Object.fromEntries(Object.entries(OPTIONS).map(([k, list]) => [k, new Set(list.map((o) => o.id))]));

export const PADDING_PX = { s: 56, m: 80, l: 116 };
export const LEADING = { tight: 1.12, normal: 1.38, loose: 1.65 };
export const TRACKING = { tight: "-0.02em", normal: "0", wide: "0.06em" };
export const SIZE_SCALE = { s: 0.78, m: 1, l: 1.22, xl: 1.45 };
export const QUOTES = {
  curly: ["“", "”"], guillemet: ["«", "»"], low: ["„", "“"], corner: ["「", "」"], none: ["", ""],
};

export const BASE_DESIGN = {
  theme: "light",
  layout: "editorial",
  pairing: "site",
  aspect: "portrait",
  align: "left",
  valign: "top",
  size: "auto",
  leading: "normal",
  tracking: "normal",
  textCase: "none",
  weight: "regular",
  bodyFace: "body",
  quoteMarks: "curly",
  highlightStyle: "marker",
  frame: "none",
  padding: "m",
  accent: null,
  includeImage: true,
  // "full": the photo at the card's full width and its own proportions, never
  // cropped — capped only on a fixed frame so the words still fit.
  imageSize: "full",
  imageFit: "contain",
  showEyebrow: true,
  showMeta: true,
  showDate: true,
  showTags: true,
  showSignature: true,
  showUrl: true,
};

// Style fields remembered between openings (per kind). Text, highlight and the
// image switch belong to one post and are never carried over.
export const REMEMBERED = [
  "theme", "pairing", "aspect", "align", "valign", "size", "leading", "tracking", "textCase", "weight", "bodyFace",
  "quoteMarks", "highlightStyle", "frame", "padding", "accent", "showEyebrow", "showMeta", "showDate", "showTags",
  "showSignature", "showUrl", "layout",
];

/** "mr" when the text is mostly Devanagari, else "en". */
export const languageOf = (...texts) => (isMarathi(texts.filter(Boolean).join(" ")) ? "mr" : "en");

const KIND_LAYOUT = {
  book: "index",
  sport: "ticket",
  trek: "ticket",
  instagram: "polaroid",
  ask: "note",
  blog: "column",
  newsletter: "letter",
  "newsletter-section": "column",
};

/** The design a post opens with before anything is remembered or picked. */
export function defaultDesign(kind, model = {}) {
  const lang = model.lang || languageOf(model.title, model.body);
  let layout = KIND_LAYOUT[kind] || (model.quote ? "pullquote" : "editorial");
  if (kind === "trek" && model.imageUrl) layout = "polaroid";
  return {
    ...BASE_DESIGN,
    layout,
    pairing: lang === "mr" ? "tiro" : "site",
    includeImage: Boolean(model.imageUrl),
    align: layout === "minimal" || layout === "pullquote" ? "center" : "left",
  };
}

const isHex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/**
 * Clean any partial design (remembered, AI-proposed, from a preset) against the
 * real option lists, onto `base`. Unknown values are dropped, never guessed,
 * and a pairing that cannot set the post's language falls back to the base's.
 */
export function sanitizeDesign(partial, base, lang = "en") {
  const out = { ...base };
  Object.entries(partial || {}).forEach(([key, value]) => {
    if (VALID[key]) {
      if (VALID[key].has(value)) out[key] = value;
    } else if (key === "theme") {
      if (ALL_THEME_IDS.includes(value)) out.theme = value;
    } else if (key === "layout") {
      if (LAYOUT_BY_ID[value]) out.layout = value;
    } else if (key === "pairing") {
      if (PAIRING_BY_ID[value] && pairingSupports(PAIRING_BY_ID[value], lang)) out.pairing = value;
    } else if (key === "aspect") {
      if (ASPECT_BY_ID[value]) out.aspect = value;
    } else if (key === "accent") {
      out.accent = isHex(value) ? value.toLowerCase() : null;
    } else if (typeof BASE_DESIGN[key] === "boolean" && typeof value === "boolean") {
      out[key] = value;
    }
  });
  return out;
}

/** Sentences for the excerpt picker: trimmed, de-duplicated, at most 40. */
export function sentencesOf(text) {
  const seen = new Set();
  return splitSentences(String(text || ""))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 1 && !seen.has(s) && seen.add(s))
    .slice(0, 40);
}

export function applyCase(text, textCase) {
  const s = String(text || "");
  if (textCase === "upper") return s.toUpperCase();
  if (textCase === "lower") return s.toLowerCase();
  if (textCase === "title") return s.toLowerCase().replace(/(^|[\s"“(])(\p{L})/gu, (m, pre, ch) => pre + ch.toUpperCase());
  return s;
}

/**
 * Split text around the first case-insensitive occurrence of `phrase`:
 * [{ text, mark }]. A phrase that is not in the text marks nothing.
 */
export function highlightSegments(text, phrase) {
  const s = String(text || "");
  const p = String(phrase || "").trim();
  if (!p) return [{ text: s, mark: false }];
  const at = s.toLowerCase().indexOf(p.toLowerCase());
  if (at < 0) return [{ text: s, mark: false }];
  return [
    { text: s.slice(0, at), mark: false },
    { text: s.slice(at, at + p.length), mark: true },
    { text: s.slice(at + p.length), mark: false },
  ].filter((seg) => seg.text);
}

/** Body text wrapped in the chosen marks. */
export const quoteWrap = (text, marks) => {
  const [open, close] = QUOTES[marks] || QUOTES.curly;
  return `${open}${text}${close}`;
};

/**
 * Starting type size (px) for a block of text in a box, before the card's own
 * measuring pass shrinks it to fit. Area-based: a glyph at size f takes about
 * 0.5f × f·leading, so f ≈ √(area / (chars × 0.5 × leading)). Clamped per
 * layout, then scaled by S/M/L/XL. For "Fit" height there is no box, so the
 * length alone decides.
 */
export function estimateSize({
  chars, boxW, boxH, leading = 1.38, min = 26, max = 72, size = "auto", fixed = true,
}) {
  const n = Math.max(1, chars);
  let px;
  if (!fixed || !boxH) {
    if (n < 80) px = max;
    else if (n < 200) px = (max + min) / 1.6;
    else if (n < 500) px = (max + min) / 2.3;
    else px = min + 6;
  } else {
    px = Math.sqrt((boxW * boxH * 0.82) / (n * 0.52 * leading));
  }
  px = Math.max(min, Math.min(max, px));
  return Math.round(px * (SIZE_SCALE[size] || 1));
}

/**
 * What the card says once the studio's edits are applied: the edited title and
 * body when present, else the model's. Edits never travel back to the post.
 */
export function cardText(model, edits = {}) {
  const title = edits.title != null ? edits.title : model?.title || "";
  const body = edits.body != null ? edits.body : model?.body || "";
  return { title, body };
}

/** Theme lookup that knows nothing about the post (the card resolves adaptive ones). */
export const themeLabel = (id) => (THEME_BY_ID[id] ? THEME_BY_ID[id].label : { photo: "From photo", tags: "From tags" }[id] || id);
