// SkyLayer (§4.6 layer 1) — day/night gradient, sun/moon, stars, clouds.
// Every fill is an atlas token; flipping [data-time] repaints the whole sky
// (sun ↔ moon and stars swap via the --atlas-day/--atlas-night opacities).

import React from "react";
import { MAP_W, MAP_H } from "../mapRegions";
import "./biomeLife.css";

// Fixed star field (deterministic render; y stays above the horizon band).
const STARS = [
  [96, 60, 2.1],
  [214, 178, 1.6],
  [345, 40, 2.6],
  [468, 130, 1.8],
  [590, 240, 1.5],
  [702, 84, 2.3],
  [818, 190, 1.7],
  [936, 48, 2.0],
  [1054, 150, 2.4],
  [1170, 262, 1.6],
  [1288, 96, 2.2],
  [1402, 208, 1.5],
  [1494, 36, 2.5],
  [1586, 148, 1.9],
  [1738, 268, 1.6],
  [1812, 76, 2.2],
  [1894, 180, 1.8],
  [1958, 300, 1.5],
  [154, 296, 1.7],
  [520, 308, 1.9],
  [872, 296, 1.6],
  [1230, 20, 1.8],
];

const CLOUD_1 = [
  [420, 170, 95, 26],
  [490, 150, 70, 22],
  [355, 152, 55, 18],
];
const CLOUD_2 = [
  [1180, 110, 110, 28],
  [1260, 90, 75, 22],
  [1105, 92, 60, 19],
];

const SkyLayer = () => (
  <g>
    <defs>
      <linearGradient id="atlas-horizon-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: "var(--atlas-sky)" }} />
        <stop offset="1" style={{ stopColor: "var(--atlas-horizon)" }} />
      </linearGradient>
    </defs>

    {/* Oversized past the canvas edges so the sky layer's parallax lag
        (±55 world units, see parallax.js) can never expose a border gap. */}
    <rect x="-80" y="-60" width={MAP_W + 160} height={MAP_H + 120} fill="var(--atlas-sky)" />
    <rect x="-80" y="230" width={MAP_W + 160} height="250" fill="url(#atlas-horizon-grad)" />

    <g>
      {STARS.map(([x, y, r]) => (
        <circle
          key={`${x}-${y}`}
          className="atlas-star"
          cx={x}
          cy={y}
          r={r}
          fill="#fff"
        />
      ))}
    </g>

    {/* Sun (day) / crescent moon (night) share the same corner. */}
    <g className="atlas-day-only">
      <circle
        cx="1660"
        cy="150"
        r="82"
        fill="var(--atlas-glow)"
        opacity=".22"
      />
      <circle cx="1660" cy="150" r="56" fill="var(--atlas-glow)" />
    </g>
    <g className="atlas-night-only">
      <circle cx="1660" cy="150" r="52" fill="var(--atlas-ink)" />
      <circle cx="1682" cy="138" r="44" fill="var(--atlas-sky)" />
    </g>

    <g className="atlas-cloud atlas-cloud-a" fill="var(--atlas-parchment)">
      {CLOUD_1.map(([cx, cy, rx, ry]) => (
        <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} />
      ))}
    </g>
    <g className="atlas-cloud atlas-cloud-b" fill="var(--atlas-parchment)">
      {CLOUD_2.map(([cx, cy, rx, ry]) => (
        <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} />
      ))}
    </g>
  </g>
);

export default SkyLayer;
