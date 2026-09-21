// Guide script (§4.8, phase 13) — the mini illustrated Sanket's speech
// beats, driven entirely by WorldContext state. A beat shows once, is
// acknowledged ("Got it") into world.guide, and never returns — the guide is
// a greeter, not a chaperone. Copy voice per plan §11: warm first-person
// Sanket, playful but not jokey.
//
// pickBeat is pure (world + pathname in, beat out) and unit-tested.

import { regionForPath } from "../map/mapRegions";
import { BEATS } from "./guideBeats";

// Re-exported so guideScript stays the one import site for the guide.
export { BEATS };

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
