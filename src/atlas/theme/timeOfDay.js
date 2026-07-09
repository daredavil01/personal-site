// Day/night resolution for the atlas scene (§4.10, creative decision #11).
// Night is 19:00–06:00 visitor-local; "auto" derives from the clock, an
// explicit preference wins. The scene value feeds .atlas-root[data-time] and
// is kept in lockstep with ThemeContext's Tailwind `dark` class by the HUD.

export const NIGHT_START_HOUR = 19; // inclusive
export const NIGHT_END_HOUR = 6; // exclusive

export const isNightHour = (hour) => hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;

/**
 * @param {"auto"|"day"|"night"} pref  stored world.time preference
 * @param {Date} [now]                 injectable clock for tests
 * @returns {"day"|"night"}
 */
export const resolveTime = (pref, now = new Date()) => {
  if (pref === "day" || pref === "night") return pref;
  return isNightHour(now.getHours()) ? "night" : "day";
};
