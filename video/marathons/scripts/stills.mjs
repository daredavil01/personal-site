#!/usr/bin/env node
// Proof frames without rendering the film: node scripts/stills.mjs 3 7.5 15 …
// (seconds) → out/stills/<s>.jpg. One bundle, one browser. STILLS_ID=MarathonsVertical for the portrait cut.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "index.js") });
const composition = await selectComposition({ serveUrl, id: process.env.STILLS_ID || "Marathons" });
for (const s of process.argv.slice(2).map(Number)) {
  const output = path.join(ROOT, "out", "stills", `${s}.jpg`);
  // eslint-disable-next-line no-await-in-loop
  await renderStill({ serveUrl, composition, frame: Math.round(s * composition.fps), output, imageFormat: "jpeg", jpegQuality: 80, scale: 0.5 });
  console.info(`  ${s}s`);
}
