// Map-hub geometry for the six regions (§4.6). Keys, colors and routes stay
// sourced from the globe's domain table (single source of truth, §3); this
// module adds only what the map needs: where each biome sits on the
// 2000×1250 canvas, the viewBox the camera flies to on activation, the
// generous hotspot rect, and the label plaque. All coordinates come from the
// approved concept board (docs/wanderers-atlas-redesign-plan.md §10 gate).

import { DOMAINS } from "../../components/Index/globe/domains";

export const MAP_W = 2000;
export const MAP_H = 1250;

export const FULL_VIEW = { x: 0, y: 0, w: MAP_W, h: MAP_H };

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// A camera box of width `w` (canvas aspect ratio) centered on (cx, cy),
// clamped inside the canvas so corner regions never fly past the map edge.
const boxAround = (cx, cy, w, W = MAP_W, H = MAP_H) => {
  const h = w * (H / W);
  return {
    x: clamp(cx - (w / 2), 0, W - w),
    y: clamp(cy - (h / 2), 0, H - h),
    w,
    h,
  };
};

// Post-dive entry view (§4.2): the map mounts tight on the hometown center
// behind the whiteout, then pulls out to the full map as the clouds part.
export const INTRO_VIEW = boxAround(1050, 745, MAP_W / 3.2);

// Geographic keyboard order (§4.6): clockwise from the northern ridge, ending
// on the hometown center. Arrow keys walk this ring.
export const MAP_ORDER = ["treks", "reader", "creator", "marathons", "writer", "person"];

const MAP_DATA = {
  treks: {
    name: "Treks",
    blurb: "treks and summit forts",
    at: [300, 300],
    focus: [660, 480, 1000],
    hit: [280, 230, 760, 400],
    plaque: [548, 582, 215],
  },
  reader: {
    name: "Book Forest",
    blurb: "books and reviews",
    at: [1300, 430],
    focus: [1600, 640, 950],
    hit: [1290, 435, 620, 420],
    plaque: [1505, 812, 190],
  },
  creator: {
    name: "Projects",
    blurb: "projects and resume",
    at: [1360, 880],
    focus: [1620, 1030, 900],
    hit: [1420, 900, 440, 310],
    plaque: [1495, 1148, 165],
  },
  marathons: {
    name: "Marathons",
    blurb: "races and running",
    at: [40, 850],
    focus: [480, 1050, 1000],
    hit: [70, 925, 820, 300],
    plaque: [295, 1156, 200],
  },
  writer: {
    name: "Scriptorium",
    blurb: "blogs and micro-posts",
    at: [170, 560],
    focus: [400, 750, 900],
    hit: [155, 605, 500, 290],
    plaque: [348, 848, 190],
  },
  person: {
    name: "Hometown Square",
    blurb: "about, now and everything home",
    at: [840, 590],
    focus: [1050, 745, 900],
    hit: [845, 565, 430, 355],
    plaque: [938, 876, 235],
  },
};

export const REGIONS = MAP_ORDER.map((key) => {
  const domain = DOMAINS.find((d) => d.key === key);
  const m = MAP_DATA[key];
  return {
    key,
    path: domain.path,
    color: domain.color,
    name: m.name,
    blurb: m.blurb,
    at: m.at,
    art: `translate(${m.at[0]},${m.at[1]})`,
    viewBox: boxAround(m.focus[0], m.focus[1], m.focus[2]),
    hit: m.hit,
    plaque: m.plaque,
    plaqueScale: 1,
  };
});

// Roads out of Hometown Square, drawn under the biomes.
const ROADS = [
  "M1000,740 Q860,650 700,585",
  "M1090,720 Q1220,690 1345,660",
  "M960,760 Q760,740 620,730",
  "M1090,800 Q1300,880 1480,960",
  "M980,810 Q850,930 740,1010",
];

const GROUND = "M0,470 C300,432 700,455 1000,445 C1400,432 1700,455 2000,440 L2000,1250 L0,1250 Z";

// ---- Portrait canvas (screens taller than wide) ----------------------------
// The landscape map fitted into a 375px-wide phone drew a 257px strip with
// ~3px labels. Portrait screens get the same biome art re-placed down a tall
// column instead (ridge on top, the coast and its lighthouse at the bottom),
// with plaques drawn 1.8x so they read at phone size. Landscape is untouched.
export const PORTRAIT_W = 900;
export const PORTRAIT_H = 1950;
const PLAQUE_SCALE = 1.8;

// key -> where its biome art is drawn ([x, y, scale]) and its plaque's
// top-left. From the approved sketch; the bottom plaques sit clear of the HUD's
// zoom cluster (bottom-left) and the guide (bottom-right).
const PORTRAIT_DATA = {
  treks: { place: [90, 300, 1], plaque: [300, 615] },
  reader: { place: [400, 575, 0.85], plaque: [520, 905] },
  creator: { place: [420, 1330, 0.95], plaque: [590, 1608] },
  marathons: { place: [-12, 1572, 0.95], plaque: [150, 1877] },
  writer: { place: [-12, 590, 0.85], plaque: [20, 815] },
  person: { place: [228, 980, 1], plaque: [240, 1290] },
};

