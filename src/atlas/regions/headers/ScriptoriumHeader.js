// Scriptorium (writer) header band — reuses the map's BiomeScriptorium art
// (hall, press tower, quill pond) over a soft floor. Decorative + aria-hidden;
// the windows light up at night via --atlas-window.

import React from "react";
import BiomeScriptorium from "../../map/art/BiomeScriptorium";

const ScriptoriumHeader = () => (
  <svg
    className="atlas-header-art"
    viewBox="0 0 1200 300"
    preserveAspectRatio="xMidYMax slice"
    role="presentation"
  >
    <rect x="0" y="0" width="1200" height="300" fill="var(--atlas-sky)" />
    <rect x="0" y="250" width="1200" height="50" fill="var(--atlas-stone)" opacity=".4" />
    <g transform="translate(360,-42) scale(1.16)">
      <BiomeScriptorium />
    </g>
  </svg>
);

export default ScriptoriumHeader;
