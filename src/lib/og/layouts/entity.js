// Per-entity card layouts. Each family gets its own composition — the card
// should be recognisable as "a race" or "a trek" before any text is readable.
//
// Every photo layout is built so it still reads with no photo: the image sits
// inside a tinted PhotoPanel, so a failed fetch degrades to a coloured ground
// rather than a hole. That is deliberate — the endpoint renders whether or not
// Supabase Storage answers in time.

import { h } from "../h.js";
import { CARD, SAFE, COLORS, FONTS, TYPE, accentFor } from "../tokens.js";
import {
  Frame, Eyebrow, TitleBlock, Lede, StatRow, ChipRow, MetaLine, Footer, PhotoPanel, ArtField, svgShape,
} from "../primitives.js";
import { ridgeline, bookPlate, slideFan, browserChrome, hashMark, chatBubbles } from "./figures.js";

const col = (gap, ...children) => h("div", { style: { display: "flex", flexDirection: "column", gap } }, children);
const row = (gap, ...children) => h("div", { style: { display: "flex", alignItems: "center", gap } }, children);

// A status/difficulty pill. Endurance and project status both map to a
// traffic-light colour so the card carries the grade at a glance.
const BADGE_COLORS = {
  easy: COLORS.teal,
  medium: COLORS.amber,
  hard: COLORS.red,
  live: COLORS.teal,
  "in progress": COLORS.amber,
  archived: COLORS.textFaint,
  concept: COLORS.violetLight,
};

const Badge = (label, fallback) => {
  const key = String(label || "").toLowerCase();
  const color = BADGE_COLORS[key] || fallback;
  return h("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 18,
      paddingRight: 18,
      borderRadius: 999,
      background: color,
      color: COLORS.ink,
      fontFamily: FONTS.label,
      fontWeight: 700,
      fontSize: 22,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
  }, String(label));
};

// Spine + plate. The generated plate stands in for a cover the library does not
// store, and its hue is hashed from the title so a book always gets the same one.
const bookCard = (m) => Frame({
  accent: m.accent,
  children: [
    row(
      48,
      svgShape(bookPlate(m.title, { width: 240, height: 340, accent: m.accent }), 240, 340, { borderRadius: 6 }),
      col(
        18,
        Eyebrow(m.eyebrow, m.accent),
        TitleBlock(m.title, { clamp: 2 }),
        m.subtitle ? Lede(m.subtitle, { size: 30, clamp: 1 }) : null,
        m.meta && m.meta.length ? MetaLine(m.meta) : null,
      )
    ),
    col(
      26,
      m.chips && m.chips.length ? ChipRow(m.chips, { accent: m.accent, max: 3 }) : null,
      Footer({ path: m.path, accent: m.accent }),
    ),
  ],
});

// Numbered essay plate: the challenge day as an oversized outline numeral.
const blogCard = (m) => Frame({
  accent: m.accent,
  bleed: h("div", {
    style: {
      position: "absolute",
      right: -40,
      top: -30,
      display: "flex",
      fontFamily: FONTS.headline,
      fontWeight: 700,
      fontSize: 420,
      lineHeight: 1,
      color: m.accent,
      opacity: 0.14,
    },
  }, m.dayLabel || "100"),
  children: [
    col(20, Eyebrow(m.eyebrow, m.accent), TitleBlock(m.title, { clamp: 3 })),
    col(
      24,
      m.lede ? Lede(m.lede, { clamp: 2 }) : null,
      m.meta && m.meta.length ? MetaLine(m.meta) : null,
      m.chips && m.chips.length ? ChipRow(m.chips, { accent: m.accent, max: 3 }) : null,
      Footer({ path: m.path, accent: m.accent }),
    ),
  ],
});

