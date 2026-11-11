// Share-studio themes as data. No React, no Tailwind classes, no imports:
// functions/api/assist.js bundles this file to tell the AI which themes exist,
// and the card applies every token as an inline style, so a new theme is one
// object here with no JIT safelist to update.
//
// Tokens:
//   base        a solid colour: the export canvas, and the colour contrast is
//               measured against (themes.test.js holds ink/base ≥ 4.5:1)
//   background  the card's own background (colour, gradient or layered images)
//   ink         title and body text
//   muted       meta, subtitles, footer (≥ 3:1 against base)
//   accent      the one accent colour: the bar, quote marks, rules, highlights
//   rule        dividers and hairlines
//   chip        { bg, border, ink } for tag chips and panels
//   panel       background of the inner card in the Note / Index layouts
//   overlay     extra background layer drawn over `background` (texture)
//   grain       0–1, strength of the film-grain layer
//   riso        offset colour for a risograph misregistration on the title
//   glow        text-shadow for the title
//   fontHint    pairing the theme prefers when the type is left on Auto
//   dark        true when the theme reads light-on-dark (logo + signature flip)

const BRAND = "/images/brand";

const svg = (body, w = 120, h = 120) => `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`,
)}")`;

// Film grain as an SVG noise tile: dark specks for paper, light ones for night
// grounds. html-to-image inlines data URIs as they are.
const grainTile = (rgb) => svg(
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>"
  + `<feColorMatrix values='0 0 0 0 ${rgb}  0 0 0 0 ${rgb}  0 0 0 0 ${rgb}  0 0 0 0.6 -0.05'/></filter>`
  + "<rect width='100%' height='100%' filter='url(#n)'/>",
  220,
  220,
);
export const GRAIN_TILE = grainTile(0);
export const GRAIN_TILE_LIGHT = grainTile(1);

