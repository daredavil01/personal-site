// Hometown Square (person) — final art (phase 11): the world's center at the
// Book Forest detail benchmark. Clock tower with a ticking face and bunting
// strings to both houses, a pulsing fountain, lamp posts whose halos light
// at night, the observatory annex dome (§3: /mindmap = Observatory), a
// postbox (post office / contact), a notice board (archive hall /
// changelog), benches and town trees. Local coords;
// [data-region="person"] supplies --atlas-accent.

import React from "react";
import "./biomeLife.css";

// One town tree, reused via <use>.
const TownTree = () => (
  <g id="atlas-town-tree">
    <rect x="-3.5" y="8" width="7" height="16" rx="2" fill="var(--atlas-stone)" />
    <circle cx="0" cy="-4" r="17" fill="var(--atlas-foliage-2)" />
    <circle cx="-9" cy="2" r="10" fill="var(--atlas-foliage-1)" />
    <circle cx="10" cy="1" r="9" fill="var(--atlas-foliage-3)" />
  </g>
);

const BUNTING_A = [[196, 84], [180, 98], [164, 110], [148, 121]];
const BUNTING_B = [[230, 86], [246, 100], [263, 113], [282, 124]];
const FLAG_FILLS = ["var(--atlas-accent)", "var(--atlas-glow)", "var(--atlas-parchment)", "var(--atlas-accent)"];

