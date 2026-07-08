// Persistence layer for the Wanderer's Atlas world state (§4.5 of the plan).
// One versioned localStorage key holds everything; WorldContext is the only
// module allowed to call these functions — nothing else touches localStorage
// for atlas state directly.

export const STORAGE_KEY = "atlas.v1";
export const PREVIEW_KEY = "atlas.preview";
export const VISIT_DAYS_CAP = 30;

// Legacy homepage-globe keys, consumed (but never deleted) by migrate.js.
// A post-flip cleanup phase removes the globe's own tracker and these keys.
export const LEGACY_VISITED_KEY = "globe-visited-worlds";
export const LEGACY_CELEBRATED_KEY = "globe-all-worlds-celebrated";

export const defaultState = () => ({
  version: 1,
  view: null, // explicit user choice only: null | "atlas" | "classic"
  sound: false,
  time: "auto", // "auto" | "day" | "night"
  introSeen: false,
  visitedRegions: {}, // region key -> first-visit ISO timestamp
  stamps: {}, // region key -> { first: ISO timestamp, ... }
  actions: {}, // action name -> array of deduped ids
  quests: {}, // quest id -> { done: ISO timestamp | null }
  eggs: {}, // egg id -> found ISO timestamp
  visitDays: [], // distinct "YYYY-MM-DD" strings, capped at VISIT_DAYS_CAP
});

const safeGet = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null; // private mode / storage disabled — non-fatal
  }
};

// Raw (unvalidated) stored state; migrate.js turns this into a usable state.
export const readRaw = () => {
  const raw = safeGet(STORAGE_KEY);
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

export const readLegacyGlobeKeys = () => {
  let visitedWorlds = null;
  try {
    const raw = safeGet(LEGACY_VISITED_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) visitedWorlds = parsed.filter((k) => typeof k === "string");
  } catch (e) {
    visitedWorlds = null;
  }
  const allCelebrated = safeGet(LEGACY_CELEBRATED_KEY) === "true";
  return { visitedWorlds, allCelebrated };
};

export const writeState = (state) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* non-fatal */
  }
};

// Reducer state changes in quick succession (visit + track + day record);
// batch them into one write.
export const createDebouncedPersist = (delayMs = 400) => {
  let timer = null;
  const persist = (state) => {
    clearTimeout(timer);
    timer = setTimeout(() => writeState(state), delayMs);
  };
  persist.flush = null; // reserved; unload flush arrives with the game layer
  persist.cancel = () => clearTimeout(timer);
  return persist;
};

export const readPreviewFlag = () => safeGet(PREVIEW_KEY) === "1";

export const writePreviewFlag = (on) => {
  try {
    if (on) window.localStorage.setItem(PREVIEW_KEY, "1");
    else window.localStorage.removeItem(PREVIEW_KEY);
  } catch (e) {
    /* non-fatal */
  }
};
