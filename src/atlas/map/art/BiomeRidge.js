// Sahyadri Ridge (treks) — final art (phase 11), grown from the approved
// silhouette to the Book Forest detail benchmark: layered peaks, a
// crenellated hill fort with turrets flying the flag, a switchback summit
// trail with cairn and trail sign, pine foothills, base camp (tent +
// campfire whose halo lights at night), drifting mist and birds. Local
// coords; the map positions the group and [data-region="treks"] supplies
// --atlas-accent.

import React from "react";
import "./biomeLife.css";

// One foothill pine, reused via <use>.
const Pine = () => (
  <g id="atlas-pine">
    <rect x="-4" y="22" width="8" height="14" rx="2" fill="var(--atlas-stone)" />
    <polygon points="0,-26 20,8 -20,8" fill="var(--atlas-foliage-3)" />
    <polygon points="0,-8 24,24 -24,24" fill="var(--atlas-foliage-2)" />
  </g>
);

const BiomeRidge = () => (
  <g>
    <defs>
      <Pine />
    </defs>

    {/* Distant peaks behind the main range */}
    <polygon points="90,265 235,135 375,265" fill="var(--atlas-foliage-3)" opacity=".35" />
    <polygon points="365,265 515,118 655,265" fill="var(--atlas-foliage-3)" opacity=".3" />

    {/* Main range (approved silhouette) */}
    <polygon points="0,265 130,90 265,265" fill="var(--atlas-foliage-2)" />
    <polygon points="130,90 101,133 159,133" fill="var(--atlas-stone)" />
    <polygon points="195,265 355,25 515,265" fill="var(--atlas-foliage-3)" />
    <polygon points="355,25 323,80 387,80" fill="var(--atlas-stone)" />
    <polygon points="455,265 585,110 720,265" fill="var(--atlas-foliage-2)" />
    <polygon points="585,110 559,148 611,148" fill="var(--atlas-stone)" />

    {/* Switchback trail up the tallest peak */}
    <path
      d="M262,262 L322,232 L284,204 L340,172 L308,144 L352,116 L332,94 L355,72"
      fill="none"
      stroke="var(--atlas-parchment)"
      strokeWidth="5"
      strokeDasharray="9 7"
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity=".8"
    />

    {/* Hill fort: turrets, crenellated wall, gate, lit windows at night */}
    <rect x="307" y="-26" width="16" height="56" fill="var(--atlas-stone)" />
    <polygon points="305,-26 315,-40 325,-26" fill="var(--atlas-accent)" />
    <rect x="387" y="-26" width="16" height="56" fill="var(--atlas-stone)" />
    <polygon points="385,-26 395,-40 405,-26" fill="var(--atlas-accent)" />
    <rect x="319" y="-10" width="72" height="40" fill="var(--atlas-stone)" />
    <rect x="323" y="-20" width="10" height="10" fill="var(--atlas-stone)" />
    <rect x="341" y="-20" width="10" height="10" fill="var(--atlas-stone)" />
    <rect x="359" y="-20" width="10" height="10" fill="var(--atlas-stone)" />
    <rect x="377" y="-20" width="10" height="10" fill="var(--atlas-stone)" />
    <path d="M347,30 L347,14 Q355,6 363,14 L363,30 Z" fill="var(--atlas-ink)" opacity=".45" />
    <rect x="329" y="-2" width="9" height="11" rx="2" fill="var(--atlas-window)" />
    <rect x="372" y="-2" width="9" height="11" rx="2" fill="var(--atlas-window)" />
    <line x1="355" y1="-26" x2="355" y2="-66" stroke="var(--atlas-ink)" strokeWidth="3" />
    <polygon className="atlas-flag" points="355,-66 397,-55 355,-45" fill="var(--atlas-accent)" />

    {/* Pennants on the side summits */}
    <line x1="130" y1="90" x2="130" y2="66" stroke="var(--atlas-ink)" strokeWidth="2.5" />
    <polygon className="atlas-flag" style={{ animationDelay: "-1.2s" }} points="130,66 156,73 130,80" fill="var(--atlas-glow)" />
    <line x1="585" y1="110" x2="585" y2="88" stroke="var(--atlas-ink)" strokeWidth="2.5" />
    <polygon className="atlas-flag" style={{ animationDelay: "-2.1s" }} points="585,88 609,94 585,100" fill="var(--atlas-parchment)" />

    {/* Foothill pines */}
    <use href="#atlas-pine" transform="translate(58,226)" />
    <use href="#atlas-pine" transform="translate(232,236) scale(.85)" />
    <use href="#atlas-pine" transform="translate(475,230)" />
    <use href="#atlas-pine" transform="translate(695,236) scale(.9)" />
    <use href="#atlas-pine" transform="translate(148,250) scale(.7)" />
    <use href="#atlas-pine" transform="translate(652,254) scale(.65)" />

    {/* Cairn beside the trailhead */}
    <ellipse cx="243" cy="258" rx="11" ry="5" fill="var(--atlas-stone)" />
    <ellipse cx="243" cy="251" rx="8" ry="4" fill="var(--atlas-stone)" />
    <ellipse cx="243" cy="245" rx="5" ry="3.5" fill="var(--atlas-stone)" />

    {/* Trail sign */}
    <rect x="166" y="224" width="7" height="38" rx="3" fill="var(--atlas-stone)" />
    <rect x="140" y="218" width="58" height="17" rx="4" fill="var(--atlas-accent)" />
    <polygon points="198,218 210,226.5 198,235" fill="var(--atlas-accent)" />
    <text x="169" y="230.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" letterSpacing="1">SUMMIT</text>

    {/* Base camp: tent + campfire (halo wakes at night) */}
    <polygon points="600,258 622,224 644,258" fill="var(--atlas-accent)" opacity=".9" />
    <polygon points="615,258 622,240 629,258" fill="var(--atlas-ink)" opacity=".4" />
    <line x1="660" y1="256" x2="678" y2="250" stroke="var(--atlas-stone)" strokeWidth="4" strokeLinecap="round" />
    <line x1="660" y1="250" x2="678" y2="256" stroke="var(--atlas-stone)" strokeWidth="4" strokeLinecap="round" />
    <circle className="atlas-halo" cx="669" cy="246" r="16" fill="var(--atlas-glow)" />
    <polygon points="669,236 675,249 669,253 663,249" fill="var(--atlas-glow)" />

    {/* Drifting mist bands */}
    <g className="atlas-cloud atlas-mist-a" fill="var(--atlas-parchment)">
      <ellipse cx="180" cy="152" rx="55" ry="12" />
      <ellipse cx="242" cy="162" rx="40" ry="10" />
    </g>
    <g className="atlas-cloud atlas-mist-b" fill="var(--atlas-parchment)">
      <ellipse cx="560" cy="172" rx="60" ry="12" />
      <ellipse cx="622" cy="182" rx="42" ry="10" />
    </g>

    {/* Birds over the col */}
    <path d="M430,62 q8,-9 16,0 q8,-9 16,0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".85" />
    <path d="M488,44 q6,-7 12,0 q6,-7 12,0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".75" />
  </g>
);

export default BiomeRidge;