const BiomeSquare = () => (
  <g>
    <defs>
      <TownTree />
    </defs>

    <ellipse cx="215" cy="240" rx="200" ry="52" fill="var(--atlas-stone)" opacity=".5" />
    <ellipse cx="215" cy="240" rx="130" ry="33" fill="var(--atlas-parchment)" opacity=".35" />

    {/* Observatory annex dome (drawn behind the right house) */}
    <rect x="370" y="208" width="52" height="32" fill="var(--atlas-parchment)" />
    <path d="M370,208 A26,26 0 0 1 422,208 Z" fill="var(--atlas-stone)" />
    <rect x="392" y="188" width="8" height="18" rx="2" fill="var(--atlas-window)" />

    {/* Clock tower */}
    <rect x="182" y="70" width="64" height="168" fill="var(--atlas-parchment)" />
    <polygon points="174,74 214,16 254,74" fill="var(--atlas-accent)" />
    <line x1="214" y1="16" x2="214" y2="-14" stroke="var(--atlas-ink)" strokeWidth="3" />
    <polygon className="atlas-flag" points="214,-14 246,-6 214,2" fill="var(--atlas-accent)" />
    <circle cx="214" cy="118" r="22" fill="var(--atlas-parchment)" stroke="var(--atlas-accent)" strokeWidth="4" />
    <g stroke="var(--atlas-ink)" strokeWidth="2" opacity=".45">
      <path d="M214,99 v4" />
      <path d="M214,133 v4" />
      <path d="M197,118 h4" />
      <path d="M227,118 h4" />
    </g>
    <line x1="214" y1="118" x2="214" y2="104" stroke="var(--atlas-ink)" strokeWidth="3" />
    <line x1="214" y1="118" x2="224" y2="122" stroke="var(--atlas-ink)" strokeWidth="3" />
    <rect x="202" y="170" width="24" height="30" rx="3" fill="var(--atlas-window)" />

    {/* Bunting: tower → both house roofs */}
    <path d="M214,64 Q176,100 140,128" fill="none" stroke="var(--atlas-ink)" strokeWidth="2" opacity=".4" />
    <path d="M214,64 Q252,102 306,134" fill="none" stroke="var(--atlas-ink)" strokeWidth="2" opacity=".4" />
    <g className="atlas-bunting">
      {BUNTING_A.map(([x, y], i) => (
        <polygon key={`${x}-${y}`} points={`${x},${y} ${x + 9},${y + 2} ${x + 3},${y + 11}`} fill={FLAG_FILLS[i]} />
      ))}
    </g>
    <g className="atlas-bunting" style={{ animationDelay: "-3s" }}>
      {BUNTING_B.map(([x, y], i) => (
        <polygon key={`${x}-${y}`} points={`${x},${y} ${x + 9},${y - 2} ${x + 6},${y + 10}`} fill={FLAG_FILLS[i]} />
      ))}
    </g>

    {/* Houses */}
    <rect x="92" y="168" width="86" height="72" fill="var(--atlas-parchment)" />
    <polygon points="84,170 135,128 186,170" fill="var(--atlas-accent)" opacity=".85" />
    <circle cx="135" cy="152" r="5" fill="var(--atlas-window)" />
    <rect x="112" y="186" width="20" height="24" rx="3" fill="var(--atlas-window)" />
    <rect x="146" y="196" width="20" height="44" rx="3" fill="var(--atlas-ink)" opacity=".45" />
    <rect x="262" y="176" width="92" height="64" fill="var(--atlas-parchment)" />
    <polygon points="254,178 308,134 362,178" fill="var(--atlas-accent)" opacity=".85" />
    <circle cx="308" cy="158" r="5" fill="var(--atlas-window)" />
    <rect x="322" y="192" width="20" height="24" rx="3" fill="var(--atlas-window)" />
    <rect x="278" y="200" width="20" height="40" rx="3" fill="var(--atlas-ink)" opacity=".45" />

    {/* Fountain: basin, pulsing jet, falling droplets */}
    <circle cx="214" cy="248" r="20" fill="var(--atlas-stone)" />
    <circle cx="214" cy="248" r="15" fill="var(--atlas-water)" />
    <rect className="atlas-fountain" x="212" y="224" width="4" height="20" rx="2" fill="#fff" opacity=".75" />
    <g fill="#fff">
      <circle className="atlas-drop" cx="207" cy="230" r="2" />
      <circle className="atlas-drop" style={{ animationDelay: "-.9s" }} cx="221" cy="228" r="2" />
      <circle className="atlas-drop" style={{ animationDelay: "-1.7s" }} cx="214" cy="224" r="1.8" />
    </g>
    <circle cx="214" cy="248" r="5" fill="var(--atlas-parchment)" opacity=".85" />

    {/* Lamp posts (halos wake at night) */}
    <g>
      <rect x="64" y="212" width="4" height="40" rx="2" fill="var(--atlas-ink)" opacity=".6" />
      <circle className="atlas-halo" cx="66" cy="206" r="14" fill="var(--atlas-glow)" />
      <circle cx="66" cy="206" r="6" fill="var(--atlas-glow)" />
    </g>
    <g>
      <rect x="366" y="216" width="4" height="38" rx="2" fill="var(--atlas-ink)" opacity=".6" />
      <circle className="atlas-halo" cx="368" cy="210" r="14" fill="var(--atlas-glow)" />
      <circle cx="368" cy="210" r="6" fill="var(--atlas-glow)" />
    </g>

    {/* Postbox (post office) + notice board (archive hall) */}
    <rect x="96" y="246" width="13" height="20" rx="3" fill="var(--atlas-accent)" />
    <rect x="99" y="251" width="7" height="2.5" rx="1" fill="var(--atlas-parchment)" />
    <g>
      <rect x="316" y="246" width="5" height="24" rx="2" fill="var(--atlas-stone)" />
      <rect x="345" y="246" width="5" height="24" rx="2" fill="var(--atlas-stone)" />
      <rect x="310" y="234" width="46" height="24" rx="3" fill="var(--atlas-parchment)" stroke="var(--atlas-stone)" strokeWidth="2" />
      <rect x="316" y="239" width="12" height="14" fill="#fff" opacity=".9" />
      <rect x="333" y="239" width="16" height="10" fill="#fff" opacity=".75" />
    </g>

    {/* Benches + town trees */}
    <g fill="var(--atlas-stone)">
      <rect x="150" y="264" width="30" height="5" rx="2" />
      <rect x="153" y="269" width="4" height="8" />
      <rect x="173" y="269" width="4" height="8" />
      <rect x="252" y="266" width="30" height="5" rx="2" />
      <rect x="255" y="271" width="4" height="8" />
      <rect x="275" y="271" width="4" height="8" />
    </g>
    <use href="#atlas-town-tree" transform="translate(34,242)" />
    <use href="#atlas-town-tree" transform="translate(412,250) scale(.85)" />
  </g>
);

export default BiomeSquare;
