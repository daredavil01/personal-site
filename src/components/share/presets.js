// Named designs, plus the local suggestion ranker that runs for every visitor
// without a network call. Pure (presets.test.js). The owner's AI suggestions
// (src/lib/shareSuggest.js) pick from the same catalogue, so an AI pick is always
// something the studio can draw.

import { hashString } from "../../lib/generativeArt";
import { LAYOUT_BY_ID, LAYOUTS } from "./shareDesign";
import { FAMILIES, THEME_BY_ID, THEMES } from "./themes";
import { PAIRING_BY_ID, PAIRINGS, pairingSupports } from "./typography";

export const PRESETS = [
  {
    id: "redline",
    label: "Redline",
    note: "the site's own look — paper, serif, red bar",
    design: { theme: "light", layout: "editorial", pairing: "site" },
    kinds: ["*"],
  },
  {
    id: "night-thought",
    label: "Night thought",
    note: "a late-night line under the stars",
    design: { theme: "starfield", layout: "minimal", pairing: "cormorant", align: "center", valign: "middle" },
    kinds: ["microblog"],
    mood: ["night", "short"],
  },
  {
    id: "monsoon-diary",
    label: "Monsoon diary",
    note: "rain on slate, a literary serif",
    design: { theme: "monsoon", layout: "pullquote", pairing: "eczar", align: "left" },
    kinds: ["microblog", "blog"],
    mood: ["reflective"],
  },
  {
    id: "zine",
    label: "Zine page",
    note: "photocopied, typewritten, a little rough",
    design: { theme: "photocopy", layout: "column", pairing: "typewriter", frame: "hairline" },
    kinds: ["microblog", "blog", "newsletter-section"],
    mood: ["long"],
  },
  {
    id: "riso-poster",
    label: "Riso poster",
    note: "fluorescent pink-on-blue poster type",
    design: { theme: "riso", layout: "poster", pairing: "archivo", valign: "bottom", textCase: "upper" },
    kinds: ["microblog", "blog", "sport"],
    mood: ["short", "loud"],
  },
  {
    id: "letterpress-quote",
    label: "Letterpress quote",
    note: "pressed serif with hanging quote marks",
    design: { theme: "letterpress", layout: "pullquote", pairing: "fraunces", align: "left" },
    kinds: ["microblog", "book", "ask", "instagram"],
    mood: ["quote"],
  },
  {
    id: "library-card",
    label: "Library card",
    note: "an index card with a coloured spine",
    design: { theme: "ivory", layout: "index", pairing: "typewriter" },
    kinds: ["book"],
  },
  {
    id: "book-jacket",
    label: "Book jacket",
    note: "dark jacket, gold title",
    design: { theme: "noir", layout: "editorial", pairing: "playfair", align: "center", valign: "middle", frame: "double" },
    kinds: ["book"],
  },
  {
    id: "finish-line",
    label: "Finish line",
    note: "a race stub with the time in big numbers",
    design: { theme: "dark", layout: "ticket", pairing: "bebas" },
    kinds: ["sport"],
    mood: ["stats"],
  },
  {
    id: "trail-stub",
    label: "Trail stub",
    note: "a trek ticket on forest green",
    design: { theme: "forest", layout: "ticket", pairing: "grotesk" },
    kinds: ["trek"],
    mood: ["stats"],
  },
  {
    id: "summit-polaroid",
    label: "Summit polaroid",
    note: "the photo as a polaroid with a pen caption",
    design: { theme: "bone", layout: "polaroid", pairing: "caveat", imageFit: "cover" },
    kinds: ["trek", "sport", "instagram"],
    mood: ["photo"],
  },
  {
    id: "warli-tale",
    label: "Warli tale",
    note: "rice-white Warli figures on terracotta",
    design: { theme: "warli", layout: "editorial", pairing: "kalam", align: "center", valign: "middle" },
    kinds: ["microblog", "trek", "blog"],
    mood: ["marathi"],
  },
  {
    id: "paithani",
    label: "Paithani",
    note: "peacock silk, gold border, Rozha display",
    design: { theme: "paithani", layout: "pullquote", pairing: "rozha", align: "center", valign: "middle" },
    kinds: ["microblog", "book", "blog"],
    mood: ["marathi", "quote"],
  },
  {
    id: "kolam-morning",
    label: "Kolam morning",
    note: "dotted kolam on a dark floor, Tiro serif",
    design: { theme: "kolam", layout: "minimal", pairing: "tiro", align: "center", valign: "middle" },
    kinds: ["microblog"],
    mood: ["marathi", "short"],
  },
  {
    id: "terminal",
    label: "Terminal",
    note: "green phosphor, monospace",
    design: { theme: "terminal", layout: "note", pairing: "mono" },
    kinds: ["ask", "microblog"],
    mood: ["tech"],
  },
  {
    id: "front-page",
    label: "Front page",
    note: "newsprint column with a drop cap",
    design: { theme: "newsprint", layout: "column", pairing: "playfair" },
    kinds: ["blog", "newsletter", "ask"],
    mood: ["long"],
  },
  {
    id: "dear-reader",
    label: "Dear reader",
    note: "a letter on ivory, signed",
    design: { theme: "ivory", layout: "letter", pairing: "dmserif" },
    kinds: ["newsletter", "blog"],
  },
  {
    id: "sunset-poster",
    label: "Sunset poster",
    note: "big words on a plum-to-coral mesh",
    design: { theme: "sunset", layout: "poster", pairing: "bricolage", valign: "bottom" },
    kinds: ["microblog", "sport", "newsletter", "instagram"],
    mood: ["short", "loud"],
  },
  {
    id: "notebook",
    label: "Notebook page",
    note: "ruled paper in pen handwriting",
    design: { theme: "notebook", layout: "editorial", pairing: "caveat" },
    kinds: ["microblog", "book"],
    mood: ["personal"],
  },
  {
    id: "swiss",
    label: "Swiss grid",
    note: "grotesk on a column grid, signal orange",
    design: { theme: "swiss", layout: "editorial", pairing: "grotesk", textCase: "none" },
    kinds: ["*"],
  },
  {
    id: "film-still",
    label: "Film still",
    note: "photo full-bleed, grain, narrow serif",
    design: { theme: "film", layout: "polaroid", pairing: "instrument", imageFit: "cover" },
    kinds: ["trek", "sport", "instagram", "microblog"],
    mood: ["photo"],
  },
  {
    id: "saffron-shout",
    label: "Saffron",
    note: "marigold ground, brush display",
    design: { theme: "saffron", layout: "poster", pairing: "yatra", valign: "middle", align: "center" },
    kinds: ["microblog", "sport"],
    mood: ["marathi", "loud"],
  },
];

