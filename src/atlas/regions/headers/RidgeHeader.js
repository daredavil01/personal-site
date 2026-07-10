// Sahyadri Ridge (treks) header band — reuses the map's BiomeRidge silhouette
// over a layered range backdrop. Decorative (RegionShell marks it aria-hidden);
// day/night follows the shared atlas tokens.

import React from "react";
import BiomeRidge from "../../map/art/BiomeRidge";

const FAR_RANGE = "M0,210 L150,120 L300,205 L470,110 L640,205 L820,125 L1000,205 "
  + "L1200,140 L1200,300 L0,300 Z";

const RidgeHeader = () => (
  <svg
    className="atlas-header-art"
    viewBox="0 0 1200 300"
    preserveAspectRatio="xMidYMax slice"
    role="presentation"
  >
    <rect x="0" y="0" width="1200" height="300" fill="var(--atlas-sky)" />
    <path d={FAR_RANGE} fill="var(--atlas-foliage-3)" opacity=".45" />
    <rect x="0" y="256" width="1200" height="44" fill="var(--atlas-foliage-2)" opacity=".5" />
    <g transform="translate(300,38) scale(0.9)">
      <BiomeRidge />
    </g>
  </svg>
);

export default RidgeHeader;
