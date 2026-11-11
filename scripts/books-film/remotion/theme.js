import { continueRender, delayRender, staticFile } from "remotion";

// The Reading Room's palette (src/components/Books/books.css) taken into the
// evening: walnut and lamplight around it, the page's paper, its gold and
// redline, saffron for Marathi. The type is the page's own — Fraunces and
// Tiro Devanagari Marathi — with the site's Plus Jakarta Sans for labels.

export const C = {
  bg: "#120c08",
  bg2: "#22170f",
  wood: "#3b2b21",
  woodHi: "#7a5f4b",
  woodLo: "#1f1510",
  paper: "#f6f0e4",
  paper2: "#ece2d0",
  ink: "#2a2420",
  cream: "#f8efdc",
  soft: "#b8ab97",
  gold: "#dcb866",
  red: "#b22200",
  redHi: "#ff6a47",
  saffron: "#f0a030",
  indigo: "#8c9cf0",
  lamp: "#ffcf8a",
};

export const SERIF = "'Fraunces', 'Tiro Devanagari Marathi', Georgia, serif";
export const MR = "'Tiro Devanagari Marathi', 'Fraunces', serif";
export const LABEL = "'Plus Jakarta Sans', 'Inter', sans-serif";
export const SANS = "'Inter', sans-serif";

const FACES = [
  ["Fraunces", "fraunces-latin-600-normal.woff", { weight: "600" }],
  ["Fraunces", "fraunces-latin-600-italic.woff", { weight: "600", style: "italic" }],
  ["Fraunces", "fraunces-latin-400-italic.woff", { weight: "400", style: "italic" }],
  ["Tiro Devanagari Marathi", "tiro-devanagari-marathi-devanagari-400-normal.woff", { weight: "400" }],
  ["Plus Jakarta Sans", "plus-jakarta-sans-latin-700-normal.woff", { weight: "700" }],
  ["Inter", "inter-latin-400-normal.woff", { weight: "400" }],
  ["Inter", "inter-latin-700-normal.woff", { weight: "700" }],
];

export function loadFonts() {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  const handle = delayRender("fonts");
  Promise.all(FACES.map(([family, file, desc]) => {
    const face = new FontFace(family, `url(${staticFile(file)})`, desc);
    return face.load().then((f) => document.fonts.add(f));
  })).then(() => continueRender(handle), () => continueRender(handle));
}
