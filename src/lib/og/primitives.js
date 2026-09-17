// Shared card furniture. Every layout composes these so cards differ in
// structure, not in branding.
//
// Satori supports a subset of CSS: flexbox, absolute positioning, gradients,
// border-radius, transforms and `<img>`. It has no blend modes and no CSS
// filters, so the "duotone" treatment is built from a tinted ground, a
// low-opacity photo and a gradient scrim — see `PhotoPanel`.

import { h } from "./h.js";
import { CARD, SAFE, COLORS, RIBBON, FONTS, TITLE_STEPS, TYPE } from "./tokens.js";

// An SVG string as an <img>. Satori can lay out an image but cannot lay out raw
// SVG children, so anything path-based (ridgelines, rings, node graphs) is
// serialised and handed over this way. utf-8 data URIs avoid btoa's unicode trap.
export const svgImg = (svg, style = {}) => h("img", {
  src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  style,
});

const wrapSvg = (inner, w, h2) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h2}" viewBox="0 0 ${w} ${h2}">${inner}</svg>`;

export const svgShape = (inner, w, h2, style) => svgImg(wrapSvg(inner, w, h2), { width: w, height: h2, ...style });

// --- text -------------------------------------------------------------------

export const Eyebrow = (label, accent = COLORS.violetLight) => h(
  "div",
  {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      fontFamily: FONTS.label,
      fontWeight: TYPE.eyebrow.weight,
      fontSize: TYPE.eyebrow.size,
      letterSpacing: TYPE.eyebrow.tracking,
      textTransform: "uppercase",
      color: accent,
    },
  },
  h("div", { style: { width: 34, height: 4, borderRadius: 2, background: accent } }),
  h("div", {}, String(label || ""))
);

// Headline. The size steps down by length (TITLE_STEPS) so a 12-character fort
// name and a 90-character book title both fill the card without overflowing.
// `clamp` caps the line count, because satori will happily push text off-card.
export const TitleBlock = (title, { color = COLORS.text, clamp = 3, weight = 700 } = {}) => {
  const value = String(title || "").trim();
  const step = TITLE_STEPS.find((s) => value.length <= s.max) || TITLE_STEPS[TITLE_STEPS.length - 1];
  return h("div", {
    style: {
      display: "flex",
      fontFamily: FONTS.headline,
      fontWeight: weight,
      fontSize: step.size,
      lineHeight: step.lineHeight,
      color,
      // `lineClamp` is a satori extension; it truncates with an ellipsis rather
      // than letting a long title run past the card edge.
      lineClamp: clamp,
    },
  }, value);
};

export const Lede = (value, { color = COLORS.textDim, size = TYPE.lede.size, clamp = 3 } = {}) => h("div", {
  style: {
    display: "flex",
    fontFamily: FONTS.body,
    fontWeight: 400,
    fontSize: size,
    lineHeight: 1.36,
    color,
    lineClamp: clamp,
  },
}, String(value || ""));

// --- data display -----------------------------------------------------------

// `stats` = [{ value, label }]. Three is the readable maximum at thumbnail
// size; `/stats` is the one card that deliberately shows six as texture.
export const StatRow = (stats, { accent = COLORS.violetLight, gap = 56, size } = {}) => h(
  "div",
  {
    style: { display: "flex", alignItems: "flex-end", gap },
  },
  (stats || []).filter(Boolean).map((stat, i) => h(
    "div",
    {
      key: i,
      style: { display: "flex", flexDirection: "column", gap: 6 },
    },
    h("div", {
      style: {
        display: "flex",
        fontFamily: FONTS.body,
        fontWeight: TYPE.stat.weight,
        fontSize: size || TYPE.stat.size,
        lineHeight: 1,
        color: accent,
      },
    }, String(stat.value)),
    h("div", {
      style: {
        display: "flex",
        fontFamily: FONTS.label,
        fontWeight: TYPE.statLabel.weight,
        fontSize: TYPE.statLabel.size,
        letterSpacing: TYPE.statLabel.tracking,
        textTransform: "uppercase",
        color: COLORS.textFaint,
      },
    }, String(stat.label))
  ))
);

export const Chip = (label, { accent = COLORS.violetLight, filled = false } = {}) => h("div", {
  style: {
    display: "flex",
    alignItems: "center",
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 20,
    paddingRight: 20,
    borderRadius: 999,
    border: `2px solid ${filled ? accent : COLORS.panelEdge}`,
    background: filled ? accent : "transparent",
    color: filled ? COLORS.ink : COLORS.textDim,
    fontFamily: FONTS.label,
    fontWeight: TYPE.chip.weight,
    fontSize: TYPE.chip.size,
    lineClamp: 1,
  },
}, String(label || ""));

export const ChipRow = (labels, { accent, max = 4, filledFirst = false } = {}) => h(
  "div",
  {
    style: { display: "flex", gap: 12, flexWrap: "nowrap", overflow: "hidden" },
  },
  (labels || []).filter(Boolean).slice(0, max)
    .map((label, i) => Chip(label, { accent, filled: filledFirst && i === 0 }))
);

