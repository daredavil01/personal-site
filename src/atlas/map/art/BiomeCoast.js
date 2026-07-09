// Coastal Road (marathons) — approved placeholder: the winding shoreline
// route with a start banner, mile markers, a buoy and the lighthouse whose
// beam only sweeps at night (opacity keyed to --atlas-night in worldMap.css).

import React from "react";

const ROAD = "M60,340 C200,300 260,240 380,215 C520,185 640,165 780,120";

const BiomeCoast = () => (
  <g>
    <path d={ROAD} fill="none" stroke="var(--atlas-foliage-3)" strokeWidth="36" strokeLinecap="round" opacity=".4" />
    <path d={ROAD} fill="none" stroke="var(--atlas-horizon)" strokeWidth="28" strokeLinecap="round" />
    <path d={ROAD} fill="none" stroke="#ffffff" strokeWidth="4" strokeDasharray="20 16" opacity=".75" />
    {/* Start banner */}
    <rect x="74" y="296" width="10" height="46" fill="var(--atlas-accent)" />
    <rect x="120" y="296" width="10" height="46" fill="var(--atlas-accent)" />
    <rect x="66" y="280" width="72" height="20" rx="5" fill="var(--atlas-accent)" />
    {/* Mile markers */}
    <g>
      <rect x="296" y="216" width="10" height="30" rx="3" fill="var(--atlas-parchment)" />
      <circle cx="301" cy="210" r="10" fill="var(--atlas-accent)" />
      <text x="301" y="214" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">5</text>
    </g>
    <g>
      <rect x="516" y="172" width="10" height="30" rx="3" fill="var(--atlas-parchment)" />
      <circle cx="521" cy="166" r="10" fill="var(--atlas-accent)" />
      <text x="521" y="170" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">10</text>
    </g>
    {/* Lighthouse */}
    <polygon className="atlas-beam" points="736,140 920,92 920,196" fill="var(--atlas-glow)" />
    <polygon points="686,272 694,150 730,150 738,272" fill="var(--atlas-parchment)" />
    <rect x="687" y="228" width="49" height="19" fill="var(--atlas-accent)" />
    <rect x="690" y="188" width="43" height="19" fill="var(--atlas-accent)" />
    <rect x="696" y="128" width="32" height="24" rx="3" fill="var(--atlas-ink)" opacity=".65" />
    <circle cx="712" cy="140" r="8" fill="var(--atlas-glow)" />
    <polygon points="694,128 712,106 730,128" fill="var(--atlas-accent)" />
    <ellipse cx="700" cy="276" rx="42" ry="10" fill="var(--atlas-stone)" />
    {/* Buoy */}
    <circle cx="180" cy="240" r="10" fill="var(--atlas-accent)" />
    <line x1="180" y1="230" x2="180" y2="214" stroke="var(--atlas-ink)" strokeWidth="3" />
  </g>
);

export default BiomeCoast;
