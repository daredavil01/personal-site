// Workshop (creator) header band — reuses the map's BiomeWorkshop art (shed,
// turning gear, chimney smoke) over a floor band. Decorative + aria-hidden;
// the idle gear/smoke animations honour prefers-reduced-motion.

import React from "react";
import BiomeWorkshop from "../../map/art/BiomeWorkshop";

const WorkshopHeader = () => (
  <svg
    className="atlas-header-art"
    viewBox="0 0 1200 300"
    preserveAspectRatio="xMidYMax slice"
    role="presentation"
  >
    <rect x="0" y="0" width="1200" height="300" fill="var(--atlas-sky)" />
    <rect x="0" y="252" width="1200" height="48" fill="var(--atlas-stone)" opacity=".45" />
    <g transform="translate(255,4) scale(1.16)">
      <BiomeWorkshop />
    </g>
  </svg>
);

export default WorkshopHeader;
