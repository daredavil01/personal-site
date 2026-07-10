// RegionHotspot (§4.6 layer 5) — one generous invisible hit rect per region.
// Real interactive element (role="link" + roving tabIndex + aria-label), so
// keyboard and screen readers get it while every art layer stays aria-hidden.

import React, { forwardRef } from "react";
import PropTypes from "prop-types";

const RegionHotspot = forwardRef(({
  region, tabbable, onActivate, onHoverStart, onHoverEnd, onFocus, onBlur,
}, ref) => {
  const [x, y, width, height] = region.hit;
  return (
    <rect
      ref={ref}
      className="atlas-region-hit"
      x={x}
      y={y}
      width={width}
      height={height}
      rx="36"
      role="link"
      tabIndex={tabbable ? 0 : -1}
      aria-label={`${region.name} — ${region.blurb}`}
      onClick={() => onActivate("pointer")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate("keyboard");
        }
      }}
      onPointerEnter={onHoverStart}
      onPointerLeave={onHoverEnd}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
});

RegionHotspot.displayName = "RegionHotspot";

RegionHotspot.propTypes = {
  region: PropTypes.shape({
    name: PropTypes.string.isRequired,
    blurb: PropTypes.string.isRequired,
    hit: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,
  tabbable: PropTypes.bool.isRequired,
  onActivate: PropTypes.func.isRequired,
  onHoverStart: PropTypes.func.isRequired,
  onHoverEnd: PropTypes.func.isRequired,
  onFocus: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
};

export default RegionHotspot;
