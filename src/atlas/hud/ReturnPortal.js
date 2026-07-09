// "Return to Map" — the HUD's way home from any region (§4.7). During the
// preview period the map hub lives at /world; after the flip it is "/".
// Carries `state: { toRegion }` so the map mounts on the current region's
// viewBox and reverses the fly-in.

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ATLAS_LIVE } from "../../config/featureFlags";
import { regionForPath } from "../map/mapRegions";

const MAP_PATH = ATLAS_LIVE ? "/" : "/world";

const ReturnPortal = () => {
  const { pathname } = useLocation();
  if (pathname === MAP_PATH) return null;

  const toRegion = regionForPath(pathname);
  return (
    <div className="atlas-hud-corner atlas-hud-bl">
      <Link
        to={MAP_PATH}
        state={toRegion ? { toRegion } : undefined}
        className="atlas-hud-pill"
        aria-label="Return to the world map"
      >
        <span aria-hidden="true">🗺️</span>
        Return to Map
      </Link>
    </div>
  );
};

export default ReturnPortal;
