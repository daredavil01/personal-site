// Book Forest (reader) — the fully-detailed biome from the approved concept
// board: the detail benchmark for every biome (§10 gate). Shelf-trees carry
// book spines on their canopy tiers; the clearing holds the open-book
// monument; fireflies wake and the lantern halo lights when [data-time]
// flips to night — same markup, zero art changes (§4.10).

import React from "react";
import "./biomeLife.css";

// One shelf-tree, reused at five positions/scales via <use>.
const ShelfTree = () => (
  <g id="atlas-shelf-tree">
    <rect x="-9" y="-4" width="18" height="64" rx="5" fill="var(--atlas-stone)" />
    <rect x="-76" y="-42" width="152" height="30" rx="15" fill="var(--atlas-foliage-3)" />
    <rect x="-58" y="-40" width="9" height="26" rx="2" fill="var(--atlas-accent)" />
    <rect x="-44" y="-38" width="8" height="23" rx="2" fill="var(--atlas-parchment)" />
    <rect x="30" y="-40" width="9" height="26" rx="2" fill="var(--atlas-glow)" />
    <rect x="46" y="-38" width="8" height="23" rx="2" fill="var(--atlas-accent)" />
    <rect x="-60" y="-74" width="120" height="28" rx="14" fill="var(--atlas-foliage-2)" />
    <rect x="-40" y="-71" width="8" height="23" rx="2" fill="var(--atlas-glow)" />
    <rect x="22" y="-72" width="9" height="24" rx="2" fill="var(--atlas-accent)" />
    <rect x="-44" y="-104" width="88" height="26" rx="13" fill="var(--atlas-foliage-1)" />
    <rect x="-8" y="-101" width="8" height="21" rx="2" fill="var(--atlas-parchment)" />
    <rect x="-27" y="-128" width="54" height="22" rx="11" fill="var(--atlas-foliage-2)" />
  </g>
);

const FIREFLIES = [
  [200, 242, 3, "0s"],
  [352, 212, 3, "-.9s"],
  [158, 182, 2.5, "-1.7s"],
  [520, 250, 2.5, "-2.2s"],
  [262, 308, 3, "-.4s"],
  [392, 176, 2.5, "-1.3s"],
];

const BiomeForest = () => (
  <g>
    <defs>
      <ShelfTree />
    </defs>

    {/* Canopy backdrop + forest floor + clearing */}
    <ellipse cx="150" cy="150" rx="115" ry="78" fill="var(--atlas-foliage-3)" opacity=".5" />
    <ellipse cx="320" cy="120" rx="135" ry="88" fill="var(--atlas-foliage-3)" opacity=".5" />
    <ellipse cx="480" cy="160" rx="100" ry="72" fill="var(--atlas-foliage-3)" opacity=".5" />
    <ellipse cx="300" cy="330" rx="270" ry="66" fill="var(--atlas-foliage-2)" opacity=".5" />
    <ellipse cx="310" cy="330" rx="135" ry="44" fill="var(--atlas-horizon)" opacity=".6" />
    <path d="M310,372 Q255,392 195,400" fill="none" stroke="var(--atlas-parchment)" strokeWidth="9" opacity=".85" strokeLinecap="round" />

    {/* Shelf-trees */}
    <use href="#atlas-shelf-tree" transform="translate(120,300)" />
    <use href="#atlas-shelf-tree" transform="translate(255,272) scale(1.25)" />
    <use href="#atlas-shelf-tree" transform="translate(432,300) scale(-1.08,1.08)" />
    <use href="#atlas-shelf-tree" transform="translate(524,332) scale(.78)" />
    <use href="#atlas-shelf-tree" transform="translate(58,346) scale(-.68,.68)" />

    {/* Open-book monument */}
    <rect x="285" y="318" width="52" height="14" rx="4" fill="var(--atlas-stone)" />
    <path d="M311,306 Q296,297 281,306 L281,319 Q296,312 311,319 Z" fill="var(--atlas-parchment)" />
    <path d="M311,306 Q326,297 341,306 L341,319 Q326,312 311,319 Z" fill="var(--atlas-parchment)" />
    <line x1="311" y1="306" x2="311" y2="319" stroke="var(--atlas-ink)" strokeWidth="2" opacity=".4" />

    {/* Trail sign */}
    <rect x="402" y="298" width="8" height="48" rx="3" fill="var(--atlas-stone)" />
    <rect x="378" y="294" width="58" height="18" rx="4" fill="var(--atlas-accent)" />
    <polygon points="436,294 449,303 436,312" fill="var(--atlas-accent)" />
    <text x="408" y="307" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" letterSpacing="1">SHELVES</text>
    <polygon points="396,317 384,325 396,333" fill="var(--atlas-parchment)" />
    <rect x="396" y="317" width="52" height="16" rx="4" fill="var(--atlas-parchment)" />
    <text x="422" y="329" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--atlas-ink)" letterSpacing="1">REVIEWS</text>

    {/* Lantern */}
    <line x1="452" y1="222" x2="492" y2="232" stroke="var(--atlas-stone)" strokeWidth="5" strokeLinecap="round" />
    <line x1="492" y1="232" x2="492" y2="250" stroke="var(--atlas-ink)" strokeWidth="2" />
    <circle className="atlas-halo" cx="492" cy="262" r="22" fill="var(--atlas-glow)" />
    <rect x="486" y="248" width="12" height="6" rx="2" fill="var(--atlas-stone)" />
    <circle cx="492" cy="262" r="9" fill="var(--atlas-glow)" />

    {/* Leaf-cards leaning at the trunks */}
    <g fill="var(--atlas-parchment)">
      <rect x="96" y="338" width="26" height="34" rx="4" transform="rotate(-8 109 355)" />
      <rect x="452" y="340" width="24" height="32" rx="4" transform="rotate(6 464 356)" />
      <rect x="350" y="350" width="22" height="30" rx="4" transform="rotate(-4 361 365)" />
    </g>
    <g stroke="var(--atlas-ink)" strokeWidth="2" opacity=".35" strokeLinecap="round">
      <path d="M102,348 l14,-2 M103,356 l13,-2" />
      <path d="M457,348 l14,1 M457,356 l13,1" />
    </g>

    {/* Page-birds */}
    <path d="M170,110 q8,-9 16,0 q8,-9 16,0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".85" />
    <path d="M242,88 q6,-7 12,0 q6,-7 12,0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".75" />

    {/* Fireflies (night only) */}
    <g fill="var(--atlas-glow)">
      {FIREFLIES.map(([cx, cy, r, delay]) => (
        <circle key={`${cx}-${cy}`} className="atlas-ff" style={{ animationDelay: delay }} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  </g>
);

export default BiomeForest;
