// Strava helpers shared by the export import (scripts/strava-import.mjs,
// src/lib/stravaExport.js), the admin pages and the public /training pages.
//
// Pure and dependency-free: the middleware bundles it for crawlers, and Node
// imports it from scripts/.

/** How much of each end of a route is cut before it is public. */
export const ROUTE_TRIM_METRES = 400;

export const activityUrl = (id) => `https://www.strava.com/activities/${id}`;

// ---------------------------------------------------------------------------
// Polylines (Google's encoded polyline algorithm, precision 5)
// ---------------------------------------------------------------------------

export function decodePolyline(encoded) {
  const str = String(encoded || "");
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < str.length) {
    let result = 0;
    let shift = 0;
    let b;
    do {
      b = str.charCodeAt(index) - 63;
      index += 1;
      result |= (b & 0x1f) << shift; // eslint-disable-line no-bitwise
      shift += 5;
    } while (b >= 0x20 && index < str.length);
    lat += result & 1 ? ~(result >> 1) : result >> 1; // eslint-disable-line no-bitwise
    result = 0;
    shift = 0;
    do {
      b = str.charCodeAt(index) - 63;
      index += 1;
      result |= (b & 0x1f) << shift; // eslint-disable-line no-bitwise
      shift += 5;
    } while (b >= 0x20 && index < str.length);
    lng += result & 1 ? ~(result >> 1) : result >> 1; // eslint-disable-line no-bitwise
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function encodeValue(value) {
  let v = value < 0 ? ~(value << 1) : value << 1; // eslint-disable-line no-bitwise
  let out = "";
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63); // eslint-disable-line no-bitwise
    v >>= 5; // eslint-disable-line no-bitwise
  }
  return out + String.fromCharCode(v + 63);
}

export function encodePolyline(points) {
  let prevLat = 0;
  let prevLng = 0;
  let out = "";
  (points || []).forEach(([la, ln]) => {
    const lat = Math.round(la * 1e5);
    const lng = Math.round(ln * 1e5);
    out += encodeValue(lat - prevLat) + encodeValue(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  });
  return out;
}

/** Great-circle distance in metres. */
export function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * The public route: the summary polyline with every point within `metres` of
 * the start or the finish removed, so neither end gives away a doorstep (the
 * owner's token returns GPS with Strava's privacy zones NOT applied). A point
 * anywhere on the route that comes back near either end is dropped too, which
 * is what a loop from home does. Returns null when too little is left to draw.
 */
export function trimRoute(encoded, metres = ROUTE_TRIM_METRES) {
  const points = decodePolyline(encoded);
  if (points.length < 2) return null;
  const start = points[0];
  const end = points[points.length - 1];
  const kept = points.filter((p) => haversine(p, start) > metres && haversine(p, end) > metres);
  return kept.length >= 2 ? encodePolyline(kept) : null;
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** Sport types that are measured by pace (min/km) rather than speed. */
const PACE_SPORTS = new Set([
  "Run", "TrailRun", "VirtualRun", "Walk", "Hike", "Snowshoe",
]);

export const isPaceSport = (sport) => PACE_SPORTS.has(sport);

/** 3723 → "1:02:03", 403 → "6:43". */
export function formatDuration(seconds) {
  const s = Math.round(Number(seconds));
  if (!Number.isFinite(s) || s < 0) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** m/s → "5:12 /km". */
export function formatPace(metresPerSecond) {
  const v = Number(metresPerSecond);
  if (!v || !Number.isFinite(v)) return "";
  return `${formatDuration(1000 / v)} /km`;
}

/** m/s → "24.3 km/h". */
export function formatSpeed(metresPerSecond) {
  const v = Number(metresPerSecond);
  if (!v || !Number.isFinite(v)) return "";
  return `${(v * 3.6).toFixed(1)} km/h`;
}

/** Pace for foot sports, speed for the rest. */
export const formatEffortSpeed = (sport, mps) => (isPaceSport(sport) ? formatPace(mps) : formatSpeed(mps));

/** metres → "21.1 km" (or "850 m" under a kilometre). */
export function formatDistance(metres) {
  const m = Number(metres);
  if (!Number.isFinite(m) || m <= 0) return "";
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 100000 ? 1 : 0)} km`;
}

/** "TrailRun" → "Trail Run". */
export const sportLabel = (sport) => String(sport || "Activity").replace(/([a-z])([A-Z])/g, "$1 $2");

/**
 * The /sports race this activity most likely is: same day (±1) and a distance
 * within 5 %. `sports` rows carry `date` as "Month DD, YYYY" and `distance` as
 * "21 Kms". Returns the race id or null.
 */
export function matchRace(activity, sports) {
  if (!activity?.date || !activity.distance) return null;
  const day = Date.parse(`${activity.date}T00:00:00Z`);
  const km = activity.distance / 1000;
  const hits = (sports || []).filter((s) => {
    const d = Date.parse(`${s.date} UTC`);
    const dist = parseFloat(String(s.distance || "").replace(/[^\d.]/g, ""));
    if (!Number.isFinite(d) || !dist) return false;
    return Math.abs(d - day) <= 86400000 && Math.abs(km - dist) / dist <= 0.05 + 0.5 / dist;
  });
  return hits.length === 1 ? hits[0].id : null;
}
