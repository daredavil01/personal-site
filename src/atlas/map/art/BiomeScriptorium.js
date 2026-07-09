// Scriptorium (writer) — approved placeholder: writer's hall with a press
// tower, a giant quill rising from the ink pond, scattered pages. Windows use
// --atlas-window so they light up at night (§4.10).

import React from "react";

const BiomeScriptorium = () => (
  <g>
    <ellipse cx="95" cy="255" rx="75" ry="22" fill="var(--atlas-water)" opacity=".9" />
    <path
      d="M95,250 C70,180 90,120 130,80 C128,140 118,200 100,252 Z"
      fill="var(--atlas-accent)"
      opacity=".9"
    />
    <line x1="98" y1="252" x2="122" y2="120" stroke="var(--atlas-ink)" strokeWidth="3" opacity=".55" />
    <rect x="180" y="130" width="190" height="120" rx="6" fill="var(--atlas-parchment)" />
    <polygon points="168,132 275,62 382,132" fill="var(--atlas-accent)" opacity=".92" />
    <rect x="258" y="196" width="34" height="54" rx="4" fill="var(--atlas-ink)" opacity=".45" />
    <rect x="205" y="155" width="26" height="30" rx="3" fill="var(--atlas-window)" />
    <rect x="320" y="155" width="26" height="30" rx="3" fill="var(--atlas-window)" />
    <rect x="372" y="96" width="54" height="154" rx="5" fill="var(--atlas-stone)" />
    <rect x="388" y="140" width="22" height="26" rx="3" fill="var(--atlas-window)" />
    <circle cx="399" cy="88" r="19" fill="var(--atlas-stone)" />
    <circle cx="399" cy="88" r="7" fill="var(--atlas-parchment)" />
    <g fill="var(--atlas-parchment)" opacity=".95">
      <rect x="150" y="256" width="20" height="26" rx="2" transform="rotate(-12 160 269)" />
      <rect x="330" y="258" width="20" height="26" rx="2" transform="rotate(9 340 271)" />
    </g>
  </g>
);

export default BiomeScriptorium;
