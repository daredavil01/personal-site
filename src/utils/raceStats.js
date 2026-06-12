// Pure helpers for race / personal-best calculations used by the Stats page.
// Extracted from src/pages/Stats.js so the time-parsing and PB-selection logic
// can be unit-tested in isolation.

// Convert a race time string ("HH:MM:SS" or "MM:SS") into total seconds.
// Returns 0 for empty or malformed input.
export function parseTimeToSeconds(time) {
  if (!time || typeof time !== "string") return 0;
  const parts = time.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// Find the fastest race whose distance label contains `distancePattern`
// (e.g. "42", "21", "10"). Returns the race object, or null if none match.
export function getPBRaw(races, distancePattern) {
  let best = null;
  let bestSecs = Infinity;
  (races || []).forEach((race) => {
    if (race.distance && race.distance.toLowerCase().includes(distancePattern)) {
      const secs = parseTimeToSeconds(race.time);
      if (secs > 0 && secs < bestSecs) {
        bestSecs = secs;
        best = race;
      }
    }
  });
  return best;
}

// Format a race time as "HH:MM" (dropping seconds) when it carries an hours
// field; otherwise returns it unchanged. Falsy input yields "00:00".
// Used for the Marathon and Half-Marathon PB headline figures.
export function formatHoursMinutes(time) {
  if (!time) return "00:00";
  const parts = time.split(":");
  if (parts.length === 3) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return time;
}

// Format a sub-hour PB as "MM:SS" when the hours field is zero (e.g. a 10K of
// "0:48:12" → "48:12"); falls back to "HH:MM" for longer times and returns
// two-part strings unchanged. Falsy input yields "00:00".
export function formatMinutesSeconds(time) {
  if (!time) return "00:00";
  const parts = time.split(":");
  if (parts.length === 3 && parts[0] === "0") {
    return `${parts[1].padStart(2, "0")}:${parts[2].padStart(2, "0")}`;
  }
  if (parts.length === 3) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return time;
}
