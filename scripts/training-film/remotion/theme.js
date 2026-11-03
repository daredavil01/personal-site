import { continueRender, delayRender, staticFile } from "remotion";

// The night palette of /training's atlas (training.css, `.tr-night`), and the
// site's own type: Noto Serif for headlines, Plus Jakarta Sans for labels,
// Inter for text.

export const C = {
  bg: "#0b1220",
  bg2: "#111a2e",
  ink: "#eef2fb",
  muted: "#8fa0bf",
  line: "#23304a",
  accent: "#ff7a59",
  gold: "#f5b400",
  heart: "#ef4444",
  run: "#d95926",
  ride: "#3987e5",
  walk: "#199e70",
  hike: "#c98500",
  swim: "#9085e9",
  other: "#8f8c86",
};

// Brighter steps of the family colours, for light on a dark sky.
export const GLOW = {
  run: "#ff8a4c", walk: "#2fd39a", hike: "#ffc23d", ride: "#5aa2ff", swim: "#a99cff", other: "#c9c4bd",
};

export const famColor = (f) => C[f] || C.other;

export const SERIF = "'Noto Serif', Georgia, serif";
export const LABEL = "'Plus Jakarta Sans', 'Inter', sans-serif";
export const SANS = "'Inter', sans-serif";

const FACES = [
  ["Noto Serif", "noto-serif-latin-700-normal.woff", "700"],
  ["Plus Jakarta Sans", "plus-jakarta-sans-latin-700-normal.woff", "700"],
  ["Inter", "inter-latin-400-normal.woff", "400"],
  ["Inter", "inter-latin-700-normal.woff", "700"],
];

export function loadFonts() {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  const handle = delayRender("fonts");
  Promise.all(FACES.map(([family, file, weight]) => {
    const face = new FontFace(family, `url(${staticFile(file)})`, { weight });
    return face.load().then((f) => document.fonts.add(f));
  })).then(() => continueRender(handle), () => continueRender(handle));
}
