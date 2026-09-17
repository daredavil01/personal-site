// Design tokens for share cards. Pure data — no imports — so the generator and
// Jest read the same values.
//
// The palette is lifted from `public/images/logo.svg` so a card is recognisably
// this site: a near-black ground, a lifted panel, and the violet → teal → blue
// ribbon that runs through the mark.

// Facebook/X/LinkedIn/Slack/WhatsApp all crop to ~1.91:1. 1200x630 is the size
// they all accept without re-cropping.
export const CARD = { width: 1200, height: 630 };

// Every card keeps its content inside this margin so a platform that shaves a
// few pixels off the edge never clips a word.
export const SAFE = 64;

export const COLORS = {
  ink: "#13101e", // page ground, from the logo's radial centre
  panel: "#2a2642", // lifted surface, the logo's outer stop
  panelEdge: "#3b3560",
  slate: "#334155",
  text: "#f8fafc",
  textDim: "#c7c4d6",
  textFaint: "#8b86a3",
  violet: "#7c3aed",
  violetLight: "#a78bfa",
  teal: "#14b8a6",
  cyan: "#67e8f9",
  blue: "#3b82f6",
  blueDeep: "#1d4ed8",
  amber: "#fbbf24",
  orange: "#f97316",
  red: "#dc2626",
};

// The ribbon, as ordered stops. Layouts use it for the footer rule, for
// accents, and as the source of a per-section hue.
export const RIBBON = [COLORS.violet, COLORS.violetLight, COLORS.teal, COLORS.cyan, COLORS.blue];

// Per-section accent. Keyed by card kind / page slug so a section is the same
// colour on its list card and on every one of its detail cards.
export const ACCENTS = {
  home: COLORS.violetLight,
  about: COLORS.violetLight,
  ask: COLORS.cyan,
  books: COLORS.amber,
  book: COLORS.amber,
  challenges: COLORS.orange,
  changelog: COLORS.textFaint,
  contact: COLORS.teal,
  instagram: COLORS.violetLight,
  "interactive-me": COLORS.cyan,
  "micro-blog": COLORS.teal,
  microblog: COLORS.teal,
  mindmap: COLORS.blue,
  now: COLORS.cyan,
  "100-days-to-offload": COLORS.orange,
  blog: COLORS.orange,
  presentations: COLORS.blue,
  presentation: COLORS.blue,
  projects: COLORS.blueDeep,
  project: COLORS.blueDeep,
  resume: COLORS.violetLight,
  sports: COLORS.red,
  sport: COLORS.red,
  stats: COLORS.cyan,
  tags: COLORS.violetLight,
  tag: COLORS.violetLight,
  treks: COLORS.teal,
  trek: COLORS.teal,
  "ask-share": COLORS.cyan,
  notfound: COLORS.textFaint,
  "writing-ledger": COLORS.amber,
};

export const FONTS = {
  headline: "Noto Serif",
  body: "Inter",
  label: "Plus Jakarta Sans",
};

// Headline sizes step down as a title gets longer. `TitleBlock` picks the first
// bucket whose `max` the title's length fits, so a 12-character fort name and a
// 90-character book title both fill the card without overflowing it.
export const TITLE_STEPS = [
  { max: 18, size: 96, lineHeight: 1.04 },
  { max: 32, size: 80, lineHeight: 1.06 },
  { max: 52, size: 68, lineHeight: 1.08 },
  { max: 78, size: 56, lineHeight: 1.12 },
  { max: 120, size: 46, lineHeight: 1.16 },
  { max: Infinity, size: 38, lineHeight: 1.2 },
];

export const TYPE = {
  eyebrow: { size: 24, tracking: 3.5, weight: 700 },
  stat: { size: 54, weight: 700 },
  statLabel: { size: 20, weight: 700, tracking: 1.6 },
  lede: { size: 30, weight: 400 },
  meta: { size: 24, weight: 400 },
  chip: { size: 22, weight: 700 },
  footer: { size: 22, weight: 400 },
};

export const accentFor = (key) => ACCENTS[key] || COLORS.violetLight;

export default { CARD, SAFE, COLORS, RIBBON, ACCENTS, FONTS, TITLE_STEPS, TYPE, accentFor };
