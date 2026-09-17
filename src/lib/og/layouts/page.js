// Fixed-route card layouts.
//
// All 23 share the frame — eyebrow, headline, then either a stat row or a lede
// — and differ in ONE figure each. That is the point: a section should be
// identifiable by its shape (a shelf, a ridge, a dot grid) before any text is
// legible, which is the only thing that survives a WhatsApp thumbnail.

import { h } from "../h.js";
import { CARD, COLORS, FONTS } from "../tokens.js";
import {
  Frame, Eyebrow, TitleBlock, Lede, StatRow, ChipRow, MetaLine, Footer, PhotoPanel, svgShape,
} from "../primitives.js";
import {
  spineStack, ridgeline, lostTrail, dotMatrix, progressBar, swatchCloud, radialSpokes,
  connectedCurve, slideFan, sparkBars, distanceDial, timelineRail, chatBubbles, versionStack,
} from "./figures.js";

const col = (gap, ...children) => h("div", { style: { display: "flex", flexDirection: "column", gap } }, children);

// Figures that sit bottom-right without disturbing the text column.
const inset = (svg, width, height, { right = 64, bottom = 96, opacity = 1 } = {}) => h("div", {
  style: { position: "absolute", right, bottom, display: "flex", opacity },
}, svgShape(svg, width, height));

// Figures that span the card's full width along the bottom.
const band = (svg, width, height, { bottom = 84, opacity = 1 } = {}) => h("div", {
  style: { position: "absolute", left: 0, bottom, display: "flex", opacity },
}, svgShape(svg, width, height));

// One figure per slug. Returning null is fine — those cards carry their weight
// typographically (the ribbon and accent still brand them).
const FIGURES = {
  home: (m) => (m.photo
    ? h(
      "div",
      { style: { position: "absolute", right: 0, top: 0, display: "flex" } },
      PhotoPanel(m.photo, {
        width: 460, height: CARD.height, accent: m.accent, opacity: 0.6, scrim: "to left",
      })
    )
    : null),

  about: (m) => h(
    "div",
    { style: { position: "absolute", left: 0, top: 0, display: "flex", opacity: 0.35 } },
    PhotoPanel(m.photo, { width: CARD.width, height: CARD.height, accent: m.accent, opacity: 0.5, scrim: "to right" })
  ),

  resume: (m) => inset(timelineRail(4, { width: 60, height: 360, accent: m.accent }), 60, 360, { right: 110, bottom: 130 }),

  ask: (m) => inset(chatBubbles({ width: 620, height: 260, accent: m.accent, lines: 3 }), 620, 260, { right: 40, bottom: 120, opacity: 0.8 }),
  "ask-share": (m) => inset(chatBubbles({ width: 620, height: 260, accent: m.accent, lines: 2 }), 620, 260, { right: 40, bottom: 120, opacity: 0.7 }),

  books: (m) => inset(spineStack(
    (m.figure && m.figure.titles && m.figure.titles.length ? m.figure.titles : ["a", "b", "c", "d", "e", "f", "g", "h"]),
    { width: 520, height: 300, colors: [COLORS.amber, COLORS.orange, COLORS.violetLight, COLORS.teal] },
  ), 520, 300, { right: 64, bottom: 110 }),

  treks: (m) => band(ridgeline((m.figure && m.figure.names) || ["ridge"], {
    width: CARD.width, height: 210, accent: m.accent,
  }), CARD.width, 210, { bottom: 84, opacity: 0.85 }),

  sports: (m) => inset(distanceDial({ size: 280, accent: m.accent }), 280, 280, { right: 72, bottom: 150 }),

  "100-days-to-offload": (m) => inset(dotMatrix((m.figure && m.figure.filled) || 0, {
    total: 100, width: 520, columns: 20, accent: m.accent,
  }), 520, 130, { right: 64, bottom: 140 }),

  challenges: (m) => band(progressBar((m.figure && m.figure.pct) || 0, {
    width: CARD.width - 128, height: 44, accent: m.accent,
  }), CARD.width - 128, 44, { bottom: 150 }),

  tags: (m) => inset(swatchCloud((m.figure && m.figure.tags) || [], { width: 560, height: 260 }), 560, 260, { right: 64, bottom: 120 }),

  mindmap: (m) => inset(radialSpokes((m.figure && m.figure.spokes) || 6, { size: 320, accent: m.accent }), 320, 320, { right: 80, bottom: 130 }),

  "interactive-me": (m) => band(connectedCurve((m.figure && m.figure.nodes) || 9, {
    width: CARD.width, height: 200, accent: m.accent,
  }), CARD.width, 200, { bottom: 90, opacity: 0.8 }),

  presentations: (m) => inset(slideFan({ width: 480, height: 320, accent: m.accent }), 480, 320, { right: 50, bottom: 120, opacity: 0.85 }),

  changelog: (m) => inset(versionStack({ width: 380, height: 250, accent: m.accent }), 380, 250, { right: 72, bottom: 140 }),

  // The one card that shows six numbers: at thumbnail size the grid reads as
  // texture, and at full size every figure is countable.
  stats: (m) => {
    const series = (m.figure && m.figure.series) || [];
    const normalise = (s) => (Array.isArray(s)
      ? s.map((entry) => (Array.isArray(entry) ? entry[1] : entry)).filter((v) => Number.isFinite(Number(v)))
      : []);
    const charts = series.map(normalise).filter((s) => s.length > 1).slice(0, 4);
    if (!charts.length) return null;
    return h("div", {
      style: { position: "absolute", right: 64, bottom: 124, display: "flex", gap: 16 },
    }, charts.map((values, i) => svgShape(
      sparkBars(values, { width: 92, height: 76, accent: [COLORS.cyan, COLORS.teal, COLORS.amber, COLORS.violetLight][i] }),
      92,
      76,
    )));
  },

  notfound: () => band(lostTrail(CARD.width, 280), CARD.width, 280, { bottom: 84, opacity: 0.9 }),

  "writing-ledger": (m) => {
    const months = (m.figure && m.figure.months) || [];
    if (months.length < 2) return null;
    return inset(sparkBars(months, { width: 420, height: 150, accent: m.accent }), 420, 150, { right: 72, bottom: 150 });
  },
};