export const PRESET_BY_ID = Object.fromEntries(PRESETS.map((p) => [p.id, p]));

// Latin-only pairings swapped for the closest Devanagari one on a Marathi post.
const DEVA_SWAP = {
  site: "tiro",
  fraunces: "eczar",
  playfair: "rozha",
  dmserif: "rozha",
  instrument: "gotu",
  cormorant: "tiro",
  grotesk: "poppins",
  bricolage: "baloo",
  archivo: "yatra",
  bebas: "yatra",
  mono: "mukta",
  typewriter: "mukta",
  caveat: "kalam",
  dancing: "amita",
  shadows: "kalam",
};

/** A pairing that can set this language: itself, or its Devanagari stand-in. */
export function pairingForLang(id, lang) {
  const p = PAIRING_BY_ID[id];
  if (p && pairingSupports(p, lang)) return id;
  return lang === "mr" ? DEVA_SWAP[id] || "tiro" : "site";
}

/** The design a preset produces for this post's language. */
export function presetDesign(preset, lang) {
  const design = { ...preset.design };
  if (design.pairing) design.pairing = pairingForLang(design.pairing, lang);
  return design;
}

const DEVA_DIGITS = "०१२३४५६७८९";
const latinDigits = (s) => String(s).replace(/[०-९]/g, (d) => String(DEVA_DIGITS.indexOf(d)));

/**
 * The hour a micro-post was written, from its own signature
 * (`#25:09:2021::11:37:pm`, either script). Only a time inside a `#…::` / `::`
 * signature counts — never one in prose. Null when there is none.
 */
export function postHour(text) {
  const m = latinDigits(text).match(/::\s*(\d{1,2}):(\d{2})(?::|\s*)(am|pm)/i);
  if (!m) return null;
  const h = Number(m[1]) % 12;
  return m[3].toLowerCase() === "pm" ? h + 12 : h;
}

