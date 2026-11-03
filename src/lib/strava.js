// Strava helpers shared by the sync endpoint (functions/api/strava-sync.js),
// the import script (scripts/strava-import.mjs), the admin page and the public
// /training pages.
//
// Pure and dependency-free by contract: esbuild bundles it into the Worker,
// which has 10 ms of CPU per request, and Node imports it from scripts/.
//
// What is pulled (see docs/strava.md for the full inventory):
//   GET /athlete/activities  → summary columns            (toSummaryRow)
//   GET /activities/{id}     → detail columns + jsonb     (toDetailRow)
//   both                     → the private, locating parts (toPrivateRow)
// Photos, streams, kudos and comment lists are never requested.

export const STRAVA_API = "https://www.strava.com/api/v3";
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
export const STRAVA_SCOPES = "read,activity:read_all,profile:read_all";

/** How much of each end of a route is cut before it is public. */
export const ROUTE_TRIM_METRES = 400;

export const activityUrl = (id) => `https://www.strava.com/activities/${id}`;

const num = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const int = (v) => (num(v) == null ? null : Math.round(Number(v)));
const bool = (v) => (v == null ? null : !!v);
const text = (v) => (v == null || v === "" ? null : String(v));

/**
 * Strava's start_date_local is wall-clock time written with a misleading "Z".
 * Keep it as a plain timestamp (no zone) and take the local day from it.
 */
export function localParts(startDateLocal) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(String(startDateLocal || ""));
  if (!m) return { local: null, date: null };
  return { local: `${m[1]}T${m[2]}`, date: m[1] };
}

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
// API → rows
// ---------------------------------------------------------------------------

/**
 * GET /athlete/activities item → strava_activities columns. Every key is always
 * present so a bulk PostgREST upsert sees one shape; detail and site-owned
 * columns are absent, so an upsert never blanks them.
 */
export function toSummaryRow(a, { now = new Date().toISOString() } = {}) {
  const { local, date } = localParts(a.start_date_local);
  return {
    id: Number(a.id),
    name: String(a.name || "").trim(),
    sport_type: text(a.sport_type || a.type),
    type: text(a.type),
    workout_type: int(a.workout_type),
    start_date: text(a.start_date),
    start_date_local: local,
    date,
    timezone: text(a.timezone),
    distance: num(a.distance),
    moving_time: int(a.moving_time),
    elapsed_time: int(a.elapsed_time),
    total_elevation_gain: num(a.total_elevation_gain),
    elev_high: num(a.elev_high),
    elev_low: num(a.elev_low),
    average_speed: num(a.average_speed),
    max_speed: num(a.max_speed),
    average_heartrate: num(a.average_heartrate),
    max_heartrate: num(a.max_heartrate),
    has_heartrate: bool(a.has_heartrate),
    average_cadence: num(a.average_cadence),
    average_watts: num(a.average_watts),
    max_watts: num(a.max_watts),
    weighted_average_watts: num(a.weighted_average_watts),
    kilojoules: num(a.kilojoules),
    device_watts: bool(a.device_watts),
    suffer_score: num(a.suffer_score),
    kudos_count: int(a.kudos_count),
    comment_count: int(a.comment_count),
    achievement_count: int(a.achievement_count),
    pr_count: int(a.pr_count),
    athlete_count: int(a.athlete_count),
    trainer: bool(a.trainer),
    commute: bool(a.commute),
    manual: bool(a.manual),
    private: !!a.private,
    visibility: text(a.visibility),
    flagged: bool(a.flagged),
    hide_from_home: bool(a.hide_from_home),
    gear_id: text(a.gear_id),
    external_id: text(a.external_id),
    upload_id: a.upload_id == null ? null : Number(a.upload_id),
    route_polyline: trimRoute(a.map?.summary_polyline),
    synced_at: now,
  };
}

// Only what the page shows of a segment: a segment's own start/end points are
// public on Strava, but together they trace a route, so they are not kept.
const slimSegmentEffort = (e) => ({
  id: e.id,
  segment_id: e.segment?.id ?? null,
  name: e.name || e.segment?.name || "",
  distance: num(e.distance),
  elapsed_time: int(e.elapsed_time),
  moving_time: int(e.moving_time),
  average_grade: num(e.segment?.average_grade),
  climb_category: int(e.segment?.climb_category),
  pr_rank: int(e.pr_rank),
  kom_rank: int(e.kom_rank),
  average_heartrate: num(e.average_heartrate),
  average_watts: num(e.average_watts),
});

const slimBestEffort = (e) => ({
  name: e.name,
  distance: num(e.distance),
  elapsed_time: int(e.elapsed_time),
  moving_time: int(e.moving_time),
  pr_rank: int(e.pr_rank),
});

