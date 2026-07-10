// Sound toggle — OFF by default, strictly opt-in (§2 decision #7). Flips the
// persisted preference; AtlasFrame reacts by dynamically importing the
// WebAudio manager on the first enable (that click is the autoplay-unlock
// gesture) and fading the ambient bed in/out (§4.9).

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
      title="Ambient sound"
      onClick={toggleSound}
    >
      <span aria-hidden="true">{world.sound ? "🔊" : "🔇"}</span>
    </button>
  );
};

export default SoundToggle;
