// Designed display faces for the share-image editor: Marathi / Devanagari
// faces (which also cover Latin) plus English handwriting faces. These are NOT
// in the site's global font payload — the Google Fonts stylesheet is injected
// once, the first time the editor opens (loadDisplayFonts), so normal page
// loads ship zero extra font bytes.
//
// Devanagari has no italic tradition and most of these faces ship a single
// weight, so ShareCard skips the synthetic italic/black styling whenever a
// display face is active. Each entry's `sample` renders in the face itself in
// the picker, making it a live specimen.

const GOOGLE_CSS_ID = "share-display-fonts";

export const DISPLAY_FONTS = [
  // ---- Marathi / Devanagari (Latin included) ----
  {
    id: "tiro",
    label: "Tiro",
    note: "serif drawn for Marathi",
    family: '"Tiro Devanagari Marathi", "Noto Serif Devanagari", serif',
    google: "Tiro+Devanagari+Marathi",
    group: "devanagari",
    sample: "मराठी",
  },
  {
    id: "yatra",
    label: "Yatra One",
    note: "bold brush strokes",
    family: '"Yatra One", "Noto Sans Devanagari", sans-serif',
    google: "Yatra+One",
    group: "devanagari",
    sample: "मराठी",
  },
  {
    id: "modak",
    label: "Modak",
    note: "plump & playful",
    family: '"Modak", "Noto Sans Devanagari", sans-serif',
    google: "Modak",
    group: "devanagari",
    sample: "मराठी",
  },
  {
    id: "kalam",
    label: "Kalam",
    note: "handwritten, Marathi & English",
    family: '"Kalam", "Noto Sans Devanagari", cursive',
    google: "Kalam",
    group: "devanagari",
    sample: "मराठी",
  },
  {
    id: "rozha",
    label: "Rozha One",
    note: "high-contrast display",
    family: '"Rozha One", "Noto Serif Devanagari", serif',
    google: "Rozha+One",
    group: "devanagari",
    sample: "मराठी",
  },

  // ---- English handwriting ----
  {
    id: "caveat",
    label: "Caveat",
    note: "casual pen handwriting",
    family: '"Caveat", cursive',
    google: "Caveat",
    group: "latin",
    sample: "hello",
  },
  {
    id: "dancing",
    label: "Dancing",
    note: "flowing cursive script",
    family: '"Dancing Script", cursive',
    google: "Dancing+Script",
    group: "latin",
    sample: "hello",
  },
  {
    id: "shadows",
    label: "Shadows",
    note: "neat felt-tip handwriting",
    family: '"Shadows Into Light", cursive',
    google: "Shadows+Into+Light",
    group: "latin",
    sample: "hello",
  },
];

export const MARATHI_FONTS = DISPLAY_FONTS.filter((f) => f.group === "devanagari");
export const HANDWRITTEN_FONTS = DISPLAY_FONTS.filter((f) => f.group === "latin");

export const displayFont = (id) => DISPLAY_FONTS.find((f) => f.id === id) || null;

// Inject the combined Google Fonts stylesheet exactly once. `display=swap`
// keeps the preview readable while glyphs stream in; the export path already
// waits on document.fonts.ready before snapshotting.
export const loadDisplayFonts = () => {
  if (typeof document === "undefined" || document.getElementById(GOOGLE_CSS_ID)) return;
  const link = document.createElement("link");
  link.id = GOOGLE_CSS_ID;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${DISPLAY_FONTS.map((f) => `family=${f.google}`).join("&")}&display=swap`;
  document.head.appendChild(link);
};
