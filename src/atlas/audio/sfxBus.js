// sfxBus — a few bytes of indirection so UI code (RewardToaster, WorldMap)
// can fire-and-forget SFX without importing the audio manager: playSfx is a
// no-op until audioManager (dynamically imported on the first sound enable,
// §4.9) registers its handler. Keeps every audio byte out of the UI chunks.

let handler = null;

export const registerSfx = (fn) => { handler = fn; };

export const playSfx = (name) => {
  if (handler) handler(name);
};
