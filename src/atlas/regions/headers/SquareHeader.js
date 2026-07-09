// Hometown Square (person) header band — reuses the map's BiomeSquare art
// (clock tower, houses, fountain) over a plaza band. Decorative + aria-hidden;
// windows light up at night via --atlas-window.

import React from "react";
import BiomeSquare from "../../map/art/BiomeSquare";

const SquareHeader = () => (
  <svg
    className="atlas-header-art"
    viewBox="0 0 1200 300"
    preserveAspectRatio="xMidYMax slice"
    role="presentation"
  >
    <rect x="0" y="0" width="1200" height="300" fill="var(--atlas-sky)" />
    <rect x="0" y="250" width="1200" height="50" fill="var(--atlas-stone)" opacity=".4" />
    <g transform="translate(340,-4) scale(1.16)">
      <BiomeSquare />
    </g>
  </svg>
);

export default SquareHeader;
