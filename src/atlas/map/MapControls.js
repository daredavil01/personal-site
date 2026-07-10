// MapControls — the on-screen zoom cluster for the map hub (§4.6).
//
// The map is driven by wheel / pinch / drag (usePanZoom), which leaves no
// affordance for anyone who can't do those: pointer users without a wheel,
// and especially touch users who would otherwise have to pinch. This gives
// them tappable zoom in / out plus a Reset that flies the camera back to the
// resting view (the same target the Escape key uses). Reset doubles as the
// escape hatch when a pinch leaves the map somewhere disorienting — the reason
// it matters most on mobile.
//
// Presentational only: WorldMap owns the viewBox (via usePanZoom) and passes
// the three handlers down.

import React from "react";
import PropTypes from "prop-types";

const MapControls = ({ onZoomIn, onZoomOut, onReset }) => (
  <div className="atlas-map-controls" role="group" aria-label="Map zoom">
    <button
      type="button"
      className="atlas-hud-btn atlas-map-ctrl"
      aria-label="Zoom in"
      title="Zoom in"
      onClick={onZoomIn}
    >
      <span className="material-symbols-outlined" aria-hidden="true">add</span>
    </button>
    <button
      type="button"
      className="atlas-hud-btn atlas-map-ctrl"
      aria-label="Zoom out"
      title="Zoom out"
      onClick={onZoomOut}
    >
      <span className="material-symbols-outlined" aria-hidden="true">remove</span>
    </button>
    <button
      type="button"
      className="atlas-hud-btn atlas-map-ctrl atlas-map-ctrl-reset"
      aria-label="Reset zoom"
      title="Reset zoom"
      onClick={onReset}
    >
      <span className="material-symbols-outlined" aria-hidden="true">filter_center_focus</span>
    </button>
  </div>
);

MapControls.propTypes = {
  onZoomIn: PropTypes.func.isRequired,
  onZoomOut: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};

export default MapControls;
