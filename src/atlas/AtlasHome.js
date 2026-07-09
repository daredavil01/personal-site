// AtlasHome — the atlas-mode homepage. Target shape (§4.2) is the
// orbit → dive → map state machine; phase 3 lands the map stage (the hub),
// phase 4 adds orbit and the dive in front of it. Visiting keeps the preview
// flag on so navigation across the site stays in atlas mode in this browser.
// Noindexed via Helmet here + X-Robots-Tag in functions/_middleware.js for
// the preview period. Escape hatches live in the HUD's passport modal.

import React, { useEffect } from "react";
import "./theme/atlasTokens.css";
import PageMeta from "../components/Template/PageMeta";
import { useWorld } from "./world/WorldContext";
import { resolveTime } from "./theme/timeOfDay";
import WorldMap from "./map/WorldMap";

const AtlasHome = () => {
  const { world, enablePreview } = useWorld();
  const time = resolveTime(world.time);

  useEffect(() => {
    enablePreview();
  }, [enablePreview]);

  return (
    <>
      <PageMeta
        title="The Wanderer's Atlas"
        description="A living, explorable map of everything on this site — six regions, one world."
        noindex
      />
      <div className="atlas-root atlas-map-stage" data-time={time}>
        <h1 className="atlas-sr-only">The Wanderer&apos;s Atlas — world map</h1>
        <WorldMap />
      </div>
    </>
  );
};

export default AtlasHome;
