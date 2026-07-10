// Guide script (§4.8, phase 13) — the mini illustrated Sanket's speech
// beats, driven entirely by WorldContext state. A beat shows once, is
// acknowledged ("Got it") into world.guide, and never returns — the guide is
// a greeter, not a chaperone. Copy voice per plan §11: warm first-person
// Sanket, playful but not jokey.
//
// pickBeat is pure (world + pathname in, beat out) and unit-tested.

import { regionForPath } from "../map/mapRegions";

// where: "map" (the hub), "region" (any region interior), "any".
export const BEATS = [
  {
    id: "welcome",
    where: "map",
    // Only once the visitor has actually reached the hub (intro played or
    // skipped) — never over the orbit stage, where "this map" isn't shown yet.
    text: "Welcome, fellow explorer! This map is my whole world — six regions, one me. Click any region and the camera flies you in.",
    when: (world) => world.introSeen,
  },
  {
    id: "first-stamp",
    where: "region",
    text: "That's your first region — stamped! Everything you explore lands in your traveler's passport, the little book up top.",
    when: (world) => Object.keys(world.visitedRegions || {}).length >= 1,
  },
  {
    id: "sound-hint",
    where: "any",
    text: "Want the world to hum? The sound toggle plays each region's own ambience — waves, wind, gears. Off until you say so.",
    when: (world) => Object.keys(world.visitedRegions || {}).length >= 2 && !world.sound,
  },
  {
    id: "egg-hint",
    where: "map",
    text: "Between you and me — this map keeps a few secrets. Shiny ones. Keep your eyes open as you wander.",
    when: (world) => Object.keys(world.visitedRegions || {}).length >= 3
      && Object.keys(world.eggs || {}).length === 0,
  },
];

/**
 * The first unseen beat whose place and condition match, or null.
 * @param {Object} world     WorldContext state
 * @param {string} pathname  current location.pathname
 */
export const pickBeat = (world, pathname) => {
  const onMap = pathname === "/" || pathname === "/world";
  const inRegion = !!regionForPath(pathname);
  // The guide only ever speaks where the world is shown — the hub or a region
  // interior — never on a stray path (e.g. /admin, which is classic-only).
  if (!onMap && !inRegion) return null;
  const seen = world.guide || {};
  return BEATS.find((beat) => {
    if (seen[beat.id]) return false;
    if (beat.where === "map" && !onMap) return false;
    if (beat.where === "region" && !inRegion) return false;
    return beat.when(world);
  }) || null;
};
