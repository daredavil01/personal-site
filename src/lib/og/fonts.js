// The faces the card generator loads.
//
// Satori accepts TTF, OTF and WOFF — NOT WOFF2 — so these are Fontsource's
// `.woff` per-unicode-subset builds. See scripts/og-fonts/README.md for
// provenance and why the subsets are not narrowed further.
//
// They live beside the generator rather than in `public/`, because nothing
// serves them: cards are rendered once under Node and committed as PNGs, so
// shipping 254KB of font data to browsers would be dead weight. (They were in
// `public/og/fonts/` while a Worker fetched them at request time.)

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

// Repo-relative, resolved against the repo root by the generator.
export const FONT_DIR = "scripts/og-fonts";

export default FONT_FACES;
