// Font pairings for the share studio: a display face for titles and quotes and
// a body face for running text. Pure data, no imports — the assist endpoint
// bundles it to tell the AI which pairings exist.
//
// `scripts` says which scripts the pairing can set itself. A Marathi post never
// gets a Latin-only pairing (the studio greys those out and the AI's answer is
// filtered). Every Latin family still falls back to Tiro for the odd Devanagari
// word, so nothing renders as tofu.
//
// None of these are in the site's global font payload: the studio injects one
// Google Fonts stylesheet when it opens (loadShareFonts). Google serves faces by
// unicode-range, so the browser downloads only the faces a card actually uses.

const DEVA_FALLBACK = '"Tiro Devanagari Marathi", "Noto Serif Devanagari", serif';

const stack = (name, generic) => `"${name}", ${DEVA_FALLBACK.replace(", serif", "")}, ${generic}`;

export const PAIRINGS = [
  // ---- Latin ----
  {
    id: "site",
    label: "Site",
    note: "Noto Serif over Inter — the site's own type",
    scripts: ["latin"],
    display: stack("Noto Serif", "serif"),
    body: stack("Inter", "sans-serif"),
    displayWeight: 900,
    bodyWeight: 400,
    google: [],
  },
  {
    id: "fraunces",
    label: "Fraunces",
    note: "soft, wonky old-style serif",
    scripts: ["latin"],
    display: stack("Fraunces", "serif"),
    body: stack("Inter", "sans-serif"),
    displayWeight: 700,
    bodyWeight: 400,
    google: ["Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400"],
  },
  {
    id: "playfair",
    label: "Playfair",
    note: "high-contrast editorial serif",
    scripts: ["latin"],
    display: stack("Playfair Display", "serif"),
    body: stack("Source Serif 4", "serif"),
    displayWeight: 800,
    bodyWeight: 400,
    google: ["Playfair+Display:ital,wght@0,400;0,800;1,400", "Source+Serif+4:ital,wght@0,400;0,600;1,400"],
  },
  {
    id: "dmserif",
    label: "DM Serif",
    note: "magazine headline over clean sans",
    scripts: ["latin"],
    display: stack("DM Serif Display", "serif"),
    body: stack("DM Sans", "sans-serif"),
    displayWeight: 400,
    bodyWeight: 400,
    google: ["DM+Serif+Display:ital@0;1", "DM+Sans:wght@400;700"],
  },
  {
    id: "instrument",
    label: "Instrument",
    note: "narrow, literary serif",
    scripts: ["latin"],
    display: stack("Instrument Serif", "serif"),
    body: stack("Inter", "sans-serif"),
    displayWeight: 400,
    bodyWeight: 400,
    google: ["Instrument+Serif:ital@0;1"],
  },
  {
    id: "cormorant",
    label: "Cormorant",
    note: "elegant Garamond display",
    scripts: ["latin"],
    display: stack("Cormorant Garamond", "serif"),
    body: stack("Cormorant Garamond", "serif"),
    displayWeight: 600,
    bodyWeight: 500,
    google: ["Cormorant+Garamond:ital,wght@0,500;0,600;1,500"],
  },
  {
    id: "grotesk",
    label: "Grotesk",
    note: "Space Grotesk, technical sans",
    scripts: ["latin"],
    display: stack("Space Grotesk", "sans-serif"),
    body: stack("Space Grotesk", "sans-serif"),
    displayWeight: 700,
    bodyWeight: 400,
    google: ["Space+Grotesk:wght@400;700"],
  },
  {
    id: "bricolage",
    label: "Bricolage",
    note: "expressive, chunky grotesque",
    scripts: ["latin"],
    display: stack("Bricolage Grotesque", "sans-serif"),
    body: stack("Bricolage Grotesque", "sans-serif"),
    displayWeight: 800,
    bodyWeight: 400,
    google: ["Bricolage+Grotesque:opsz,wght@12..96,400;12..96,800"],
  },
  {
    id: "archivo",
    label: "Archivo",
    note: "black poster sans",
    scripts: ["latin"],
    display: stack("Archivo Black", "sans-serif"),
    body: stack("Archivo", "sans-serif"),
    displayWeight: 400,
    bodyWeight: 400,
    google: ["Archivo+Black", "Archivo:wght@400;600"],
  },
  {
    id: "bebas",
    label: "Bebas",
    note: "tall condensed caps",
    scripts: ["latin"],
    display: stack("Bebas Neue", "sans-serif"),
    body: stack("Inter", "sans-serif"),
    displayWeight: 400,
    bodyWeight: 400,
    displayCaps: true,
    google: ["Bebas+Neue"],
  },
  {
    id: "mono",
    label: "Mono",
    note: "JetBrains Mono, code-like",
    scripts: ["latin"],
    display: stack("JetBrains Mono", "monospace"),
    body: stack("JetBrains Mono", "monospace"),
    displayWeight: 700,
    bodyWeight: 400,
    google: ["JetBrains+Mono:wght@400;700"],
  },
  {
    id: "typewriter",
    label: "Typewriter",
    note: "Special Elite over Courier Prime",
    scripts: ["latin"],
    display: stack("Special Elite", "monospace"),
    body: stack("Courier Prime", "monospace"),
    displayWeight: 400,
    bodyWeight: 400,
    google: ["Special+Elite", "Courier+Prime:ital,wght@0,400;0,700;1,400"],
  },
  {
    id: "caveat",
    label: "Caveat",
    note: "casual pen handwriting",
    scripts: ["latin"],
    display: stack("Caveat", "cursive"),
    body: stack("Caveat", "cursive"),
    displayWeight: 700,
    bodyWeight: 500,
    scale: 1.25,
    google: ["Caveat:wght@500;700"],
  },
  {
    id: "dancing",
    label: "Dancing",
    note: "flowing script over Lora",
    scripts: ["latin"],
    display: stack("Dancing Script", "cursive"),
    body: stack("Lora", "serif"),
    displayWeight: 700,
    bodyWeight: 400,
    google: ["Dancing+Script:wght@700", "Lora:ital,wght@0,400;1,400"],
  },
  {
    id: "shadows",
    label: "Felt tip",
    note: "Shadows Into Light, neat marker",
    scripts: ["latin"],
    display: stack("Shadows Into Light", "cursive"),
    body: stack("Shadows Into Light", "cursive"),
    displayWeight: 400,
    bodyWeight: 400,
    scale: 1.15,
    google: ["Shadows+Into+Light"],
  },

  // ---- Devanagari (each also sets Latin) ----
  {
    id: "tiro",
    label: "Tiro",
    note: "serif drawn for Marathi",
    scripts: ["latin", "devanagari"],
    display: '"Tiro Devanagari Marathi", "Noto Serif Devanagari", serif',
    body: '"Tiro Devanagari Marathi", "Noto Serif Devanagari", serif',
    displayWeight: 400,
    bodyWeight: 400,
    google: ["Tiro+Devanagari+Marathi:ital@0;1"],
  },
  {
    id: "yatra",
    label: "Yatra One",
    note: "bold brush strokes over Mukta",
    scripts: ["latin", "devanagari"],
    display: '"Yatra One", "Mukta", sans-serif',
    body: '"Mukta", sans-serif',
    displayWeight: 400,
    bodyWeight: 400,
    google: ["Yatra+One", "Mukta:wght@400;800"],
  },
  {
    id: "modak",
    label: "Modak",
    note: "plump and playful over Baloo",
    scripts: ["latin", "devanagari"],
    display: '"Modak", "Baloo 2", sans-serif',
    body: '"Baloo 2", sans-serif',
    displayWeight: 400,
    bodyWeight: 500,
    google: ["Modak", "Baloo+2:wght@500;800"],
  },
  {
    id: "kalam",
    label: "Kalam",
    note: "handwritten, Marathi and English",
    scripts: ["latin", "devanagari"],
    display: '"Kalam", cursive',
    body: '"Kalam", cursive',
    displayWeight: 700,
    bodyWeight: 400,
    scale: 1.08,
    google: ["Kalam:wght@400;700"],
  },
  {
    id: "rozha",
    label: "Rozha One",
    note: "high-contrast display over Martel",
    scripts: ["latin", "devanagari"],
    display: '"Rozha One", "Martel", serif',
    body: '"Martel", serif',
    displayWeight: 400,
    bodyWeight: 400,
    google: ["Rozha+One", "Martel:wght@400;800"],
  },
  {
    id: "mukta",
    label: "Mukta",
    note: "clean humanist sans",
    scripts: ["latin", "devanagari"],
    display: '"Mukta", sans-serif',
    body: '"Mukta", sans-serif',
    displayWeight: 800,
    bodyWeight: 400,
    google: ["Mukta:wght@400;800"],
  },
  {
    id: "eczar",
    label: "Eczar",
    note: "sturdy literary serif",
    scripts: ["latin", "devanagari"],
    display: '"Eczar", serif',
    body: '"Eczar", serif',
    displayWeight: 700,
    bodyWeight: 400,
    google: ["Eczar:wght@400;700"],
  },
  {
    id: "baloo",
    label: "Baloo",
    note: "round, friendly",
    scripts: ["latin", "devanagari"],
    display: '"Baloo 2", sans-serif',
    body: '"Baloo 2", sans-serif',
    displayWeight: 800,
    bodyWeight: 500,
    google: ["Baloo+2:wght@500;800"],
  },
  {
    id: "amita",
    label: "Amita",
    note: "calligraphic over Martel",
    scripts: ["latin", "devanagari"],
    display: '"Amita", serif',
    body: '"Martel", serif',
    displayWeight: 700,
    bodyWeight: 400,
    google: ["Amita:wght@700", "Martel:wght@400;800"],
  },
  {
    id: "poppins",
    label: "Poppins",
    note: "geometric sans, both scripts",
    scripts: ["latin", "devanagari"],
    display: '"Poppins", sans-serif',
    body: '"Poppins", sans-serif',
    displayWeight: 700,
    bodyWeight: 400,
    google: ["Poppins:ital,wght@0,400;0,700;1,400"],
  },
  {
    id: "gotu",
    label: "Gotu",
    note: "quiet Devanagari serif over Hind",
    scripts: ["latin", "devanagari"],
    display: '"Gotu", serif',
    body: '"Hind", sans-serif',
    displayWeight: 400,
    bodyWeight: 400,
    google: ["Gotu", "Hind:wght@400;600"],
  },
];

export const PAIRING_BY_ID = Object.fromEntries(PAIRINGS.map((p) => [p.id, p]));

export const pairingFor = (id) => PAIRING_BY_ID[id] || PAIRING_BY_ID.site;

/** Whether a pairing can set text in this language ("en" | "mr"). */
export const pairingSupports = (pairing, lang) => (lang === "mr"
  ? (pairing?.scripts || []).includes("devanagari")
  : true);

const STYLESHEET_ID = "share-studio-fonts";

/**
 * Inject every pairing's faces in one stylesheet, once. Only the faces a card
 * renders are downloaded (unicode-range plus lazy font loading), and
 * `display=swap` keeps the preview readable while they arrive. The export
 * waits on document.fonts.ready.
 */
export function loadShareFonts() {
  if (typeof document === "undefined" || document.getElementById(STYLESHEET_ID)) return;
  const families = [...new Set(PAIRINGS.flatMap((p) => p.google))];
  const link = document.createElement("link");
  link.id = STYLESHEET_ID;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
  document.head.appendChild(link);
}