const fits = (preset, kind) => preset.kinds.includes("*") || preset.kinds.includes(kind);

/**
 * Rank the presets for one post, with a reason for each pick, all on the
 * device. Signals: kind, language, length, photo, the hour in a micro-post's
 * signature, and tags. Ties break on a hash of the post, so two posts of the
 * same kind and length do not always get the same six.
 */
export function localSuggestions(kind, model = {}, { lang = "en", limit = 6 } = {}) {
  const text = `${model.title || ""} ${model.body || ""}`.trim();
  const len = text.length;
  const hour = kind === "microblog" ? postHour(model.body) : null;
  const night = hour != null && (hour >= 21 || hour < 5);
  const tags = (model.tags || []).map((t) => String(t).toLowerCase());
  const hasPhoto = Boolean(model.imageUrl);
  const hasStats = (model.stats || []).length > 0;
  const seed = String(model.footerUrl || text.slice(0, 40));

  const scored = PRESETS.map((preset) => {
    const mood = preset.mood || [];
    const { layout } = preset.design;
    let score = 0;
    const why = [];
    if (fits(preset, kind)) { score += 3; } else { score -= 4; }
    if (preset.kinds.includes(kind)) why.push(`made for ${kind === "sport" ? "races" : `${kind}s`}`);
    if (lang === "mr" && mood.includes("marathi")) { score += 3; why.unshift("set in a Marathi face"); }
    if (len && len < 140 && (mood.includes("short") || ["poster", "pullquote", "minimal"].includes(layout))) {
      score += 2; why.push("short enough to set large");
    }
    if (len > 520 && (mood.includes("long") || ["column", "editorial", "letter"].includes(layout))) {
      score += 2; why.push("a column holds the long text");
    }
    if (len > 520 && ["poster", "minimal"].includes(layout)) score -= 3;
    if (layout === "polaroid") {
      if (hasPhoto) { score += 2; why.unshift("puts the photo first"); } else score -= 6;
    }
    if (layout === "ticket") {
      if (hasStats) { score += 2; why.unshift("the numbers, big"); } else score -= 6;
    }
    if (night && mood.includes("night")) { score += 3; why.unshift(`written at ${hour}:00 — a night card`); }
    if (model.quote && mood.includes("quote")) { score += 2; why.push("it is a quote"); }
    if (tags.some((t) => /code|tech|ai|software|programming/.test(t)) && mood.includes("tech")) { score += 2; why.push("tagged tech"); }
    if (tags.some((t) => /run|marathon|ultra|sport/.test(t)) && ["ticket", "poster"].includes(layout)) score += 1;
    if (tags.some((t) => /love|poem|calm|life/.test(t)) && mood.includes("personal")) { score += 1; why.push("personal in tone"); }
    const jitter = (hashString(`${seed}:${preset.id}`) % 100) / 100;
    return {
      preset, score: score + jitter, why: why[0] || preset.note,
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ preset, why }) => ({
      id: preset.id, label: preset.label, why, design: presetDesign(preset, lang),
    }));
}

/**
 * Everything the AI may choose from, as compact lines. The endpoint filters
 * the answer back against the same ids, so a model cannot invent a theme.
 */
export function designCatalogue() {
  return {
    presets: PRESETS.map((p) => ({ id: p.id, note: `${p.label}: ${p.note}` })),
    themes: THEMES.map((t) => ({ id: t.id, note: `${t.label} (${FAMILIES.find((f) => f.id === t.family)?.label}, ${t.dark ? "dark" : "light"}) — ${t.note}` })),
    layouts: LAYOUTS.map((l) => ({ id: l.id, note: `${l.label} — ${l.note}` })),
    pairings: PAIRINGS.map((p) => ({ id: p.id, note: `${p.label} — ${p.note}${p.scripts.includes("devanagari") ? " (Marathi + English)" : " (English only)"}` })),
  };
}

export const isKnown = {
  preset: (id) => Boolean(PRESET_BY_ID[id]),
  theme: (id) => Boolean(THEME_BY_ID[id]),
  layout: (id) => Boolean(LAYOUT_BY_ID[id]),
  pairing: (id) => Boolean(PAIRING_BY_ID[id]),
};
