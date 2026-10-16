// AskLighthouse (§4.6) — the lighthouse on the Marathons coast doubles as the
// way into /ask: the one building on the map that answers. Same contract as
// StatsWidget: aria-hidden plaque art that lifts on hover/focus, and one
// transparent hit rect on top carrying role="link" + the label. It sits inside
// the Marathons hotspot, so it renders after the RegionLayer to win the click
// over the lighthouse while the rest of the coast still flies to /sports.

import React from "react";
import PropTypes from "prop-types";

// Landscape defaults. BiomeCoast is drawn at (40, 850) and its lighthouse spans
// local x 658–742, y 106–286, so the tower stands at world x ≈ 698–782,
// y ≈ 956–1136. The portrait map passes its own (mapRegions.js LAYOUTS).
const PLAQUE_W = 200;

const AskLighthouse = ({ onActivate, plaque: [px, py, k], hit: [hx, hy, hw, hh] }) => (
  <g className="atlas-landmark" data-region="marathons">
    {/* The hover lift is a CSS transform, which would replace a transform
        attribute on the same node — so the position lives one level up. */}
    <g aria-hidden="true" transform={`translate(${px},${py}) scale(${k})`}>
      <g className="atlas-lift atlas-landmark-plaque">
        <rect width={PLAQUE_W} height="33" rx="8" fill="var(--atlas-parchment)" stroke="var(--atlas-line)" />
        <circle cx="20" cy="16.5" r="6" fill="var(--atlas-glow)" stroke="var(--atlas-line)" />
        <text className="atlas-plaque-text" x={PLAQUE_W / 2 + 10} y="22" textAnchor="middle" fontSize="15">
          ASK THE ARCHIVE
        </text>
      </g>
    </g>

    <rect
      className="atlas-landmark-hit"
      x={hx}
      y={hy}
      width={hw}
      height={hh}
      rx="24"
      role="link"
      tabIndex={0}
      aria-label="Lighthouse — ask the archive a question about anything on this site"
      onClick={() => onActivate("pointer")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate("keyboard");
        }
      }}
    />
  </g>
);

AskLighthouse.propTypes = {
  onActivate: PropTypes.func.isRequired,
  plaque: PropTypes.arrayOf(PropTypes.number), // [x, y, scale]
  hit: PropTypes.arrayOf(PropTypes.number), // [x, y, w, h]
};

AskLighthouse.defaultProps = {
  plaque: [652, 1140, 1],
  hit: [652, 950, 200, 225],
};

export default AskLighthouse;