/** A landscape world point inside region `key`, carried to where that region's art sits on the portrait canvas. */
export const toPortrait = (key, [x, y]) => {
  const [px, py, s] = PORTRAIT_DATA[key].place;
  const [ax, ay] = MAP_DATA[key].at;
  return [px + ((x - ax) * s), py + ((y - ay) * s)];
};

// The same move as an SVG transform, for art drawn in landscape world coords
// (the sea and shore ride with the coast this way).
const portraitShift = (key) => {
  const [px, py, s] = PORTRAIT_DATA[key].place;
  const [ax, ay] = MAP_DATA[key].at;
  return `translate(${px},${py}) scale(${s}) translate(${-ax},${-ay})`;
};

const PORTRAIT_REGIONS = REGIONS.map((r) => {
  const { place: [px, py, s], plaque: [qx, qy] } = PORTRAIT_DATA[r.key];
  const [hx, hy] = toPortrait(r.key, r.hit);
  const [fx, fy] = toPortrait(r.key, MAP_DATA[r.key].focus);
  return {
    ...r,
    art: `translate(${px},${py}) scale(${s})`,
    viewBox: boxAround(fx, fy, PORTRAIT_W / 2, PORTRAIT_W, PORTRAIT_H),
    hit: [hx, hy, r.hit[2] * s, r.hit[3] * s],
    plaque: [qx, qy, r.plaque[2]],
    plaqueScale: PLAQUE_SCALE,
  };
});

// The night-sky star belongs to the reader but hangs in the sky, which the
// portrait canvas moves to a different place than the forest.
const PORTRAIT_EGG_AT = { "birthday-star": [250, 230] };

/**
 * Everything WorldMap draws that differs between the two canvases. Landscape
 * leaves `stats`, `lighthouse` and `sea` undefined so those components keep
 * their own landscape defaults.
 */
export const LAYOUTS = {
  landscape: {
    key: "landscape",
    w: MAP_W,
    h: MAP_H,
    fullView: FULL_VIEW,
    introView: INTRO_VIEW,
    regions: REGIONS,
    zoom: [480, 2600],
    sky: {},
    ground: GROUND,
    glow: [1030, 770, 500, 210],
    roads: ROADS,
    near: true,
    eggAt: (egg) => egg.at,
  },
  portrait: {
    key: "portrait",
    w: PORTRAIT_W,
    h: PORTRAIT_H,
    fullView: { x: 0, y: 0, w: PORTRAIT_W, h: PORTRAIT_H },
    introView: boxAround(...toPortrait("person", [1050, 745]), PORTRAIT_W / 3.2, PORTRAIT_W, PORTRAIT_H),
    regions: PORTRAIT_REGIONS,
    zoom: [260, 1300],
    // Sun clear of the HUD's corner buttons; the horizon band just above the ground.
    sky: { width: PORTRAIT_W, height: PORTRAIT_H, horizon: 110, sun: [330, 110] },
    far: `translate(0,${300 - (466 * 0.45)}) scale(0.45)`,
    ground: "M0,340 C200,310 420,330 600,318 C760,308 860,325 900,315 L900,1950 L0,1950 Z",
    glow: [450, 1040, 430, 260],
    roads: [
      "M430,1010 Q380,760 450,560",
      "M330,1060 Q220,960 200,840",
      "M560,1050 Q680,960 660,880",
      "M560,1180 Q640,1260 640,1360",
      "M360,1190 Q280,1330 320,1652",
    ],
    sea: portraitShift("marathons"),
    // ponytail: NearProps (bushes, big waves, birds) are laid out along the
    // landscape map's bottom edge, so portrait skips them; re-place them here
    // if the phone map looks bare.
    near: false,
    stats: [545, 150, 0.98],
    // Plaque left of the tower (the guide stands to its right); the hit covers both.
    lighthouse: { plaque: [300, 1690, 1.6], hit: [300, 1665, 400, 185] },
    eggAt: (egg) => PORTRAIT_EGG_AT[egg.id] || toPortrait(egg.region, egg.at),
  },
};

// Route → region, used by ReturnPortal to send `state: { toRegion }` so the
// map can reverse the fly-in (§4.7). Prefixes cover every region route in §3.
const PATH_PREFIXES = [
  ["/sports", "marathons"],
  ["/treks", "treks"],
  ["/books", "reader"],
  ["/projects", "creator"],
  ["/resume", "creator"],
  ["/blueprint", "creator"],
  ["/presentations", "creator"],
  ["/100-days-to-offload", "writer"],
  ["/challenges", "writer"],
  ["/micro-blog", "writer"],
  ["/logbook", "writer"],
  ["/about", "person"],
  ["/now", "person"],
  ["/newsletter", "person"],
  ["/contact", "person"],
  ["/instagram", "person"],
  ["/stats", "person"],
  ["/changelog", "person"],
  ["/mindmap", "person"],
  ["/interactive-me", "person"],
  ["/ask", "person"],
  ["/tags", "person"],
];

export const regionForPath = (pathname) => {
  const found = PATH_PREFIXES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return found ? found[1] : null;
};
