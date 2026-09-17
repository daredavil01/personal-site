// Font loading for share cards.
//
// Satori accepts TTF, OTF and WOFF — NOT WOFF2 — so these are Fontsource's
// `.woff` per-unicode-subset builds, vendored in `public/og/fonts/`.
// See that folder's README for provenance and why the subsets aren't narrowed.
//
// `read` is injected so the same descriptors serve both callers:
//   - the Worker      → fetches `/og/fonts/<file>` from the site's own assets
//   - `og:preview`    → `fs.readFile`
//
// Reading fonts at runtime is legal precisely because they are ordinary bytes.
// The resvg WASM is not: `WebAssembly.instantiate()` on Workers only accepts
// pre-compiled modules, which is why that one is a bundled import instead.

// LATIN FIRST, DEVANAGARI LAST — and the order is load-bearing. Satori resolves
// a font per grapheme by walking this array, so Latin digits and punctuation
// inside a Marathi title keep the Latin design instead of picking up
// Devanagari's. Reversing this list silently changes how mixed strings look.
export const FONT_FACES = [
  { file: "noto-serif-latin-400-normal.woff", name: "Noto Serif", weight: 400, style: "normal" },
  { file: "noto-serif-latin-700-normal.woff", name: "Noto Serif", weight: 700, style: "normal" },
  { file: "inter-latin-400-normal.woff", name: "Inter", weight: 400, style: "normal" },
  { file: "inter-latin-700-normal.woff", name: "Inter", weight: 700, style: "normal" },
  { file: "plus-jakarta-sans-latin-700-normal.woff", name: "Plus Jakarta Sans", weight: 700, style: "normal" },
  { file: "noto-sans-devanagari-devanagari-400-normal.woff", name: "Noto Sans Devanagari", weight: 400, style: "normal" },
  { file: "noto-sans-devanagari-devanagari-700-normal.woff", name: "Noto Sans Devanagari", weight: 700, style: "normal" },
];

export const FONT_DIR = "/og/fonts";

// Holds the PROMISE, not the result, so concurrent requests on a cold isolate
// share one load instead of each fetching 254KB of font data.
let cache = null;

// `read(file) => Promise<ArrayBuffer>`
export function loadFonts(read) {
  if (!cache) {
    cache = Promise.all(
      FONT_FACES.map(async (face) => ({
        name: face.name,
        weight: face.weight,
        style: face.style,
        data: await read(face.file),
      })),
    ).catch((err) => {
      // Never cache a failure: a transient asset fetch would otherwise poison
      // the isolate for its whole lifetime.
      cache = null;
      throw err;
    });
  }
  return cache;
}

// Test seam — Jest has no isolate boundary to reset for us.
export function resetFontCache() {
  cache = null;
}

export default loadFonts;
