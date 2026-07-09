// AtlasFrame — mounts once (inside BrowserRouter, outside Routes) whenever
// atlas mode is on, and never remounts on navigation, so HUD chrome and
// (from phase 3) route transitions bridge pages without flashes (§4.7).
// Owns: HUD now; RegionTransitionOverlay (phase 3), RewardToaster (phase 5),
// GuideAvatar (phase 13) later. Loaded lazily so all of this — and the
// atlasTokens.css it imports — stays out of the entry bundle.

import React, { useEffect, useRef } from "react";
import "./theme/atlasTokens.css";
import { useWorld } from "./world/WorldContext";
import { useTheme } from "../context/ThemeContext";
import { resolveTime } from "./theme/timeOfDay";
import { ATLAS_LIVE } from "../config/featureFlags";
import Hud from "./hud/Hud";
import RewardToaster from "./hud/RewardToaster";

const AtlasFrame = () => {
  const { world, hadStoredTheme, setTime } = useWorld();
  const { theme, toggleTheme } = useTheme();
  const time = resolveTime(world.time);

  // §4.10 auto rule, evaluated once at mount: a first-time visitor (no theme
  // ever stored before this session) arriving at night gets the night scene
  // AND Tailwind dark content together. hadStoredTheme is captured by
  // WorldProvider during initial render, before ThemeProvider's mount effect
  // persists a value.
  const themeRef = useRef({ theme, toggleTheme });
  themeRef.current = { theme, toggleTheme };
  useEffect(() => {
    if (hadStoredTheme || world.time !== "auto") return;
    const wantsDark = resolveTime("auto") === "night";
    const { theme: mountTheme, toggleTheme: mountToggle } = themeRef.current;
    if (wantsDark !== (mountTheme === "dark")) mountToggle();
    // Mount-only by design (themeRef keeps values fresh without re-running).
  }, []);

  // One-way coupling (§4.10): the sun/moon sets world.time AND flips the
  // Tailwind `dark` class so RegionShell content always matches the scene.
  const handleTimeChange = (next) => {
    setTime(next);
    if ((next === "night") !== (theme === "dark")) toggleTheme();
  };

  return (
    <div className="atlas-root atlas-frame" data-time={time}>
      {!ATLAS_LIVE && <div className="atlas-ribbon">Wanderer&apos;s Atlas — preview build</div>}
      <Hud time={time} onTimeChange={handleTimeChange} />
      <RewardToaster />
    </div>
  );
};

export default AtlasFrame;
