// Sahyadri Ridge (treks) — approved placeholder silhouette: three peaks with
// stone caps and a fort flying its flag on the tallest. Local coords; the map
// positions the group and [data-region="treks"] supplies --atlas-accent.

import React from "react";

const BiomeRidge = () => (
  <g>
    <polygon points="0,265 130,90 265,265" fill="var(--atlas-foliage-2)" />
    <polygon points="130,90 101,133 159,133" fill="var(--atlas-stone)" />
    <polygon points="195,265 355,25 515,265" fill="var(--atlas-foliage-3)" />
    <polygon points="355,25 323,80 387,80" fill="var(--atlas-stone)" />
    <polygon points="455,265 585,110 720,265" fill="var(--atlas-foliage-2)" />
    <polygon points="585,110 559,148 611,148" fill="var(--atlas-stone)" />
    {/* Fort on the tallest peak */}
    <rect x="327" y="-14" width="56" height="42" fill="var(--atlas-stone)" />
    <rect x="329" y="-24" width="10" height="10" fill="var(--atlas-stone)" />
    <rect x="351" y="-24" width="10" height="10" fill="var(--atlas-stone)" />
    <rect x="373" y="-24" width="10" height="10" fill="var(--atlas-stone)" />
    <rect x="348" y="4" width="14" height="24" fill="var(--atlas-ink)" opacity=".45" />
    <line x1="355" y1="-24" x2="355" y2="-66" stroke="var(--atlas-ink)" strokeWidth="3" />
    <polygon className="atlas-flag" points="355,-66 397,-55 355,-45" fill="var(--atlas-accent)" />
  </g>
);

export default BiomeRidge;
