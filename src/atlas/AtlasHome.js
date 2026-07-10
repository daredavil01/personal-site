// AtlasHome — the atlas-mode homepage (§4.2): the orbit → dive → map state
// machine. First-time visitors arrive at the orbit stage, click "Enter the
// World" to play the dive, and land on the hub; the intro then persists
// (introSeen) so returning visitors go straight to the map (a quiet fade).
// Arriving back from a region (state.toRegion) also lands on the map and lets
// WorldMap reverse the fly-in. "Replay intro" (passport) navigates here with
// state.replayIntro to restart at orbit.
//
// This serves "/" in atlas mode (App.js HomeRoute), so its meta is the site's
// homepage meta straight from PAGE_META — no title override and, since the
// v11.0.0 flip, no noindex.

import React, {
  Suspense, useEffect, useMemo, useRef, useState,
} from "react";
import { useLocation } from "react-router-dom";
import "./theme/atlasTokens.css";
import PageMeta from "../components/Template/PageMeta";
import { useWorld } from "./world/WorldContext";
import { resolveTime } from "./theme/timeOfDay";
import atlasEvent from "./lib/analytics";
import WorldMap from "./map/WorldMap";
import OrbitStage from "./intro/OrbitStage";

// Lazy so GSAP (and the dive CSS) loads only when a visitor actually plays the
// intro — never for returning visitors who land straight on the map.
const DiveSequence = React.lazy(() => import("./intro/DiveSequence"));

const prefersReducedMotion = () => (
  typeof window !== "undefined"
  && !!window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches
);

const AtlasHome = () => {
  const { world, markIntroSeen } = useWorld();
  const { state } = useLocation();
  const time = resolveTime(world.time);
  const globeApiRef = useRef(null);

  // Where to start (mount-only): a fresh visitor plays the intro; a returning
  // one (or one coming back from a region) lands on the map.
  const initial = useMemo(() => {
    if (state?.toRegion) return { stage: "map", entry: "return" };
    if (world.introSeen && !state?.replayIntro) return { stage: "map", entry: "direct" };
    return { stage: "orbit", entry: null };
  }, []); // mount-only: the entry stage is captured once

  const [stage, setStage] = useState(initial.stage);
  const [entry, setEntry] = useState(initial.entry);
  const [diving, setDiving] = useState(false);

  // "Replay intro" from the passport navigates here with a fresh replayIntro
  // nonce; restart the machine at orbit even though AtlasHome stays mounted.
  useEffect(() => {
    if (!state?.replayIntro) return;
    setDiving(false);
    setEntry(null);
    setStage("orbit");
  }, [state?.replayIntro]);

  const goToMap = (mode) => {
    setEntry(mode);
    setStage("map");
  };

  const handleEnter = () => {
    if (prefersReducedMotion()) {
      markIntroSeen();
      goToMap("direct");
      return;
    }
    setDiving(true);
  };

  const handleSkip = () => {
    atlasEvent("atlas_intro_skip");
    markIntroSeen();
    goToMap("direct");
  };

  // Mid-flight: swap the globe for the map behind the still-white overlay.
  const handleWhiteout = () => {
    setEntry("intro");
    setStage("map");
  };

  // Timeline finished: drop the overlay and remember the intro was seen.
  const handleDiveDone = () => {
    atlasEvent("atlas_intro_finish");
    setDiving(false);
    markIntroSeen();
  };

  return (
    <>
      <PageMeta />
      <div className="atlas-root atlas-map-stage" data-time={time}>
        <h1 className="atlas-sr-only">The Wanderer&apos;s Atlas — world map</h1>

        {stage === "orbit" && (
          <OrbitStage ref={globeApiRef} onEnter={handleEnter} onSkip={handleSkip} />
        )}
        {stage === "map" && <WorldMap entry={entry} />}

        {diving && (
          <Suspense fallback={null}>
            <DiveSequence
              globeApiRef={globeApiRef}
              onWhiteout={handleWhiteout}
              onDone={handleDiveDone}
              onSkip={handleSkip}
            />
          </Suspense>
        )}
      </div>
    </>
  );
};

export default AtlasHome;
