// The card renderer, shared by `npm run og:fallbacks` (scripts/og-preview.mjs)
// and `npm run newsletter:draft`. Node-only: satori and resvg are
// devDependencies precisely so nothing renders at the edge (docs/og-cards.md).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

import { FONT_FACES, FONT_DIR } from "../../src/lib/og/fonts.js";
import { renderCard } from "../../src/lib/og/render.js";
import { CARD } from "../../src/lib/og/tokens.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// resvg's wasm is read straight out of node_modules: this is a Node-only build
// step, so there is nothing to vendor.
const WASM = path.join(ROOT, "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm");

export async function loadFonts() {
  return Promise.all(FONT_FACES.map(async (face) => ({
    name: face.name,
    weight: face.weight,
    style: face.style,
    data: await fs.promises.readFile(path.join(ROOT, FONT_DIR, face.file)),
  })));
}

// WEBP IS UNUSABLE HERE. resvg decodes PNG, JPEG and GIF only, and /admin
// uploads .webp whenever a source image has transparency
// (src/lib/imageCompress.js). satori embeds it happily and resvg then draws
// nothing. So: keep what is decodable, inline it as a data URI — which also
// takes the network out of the render.
const DECODABLE = /^image\/(jpeg|png|gif)$/;

export async function inlineImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!DECODABLE.test(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch (_) {
    return null;
  }
}

/** Initialises resvg once; returns `render(element) → PNG bytes`. */
export async function createRenderer() {
  await initWasm(await fs.promises.readFile(WASM));
  const fonts = await loadFonts();
  const rasterise = (svg) => new Resvg(svg, { fitTo: { mode: "width", value: CARD.width } }).render().asPng();
  return (element) => renderCard(element, { satori, fonts, rasterise });
}