export const MetaLine = (parts, { color = COLORS.textFaint, size = TYPE.meta.size } = {}) => h("div", {
  style: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    fontFamily: FONTS.body,
    fontSize: size,
    color,
    lineClamp: 1,
  },
}, (parts || []).filter(Boolean).join("  ·  "));

// --- imagery ----------------------------------------------------------------

// Duotone-ish photo panel. Satori has no blend modes, so this is: an
// accent-tinted ground, the photo at reduced opacity on top, then a gradient
// scrim toward the ink so overlaid text always has contrast.
//
// A card whose photo fails to load still renders — it just shows the tinted
// ground, which is why every photo layout is legible without its photo.
export const PhotoPanel = (url, {
  width = CARD.width,
  height = CARD.height,
  accent = COLORS.teal,
  opacity = 0.55,
  scrim = "to top",
  radius = 0,
} = {}) => h(
  "div",
  {
    style: {
      display: "flex",
      position: "relative",
      width,
      height,
      borderRadius: radius,
      overflow: "hidden",
      background: COLORS.ink,
    },
  },
  // The accent wash. Strong under a photo (that is what makes it read as
  // duotone) but only a hint without one — a full-strength flood would swamp
  // the brand ground and every photoless card would look like a colour swatch.
  h("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      display: "flex",
      width,
      height,
      background: accent,
      opacity: url ? 0.85 : 0.18,
    },
  }),
  url
    ? h("img", {
      src: url,
      style: { position: "absolute", top: 0, left: 0, width, height, objectFit: "cover", opacity },
    })
    : null,
  h("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      display: "flex",
      width,
      height,
      background: `linear-gradient(${scrim}, ${COLORS.ink} 0%, rgba(19,16,30,0.55) 45%, rgba(19,16,30,0.05) 100%)`,
    },
  })
);

// Renders `postArt`'s shape descriptors (src/lib/generativeArt.js) as an SVG
// image. Reused UNCHANGED from the micro-blog pinboard: the shapes are already
// in a 100x100 viewBox, so only a scale is needed.
export const ArtField = (shapes, { width, height, opacity = 1 } = {}) => {
  const inner = (shapes || []).map((s) => {
    if (s.kind === "circle") {
      return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${s.fill}" opacity="${s.opacity}"/>`;
    }
    return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.fill}" opacity="${s.opacity}" transform="rotate(${s.rotate} ${s.x + s.w / 2} ${s.y + s.h / 2})"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 100 100" preserveAspectRatio="none">${inner}</svg>`;
  return svgImg(svg, { width, height, opacity });
};

// --- frame ------------------------------------------------------------------

export const Ribbon = ({ width = CARD.width, height = 8 } = {}) => h("div", {
  style: {
    display: "flex",
    width,
    height,
    background: `linear-gradient(to right, ${RIBBON.join(", ")})`,
  },
});

export const Footer = ({ path = "", note = "", accent = COLORS.violetLight } = {}) => h(
  "div",
  {
    style: {
      display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 24,
    },
  },
  h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        // A long path (a Marathi tag name, say) must not run under the note.
        overflow: "hidden",
        fontFamily: FONTS.label,
        fontWeight: 700,
        fontSize: TYPE.footer.size,
        letterSpacing: 0.6,
        color: COLORS.textDim,
      },
    },
    h("div", { style: { display: "flex", width: 10, height: 10, borderRadius: 5, background: accent, flexShrink: 0 } }),
    h("div", { style: { display: "flex", lineClamp: 1 } }, `sankettambare.in${path || ""}`)
  ),
  note
    ? h("div", {
      style: {
        display: "flex",
        flexShrink: 0,
        fontFamily: FONTS.body,
        fontSize: TYPE.footer.size,
        color: COLORS.textFaint,
        lineClamp: 1,
      },
    }, String(note))
    : null
);

// The card root. Everything sits inside SAFE so a platform that shaves a few
// pixels off the edge never clips a word.
export const Frame = ({ accent = COLORS.violetLight, background, children, bleed = null, padded = true }) => h(
  "div",
  {
    style: {
      display: "flex",
      position: "relative",
      width: CARD.width,
      height: CARD.height,
      background: background || `radial-gradient(circle at 18% 12%, ${COLORS.panel} 0%, ${COLORS.ink} 62%)`,
      color: COLORS.text,
      fontFamily: FONTS.body,
      overflow: "hidden",
    },
  },
  // The bleed slot is always taken out of flow. A layout that passed a
  // `position: relative` element here (PhotoPanel at full card size, say) would
  // otherwise consume the frame's flex row and push the content column off the
  // canvas — which rendered the race card completely blank. Sized to the full
  // card so absolutely-positioned figures inside still offset against it.
  bleed
    ? h("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        display: "flex",
        width: CARD.width,
        height: CARD.height,
      },
    }, bleed)
    : null,
  h("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      position: "relative",
      width: "100%",
      height: "100%",
      padding: padded ? SAFE : 0,
    },
  }, children),
  h("div", { style: { position: "absolute", left: 0, bottom: 0, display: "flex" } }, Ribbon({})),
  h("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      display: "flex",
      width: CARD.width,
      height: 4,
      background: accent,
    },
  })
);

export default Frame;
