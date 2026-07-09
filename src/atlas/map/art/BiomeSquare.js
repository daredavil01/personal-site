// Hometown Square (person) — approved placeholder: clock tower flying the
// hometown flag, two houses, plaza and fountain at the world's center.

import React from "react";

const BiomeSquare = () => (
  <g>
    <ellipse cx="215" cy="240" rx="200" ry="52" fill="var(--atlas-stone)" opacity=".5" />
    <ellipse cx="215" cy="240" rx="130" ry="33" fill="var(--atlas-parchment)" opacity=".35" />
    {/* Clock tower */}
    <rect x="182" y="70" width="64" height="168" fill="var(--atlas-parchment)" />
    <polygon points="174,74 214,16 254,74" fill="var(--atlas-accent)" />
    <line x1="214" y1="16" x2="214" y2="-14" stroke="var(--atlas-ink)" strokeWidth="3" />
    <polygon className="atlas-flag" points="214,-14 246,-6 214,2" fill="var(--atlas-accent)" />
    <circle cx="214" cy="118" r="22" fill="var(--atlas-parchment)" stroke="var(--atlas-accent)" strokeWidth="4" />
    <line x1="214" y1="118" x2="214" y2="104" stroke="var(--atlas-ink)" strokeWidth="3" />
    <line x1="214" y1="118" x2="224" y2="122" stroke="var(--atlas-ink)" strokeWidth="3" />
    <rect x="202" y="170" width="24" height="30" rx="3" fill="var(--atlas-window)" />
    {/* Houses */}
    <rect x="92" y="168" width="86" height="72" fill="var(--atlas-parchment)" />
    <polygon points="84,170 135,128 186,170" fill="var(--atlas-accent)" opacity=".85" />
    <rect x="112" y="186" width="20" height="24" rx="3" fill="var(--atlas-window)" />
    <rect x="146" y="196" width="20" height="44" rx="3" fill="var(--atlas-ink)" opacity=".45" />
    <rect x="262" y="176" width="92" height="64" fill="var(--atlas-parchment)" />
    <polygon points="254,178 308,134 362,178" fill="var(--atlas-accent)" opacity=".85" />
    <rect x="322" y="192" width="20" height="24" rx="3" fill="var(--atlas-window)" />
    <rect x="278" y="200" width="20" height="40" rx="3" fill="var(--atlas-ink)" opacity=".45" />
    {/* Fountain */}
    <circle cx="214" cy="248" r="14" fill="var(--atlas-water)" />
    <circle cx="214" cy="248" r="6" fill="var(--atlas-parchment)" opacity=".85" />
  </g>
);

export default BiomeSquare;
