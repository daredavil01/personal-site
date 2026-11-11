import React, { memo } from "react";
import { GRAIN, themeFor } from "./themes";
import { pairingFor } from "./typography";
import { LAYOUT_COMPONENTS } from "./layouts";
import {
  ASPECT_BY_ID, BASE_DESIGN, CARD_W, LEADING, PADDING_PX, TRACKING, applyCase, cardText, estimateSize,
} from "./shareDesign";

// Faint binary texture echoing the site logo art, used by the abstract theme.
const BINARY_TEXTURE = "01001101 01010011 01010100 00100110 ".repeat(240);

const stripLinks = (text) => String(text || "")
  .replace(/https?:\/\/\S+/g, "")
  .replace(/[ \t]+\n/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const FRAMES = {
  hairline: (t) => ({ border: `2px solid ${t.rule}` }),
  double: (t, accent) => ({ border: `7px double ${accent}` }),
  mat: (t) => ({ border: `3px solid ${t.ink}`, boxShadow: `0 0 0 18px ${t.panel || t.base}, 0 0 0 20px ${t.rule}` }),
  rounded: (t) => ({ border: `2px solid ${t.rule}`, borderRadius: 48 }),
};

/**
 * Resolve the design into the context every layout reads: theme tokens, fonts,
 * sizes and the text after edits. Exported for the tests.
 */
export function cardContext({
  model, design, edits = {}, colors = {},
}) {
  const d = { ...BASE_DESIGN, ...design };
  const t = themeFor(d.theme, colors);
  const pf = pairingFor(d.pairing);
  const aspect = ASPECT_BY_ID[d.aspect] || ASPECT_BY_ID.portrait;
  const H = aspect.h;
  const P = PADDING_PX[d.padding] || PADDING_PX.m;
  // Bare links read as noise on a picture, and the footer already carries the
  // post's own address. Only the stored text is cleaned; an edit stays as typed.
  const raw = cardText({ ...model, body: stripLinks(model.body) }, edits);
  const title = applyCase(raw.title, d.textCase);
  const body = applyCase(raw.body, d.textCase);
  const leading = LEADING[d.leading] || LEADING.normal;
  const fixed = Boolean(H);
  const showHero = d.includeImage && Boolean(model.imageUrl);
  const boxH = H ? H * (showHero ? 0.4 : 0.58) : null;
  const bodySize = estimateSize({
    chars: body.length || title.length, boxW: CARD_W - 2 * P, boxH, leading, min: 30, max: 64, size: d.size, fixed,
  });
  const posterSize = estimateSize({
    chars: (body && body.length <= 280 ? body : title || body).length,
    boxW: CARD_W - 2 * P,
    boxH: H ? H * (showHero ? 0.5 : 0.62) : null,
    leading: 1.05,
    min: 48,
    max: 168,
    size: d.size,
    fixed,
  });
  return {
    d,
    t,
    pf,
    m: model,
    H,
    P,
    fixed,
    title,
    body,
    leading,
    tracking: TRACKING[d.tracking] || "0",
    accent: d.accent || t.accent,
    highlight: edits.highlight || "",
    showHero,
    bodySize,
    posterSize,
    tagColor: colors.tagColor || null,
    // Anything that changes what has to fit. FitBox re-measures when it moves.
    fitKey: JSON.stringify([d, title, body, edits.highlight, colors.photoColor, colors.tagColor]),
  };
}

// The share card: 1080 px wide, a fixed frame per aspect (or as tall as the
// text for "Fit"), drawn by one of the ten layouts over the theme's ground,
// texture and grain. Presentational only — the studio owns every choice.
const ShareCard = ({
  model, design, edits, colors,
}) => {
  if (!model) return null;
  const c = cardContext({
    model, design, edits, colors,
  });
  const { t, d } = c;
  const Layout = LAYOUT_COMPONENTS[d.layout] || LAYOUT_COMPONENTS.editorial;
  const frame = FRAMES[d.frame];
  const inset = Math.round(c.P * 0.42);

  return (
    <div
      style={{
        width: CARD_W,
        height: c.H || undefined,
        minHeight: c.H ? undefined : 900,
        background: t.background,
        color: t.ink,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: c.pf.body,
      }}
    >
      {t.overlay ? <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", ...t.overlay }} /> : null}
      {t.binary ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, padding: 24, wordBreak: "break-all", fontFamily: "monospace", fontSize: 30, lineHeight: 1, color: "#fff", opacity: 0.05, pointerEvents: "none",
          }}
        >
          {BINARY_TEXTURE}
        </div>
      ) : null}
      <Layout c={c} />
      {t.grain ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, pointerEvents: "none", ...GRAIN(t.grain, t.dark),
          }}
        />
      ) : null}
      {frame ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset, pointerEvents: "none", ...frame(t, c.accent),
          }}
        />
      ) : null}
    </div>
  );
};

export default memo(ShareCard);