// Split-time bib: the finish time is the hero, because that is what a race
// result is actually about.
const sportCard = (m) => Frame({
  accent: m.accent,
  bleed: PhotoPanel(m.photo, {
    width: CARD.width, height: CARD.height, accent: m.accent, opacity: 0.4, scrim: "to right",
  }),
  children: [
    col(
      16,
      Eyebrow(m.eyebrow, m.accent),
      TitleBlock(m.title, { clamp: 2 }),
      m.subtitle ? Lede(m.subtitle, { size: 28, clamp: 1 }) : null,
    ),
    col(
      26,
      m.stats && m.stats.length ? StatRow(m.stats, { accent: m.accent, gap: 64 }) : null,
      Footer({ path: m.path, note: (m.meta || [])[0] || "", accent: m.accent }),
    ),
  ],
});

// Summit card. With a photo, the photo IS the mountain — drawing the ridge on
// top of it put two competing mountain silhouettes on one card, and the "to
// top" scrim left the headline sitting on the bright part of the sky. With no
// photo, the ridge carries the card instead.
const trekCard = (m) => Frame({
  accent: m.accent,
  bleed: m.photo
    ? h(
      "div",
      { style: { position: "absolute", top: 0, left: 0, display: "flex" } },
      PhotoPanel(m.photo, {
        width: CARD.width,
        height: CARD.height,
        accent: m.accent,
        opacity: 0.5,
        // Dark on the left, where every line of text is.
        scrim: "to right",
      })
    )
    : h(
      "div",
      { style: { position: "absolute", left: 0, bottom: 84, display: "flex", opacity: 0.9 } },
      svgShape(ridgeline((m.figure && m.figure.names) || ["ridge"], {
        width: CARD.width, height: 220, accent: m.accent,
      }), CARD.width, 220)
    ),
  children: [
    col(
      16,
      Eyebrow(m.eyebrow, m.accent),
      TitleBlock(m.title, { clamp: 2 }),
      m.badge ? row(14, Badge(m.badge, m.accent)) : null
    ),
    col(
      22,
      m.meta && m.meta.length ? MetaLine(m.meta, { color: COLORS.textDim }) : null,
      Footer({ path: m.path, accent: m.accent })
    ),
  ],
});

// Browser chrome around the screenshot — a project is a thing you open.
const projectCard = (m) => Frame({
  accent: m.accent,
  children: [
    row(
      44,
      col(
        18,
        Eyebrow(m.eyebrow, m.accent),
        TitleBlock(m.title, { clamp: 2 }),
        m.subtitle ? Lede(m.subtitle, { size: 28, clamp: 2 }) : null,
        m.badge ? row(12, Badge(m.badge, m.accent)) : null,
      ),
      h(
        "div",
        { style: { display: "flex", position: "relative", width: 480, height: 300 } },
        PhotoPanel(m.photo, {
          width: 480, height: 300, accent: m.accent, opacity: 0.75, scrim: "to top", radius: 14,
        }),
        h(
          "div",
          { style: { position: "absolute", top: 0, left: 0, display: "flex" } },
          svgShape(browserChrome({ width: 480, height: 300, accent: m.accent }), 480, 300)
        )
      ),
    ),
    col(
      24,
      m.chips && m.chips.length ? ChipRow(m.chips, { accent: m.accent, max: 4 }) : null,
      Footer({ path: m.path, accent: m.accent }),
    ),
  ],
});

// The deck's own title slide, with two blanks fanned behind it.
const presentationCard = (m) => Frame({
  accent: m.accent,
  bleed: h(
    "div",
    { style: { position: "absolute", right: -30, top: 150, display: "flex", opacity: 0.6 } },
    svgShape(slideFan({ width: 520, height: 340, accent: m.accent }), 520, 340)
  ),
  children: [
    col(20, Eyebrow(m.eyebrow, m.accent), TitleBlock(m.title, { clamp: 3 })),
    col(
      24,
      m.lede ? Lede(m.lede, { clamp: 2 }) : null,
      m.meta && m.meta.length ? MetaLine(m.meta) : null,
      m.chips && m.chips.length ? ChipRow(m.chips, { accent: m.accent, max: 3 }) : null,
      Footer({ path: m.path, accent: m.accent }),
    ),
  ],
});