// ---- Motifs (texture layers) ----------------------------------------------
const MOTIFS = {
  halftone: (c) => ({
    backgroundImage: `radial-gradient(${c} 1.3px, transparent 1.5px)`,
    backgroundSize: "18px 18px",
  }),
  bigHalftone: (c) => ({
    backgroundImage: `radial-gradient(${c} 3px, transparent 3.4px)`,
    backgroundSize: "26px 26px",
  }),
  grid: (c, step = 54) => ({
    backgroundImage: `linear-gradient(${c} 1.5px, transparent 1.5px), linear-gradient(90deg, ${c} 1.5px, transparent 1.5px)`,
    backgroundSize: `${step}px ${step}px`,
  }),
  ruled: (line, margin) => ({
    backgroundImage: `linear-gradient(90deg, transparent 108px, ${margin} 108px, ${margin} 111px, transparent 111px), repeating-linear-gradient(to bottom, transparent 0, transparent 62px, ${line} 62px, ${line} 64px)`,
  }),
  scanlines: (c) => ({
    backgroundImage: `repeating-linear-gradient(to bottom, ${c} 0px, ${c} 3px, transparent 3px, transparent 6px)`,
  }),
  // Warli: stick figures in a ring dance, triangles and a sun, in rice white.
  warli: (c) => ({
    backgroundImage: svg(
      `<g fill='none' stroke='${c}' stroke-width='2' stroke-linecap='round'>`
      + "<circle cx='30' cy='22' r='5'/><path d='M30 27 L22 42 L38 42 Z M30 42 L22 60 L38 60 Z M22 34 L12 30 M38 34 L48 30 M24 60 L20 72 M36 60 L40 72'/>"
      + "<circle cx='92' cy='82' r='5'/><path d='M92 87 L84 102 L100 102 Z M92 102 L84 118 L100 118 Z M84 94 L74 98 M100 94 L110 98'/>"
      + "<circle cx='96' cy='22' r='8'/><path d='M96 6 V2 M96 38 V42 M80 22 H76 M112 22 H116'/>"
      + "<path d='M10 112 L22 92 L34 112 Z'/></g>",
      124,
      124,
    ),
    backgroundSize: "124px 124px",
  }),
  // Kolam: a grid of rice-flour dots with looping strokes between them.
  kolam: (c) => ({
    backgroundImage: svg(
      `<g fill='${c}'><circle cx='20' cy='20' r='3'/><circle cx='60' cy='20' r='3'/><circle cx='20' cy='60' r='3'/><circle cx='60' cy='60' r='3'/><circle cx='40' cy='40' r='3'/></g>`
      + `<g fill='none' stroke='${c}' stroke-width='1.6'><path d='M20 8 C34 8 52 26 52 40 C52 54 34 72 20 72 C6 72 8 54 8 40 C8 26 6 8 20 8 Z'/><path d='M60 8 C74 8 72 26 72 40 C72 54 74 72 60 72 C46 72 28 54 28 40 C28 26 46 8 60 8 Z'/></g>`,
      80,
      80,
    ),
    backgroundSize: "80px 80px",
  }),
  // Paithani: a woven border of peacock-feather eyes along the top and bottom.
  paithani: (gold) => ({
    backgroundImage: [
      svg(
        `<g fill='none' stroke='${gold}' stroke-width='2'><path d='M0 30 Q15 4 30 30 T60 30'/></g>`
        + `<ellipse cx='30' cy='22' rx='6' ry='9' fill='${gold}' fill-opacity='0.55'/>`,
        60,
        44,
      ),
      svg(
        `<g fill='none' stroke='${gold}' stroke-width='2'><path d='M0 14 Q15 40 30 14 T60 14'/></g>`
        + `<ellipse cx='30' cy='22' rx='6' ry='9' fill='${gold}' fill-opacity='0.55'/>`,
        60,
        44,
      ),
    ].join(", "),
    backgroundRepeat: "repeat-x, repeat-x",
    backgroundPosition: "0 18px, 0 calc(100% - 18px)",
    backgroundSize: "60px 44px, 60px 44px",
  }),
  rain: (c) => ({
    backgroundImage: `repeating-linear-gradient(105deg, transparent 0 22px, ${c} 22px 23.5px, transparent 23.5px 47px)`,
  }),
  stars: (c) => ({
    backgroundImage: svg(
      `<g fill='${c}'><circle cx='12' cy='18' r='1.4'/><circle cx='74' cy='9' r='1'/><circle cx='140' cy='40' r='1.8'/>`
      + "<circle cx='40' cy='88' r='1'/><circle cx='110' cy='120' r='1.3'/><circle cx='170' cy='96' r='1'/>"
      + "<circle cx='60' cy='160' r='1.6'/><circle cx='150' cy='170' r='1'/><circle cx='20' cy='190' r='1'/></g>",
      200,
      200,
    ),
    backgroundSize: "200px 200px",
  }),
  splashes: () => ({
    backgroundImage: [
      "radial-gradient(circle at 12% 14%, rgba(236,72,153,0.32), transparent 24%)",
      "radial-gradient(circle at 88% 10%, rgba(250,204,21,0.38), transparent 22%)",
      "radial-gradient(circle at 92% 86%, rgba(34,197,94,0.28), transparent 24%)",
      "radial-gradient(circle at 6% 92%, rgba(59,130,246,0.26), transparent 22%)",
    ].join(", "),
  }),
  fibers: (c) => ({
    backgroundImage: `repeating-linear-gradient(33deg, transparent 0 9px, ${c} 9px 10px, transparent 10px 29px), repeating-linear-gradient(-58deg, transparent 0 13px, ${c} 13px 14px, transparent 14px 41px)`,
  }),
  swiss: (c) => ({
    backgroundImage: `linear-gradient(90deg, ${c} 0 1px, transparent 1px)`,
    backgroundSize: "90px 100%",
  }),
  vignette: () => ({
    background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.22) 100%)",
  }),
};

const light = (t) => ({
  dark: false,
  logo: `${BRAND}/logo.png`,
  signature: `${BRAND}/black_sign.png`,
  ...t,
});

const dark = (t) => ({
  dark: true,
  logo: `${BRAND}/logo_circle.png`,
  signature: `${BRAND}/white_sign.png`,
  ...t,
});

