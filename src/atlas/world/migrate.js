// Pure migration from whatever is (or isn't) in storage to a valid v1 world
// state (§4.5). Never throws — any unusable input falls back to defaults.
//
// Legacy seeding: if `atlas.v1` is absent and the old homepage globe recorded
// visits ("globe-visited-worlds" — an array of domain keys), those keys seed
// `visitedRegions` + `stamps`; "globe-all-worlds-celebrated" seeds the
// Explorer quest. Region keys are identical between the globe and the atlas
// by design (both come from src/components/Index/globe/domains.js), which is
// what makes this migration trivial. Legacy keys are left in place until a
// post-flip cleanup.

import { defaultState, VISIT_DAYS_CAP } from "./storage";

const isPlainObject = (v) => v != null && typeof v === "object" && !Array.isArray(v);

const sanitize = (raw) => {
  const base = defaultState();
  const out = { ...base };
  out.view = raw.view === "atlas" || raw.view === "classic" ? raw.view : null;
  out.sound = raw.sound === true;
  out.time = raw.time === "day" || raw.time === "night" ? raw.time : "auto";
  out.introSeen = raw.introSeen === true;
  out.visitedRegions = isPlainObject(raw.visitedRegions) ? { ...raw.visitedRegions } : {};
  out.stamps = isPlainObject(raw.stamps) ? { ...raw.stamps } : {};
  out.actions = isPlainObject(raw.actions) ? { ...raw.actions } : {};
  out.quests = isPlainObject(raw.quests) ? { ...raw.quests } : {};
  out.eggs = isPlainObject(raw.eggs) ? { ...raw.eggs } : {};
  out.visitDays = Array.isArray(raw.visitDays)
    ? raw.visitDays.filter((d) => typeof d === "string").slice(-VISIT_DAYS_CAP)
    : [];
  out.guide = isPlainObject(raw.guide) ? { ...raw.guide } : {};
  return out;
};

const seedFromLegacy = (state, legacy, nowIso) => {
  const { visitedWorlds, allCelebrated } = legacy || {};
  const visitedRegions = { ...state.visitedRegions };
  const stamps = { ...state.stamps };
  const quests = { ...state.quests };
  if (Array.isArray(visitedWorlds)) {
    visitedWorlds.forEach((key) => {
      if (typeof key !== "string" || !key) return;
      if (!visitedRegions[key]) visitedRegions[key] = nowIso;
      if (!stamps[key]) stamps[key] = { first: nowIso, migrated: true };
    });
  }
  if (allCelebrated && !quests.explorer) {
    quests.explorer = { done: nowIso, migrated: true };
  }
  return { ...state, visitedRegions, stamps, quests };
};

/**
 * @param {unknown} raw       parsed contents of localStorage["atlas.v1"] (or null)
 * @param {{visitedWorlds: string[]|null, allCelebrated: boolean}} [legacy]
 * @param {Date} [now]        injectable clock for tests
 */
export default function migrate(raw, legacy = {}, now = new Date()) {
  try {
    const nowIso = now.toISOString();
    if (isPlainObject(raw) && raw.version === 1) {
      // Already v1 — sanitize shape drift, never re-seed from legacy.
      return sanitize(raw);
    }
    // Absent, corrupt, or unknown version: fresh state + legacy globe seeding.
    return seedFromLegacy(defaultState(), legacy, nowIso);
  } catch (e) {
    return defaultState();
  }
}
