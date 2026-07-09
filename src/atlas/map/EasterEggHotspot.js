// EasterEggHotspot (§4.6 EggLayer) — a small, subtle interactive spot drawn
// into the map art. Before discovery it's a faint glint with a vague aria
// hint; once found it becomes a little star marker. Night-only eggs (e.g. the
// birthday constellation) only glint after dark via the atlas day/night vars.
// Keyboard + pointer both activate; found eggs stop responding.

import React from "react";
import PropTypes from "prop-types";

const EasterEggHotspot = ({ egg, found, onFound }) => {
  const [cx, cy] = egg.at;

  if (found) {
    return (
      <g className="atlas-egg is-found" transform={`translate(${cx},${cy})`} aria-hidden="true">
        <circle r="14" className="atlas-egg-halo" fill="var(--atlas-glow)" />
        <path
          className="atlas-egg-star"
          d="M0,-9 L2.4,-2.6 L9,-2.6 L3.6,1.4 L5.6,8 L0,4 L-5.6,8 L-3.6,1.4 L-9,-2.6 L-2.4,-2.6 Z"
          fill="var(--atlas-glow)"
        />
      </g>
    );
  }

  const activate = () => onFound(egg.id);

  return (
    <g
      className={`atlas-egg${egg.night ? " atlas-egg-night" : ""}`}
      transform={`translate(${cx},${cy})`}
      role="button"
      tabIndex={0}
      aria-label={`Hidden spot: ${egg.hint}`}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
    >
      {/* Generous invisible hit target. */}
      <circle r="24" fill="transparent" className="atlas-egg-hit" />
      <circle r="6" className="atlas-egg-glint" fill="var(--atlas-glow)" />
    </g>
  );
};

EasterEggHotspot.propTypes = {
  egg: PropTypes.shape({
    id: PropTypes.string.isRequired,
    at: PropTypes.arrayOf(PropTypes.number).isRequired,
    hint: PropTypes.string.isRequired,
    night: PropTypes.bool,
  }).isRequired,
  found: PropTypes.bool,
  onFound: PropTypes.func.isRequired,
};

EasterEggHotspot.defaultProps = {
  found: false,
};

export default EasterEggHotspot;