const lightChip = (border, ink) => ({ bg: "rgba(255,255,255,0.6)", border, ink });
const darkChip = (ink = "rgba(255,255,255,0.86)") => ({ bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.18)", ink });

// ---- The registry ----------------------------------------------------------
export const FAMILIES = [
  { id: "core", label: "Core" },
  { id: "paper", label: "Paper & ink" },
  { id: "editorial", label: "Editorial" },
  { id: "mesh", label: "Mesh gradient" },
  { id: "print", label: "Print texture" },
  { id: "india", label: "Indian craft" },
  { id: "night", label: "Night" },
  { id: "minimal", label: "Minimal" },
  { id: "adaptive", label: "From this post" },
];

export const THEMES = [
  // ---- Core ----
  light({
    id: "light",
    label: "Light",
    family: "core",
    note: "the site's own paper and redline",
    base: "#f4f4f3",
    background: "#f4f4f3",
    ink: "#1c1917",
    muted: "#57534e",
    accent: "#b22200",
    rule: "#d6d3d1",
    chip: lightChip("#d6d3d1", "#57534e"),
    panel: "#ffffff",
  }),
  dark({
    id: "dark",
    label: "Dark",
    family: "core",
    note: "warm black, coral accent",
    base: "#1c1917",
    background: "#1c1917",
    ink: "#fafaf9",
    muted: "#a8a29e",
    accent: "#ff6b4a",
    rule: "rgba(255,255,255,0.14)",
    chip: darkChip(),
    panel: "#292524",
  }),
  dark({
    id: "abstract",
    label: "Abstract",
    family: "core",
    note: "the logo's binary, glowing ember",
    base: "#160a08",
    background: "radial-gradient(circle at 22% 18%, rgba(178,34,0,0.55), transparent 42%), radial-gradient(circle at 82% 88%, rgba(0,34,43,0.7), transparent 46%), linear-gradient(135deg, #1c0a07 0%, #0b0504 62%, #06100f 100%)",
    ink: "#fafaf9",
    muted: "#d6d3d1",
    accent: "#ff8a6a",
    rule: "rgba(255,255,255,0.16)",
    chip: darkChip(),
    panel: "rgba(255,255,255,0.06)",
    binary: true,
    grain: 0.12,
  }),

  // ---- Paper & ink ----
  light({
    id: "sepia",
    label: "Sepia",
    family: "paper",
    note: "old diary paper",
    base: "#f3ead9",
    background: "#f3ead9",
    ink: "#3b2a18",
    muted: "#6f573d",
    accent: "#9a5b2c",
    rule: "#d8c9a8",
    chip: lightChip("#d8c9a8", "#6f573d"),
    panel: "#faf4e8",
    grain: 0.18,
    fontHint: "cormorant",
  }),
  light({
    id: "ivory",
    label: "Ivory",
    family: "paper",
    note: "cream stock, gold accent",
    base: "#fffdf4",
    background: "#fffdf4",
    ink: "#292524",
    muted: "#6b6459",
    accent: "#a5842c",
    rule: "#e5dbb8",
    chip: lightChip("#e5dbb8", "#6b6459"),
    panel: "#ffffff",
    fontHint: "playfair",
  }),
  light({
    id: "letterpress",
    label: "Letterpress",
    family: "paper",
    note: "pressed ink, brick red",
    base: "#f5efe2",
    background: "#f5efe2",
    ink: "#2a211a",
    muted: "#6b5c49",
    accent: "#b3402a",
    rule: "#d9cdb4",
    chip: lightChip("#d9cdb4", "#6b5c49"),
    panel: "#fbf7ee",
    grain: 0.22,
    fontHint: "fraunces",
  }),
  light({
    id: "kraft",
    label: "Kraft",
    family: "paper",
    note: "brown parcel paper",
    base: "#c9a77c",
    background: "#c9a77c",
    ink: "#2b1d10",
    muted: "#4a3520",
    accent: "#7a2e12",
    rule: "rgba(43,29,16,0.3)",
    chip: { bg: "rgba(255,255,255,0.22)", border: "rgba(43,29,16,0.3)", ink: "#2b1d10" },
    panel: "#d6b88f",
    grain: 0.3,
    fontHint: "typewriter",
  }),
  light({
    id: "washi",
    label: "Washi",
    family: "paper",
    note: "fibrous paper, indigo ink",
    base: "#efe9df",
    background: "#efe9df",
    overlay: MOTIFS.fibers("rgba(120,100,70,0.07)"),
    ink: "#1f2a44",
    muted: "#4b5670",
    accent: "#c0392b",
    rule: "#d5cbbb",
    chip: lightChip("#d5cbbb", "#4b5670"),
    panel: "#f7f3ec",
    fontHint: "instrument",
  }),

  // ---- Editorial ----
  light({
    id: "newsprint",
    label: "Newsprint",
    family: "editorial",
    note: "halftone dots, black headline",
    base: "#f4f1e9",
    background: "#f4f1e9",
    overlay: MOTIFS.halftone("rgba(28,25,23,0.1)"),
    ink: "#1c1917",
    muted: "#57534e",
    accent: "#1c1917",
    rule: "#a8a29e",
    chip: lightChip("#d6d3d1", "#57534e"),
    panel: "#ffffff",
    fontHint: "playfair",
  }),
  light({
    id: "magazine",
    label: "Magazine",
    family: "editorial",
    note: "white page, cover red",
    base: "#ffffff",
    background: "#ffffff",
    ink: "#111111",
    muted: "#525252",
    accent: "#e11d48",
    rule: "#e5e5e5",
    chip: lightChip("#e5e5e5", "#525252"),
    panel: "#fafafa",
    fontHint: "dmserif",
  }),
  light({
    id: "swiss",
    label: "Swiss",
    family: "editorial",
    note: "grid columns, signal orange",
    base: "#f2f2f2",
    background: "#f2f2f2",
    overlay: MOTIFS.swiss("rgba(0,0,0,0.05)"),
    ink: "#111111",
    muted: "#4d4d4d",
    accent: "#ff3b00",
    rule: "#111111",
    chip: lightChip("#cfcfcf", "#4d4d4d"),
    panel: "#ffffff",
    fontHint: "grotesk",
  }),
  dark({
    id: "charcoal",
    label: "Charcoal",
    family: "editorial",
    note: "dark slate, amber",
    base: "#2a2724",
    background: "#2a2724",
    ink: "#fafaf9",
    muted: "#a8a29e",
    accent: "#f59e0b",
    rule: "rgba(255,255,255,0.12)",
    chip: darkChip(),
    panel: "#34302c",
  }),
  dark({
    id: "midnight",
    label: "Midnight",
    family: "editorial",
    note: "navy, sky blue",
    base: "#0f1a2e",
    background: "linear-gradient(165deg, #101d33 0%, #0c1526 100%)",
    ink: "#f8fafc",
    muted: "#94a3b8",
    accent: "#38bdf8",
    rule: "rgba(255,255,255,0.12)",
    chip: darkChip(),
    panel: "rgba(255,255,255,0.05)",
  }),

  // ---- Mesh gradient ----
  dark({
    id: "sunset",
    label: "Sunset",
    family: "mesh",
    note: "plum to coral",
    base: "#3d1541",
    background: "radial-gradient(circle at 85% 90%, rgba(248,177,149,0.75), transparent 45%), radial-gradient(circle at 15% 85%, rgba(233,100,67,0.55), transparent 50%), linear-gradient(140deg, #2b1240 0%, #6d2350 55%, #8f2d56 100%)",
    ink: "#ffffff",
    muted: "#fde2e4",
    accent: "#fcd34d",
    rule: "rgba(255,255,255,0.25)",
    chip: darkChip("#ffffff"),
    panel: "rgba(255,255,255,0.1)",
  }),
  dark({
    id: "ocean",
    label: "Ocean",
    family: "mesh",
    note: "deep sea to lagoon",
    base: "#05304d",
    background: "radial-gradient(circle at 90% 95%, rgba(46,196,182,0.6), transparent 45%), linear-gradient(150deg, #03203c 0%, #0a4a66 70%, #0d5f75 100%)",
    ink: "#ffffff",
    muted: "#cffafe",
    accent: "#7ff0e3",
    rule: "rgba(255,255,255,0.25)",
    chip: darkChip("#ffffff"),
    panel: "rgba(255,255,255,0.1)",
  }),
  dark({
    id: "forest",
    label: "Forest",
    family: "mesh",
    note: "pine, moss, lime",
    base: "#0f3220",
    background: "radial-gradient(circle at 88% 92%, rgba(78,140,74,0.65), transparent 48%), linear-gradient(150deg, #0b2818 0%, #164628 100%)",
    ink: "#ffffff",
    muted: "#d9f99d",
    accent: "#bef264",
    rule: "rgba(255,255,255,0.22)",
    chip: darkChip("#ffffff"),
    panel: "rgba(255,255,255,0.08)",
  }),
  dark({
    id: "aurora",
    label: "Aurora",
    family: "mesh",
    note: "green and violet lights",
    base: "#0c1023",
    background: "radial-gradient(circle at 20% 15%, rgba(64,224,160,0.35), transparent 45%), radial-gradient(circle at 85% 30%, rgba(140,90,255,0.4), transparent 50%), radial-gradient(circle at 60% 90%, rgba(0,180,255,0.25), transparent 50%), linear-gradient(160deg, #0c1023 0%, #141b3c 100%)",
    ink: "#f8fafc",
    muted: "#c7d2fe",
    accent: "#6ee7b7",
    rule: "rgba(255,255,255,0.15)",
    chip: darkChip(),
    panel: "rgba(255,255,255,0.07)",
  }),
  light({
    id: "peach",
    label: "Peach",
    family: "mesh",
    note: "peach, rose and lilac haze",
    base: "#fde8d7",
    background: "radial-gradient(circle at 10% 10%, rgba(255,183,148,0.9), transparent 45%), radial-gradient(circle at 90% 20%, rgba(244,166,201,0.7), transparent 45%), radial-gradient(circle at 70% 95%, rgba(196,181,253,0.65), transparent 50%), #fde8d7",
    ink: "#3b1d2a",
    muted: "#6b3f52",
    accent: "#c2410c",
    rule: "rgba(59,29,42,0.18)",
    chip: lightChip("rgba(59,29,42,0.18)", "#6b3f52"),
    panel: "rgba(255,255,255,0.55)",
    fontHint: "fraunces",
  }),
  dark({
    id: "dusk",
    label: "Dusk",
    family: "mesh",
    note: "indigo into violet",
    base: "#1e1b4b",
    background: "radial-gradient(circle at 80% 15%, rgba(167,139,250,0.55), transparent 45%), radial-gradient(circle at 15% 90%, rgba(236,72,153,0.35), transparent 45%), linear-gradient(170deg, #1e1b4b 0%, #312e81 100%)",
    ink: "#ffffff",
    muted: "#ddd6fe",
    accent: "#f9a8d4",
    rule: "rgba(255,255,255,0.2)",
    chip: darkChip("#ffffff"),
    panel: "rgba(255,255,255,0.08)",
  }),

  // ---- Print texture ----
  light({
    id: "riso",
    label: "Risograph",
    family: "print",
    note: "fluorescent pink over blue, slightly off",
    base: "#f6f1e7",
    background: "#f6f1e7",
    grain: 0.28,
    ink: "#1f3fa0",
    muted: "#3b55a8",
    accent: "#e8338c",
    rule: "rgba(31,63,160,0.3)",
    riso: "rgba(255,72,176,0.7)",
    chip: { bg: "rgba(255,72,176,0.12)", border: "rgba(232,51,140,0.45)", ink: "#1f3fa0" },
    panel: "#fbf8f1",
    fontHint: "archivo",
  }),
  light({
    id: "halftone",
    label: "Halftone",
    family: "print",
    note: "yellow comic print",
    base: "#ffd84d",
    background: "#ffd84d",
    overlay: MOTIFS.bigHalftone("rgba(0,0,0,0.08)"),
    ink: "#111111",
    muted: "#3a2f00",
    accent: "#d61f1f",
    rule: "#111111",
    chip: { bg: "rgba(255,255,255,0.55)", border: "#111111", ink: "#111111" },
    panel: "#fff3b0",
    fontHint: "bebas",
  }),
  dark({
    id: "film",
    label: "Film grain",
    family: "print",
    note: "35mm darkroom, heavy grain",
    base: "#141414",
    background: "radial-gradient(ellipse at 50% 40%, #232323 0%, #121212 70%)",
    grain: 0.5,
    ink: "#f5f5f4",
    muted: "#b5b0a8",
    accent: "#e7c27d",
    rule: "rgba(255,255,255,0.14)",
    chip: darkChip(),
    panel: "rgba(255,255,255,0.05)",
    fontHint: "instrument",
  }),
  light({
    id: "photocopy",
    label: "Photocopy",
    family: "print",
    note: "zine xerox, toner and grit",
    base: "#e9e9e6",
    background: "#e9e9e6",
    overlay: MOTIFS.vignette(),
    grain: 0.55,
    ink: "#0d0d0d",
    muted: "#3f3f3f",
    accent: "#0d0d0d",
    rule: "#0d0d0d",
    chip: { bg: "transparent", border: "#0d0d0d", ink: "#0d0d0d" },
    panel: "#f4f4f2",
    fontHint: "typewriter",
  }),
  dark({
    id: "blueprint",
    label: "Blueprint",
    family: "print",
    note: "cyanotype grid",
    base: "#123a6b",
    background: "#123a6b",
    overlay: MOTIFS.grid("rgba(255,255,255,0.09)"),
    ink: "#ffffff",
    muted: "#bae6fd",
    accent: "#bae6fd",
    rule: "rgba(255,255,255,0.3)",
    chip: darkChip("#e0f2fe"),
    panel: "rgba(255,255,255,0.06)",
    fontHint: "mono",
  }),
  light({
    id: "notebook",
    label: "Notebook",
    family: "print",
    note: "ruled school notebook",
    base: "#fbf8ef",
    background: "#fbf8ef",
    overlay: MOTIFS.ruled("rgba(59,86,168,0.16)", "rgba(217,72,72,0.3)"),
    ink: "#1e3a5f",
    muted: "#4a648c",
    accent: "#d94848",
    rule: "#c9d4e8",
    chip: lightChip("#c9d4e8", "#4a648c"),
    panel: "#ffffff",
    fontHint: "caveat",
  }),

  // ---- Indian craft ----
  dark({
    id: "warli",
    label: "Warli",
    family: "india",
    note: "rice-white figures on terracotta",
    base: "#8a3b22",
    background: "#8a3b22",
    overlay: MOTIFS.warli("rgba(255,245,230,0.16)"),
    ink: "#fbf3e6",
    muted: "#f2d9c4",
    accent: "#ffe1b8",
    rule: "rgba(255,245,230,0.35)",
    chip: darkChip("#fbf3e6"),
    panel: "rgba(0,0,0,0.12)",
    fontHint: "kalam",
  }),
  dark({
    id: "kolam",
    label: "Kolam",
    family: "india",
    note: "rice-flour dots on a dark floor",
    base: "#2b2321",
    background: "#2b2321",
    overlay: MOTIFS.kolam("rgba(247,241,232,0.13)"),
    ink: "#f7f1e8",
    muted: "#d6cbbd",
    accent: "#f2b134",
    rule: "rgba(247,241,232,0.18)",
    chip: darkChip("#f7f1e8"),
    panel: "rgba(255,255,255,0.05)",
    fontHint: "tiro",
  }),
  dark({
    id: "paithani",
    label: "Paithani",
    family: "india",
    note: "peacock silk with a gold border",
    base: "#0f4c4a",
    background: "linear-gradient(180deg, #7a1650 0px, #7a1650 64px, #0f4c4a 64px, #0f4c4a calc(100% - 64px), #7a1650 calc(100% - 64px))",
    overlay: MOTIFS.paithani("#e2b33c"),
    ink: "#fdf6e3",
    muted: "#d9e8e0",
    accent: "#e2b33c",
    rule: "rgba(226,179,60,0.45)",
    chip: darkChip("#fdf6e3"),
    panel: "rgba(0,0,0,0.15)",
    fontHint: "rozha",
  }),
  dark({
    id: "monsoon",
    label: "Monsoon",
    family: "india",
    note: "slate sky, slanting rain",
    base: "#2f4a5a",
    background: "linear-gradient(180deg, #2a4252 0%, #34515f 100%)",
    overlay: MOTIFS.rain("rgba(255,255,255,0.07)"),
    ink: "#eef5f7",
    muted: "#c3d6dc",
    accent: "#9fd3c7",
    rule: "rgba(255,255,255,0.2)",
    chip: darkChip(),
    panel: "rgba(255,255,255,0.07)",
    fontHint: "eczar",
  }),
  light({
    id: "holi",
    label: "Holi",
    family: "india",
    note: "colour splashes on white",
    base: "#fff7ed",
    background: "#fff7ed",
    overlay: MOTIFS.splashes(),
    ink: "#3b0a2a",
    muted: "#6d2850",
    accent: "#db2777",
    rule: "rgba(59,10,42,0.15)",
    chip: lightChip("rgba(219,39,119,0.3)", "#6d2850"),
    panel: "rgba(255,255,255,0.7)",
    fontHint: "baloo",
  }),
  light({
    id: "saffron",
    label: "Saffron",
    family: "india",
    note: "marigold and kumkum",
    base: "#f6b73c",
    background: "linear-gradient(160deg, #f8c35a 0%, #f2a91e 100%)",
    ink: "#3a1a00",
    muted: "#5c2e05",
    accent: "#8b1e0f",
    rule: "rgba(58,26,0,0.25)",
    chip: { bg: "rgba(255,255,255,0.3)", border: "rgba(58,26,0,0.25)", ink: "#3a1a00" },
    panel: "rgba(255,255,255,0.28)",
    fontHint: "yatra",
  }),
  light({
    id: "chai",
    label: "Chai",
    family: "india",
    note: "milky tea, cardamom brown",
    base: "#e8d3b9",
    background: "#e8d3b9",
    grain: 0.2,
    ink: "#3e2410",
    muted: "#6b4a2e",
    accent: "#a0522d",
    rule: "rgba(62,36,16,0.2)",
    chip: lightChip("rgba(62,36,16,0.2)", "#6b4a2e"),
    panel: "#f1e3d0",
    fontHint: "gotu",
  }),

  // ---- Night ----
  dark({
    id: "neon",
    label: "Neon",
    family: "night",
    note: "magenta glow, cyan accent",
    base: "#0b0b12",
    background: "radial-gradient(circle at 15% 20%, rgba(255,45,149,0.18), transparent 45%), radial-gradient(circle at 85% 80%, rgba(0,229,255,0.15), transparent 45%), #0b0b12",
    ink: "#f1f5f9",
    muted: "#94a3b8",
    accent: "#ff2d95",
    rule: "rgba(255,255,255,0.1)",
    glow: "0 0 24px rgba(255,45,149,0.55)",
    titleInk: "#ff5aa9",
    chip: { bg: "rgba(255,255,255,0.04)", border: "rgba(0,229,255,0.3)", ink: "#7df3ff" },
    panel: "rgba(255,255,255,0.04)",
    fontHint: "grotesk",
  }),
  dark({
    id: "terminal",
    label: "Terminal",
    family: "night",
    note: "green phosphor scanlines",
    base: "#071007",
    background: "#071007",
    overlay: MOTIFS.scanlines("rgba(34,197,94,0.05)"),
    ink: "#86efac",
    muted: "#4ade80",
    accent: "#4ade80",
    rule: "#1f4d1f",
    chip: { bg: "rgba(255,255,255,0.03)", border: "#1f4d1f", ink: "#86efac" },
    panel: "rgba(34,197,94,0.05)",
    fontHint: "mono",
    glow: "0 0 18px rgba(74,222,128,0.35)",
  }),
  dark({
    id: "starfield",
    label: "Starfield",
    family: "night",
    note: "a clear sky over the Sahyadris",
    base: "#05060f",
    background: "radial-gradient(ellipse at 50% 120%, rgba(56,72,140,0.55), transparent 60%), #05060f",
    overlay: MOTIFS.stars("rgba(255,255,255,0.7)"),
    ink: "#e6e9ff",
    muted: "#a5acd6",
    accent: "#ffd27a",
    rule: "rgba(255,255,255,0.12)",
    chip: darkChip(),
    panel: "rgba(255,255,255,0.05)",
    fontHint: "cormorant",
  }),

  // ---- Minimal ----
  light({
    id: "bone",
    label: "Bone",
    family: "minimal",
    note: "quiet off-white",
    base: "#ebe6dd",
    background: "#ebe6dd",
    ink: "#262626",
    muted: "#5c5852",
    accent: "#262626",
    rule: "rgba(38,38,38,0.15)",
    chip: lightChip("rgba(38,38,38,0.15)", "#5c5852"),
    panel: "#f3efe8",
    fontHint: "instrument",
  }),
  dark({
    id: "slate",
    label: "Slate",
    family: "minimal",
    note: "cool grey-blue",
    base: "#334155",
    background: "#334155",
    ink: "#f8fafc",
    muted: "#cbd5e1",
    accent: "#fbbf24",
    rule: "rgba(255,255,255,0.18)",
    chip: darkChip(),
    panel: "rgba(255,255,255,0.06)",
  }),
  light({
    id: "mono",
    label: "Mono",
    family: "minimal",
    note: "pure black on white",
    base: "#ffffff",
    background: "#ffffff",
    ink: "#000000",
    muted: "#404040",
    accent: "#000000",
    rule: "#000000",
    chip: { bg: "transparent", border: "#000000", ink: "#000000" },
    panel: "#ffffff",
    fontHint: "grotesk",
  }),
  dark({
    id: "noir",
    label: "Noir",
    family: "minimal",
    note: "pure white on black",
    base: "#0a0a0a",
    background: "#0a0a0a",
    ink: "#ffffff",
    muted: "#a3a3a3",
    accent: "#ffffff",
    rule: "rgba(255,255,255,0.3)",
    chip: { bg: "transparent", border: "rgba(255,255,255,0.5)", ink: "#ffffff" },
    panel: "#141414",
    fontHint: "cormorant",
  }),
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

// The two adaptive themes are built per post, so they are not in THEMES.
export const ADAPTIVE_IDS = ["photo", "tags"];
export const ALL_THEME_IDS = [...THEMES.map((t) => t.id), ...ADAPTIVE_IDS];

export const GRAIN = (strength, isDark = false) => ({
  backgroundImage: isDark ? GRAIN_TILE_LIGHT : GRAIN_TILE,
  backgroundSize: "220px 220px",
  opacity: isDark ? strength * 0.6 : strength,
});

// ---- Colour maths (also used by the tests) ---------------------------------
export function hexToRgb(hex) {
  const m = String(hex || "").trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

export function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const mix = (hex, target, amount) => {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * amount));
};

/**
 * A full theme from one colour — the photo's dominant hue or the first tag's
 * colour. Dark keeps the colour deep as the ground with a pale tint as accent;
 * light makes a pale tint the ground and the colour itself the accent, darkened
 * until it is legible. Ink is pinned to near-black / near-white, so contrast
 * holds whatever colour comes in.
 */
export function themeFromColor(hex, { id = "photo", label = "From photo", dark: isDark = true } = {}) {
  const color = hexToRgb(hex) ? hex : "#b22200";
  if (isDark) {
    const base = mix(color, "#000000", 0.72);
    const glow = mix(color, "#000000", 0.4);
    let accent = mix(color, "#ffffff", 0.45);
    if (contrast(accent, base) < 3) accent = mix(color, "#ffffff", 0.7);
    return dark({
      id,
      label,
      family: "adaptive",
      note: "built from this post's colour",
      base,
      background: `radial-gradient(circle at 80% 10%, ${glow}, transparent 55%), radial-gradient(circle at 10% 95%, ${mix(color, "#000000", 0.55)}, transparent 50%), ${base}`,
      ink: "#fafaf9",
      muted: mix(color, "#ffffff", 0.78),
      accent,
      rule: "rgba(255,255,255,0.16)",
      chip: darkChip(),
      panel: "rgba(255,255,255,0.07)",
      grain: 0.12,
    });
  }
  const base = mix(color, "#ffffff", 0.88);
  let accent = color;
  for (let i = 0; i < 6 && contrast(accent, base) < 3; i += 1) accent = mix(accent, "#000000", 0.25);
  return light({
    id,
    label,
    family: "adaptive",
    note: "built from this post's colour",
    base,
    background: `radial-gradient(circle at 90% 0%, ${mix(color, "#ffffff", 0.65)}, transparent 50%), ${base}`,
    ink: mix(color, "#000000", 0.85),
    muted: mix(color, "#000000", 0.62),
    accent,
    rule: mix(color, "#ffffff", 0.6),
    chip: lightChip(mix(color, "#ffffff", 0.55), mix(color, "#000000", 0.62)),
    panel: mix(color, "#ffffff", 0.94),
  });
}

/** Theme lookup with the adaptive ones resolved from their colours. */
export function themeFor(id, { photoColor, tagColor } = {}) {
  if (id === "photo" && photoColor) return themeFromColor(photoColor, { id: "photo", label: "From photo", dark: true });
  if (id === "tags" && tagColor) return themeFromColor(tagColor, { id: "tags", label: "From tags", dark: false });
  return THEME_BY_ID[id] || THEME_BY_ID.light;
}