// A contact sheet of duotone tiles for /instagram and /projects.
//
// Only real photos get a tile. Padding the grid out to six drew empty rounded
// rectangles, which read as a gallery that had failed to load — worse than no
// figure at all on the two cards whose subject is images.
const tileGrid = (photos, { accent, columns = 3, tile = 150, gap = 12 }) => {
  const list = (photos || []).filter(Boolean).slice(0, columns * 2);
  if (!list.length) return null;
  return h("div", {
    style: {
      position: "absolute",
      right: 64,
      bottom: 110,
      display: "flex",
      flexWrap: "wrap",
      width: columns * tile + (columns - 1) * gap,
      gap,
    },
  }, list.map((photo) => PhotoPanel(photo, {
    width: tile, height: tile, accent, opacity: 0.8, scrim: "to top", radius: 8,
  })));
};

FIGURES.instagram = (m) => tileGrid(m.photos, { accent: m.accent });
FIGURES.projects = (m) => tileGrid(m.photos, { accent: m.accent, columns: 2, tile: 170 });

// /stats only: two rows of three. Smaller type than StatRow, because six
// numbers at stat size would not fit — and at thumbnail scale the grid is meant
// to read as texture rather than as six separate figures.
const NumberWall = (stats, accent) => h(
  "div",
  { style: { display: "flex", flexWrap: "wrap", width: 600, gap: 18 } },
  stats.slice(0, 6).map((stat, i) => h(
    "div",
    { key: i, style: { display: "flex", flexDirection: "column", gap: 2, width: 188 } },
    h("div", {
      style: {
        display: "flex", fontFamily: FONTS.body, fontWeight: 700, fontSize: 44, lineHeight: 1, color: accent,
      },
    }, String(stat.value)),
    h("div", {
      style: {
        display: "flex",
        fontFamily: FONTS.label,
        fontWeight: 700,
        fontSize: 18,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        color: COLORS.textFaint,
      },
    }, String(stat.label))
  ))
);

const pickStatDisplay = (model) => (model.slug === "stats"
  ? NumberWall(model.stats, model.accent)
  : StatRow(model.stats.slice(0, 3), { accent: model.accent, gap: 54 }));

export const pageCard = (model) => {
  if (!model) return null;
  const figure = FIGURES[model.slug];
  const bleed = typeof figure === "function" ? figure(model) : null;
  // Leave room for whichever side the figure occupies so text never collides
  // with it. The full-bleed portraits are the exception: text sits over them.
  const textWidth = ["home", "books", "sports", "tags", "mindmap", "presentations", "changelog", "stats", "instagram", "projects", "resume", "ask", "ask-share", "100-days-to-offload", "writing-ledger"]
    .includes(model.slug) ? 620 : CARD.width - 128;

  return Frame({
    accent: model.accent,
    bleed,
    children: [
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 20, width: textWidth } },
        Eyebrow(model.eyebrow, model.accent),
        TitleBlock(model.title, { clamp: 3 }),
        model.lede ? Lede(model.lede, { clamp: 3 }) : null
      ),
      col(
        26,
        model.stats && model.stats.length
          ? pickStatDisplay(model)
          : null,
        model.meta && model.meta.length ? MetaLine(model.meta) : null,
        model.chips && model.chips.length ? ChipRow(model.chips, { accent: model.accent, max: 4 }) : null,
        Footer({ path: model.path, accent: model.accent })
      ),
    ],
  });
};

export { FONTS };
export default pageCard;
