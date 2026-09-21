// sfxBus — a few bytes of indirection so UI code (RewardToaster, WorldMap)
// can fire-and-forget SFX without importing the audio manager: playSfx is a
// no-op until audioManager (dynamically imported on the first sound enable,
// §4.9) registers its handler. Keeps every audio byte out of the UI chunks.

let handler = null;
let voiceHandler = null;
let stopHandler = null;

export const registerSfx = (fn) => { handler = fn; };

export const playSfx = (name) => {
  if (handler) handler(name);
};

// The guide's spoken beats (public/audio/guide-voice.m4a). Same no-op-until-
// registered shape: GuideAvatar says the line whether or not sound is on, and
// this stays silent until the audio manager exists.
export const registerVoice = (fn, stopFn) => { voiceHandler = fn; stopHandler = stopFn; };

export const playVoice = (id) => {
  if (voiceHandler) voiceHandler(id);
};

// Anything about to speak silences whatever is speaking first: one voice at a
// time, across the guide and the browser's own synthesiser both.
export const stopVoice = () => {
  if (stopHandler) stopHandler();
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
};