const slimLap = (l) => ({
  lap_index: int(l.lap_index),
  name: l.name || null,
  distance: num(l.distance),
  elapsed_time: int(l.elapsed_time),
  moving_time: int(l.moving_time),
  average_speed: num(l.average_speed),
  max_speed: num(l.max_speed),
  average_heartrate: num(l.average_heartrate),
  max_heartrate: num(l.max_heartrate),
  average_cadence: num(l.average_cadence),
  average_watts: num(l.average_watts),
  total_elevation_gain: num(l.total_elevation_gain),
  pace_zone: int(l.pace_zone),
});

const slimSplit = (s) => ({
  split: int(s.split),
  distance: num(s.distance),
  elapsed_time: int(s.elapsed_time),
  moving_time: int(s.moving_time),
  elevation_difference: num(s.elevation_difference),
  average_speed: num(s.average_speed),
  average_grade_adjusted_speed: num(s.average_grade_adjusted_speed),
  average_heartrate: num(s.average_heartrate),
  pace_zone: int(s.pace_zone),
});

const list = (arr, fn) => (Array.isArray(arr) && arr.length ? arr.map(fn) : null);

/** GET /activities/{id} → the summary row plus the detail-only columns. */
export function toDetailRow(a, { now = new Date().toISOString() } = {}) {
  return {
    ...toSummaryRow(a, { now }),
    description: text(a.description),
    calories: num(a.calories),
    device_name: text(a.device_name),
    perceived_exertion: num(a.perceived_exertion),
    splits_metric: list(a.splits_metric, slimSplit),
    splits_standard: list(a.splits_standard, slimSplit),
    laps: list(a.laps, slimLap),
    best_efforts: list(a.best_efforts, slimBestEffort),
    segment_efforts: list(a.segment_efforts, slimSegmentEffort),
    similar_activities: a.similar_activities || null,
    detail_synced_at: now,
  };
}

const latlng = (v) => (Array.isArray(v) && v.length === 2 ? v.map(Number) : null);

/**
 * The owner-only row. A summary carries no full polyline or note, so the keys a
 * summary lacks are omitted rather than nulled — a summary sync must not wipe
 * what a detail sync stored.
 */
export function toPrivateRow(a, { detail = false } = {}) {
  const row = {
    activity_id: Number(a.id),
    summary_polyline: text(a.map?.summary_polyline),
    start_latlng: latlng(a.start_latlng),
    end_latlng: latlng(a.end_latlng),
  };
  if (detail) {
    row.polyline = text(a.map?.polyline);
    row.private_note = text(a.private_note);
  }
  return row;
}

/** /athlete gear summary (+ /gear/{id}) → strava_gear row. */
export function toGearRow(g, kind, { now = new Date().toISOString() } = {}) {
  return {
    id: String(g.id),
    kind,
    name: text(g.name || g.nickname),
    brand_name: text(g.brand_name),
    model_name: text(g.model_name),
    description: text(g.description),
    distance: num(g.distance),
    is_primary: bool(g.primary),
    retired: bool(g.retired),
    synced_at: now,
  };
}

// ---------------------------------------------------------------------------
// Rate limits
// ---------------------------------------------------------------------------

/**
 * Strava reports usage as "15min,daily" in X-RateLimit-Usage / -Limit, and the
 * read-only budget in X-ReadRateLimit-*. The tighter of the two decides.
 * `headers` is anything with get(). Returns null when neither is present.
 */
export function rateLimitFromHeaders(headers) {
  const pair = (name) => {
    const raw = headers?.get?.(name);
    if (!raw) return null;
    const [a, b] = String(raw).split(",").map((v) => Number(v.trim()));
    return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null;
  };
  const read = [pair("X-ReadRateLimit-Usage"), pair("X-ReadRateLimit-Limit")];
  const all = [pair("X-RateLimit-Usage"), pair("X-RateLimit-Limit")];
  const budgets = [read, all].filter(([u, l]) => u && l).map(([u, l]) => ({
    usage15: u[0], limit15: l[0], usageDay: u[1], limitDay: l[1],
  }));
  if (!budgets.length) return null;
  return budgets.reduce((tight, b) => ({
    usage15: b.usage15,
    limit15: b.limit15,
    usageDay: b.usageDay,
    limitDay: b.limitDay,
    left15: Math.min(tight.left15, b.limit15 - b.usage15),
    leftDay: Math.min(tight.leftDay, b.limitDay - b.usageDay),
  }), { left15: Infinity, leftDay: Infinity });
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
