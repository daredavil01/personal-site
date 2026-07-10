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

// A camera box of width `w` (map aspect ratio) centered on (cx, cy), clamped
// inside the canvas so corner regions never fly past the map edge.
const boxAround = (cx, cy, w) => {
  const h = w * (MAP_H / MAP_W);
  return {
    x: clamp(cx - (w / 2), 0, MAP_W - w),
    y: clamp(cy - (h / 2), 0, MAP_H - h),
    w,
    h,
  };
};

// Mobile initial view (§4.6): ~1.6× zoomed on Hometown Square.
export const HOME_VIEW = boxAround(1050, 745, MAP_W / 1.6);

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
    viewBox: boxAround(m.focus[0], m.focus[1], m.focus[2]),
    hit: m.hit,
    plaque: m.plaque,
  };
});

// Route → region, used by ReturnPortal to send `state: { toRegion }` so the
// map can reverse the fly-in (§4.7). Prefixes cover every region route in §3.
const PATH_PREFIXES = [
  ["/sports", "marathons"],
  ["/treks", "treks"],
  ["/books", "reader"],
  ["/projects", "creator"],
  ["/resume", "creator"],
  ["/100-days-to-offload", "writer"],
  ["/challenges", "writer"],
  ["/micro-blog", "writer"],
  ["/about", "person"],
  ["/now", "person"],
  ["/contact", "person"],
  ["/instagram", "person"],
  ["/stats", "person"],
  ["/changelog", "person"],
  ["/mindmap", "person"],
  ["/interactive-me", "person"],
];

export const regionForPath = (pathname) => {
  const found = PATH_PREFIXES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return found ? found[1] : null;
};
