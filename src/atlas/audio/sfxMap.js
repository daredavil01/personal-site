// SFX sprite map (§4.9) — [offset, duration] seconds into public/audio/sfx.m4a.
// MUST match the SFX table in scripts/generate-atlas-audio.mjs, which renders
// the sprite.

const SFX_MAP = {
  stamp: [0.0, 0.45],
  chime: [0.6, 1.1],
  whoosh: [1.9, 0.7],
  egg: [2.8, 1.0],
};

export default SFX_MAP;
