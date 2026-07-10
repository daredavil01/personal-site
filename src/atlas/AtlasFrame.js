// AtlasFrame — mounts once (inside BrowserRouter, outside Routes) whenever
// atlas mode is on, and never remounts on navigation, so HUD chrome and
// (from phase 3) route transitions bridge pages without flashes (§4.7).
// Owns: HUD, RewardToaster, the ambient-audio lifecycle (phase 12) and
// GuideAvatar (phase 13). Loaded lazily so all of this — and the
// atlasTokens.css it imports — stays out of the entry bundle.

import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./theme/atlasTokens.css";
import { useWorld } from "./world/WorldContext";
import { useTheme } from "../context/ThemeContext";
import { resolveTime } from "./theme/timeOfDay";
import { ATLAS_LIVE } from "../config/featureFlags";
import { regionForPath } from "./map/mapRegions";
import Hud from "./hud/Hud";
import RewardToaster from "./hud/RewardToaster";
import GuideAvatar from "./guide/GuideAvatar";

// Which ambient bed a path wants: region routes by prefix, the hub its own
// "map" bed, anything else (e.g. /admin) silence.
const biomeForPath = (pathname) => {
  if (pathname === "/" || pathname === "/world") return "map";
  return regionForPath(pathname);
};

const AtlasFrame = () => {
  const { world, hadStoredTheme, setTime } = useWorld();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const time = resolveTime(world.time);
  const biomeKey = biomeForPath(pathname);

  // Ambient audio (§4.9): the manager is dynamically imported on the FIRST
  // enable (zero audio bytes before that; the toggle click doubles as the
  // autoplay-unlock gesture) and torn down to silence when sound goes off.
  const audioRef = useRef(null);
  const biomeRef = useRef(biomeKey);
  biomeRef.current = biomeKey;
  useEffect(() => {
    if (!world.sound) {
      if (audioRef.current) audioRef.current.disable();
      return undefined;
    }
    let cancelled = false;
    import("./audio/audioManager").then((manager) => {
      if (cancelled) return;
      audioRef.current = manager;
      manager.setBiome(biomeRef.current);
      manager.enable();
    });
    return () => { cancelled = true; };
  }, [world.sound]);

  // Crossfade the bed when navigation crosses a region border.
  useEffect(() => {
    if (audioRef.current) audioRef.current.setBiome(biomeKey);
  }, [biomeKey]);

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
      <GuideAvatar />
    </div>
  );
};

export default AtlasFrame;