// The pinboard card, enlarged. Art when there is no photo, photo when there is.
const microblogCard = (m) => Frame({
  accent: m.accent,
  bleed: m.photo
    ? PhotoPanel(m.photo, {
      width: CARD.width, height: CARD.height, accent: m.accent, opacity: 0.4, scrim: "to right",
    })
    : h(
      "div",
      { style: { position: "absolute", right: 0, top: 0, display: "flex", opacity: 0.5 } },
      ArtField(m.art && m.art.shapes, { width: 560, height: CARD.height })
    ),
  children: [
    col(18, Eyebrow(m.eyebrow, m.accent)),
    h(
      "div",
      { style: { display: "flex", width: m.photo ? 700 : 620 } },
      h("div", {
        style: {
          display: "flex",
          fontFamily: m.quote ? FONTS.headline : FONTS.body,
          fontStyle: m.quote ? "italic" : "normal",
          fontWeight: m.quote ? 400 : 400,
          fontSize: 44,
          lineHeight: 1.3,
          color: COLORS.text,
          lineClamp: 5,
        },
      }, m.quote ? `“${m.body}”` : m.body)
    ),
    col(
      22,
      m.chips && m.chips.length ? ChipRow(m.chips, { accent: m.accent, max: 3 }) : null,
      Footer({ path: m.path, note: m.footerNote, accent: m.accent }),
    ),
  ],
});

// Tag hero: the tag's own colour floods the card, with a # watermark.
const tagCard = (m) => {
  const accent = m.color || m.accent || accentFor("tag");
  return Frame({
    accent,
    bleed: h(
      "div",
      // Low and faint: at 0.5 opacity it muddied the ground, and the lede ran
      // straight through it.
      { style: { position: "absolute", right: 56, bottom: 96, display: "flex", opacity: 0.2 } },
      svgShape(hashMark(accent, { size: 290 }), 290, 290)
    ),
    children: [
      col(
        18,
        Eyebrow(m.subtitle ? `Tag · ${m.subtitle}` : m.eyebrow, accent),
        TitleBlock(m.title, { clamp: 2 }),
        m.lede ? Lede(m.lede, { clamp: 2 }) : null,
      ),
      col(
        26,
        m.stats && m.stats.length ? StatRow(m.stats, { accent, gap: 52 }) : null,
        Footer({ path: m.path, note: m.footerNote, accent }),
      ),
    ],
  });
};

// A shared conversation. The opening question is the whole point of the card.
const askShareCard = (m) => Frame({
  accent: m.accent,
  bleed: h(
    "div",
    { style: { position: "absolute", right: -120, bottom: 40, display: "flex", opacity: 0.35 } },
    svgShape(chatBubbles({ width: 760, height: 280, accent: m.accent, lines: 3 }), 760, 280)
  ),
  children: [
    col(
      20,
      Eyebrow(m.eyebrow, m.accent),
      h("div", {
        style: {
          display: "flex",
          width: 900,
          fontFamily: FONTS.headline,
          fontWeight: 700,
          fontSize: 56,
          lineHeight: 1.16,
          color: COLORS.text,
          lineClamp: 3,
        },
      }, `“${m.title}”`),
    ),
    col(
      24,
      m.stats && m.stats.length ? StatRow(m.stats, { accent: m.accent, gap: 52, size: 40 }) : null,
      Footer({ path: m.path, accent: m.accent }),
    ),
  ],
});

export const ENTITY_LAYOUTS = {
  book: bookCard,
  blog: blogCard,
  sport: sportCard,
  trek: trekCard,
  project: projectCard,
  presentation: presentationCard,
  microblog: microblogCard,
  tag: tagCard,
  "ask-share": askShareCard,
};

export const entityCard = (model) => {
  const layout = ENTITY_LAYOUTS[model && model.kind];
  return layout ? layout(model) : null;
};

export { SAFE, TYPE };
export default entityCard;
