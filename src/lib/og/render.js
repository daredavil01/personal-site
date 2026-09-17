// Renders a card: satori lays out the element tree into SVG, then a rasteriser
// turns that into PNG bytes.
//
// `satori` and `rasterise` are INJECTED rather than imported. That is what lets
// the same layouts serve the Worker (resvg compiled from a bundled WASM module)
// and `npm run og:preview` (the same WASM, instantiated under Node), and it is
// the seam a pre-render build step would plug into if on-demand rendering ever
// proves too expensive. No layout file imports a renderer.

import { CARD } from "./tokens.js";

export async function renderSvg(element, { satori, fonts }) {
  return satori(element, { width: CARD.width, height: CARD.height, fonts });
}

export async function renderCard(element, { satori, rasterise, fonts }) {
  const svg = await renderSvg(element, { satori, fonts });
  return rasterise(svg);
}

export default renderCard;
