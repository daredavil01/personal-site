// AskLighthouse (§4.6) — the lighthouse on the Marathons coast doubles as the
// way into /ask: the one building on the map that answers. Same contract as
// StatsWidget: aria-hidden plaque art that lifts on hover/focus, and one
// transparent hit rect on top carrying role="link" + the label. It sits inside
// the Marathons hotspot, so it renders after the RegionLayer to win the click
// over the lighthouse while the rest of the coast still flies to /sports.

import React from "react";
import PropTypes from "prop-types";

// World coords: BiomeCoast is drawn at (40, 850) and its lighthouse spans local
// x 658–742, y 106–286, so the tower stands at world x ≈ 698–782, y ≈ 956–1136.
const PLAQUE = { x: 652, y: 1140, w: 200 };
const HIT = { x: 652, y: 950, w: 200, h: 225 };

const AskLighthouse = ({ onActivate }) => (
  <g className="atlas-landmark" data-region="marathons">
    {/* The hover lift is a CSS transform, which would replace a transform
        attribute on the same node — so the position lives one level up. */}
    <g aria-hidden="true" transform={`translate(${PLAQUE.x},${PLAQUE.y})`}>
      <g className="atlas-lift atlas-landmark-plaque">
        <rect width={PLAQUE.w} height="33" rx="8" fill="var(--atlas-parchment)" stroke="var(--atlas-line)" />
        <circle cx="20" cy="16.5" r="6" fill="var(--atlas-glow)" stroke="var(--atlas-line)" />
        <text className="atlas-plaque-text" x={PLAQUE.w / 2 + 10} y="22" textAnchor="middle" fontSize="15">
          ASK THE ARCHIVE
        </text>
      </g>
    </g>

    <rect
      className="atlas-landmark-hit"
      x={HIT.x}
      y={HIT.y}
      width={HIT.w}
      height={HIT.h}
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
};

export default AskLighthouse;
