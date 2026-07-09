// Book Forest region header band (§4.8). Reuses the map's benchmark biome art
// (BiomeForest — the §10 detail benchmark) as a wide banner strip so the
// region interior reads as the same place the hub flew into. Purely decorative
// (RegionShell marks the band aria-hidden); day/night comes from the shared
// atlas tokens, exactly as on the map. BiomeForest is rendered once here to
// keep its internal <defs id> unique on the page.

import React from "react";
import BiomeForest from "../../map/art/BiomeForest";

const FAR_CANOPY = "M0,150 Q150,86 300,150 Q450,90 600,150 Q750,86 900,150 "
  + "Q1050,90 1200,150 L1200,320 L0,320 Z";

const ForestHeader = () => (
  <svg
    className="atlas-header-art"
    viewBox="0 0 1200 300"
    preserveAspectRatio="xMidYMax slice"
    role="presentation"
  >
    <rect x="0" y="0" width="1200" height="300" fill="var(--atlas-sky)" />
    <path d={FAR_CANOPY} fill="var(--atlas-foliage-3)" opacity=".45" />
    <rect x="0" y="222" width="1200" height="78" fill="var(--atlas-foliage-2)" opacity=".55" />
    <path
      d="M0,222 Q300,206 600,220 Q900,232 1200,216 L1200,240 L0,240 Z"
      fill="var(--atlas-horizon)"
      opacity=".35"
    />
    {/* The benchmark biome, scaled into the band (rendered once). */}
    <g transform="translate(300,-52) scale(0.92)">
      <BiomeForest />
    </g>
  </svg>
);

export default ForestHeader;
