// Coastal Road (marathons) header band — reuses the map's BiomeCoast art (road,
// mile-markers, lighthouse) over a sea band. Decorative + aria-hidden; the
// lighthouse beam still keys to night via the shared tokens.

import React from "react";
import BiomeCoast from "../../map/art/BiomeCoast";

const SEA = "M0,235 C220,250 420,255 600,246 C820,236 1010,250 1200,240 L1200,300 L0,300 Z";

const CoastHeader = () => (
  <svg
    className="atlas-header-art"
    viewBox="0 0 1200 300"
    preserveAspectRatio="xMidYMax slice"
    role="presentation"
  >
    <rect x="0" y="0" width="1200" height="300" fill="var(--atlas-sky)" />
    <rect x="0" y="196" width="1200" height="104" fill="var(--atlas-foliage-2)" opacity=".4" />
    <g transform="translate(190,-6) scale(0.82)">
      <BiomeCoast />
    </g>
    <path d={SEA} fill="var(--atlas-water)" opacity=".92" />
    <path
      d="M0,235 C220,250 420,255 600,246 C820,236 1010,250 1200,240"
      fill="none"
      stroke="var(--atlas-parchment)"
      strokeWidth="4"
      opacity=".5"
    />
  </svg>
);

export default CoastHeader;
