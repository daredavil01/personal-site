// Workshop (creator) — approved placeholder: the maker's shed with a slowly
// turning gear and chimney smoke (idle life, §1; animations live in
// worldMap.css behind prefers-reduced-motion).

import React from "react";

const GEAR_TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

const BiomeWorkshop = () => (
  <g>
    <ellipse cx="260" cy="245" rx="230" ry="42" fill="var(--atlas-stone)" opacity=".4" />
    <rect x="96" y="120" width="236" height="128" rx="6" fill="var(--atlas-parchment)" />
    <polygon points="84,124 214,54 344,124" fill="var(--atlas-accent)" opacity=".92" />
    <rect x="150" y="176" width="72" height="72" rx="6" fill="var(--atlas-ink)" opacity=".45" />
    <rect x="250" y="160" width="30" height="32" rx="3" fill="var(--atlas-window)" />
    <rect x="292" y="74" width="26" height="50" fill="var(--atlas-stone)" />
    <circle className="atlas-smoke" cx="305" cy="58" r="10" fill="var(--atlas-parchment)" opacity=".5" />
    <circle className="atlas-smoke" style={{ animationDelay: "1.6s" }} cx="312" cy="48" r="13" fill="var(--atlas-parchment)" opacity=".45" />
    <circle className="atlas-smoke" style={{ animationDelay: "3.2s" }} cx="318" cy="36" r="15" fill="var(--atlas-parchment)" opacity=".4" />
    <g className="atlas-gear" transform="translate(420,180)">
      <g fill="var(--atlas-stone)">
        {GEAR_TEETH.map((deg) => (
          <rect key={deg} x="-7" y="-64" width="14" height="20" rx="3" transform={`rotate(${deg})`} />
        ))}
        <circle r="48" />
      </g>
      <circle r="16" fill="var(--atlas-parchment)" />
      <circle r="6" fill="var(--atlas-ink)" opacity=".5" />
    </g>
  </g>
);

export default BiomeWorkshop;
