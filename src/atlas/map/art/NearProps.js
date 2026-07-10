// NearLayer foreground props (§4.6 layer 4, phase 11) — the strip of scenery
// closest to the camera: big shore waves over the sea, bushes and grass
// tufts along the map's bottom edge, and low-flying birds. World coords on
// the 2000×1250 canvas. Strictly decorative (inside WorldMap's aria-hidden
// group) and non-interactive — hotspots/eggs render above this layer, and
// the parallax lead the layer gets never shifts anything interactive.

import React from "react";
import "./biomeLife.css";

// One foreground bush, reused via <use>.
const Bush = () => (
  <g id="atlas-near-bush">
    <circle cx="-18" cy="6" r="20" fill="var(--atlas-foliage-3)" />
    <circle cx="6" cy="0" r="26" fill="var(--atlas-foliage-2)" />
    <circle cx="28" cy="8" r="18" fill="var(--atlas-foliage-3)" />
  </g>
);

const BUSHES = [
  [780, 1238, 1],
  [1000, 1252, 1.25],
  [1245, 1240, 0.9],
  [1660, 1248, 1.15],
  [1900, 1236, 0.85],
];

const TUFTS = [
  [730, 1200],
  [905, 1215],
  [1120, 1205],
  [1420, 1222],
  [1560, 1200],
  [1800, 1212],
];

const NearProps = () => (
  <g>
    <defs>
      <Bush />
    </defs>

    {/* Big shore waves rolling in over the sea (bottom-left) */}
    <g className="atlas-wave" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round">
      <path d="M60,1060 q40,-20 80,0 q40,20 80,0" />
      <path d="M240,1160 q36,-18 72,0 q36,18 72,0" />
    </g>
    <g className="atlas-wave" style={{ animationDelay: "-2.9s" }} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round">
      <path d="M90,1190 q34,-16 68,0 q34,16 68,0" />
      <path d="M400,1210 q30,-15 60,0 q30,15 60,0" />
    </g>
    <g stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".3">
      <path d="M170,1110 h60" />
      <path d="M330,1075 h44" />
      <path d="M500,1180 h52" />
    </g>

    {/* Bushes along the bottom edge */}
    {BUSHES.map(([x, y, s]) => (
      <use key={`${x}-${y}`} href="#atlas-near-bush" transform={`translate(${x},${y}) scale(${s})`} />
    ))}

    {/* Grass tufts */}
    <g stroke="var(--atlas-foliage-3)" strokeWidth="4" strokeLinecap="round" fill="none">
      {TUFTS.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <path d={`M${x},${y} q-3,-12 -8,-16`} />
          <path d={`M${x},${y} q1,-14 0,-18`} />
          <path d={`M${x},${y} q4,-12 9,-15`} />
        </g>
      ))}
    </g>

    {/* Low-flying birds, closest to camera */}
    <path d="M600,420 q11,-12 22,0 q11,-12 22,0" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" opacity=".9" />
    <path d="M1730,470 q10,-11 20,0 q10,-11 20,0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".85" />
  </g>
);

export default NearProps;
