// Sound toggle — OFF by default, strictly opt-in (§2 decision #7). The
// WebAudio manager arrives in phase 12; until then this only flips the
// persisted preference so the rest of the HUD/state plumbing is real.

import React from "react";
import { useWorld } from "../world/WorldContext";

const SoundToggle = () => {
  const { world, toggleSound } = useWorld();

  return (
    <button
      type="button"
      className="atlas-hud-btn"
      aria-pressed={world.sound}
      aria-label={world.sound ? "Turn ambient sound off" : "Turn ambient sound on"}
      title="Ambient sound (arrives with the audio phase)"
      onClick={toggleSound}
    >
      <span aria-hidden="true">{world.sound ? "🔊" : "🔇"}</span>
    </button>
  );
};

export default SoundToggle;
