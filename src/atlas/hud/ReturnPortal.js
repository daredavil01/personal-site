// "Return to Map" — the HUD's way home from any region (§4.7). During the
// preview period the map hub lives at /world; after the flip it is "/".
// Phase 3 adds `state: { toRegion }` so the map can reverse the fly-in.

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ATLAS_LIVE } from "../../config/featureFlags";

const MAP_PATH = ATLAS_LIVE ? "/" : "/world";

const ReturnPortal = () => {
  const { pathname } = useLocation();
  if (pathname === MAP_PATH) return null;

  return (
    <div className="atlas-hud-corner atlas-hud-bl">
      <Link to={MAP_PATH} className="atlas-hud-pill" aria-label="Return to the world map">
        <span aria-hidden="true">🗺️</span>
        Return to Map
      </Link>
    </div>
  );
};

export default ReturnPortal;
