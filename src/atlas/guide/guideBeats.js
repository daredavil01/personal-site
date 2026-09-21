// The guide's spoken lines, on their own and import-free.
//
// Separate from guideScript.js because scripts/generate-guide-audio.mjs reads
// this file directly in node to render the voice sprite, and guideScript.js
// imports mapRegions — which node cannot resolve (extensionless imports) and
// which the audio script has no use for anyway. Same reason pageMeta.js is
// kept import-free for the Worker bundle.

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

export default BEATS;
