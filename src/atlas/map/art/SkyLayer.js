// SkyLayer (§4.6 layer 1) — day/night gradient, sun/moon, stars, clouds.
// Every fill is an atlas token; flipping [data-time] repaints the whole sky
// (sun ↔ moon and stars swap via the --atlas-day/--atlas-night opacities).

import React from "react";
import PropTypes from "prop-types";
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

// `width`/`height` size the sky to the canvas (the portrait map is 900 wide):
// stars and clouds spread across the width, the sun sits at `sun`, and the
// horizon band starts at `horizon`. The defaults are the landscape map.
const SkyLayer = ({
  width, height, horizon, sun: [sunX, sunY],
}) => {
  const sx = width / MAP_W;
  return (
  <g>
    <defs>
      <linearGradient id="atlas-horizon-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: "var(--atlas-sky)" }} />
        <stop offset="1" style={{ stopColor: "var(--atlas-horizon)" }} />
      </linearGradient>
    </defs>

    {/* Oversized past the canvas edges so the sky layer's parallax lag
        (±55 world units, see parallax.js) can never expose a border gap. */}
    <rect x="-80" y="-60" width={width + 160} height={height + 120} fill="var(--atlas-sky)" />
    <rect x="-80" y={horizon} width={width + 160} height="250" fill="url(#atlas-horizon-grad)" />

    <g>
      {STARS.map(([x, y, r]) => (
        <circle
          key={`${x}-${y}`}
          className="atlas-star"
          cx={x * sx}
          cy={y}
          r={r}
          fill="#fff"
        />
      ))}
    </g>

    {/* Sun (day) / crescent moon (night) share the same corner. */}
    <g className="atlas-day-only">
      <circle
        cx={sunX}
        cy={sunY}
        r="82"
        fill="var(--atlas-glow)"
        opacity=".22"
      />
      <circle cx={sunX} cy={sunY} r="56" fill="var(--atlas-glow)" />
    </g>
    <g className="atlas-night-only">
      <circle cx={sunX} cy={sunY} r="52" fill="var(--atlas-ink)" />
      <circle cx={sunX + 22} cy={sunY - 12} r="44" fill="var(--atlas-sky)" />
    </g>

    <g className="atlas-cloud atlas-cloud-a" fill="var(--atlas-parchment)">
      {CLOUD_1.map(([cx, cy, rx, ry]) => (
        <ellipse key={`${cx}-${cy}`} cx={cx * sx} cy={cy} rx={rx} ry={ry} />
      ))}
    </g>
    <g className="atlas-cloud atlas-cloud-b" fill="var(--atlas-parchment)">
      {CLOUD_2.map(([cx, cy, rx, ry]) => (
        <ellipse key={`${cx}-${cy}`} cx={cx * sx} cy={cy} rx={rx} ry={ry} />
      ))}
    </g>
  </g>
  );
};

SkyLayer.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  horizon: PropTypes.number,
  sun: PropTypes.arrayOf(PropTypes.number),
};

SkyLayer.defaultProps = {
  width: MAP_W,
  height: MAP_H,
  horizon: 230,
  sun: [1660, 150],
};

export default SkyLayer;
