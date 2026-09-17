// Renders a card: satori lays out the element tree into SVG, then a rasteriser
// turns that into PNG bytes.
//
// `satori` and `rasterise` are INJECTED rather than imported, so no layout file
// and nothing under src/ pulls in a renderer: only scripts/og-preview.mjs does,
// which is what keeps satori and resvg out of the browser bundle and out of the
// Worker entirely.

import { CARD } from "./tokens.js";

export async function renderSvg(element, { satori, fonts }) {
  return satori(element, { width: CARD.width, height: CARD.height, fonts });
}

export async function renderCard(element, { satori, rasterise, fonts }) {
  const svg = await renderSvg(element, { satori, fonts });
  return rasterise(svg);
}

export default renderCard;
