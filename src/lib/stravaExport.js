// Reading a Strava bulk export ("Download or Delete Your Account" → "Request
// your archive") into the /training tables. Strava's API now needs a paid
// subscription, so the export is the source: activities.csv, the original
// GPS file per activity (activities/*.fit.gz | .gpx | .tcx.gz), shoes.csv and
// bikes.csv.
//
// Pure: text and parsed objects in, rows out. scripts/strava-import.mjs does
// the file reading, the gunzipping and the FIT decoding (fit-file-parser).
// See docs/strava.md for what the export does and does not contain.

import {
  ROUTE_TRIM_METRES, encodePolyline, haversine, trimRoute,
// Explicit extension: scripts/strava-import.mjs imports this under Node.
// eslint-disable-next-line import/extensions
} from "./strava.js";

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** RFC 4180: quoted fields may hold commas, quotes ("") and newlines. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const s = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (quoted) {
      if (c === "\"") {
        if (s[i + 1] === "\"") {
          field += "\"";
          i += 1;
        } else quoted = false;
      } else field += c;
    } else if (c === "\"") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v !== ""));
}

/**
 * Rows as objects. activities.csv repeats some headers ("Distance",
 * "Elapsed Time", "Max Heart Rate", "Relative Effort", "Commute"): the first
 * copy is in display units, the later one raw. A repeat is keyed "Name (2)".
 */
export function csvObjects(text) {
  const [header = [], ...body] = parseCsv(text);
  const seen = {};
  const keys = header.map((h) => {
    const name = h.trim();
    seen[name] = (seen[name] || 0) + 1;
    return seen[name] > 1 ? `${name} (${seen[name]})` : name;
  });
  return body.map((cells) => Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? "").trim()])));
}

// ---------------------------------------------------------------------------
// activities.csv → rows
// ---------------------------------------------------------------------------

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * "Feb 22, 2026, 12:45:00 AM" (UTC, the export's English format) → ISO. Also
 * accepts an ISO string. Null when unreadable — the export's language decides
 * the format, so an export in another language needs English set first.
 */
export function parseExportDate(value) {
  const v = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const t = Date.parse(/Z|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}Z`);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }
  const m = /^([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4}),? (\d{1,2}):(\d{2}):(\d{2})\s*([AP]M)?$/i.exec(v);
  if (!m) return null;
  let hour = Number(m[4]) % 12;
  if (!m[7]) hour = Number(m[4]);
  else if (m[7].toUpperCase() === "PM") hour += 12;
  const month = MONTHS[m[1].toLowerCase()];
  if (month == null) return null;
  return new Date(Date.UTC(Number(m[3]), month, Number(m[2]), hour, Number(m[5]), Number(m[6]))).toISOString();
}

/** UTC ISO → { local: "YYYY-MM-DDTHH:MM:SS", date } in an IANA time zone. */
export function toLocal(iso, timeZone) {
  if (!iso) return { local: null, date: null };
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { local: `${date}T${parts.hour}:${parts.minute}:${parts.second}`, date };
}

const num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const int = (v) => (num(v) == null ? null : Math.round(num(v)));
const truthy = (v) => /^(true|1|yes)$/i.test(String(v || "").trim());
const text = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());

/** The raw (later) copy of a repeated column, else the first. */
const raw = (r, name) => (text(r[`${name} (2)`]) != null ? r[`${name} (2)`] : r[name]);

/** "Virtual Ride" → "VirtualRide", "E-Bike Ride" → "EBikeRide": the API's sport_type names. */
export const toSportType = (type) => (text(type) ? String(type).replace(/[^A-Za-z]/g, "") : null);

// Columns that become real columns (or are dropped); everything else non-empty
// is kept in `extra`, so no exported field is lost.
const MAPPED = new Set([
  "Activity ID", "Activity Date", "Activity Name", "Activity Type", "Activity Description",
  "Elapsed Time", "Elapsed Time (2)", "Distance", "Distance (2)", "Moving Time", "Max Speed",
  "Average Speed", "Elevation Gain", "Elevation Low", "Elevation High", "Max Heart Rate",
  "Max Heart Rate (2)", "Average Heart Rate", "Average Cadence", "Average Watts", "Max Watts",
  "Weighted Average Power", "Calories", "Relative Effort", "Relative Effort (2)", "Perceived Exertion",
  "Commute", "Commute (2)", "Activity Gear", "Gear", "Bike", "Filename", "Flagged", "From Upload",
  "Total Work", "Activity Private Note",
]);
// Never public: they describe the athlete, not the activity, or are photos.
const PRIVATE_EXTRA = new Set(["Athlete Weight"]);
const DROPPED = new Set(["Media"]);

/**
 * The export has no visibility column that this was written against; if one
 * turns up (any header naming visibility or a private flag other than the
 * private note), it is honoured. Returns { private, visibility } or nulls.
 */
export function visibilityOf(r) {
  const key = Object.keys(r).find((k) => /visib/i.test(k) && text(r[k]));
  if (key) {
    const v = r[key].toLowerCase().replace(/[^a-z]/g, "_");
    if (/only_me|private/.test(v)) return { private: true, visibility: "only_me" };
    if (/follower/.test(v)) return { private: false, visibility: "followers_only" };
    return { private: false, visibility: "everyone" };
  }
  const flag = Object.keys(r).find((k) => /^(activity )?private$/i.test(k));
  if (flag && text(r[flag])) return { private: truthy(r[flag]), visibility: truthy(r[flag]) ? "only_me" : "everyone" };
  return { private: false, visibility: null };
}

/** A gear name → its strava_gear id. Names are all the export links by. */
export const gearIdOf = (kind, name) => (text(name) ? `${kind}:${String(name).trim().toLowerCase()}` : null);

/**
 * One activities.csv row → { row, privateRow, file }. `row` has every key
 * every time (one bulk-upsert shape) and never the site-owned columns.
 * `gearKinds` maps a lowercased gear name to "shoe" | "bike".
 */
export function activityFromCsv(r, { timeZone = "Asia/Kolkata", gearKinds = {}, now = new Date().toISOString() } = {}) {
  const id = num(r["Activity ID"]);
  if (!id) return null;
  const start = parseExportDate(r["Activity Date"]);
  const { local, date } = toLocal(start, timeZone);
  // The raw copy is metres; the first is display units (km, or miles in an
  // imperial account — which is why the raw one wins when it is there).
  let distance = num(r["Distance (2)"]);
  if (distance == null && num(r.Distance) != null) distance = num(r.Distance) * 1000;
  const gearName = text(r["Activity Gear"]) || text(r.Gear) || text(r.Bike);
  const gearKind = gearName ? gearKinds[gearName.toLowerCase()] || null : null;
  const extra = {};
  const privateExtra = {};
  Object.entries(r).forEach(([k, v]) => {
    if (!text(v) || MAPPED.has(k) || DROPPED.has(k)) return;
    if (PRIVATE_EXTRA.has(k)) privateExtra[k] = v;
    else extra[k] = v;
  });
  const vis = visibilityOf(r);
  return {
    row: {
      id,
      name: text(r["Activity Name"]) || "",
      sport_type: toSportType(r["Activity Type"]),
      type: text(r["Activity Type"]),
      start_date: start,
      start_date_local: local,
      date,
      timezone: timeZone,
      distance,
      moving_time: int(r["Moving Time"]),
      elapsed_time: int(raw(r, "Elapsed Time")),
      total_elevation_gain: num(r["Elevation Gain"]),
      elev_high: num(r["Elevation High"]),
      elev_low: num(r["Elevation Low"]),
      average_speed: num(r["Average Speed"]),
      max_speed: num(r["Max Speed"]),
      average_heartrate: num(r["Average Heart Rate"]),
      max_heartrate: num(raw(r, "Max Heart Rate")),
      has_heartrate: num(r["Average Heart Rate"]) != null,
      average_cadence: num(r["Average Cadence"]),
      average_watts: num(r["Average Watts"]),
      max_watts: num(r["Max Watts"]),
      weighted_average_watts: num(r["Weighted Average Power"]),
      kilojoules: num(r["Total Work"]) == null ? null : num(r["Total Work"]) / 1000,
      calories: num(r.Calories),
      suffer_score: num(raw(r, "Relative Effort")),
      perceived_exertion: num(r["Perceived Exertion"]),
      commute: truthy(raw(r, "Commute")),
      manual: !text(r.Filename),
      flagged: truthy(r.Flagged),
      private: vis.private,
      visibility: vis.visibility,
      gear_id: gearKind ? gearIdOf(gearKind, gearName) : null,
      description: text(r["Activity Description"]),
      extra: Object.keys(extra).length ? extra : null,
      synced_at: now,
    },
    privateRow: {
      activity_id: id,
      private_note: text(r["Activity Private Note"]),
      extra: Object.keys(privateExtra).length ? privateExtra : null,
    },
    file: text(r.Filename),
  };
}

/** shoes.csv / bikes.csv rows → strava_gear rows (mileage added later). */
export function gearFromCsv(rows, kind, { now = new Date().toISOString() } = {}) {
  const cap = kind === "shoe" ? "Shoe" : "Bike";
  return (rows || []).map((r) => {
    const name = text(r[`${cap} Name`]) || [r[`${cap} Brand`], r[`${cap} Model`]].map(text).filter(Boolean).join(" ");
    return name ? {
      id: gearIdOf(kind, name),
      kind,
      name,
      brand_name: text(r[`${cap} Brand`]),
      model_name: text(r[`${cap} Model`]),
      description: text(r[`${cap} Default Sport Types`]),
      synced_at: now,
    } : null;
  }).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Tracks: { t (epoch s), lat, lng, ele, dist (m, cumulative), hr, cad, watts }
// ---------------------------------------------------------------------------

const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
};
const inner = (xml, name) => {
  const m = new RegExp(`<(?:\\w+:)?${name}>([^<]*)</(?:\\w+:)?${name}>`).exec(xml);
  return m ? m[1].trim() : null;
};
const epoch = (iso) => {
  const t = Date.parse(iso || "");
  return Number.isFinite(t) ? t / 1000 : null;
};

/** Fills a missing cumulative distance from the coordinates. */
function withDistance(points) {
  let total = 0;
  return points.map((p, i) => {
    if (p.dist == null && i > 0 && p.lat != null && points[i - 1].lat != null) {
      total += haversine([points[i - 1].lat, points[i - 1].lng], [p.lat, p.lng]);
    }
    if (p.dist != null) total = p.dist;
    return { ...p, dist: total };
  });
}

export function trackFromGpx(xml) {
  const points = [];
  const re = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;
  let m = re.exec(xml);
  while (m) {
    const lat = num(attr(m[1], "lat"));
    const lng = num(attr(m[1], "lon"));
    points.push({
      t: epoch(inner(m[2], "time")),
      lat,
      lng,
      ele: num(inner(m[2], "ele")),
      dist: null,
      hr: num(inner(m[2], "hr")),
      cad: num(inner(m[2], "cad")),
      watts: num(inner(m[2], "power")),
    });
    m = re.exec(xml);
  }
  return { points: withDistance(points.filter((p) => p.t != null)), laps: [] };
}

export function trackFromTcx(xml) {
  const points = [];
  const laps = [];
  const lapRe = /<Lap\b([^>]*)>([\s\S]*?)<\/Lap>/g;
  let lap = lapRe.exec(xml);
  while (lap) {
    const body = lap[2];
    const trackStart = body.indexOf("<Track");
    const head = trackStart >= 0 ? body.slice(0, trackStart) : body;
    laps.push({
      start: epoch(attr(lap[1], "StartTime")),
      elapsed_time: num(inner(head, "TotalTimeSeconds")),
      distance: num(inner(head, "DistanceMeters")),
      max_speed: num(inner(head, "MaximumSpeed")),
      average_heartrate: num(/<AverageHeartRateBpm>\s*<Value>([^<]*)/.exec(head)?.[1]),
      max_heartrate: num(/<MaximumHeartRateBpm>\s*<Value>([^<]*)/.exec(head)?.[1]),
      average_cadence: num(inner(head, "Cadence")),
    });
    const tp = /<Trackpoint>([\s\S]*?)<\/Trackpoint>/g;
    let p = tp.exec(body);
    while (p) {
      points.push({
        t: epoch(inner(p[1], "Time")),
        lat: num(inner(p[1], "LatitudeDegrees")),
        lng: num(inner(p[1], "LongitudeDegrees")),
        ele: num(inner(p[1], "AltitudeMeters")),
        dist: num(inner(p[1], "DistanceMeters")),
        hr: num(/<HeartRateBpm>\s*<Value>([^<]*)/.exec(p[1])?.[1]),
        cad: num(inner(p[1], "Cadence")) ?? num(inner(p[1], "RunCadence")),
        watts: num(inner(p[1], "Watts")),
      });
      p = tp.exec(body);
    }
    lap = lapRe.exec(xml);
  }
  return { points: withDistance(points.filter((p) => p.t != null)), laps };
}

const fitTime = (v) => {
  if (v == null) return null;
  const t = v instanceof Date ? v.getTime() : Date.parse(v);
  return Number.isFinite(t) ? t / 1000 : null;
};

/**
 * fit-file-parser output (lengthUnit "m", speedUnit "m/s", mode "list") → a
 * track. Positions arrive in degrees from the parser.
 */
export function trackFromFit(fit) {
  const points = (fit?.records || []).map((r) => ({
    t: fitTime(r.timestamp),
    lat: num(r.position_lat),
    lng: num(r.position_long),
    ele: num(r.enhanced_altitude ?? r.altitude),
    dist: num(r.distance),
    hr: num(r.heart_rate),
    cad: num(r.cadence),
    watts: num(r.power),
  })).filter((p) => p.t != null);
  const laps = (fit?.laps || []).map((l) => ({
    start: fitTime(l.start_time),
    elapsed_time: num(l.total_elapsed_time),
    moving_time: num(l.total_timer_time),
    distance: num(l.total_distance),
    average_speed: num(l.enhanced_avg_speed ?? l.avg_speed),
    max_speed: num(l.enhanced_max_speed ?? l.max_speed),
    average_heartrate: num(l.avg_heart_rate),
    max_heartrate: num(l.max_heart_rate),
    average_cadence: num(l.avg_cadence),
    average_watts: num(l.avg_power),
    total_elevation_gain: num(l.total_ascent),
  }));
  return { points: withDistance(points), laps };
}

// ---------------------------------------------------------------------------
// Track → what the API used to compute
// ---------------------------------------------------------------------------

const MOVING_MPS = 0.5; // slower than this between two points counts as stopped

/** Seconds moving between point indexes a..b. */
function movingBetween(points, a, b) {
  let s = 0;
  for (let i = a + 1; i <= b; i += 1) {
    const dt = points[i].t - points[i - 1].t;
    const dd = points[i].dist - points[i - 1].dist;
    if (dt > 0 && dd / dt >= MOVING_MPS) s += dt;
  }
  return s;
}

const avg = (arr) => {
  const v = arr.filter((x) => x != null && x > 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

/** Splits every `size` metres (1000 = per km), the shape the API returned. */
export function splitsOf(points, size = 1000) {
  if (!points || points.length < 2) return null;
  const out = [];
  let from = 0;
  let target = size;
  const total = points[points.length - 1].dist;
  for (let i = 1; i < points.length; i += 1) {
    const last = i === points.length - 1;
    if (points[i].dist >= target || last) {
      const seg = points.slice(from, i + 1);
      const distance = points[i].dist - points[from].dist;
      if (distance < 50 && last) break; // a few metres past the last whole km
      const elapsed = points[i].t - points[from].t;
      const moving = movingBetween(points, from, i);
      out.push({
        split: out.length + 1,
        distance: round1(distance),
        elapsed_time: Math.round(elapsed),
        moving_time: Math.round(moving),
        elevation_difference: seg[seg.length - 1].ele != null && seg[0].ele != null
          ? round1(seg[seg.length - 1].ele - seg[0].ele) : null,
        average_speed: moving > 0 ? round1((distance / moving) * 100) / 100 : null,
        average_heartrate: round1(avg(seg.map((p) => p.hr))),
      });
      from = i;
      target += size;
      if (target > total + size) break;
    }
  }
  return out.length ? out : null;
}

// Strava's best-effort distances, in metres.
export const BEST_EFFORTS = [
  ["400m", 400], ["1/2 mile", 804.67], ["1K", 1000], ["1 mile", 1609.34], ["2 mile", 3218.69],
  ["5K", 5000], ["10K", 10000], ["15K", 15000], ["10 mile", 16093.4], ["20K", 20000],
  ["Half-Marathon", 21097.5], ["30K", 30000], ["Marathon", 42195], ["50K", 50000],
];

/**
 * The fastest stretch of each standard distance inside one activity (two
 * pointers over cumulative distance, interpolated at the window start).
 * `pr_rank` is filled in later, across all activities (rankBestEfforts).
 */
export function bestEffortsOf(points) {
  if (!points || points.length < 2) return null;
  const total = points[points.length - 1].dist;
  const out = [];
  BEST_EFFORTS.forEach(([name, metres]) => {
    if (total < metres) return;
    let best = Infinity;
    let a = 0;
    for (let b = 1; b < points.length; b += 1) {
      while (a + 1 < b && points[b].dist - points[a + 1].dist >= metres) a += 1;
      const span = points[b].dist - points[a].dist;
      if (span >= metres) {
        // Shift the start forward so the window is exactly `metres`.
        const extra = span - metres;
        const segD = points[a + 1].dist - points[a].dist;
        const segT = points[a + 1].t - points[a].t;
        const startT = points[a].t + (segD > 0 ? (extra / segD) * segT : 0);
        best = Math.min(best, points[b].t - startT);
      }
    }
    if (Number.isFinite(best) && best > 0) {
      out.push({
        name, distance: metres, elapsed_time: Math.round(best), moving_time: Math.round(best), pr_rank: null,
      });
    }
  });
  return out.length ? out : null;
}

/**
 * Strava's PR ranks across the whole log: for each distance, the three fastest
 * efforts *at the time they were run* get pr_rank 1–3 (a PR is a PR on the day
 * it happened, even if beaten later). `rows` need start_date and best_efforts;
 * they are updated in place.
 */
export function rankBestEfforts(rows) {
  const byName = {};
  [...rows].sort((a, b) => (a.start_date < b.start_date ? -1 : 1)).forEach((r) => {
    (r.best_efforts || []).forEach((e) => {
      const prior = byName[e.name] || [];
      const rank = prior.filter((t) => t <= e.elapsed_time).length + 1;
      e.pr_rank = rank <= 3 ? rank : null;
      byName[e.name] = [...prior, e.elapsed_time].sort((x, y) => x - y).slice(0, 3);
    });
  });
  return rows;
}

/** Laps as the page reads them, numbered. A single lap is not worth a table. */
export function lapsOf(laps) {
  const list = (laps || []).filter((l) => l.distance || l.elapsed_time);
  if (list.length < 2) return null;
  return list.map((l, i) => ({
    lap_index: i + 1,
    name: `Lap ${i + 1}`,
    distance: round1(l.distance),
    elapsed_time: l.elapsed_time == null ? null : Math.round(l.elapsed_time),
    moving_time: Math.round(l.moving_time ?? l.elapsed_time ?? 0) || null,
    average_speed: l.average_speed ?? (l.distance && (l.moving_time || l.elapsed_time)
      ? round1((l.distance / (l.moving_time || l.elapsed_time)) * 100) / 100 : null),
    max_speed: l.max_speed ?? null,
    average_heartrate: l.average_heartrate ?? null,
    max_heartrate: l.max_heartrate ?? null,
    average_cadence: l.average_cadence ?? null,
    average_watts: l.average_watts ?? null,
    total_elevation_gain: l.total_elevation_gain ?? null,
  }));
}

/** Every Nth point so a polyline stays under `max` points. */
function thin(coords, max) {
  if (coords.length <= max) return coords;
  const step = coords.length / max;
  const out = [];
  for (let i = 0; i < max; i += 1) out.push(coords[Math.floor(i * step)]);
  out.push(coords[coords.length - 1]);
  return out;
}

/**
 * A parsed track → the detail columns (public) and the GPS (private).
 * The public route is the same trimmed summary line the API version stored.
 */
export function detailFromTrack(track, { isRun = false, now = new Date().toISOString() } = {}) {
  const points = (track?.points || []).filter((p) => p.dist != null);
  const coords = points.filter((p) => p.lat != null && p.lng != null).map((p) => [p.lat, p.lng]);
  const summary = coords.length >= 2 ? encodePolyline(thin(coords, 300)) : null;
  return {
    detail: {
      route_polyline: summary ? trimRoute(summary, ROUTE_TRIM_METRES) : null,
      splits_metric: splitsOf(points, 1000),
      splits_standard: splitsOf(points, 1609.34),
      laps: lapsOf(track?.laps),
      best_efforts: isRun ? bestEffortsOf(points) : null,
      detail_synced_at: now,
    },
    gps: {
      summary_polyline: summary,
      polyline: coords.length >= 2 ? encodePolyline(thin(coords, 3000)) : null,
      start_latlng: coords[0] || null,
      end_latlng: coords[coords.length - 1] || null,
    },
  };
}

// ---------------------------------------------------------------------------
// Files-only exports: no activities.csv, just activities/<id>.fit.gz | .gpx
// ---------------------------------------------------------------------------
//
// Some archives (or a folder of files copied out of one) carry the original
// files without the CSV. Each file is then the whole record: a FIT session
// has the summary, a GPX its name and type and a track to compute one from.
// The file name is the Strava activity id. Rows come out in exactly the shape
// activityFromCsv produces, so the import writes them the same way.

const FIT_SPORTS = {
  running: "Run",
  walking: "Walk",
  hiking: "Hike",
  cycling: "Ride",
  swimming: "Swim",
  e_biking: "EBikeRide",
  rowing: "Rowing",
  cross_country_skiing: "NordicSki",
  alpine_skiing: "AlpineSki",
  snowboarding: "Snowboard",
  rock_climbing: "RockClimbing",
  stand_up_paddleboarding: "StandUpPaddling",
  kayaking: "Kayaking",
};
const FIT_SUB_SPORTS = {
  trail: "TrailRun",
  strength_training: "WeightTraining",
  yoga: "Yoga",
  pilates: "Pilates",
  hiit: "HighIntensityIntervalTraining",
  mountain: "MountainBikeRide",
  gravel_cycling: "GravelRide",
  virtual_activity: null, // decided by sport below
  elliptical: "Elliptical",
  stair_climbing: "StairStepper",
};
const INDOOR = new Set(["indoor_running", "treadmill", "indoor_cycling", "spin", "indoor_walking", "virtual_activity", "lap_swimming"]);

/** A FIT session's sport + sub_sport → { sportType, trainer }. */
export function sportTypeFromFit(sport, subSport) {
  const sub = String(subSport || "").toLowerCase();
  const base = String(sport || "").toLowerCase();
  const trainer = INDOOR.has(sub) && sub !== "lap_swimming";
  if (sub === "virtual_activity") {
    if (base === "running") return { sportType: "VirtualRun", trainer: true };
    if (base === "cycling") return { sportType: "VirtualRide", trainer: true };
  }
  if (FIT_SUB_SPORTS[sub]) return { sportType: FIT_SUB_SPORTS[sub], trainer };
  if (FIT_SPORTS[base]) return { sportType: FIT_SPORTS[base], trainer };
  if (base === "training" || base === "fitness_equipment") return { sportType: "Workout", trainer: true };
  return { sportType: "Workout", trainer };
}

const SPORT_WORDS = {
  WeightTraining: "Weight Training",
  HighIntensityIntervalTraining: "HIIT",
  TrailRun: "Trail Run",
  VirtualRun: "Virtual Run",
  VirtualRide: "Virtual Ride",
  MountainBikeRide: "Mountain Bike Ride",
  GravelRide: "Gravel Ride",
  EBikeRide: "E-Bike Ride",
};

/** Strava's name for an unnamed upload: "Morning Run", "Evening Walk", "Night Yoga". */
export function defaultName(sportType, localHour) {
  const h = Number(localHour);
  let part = "Night";
  if (h >= 4 && h < 12) part = "Morning";
  else if (h >= 12 && h < 17) part = "Afternoon";
  else if (h >= 17 && h < 21) part = "Evening";
  const word = SPORT_WORDS[sportType] || String(sportType || "Activity").replace(/([a-z])([A-Z])/g, "$1 $2");
  return `${part} ${word}`;
}

// Session fields with a column of their own; the rest of the session goes
// to `extra` under a readable name.
const FIT_EXTRA = {
  avg_temperature: "Average Temperature",
  max_temperature: "Max Temperature",
  total_descent: "Elevation Loss",
  total_cycles: "Total Cycles",
  total_strides: "Total Steps",
  avg_step_length: "Average Step Length (mm)",
  avg_vertical_oscillation: "Average Vertical Oscillation (mm)",
  avg_vertical_ratio: "Average Vertical Ratio",
  avg_stance_time: "Average Ground Contact Time (ms)",
  max_cadence: "Max Cadence",
  min_heart_rate: "Min Heart Rate",
  total_training_effect: "Aerobic Training Effect",
  total_anaerobic_training_effect: "Anaerobic Training Effect",
  training_load_peak: "Training Load",
  num_lengths: "Pool Lengths",
  pool_length: "Pool Length",
};

const emptyRow = (id, now, timeZone) => ({
  id,
  name: "",
  sport_type: null,
  type: null,
  start_date: null,
  start_date_local: null,
  date: null,
  timezone: timeZone,
  distance: null,
  moving_time: null,
  elapsed_time: null,
  total_elevation_gain: null,
  elev_high: null,
  elev_low: null,
  average_speed: null,
  max_speed: null,
  average_heartrate: null,
  max_heartrate: null,
  has_heartrate: false,
  average_cadence: null,
  average_watts: null,
  max_watts: null,
  weighted_average_watts: null,
  kilojoules: null,
  calories: null,
  suffer_score: null,
  perceived_exertion: null,
  commute: false,
  manual: false,
  flagged: false,
  private: false,
  visibility: null,
  gear_id: null,
  description: null,
  device_name: null,
  trainer: false,
  extra: null,
  synced_at: now,
});

const minMax = (values) => {
  const v = values.filter((x) => x != null);
  return v.length ? [Math.min(...v), Math.max(...v)] : [null, null];
};

/**
 * A parsed FIT file (fit-file-parser, mode "list") → { row, privateRow }, or
 * null when it has no session. `id` is the Strava activity id (the file name).
 */
export function activityFromFit(fit, { id, timeZone = "Asia/Kolkata", now = new Date().toISOString() } = {}) {
  const s = fit?.sessions?.[0];
  const start = s ? fitTime(s.start_time) : null;
  if (!id || !s || start == null) return null;
  const startIso = new Date(start * 1000).toISOString().replace(".000Z", "Z");
  const { local, date } = toLocal(startIso, timeZone);
  const { sportType, trainer } = sportTypeFromFit(s.sport, s.sub_sport);
  const device = fit.file_ids?.[0]?.product_name || fit.device_infos?.find((d) => d.product_name)?.product_name || null;
  const [elevLow, elevHigh] = minMax((fit.records || []).map((r) => num(r.enhanced_altitude ?? r.altitude)));
  const extra = { source: "fit" };
  Object.entries(FIT_EXTRA).forEach(([k, label]) => {
    if (num(s[k]) != null) extra[label] = num(s[k]);
  });
  const avgHr = num(s.avg_heart_rate);
  const distance = num(s.total_distance);
  return {
    row: {
      ...emptyRow(Number(id), now, timeZone),
      name: defaultName(sportType, Number(local.slice(11, 13))),
      sport_type: sportType,
      type: sportType,
      start_date: startIso,
      start_date_local: local,
      date,
      distance: distance ?? 0,
      moving_time: int(s.total_timer_time),
      elapsed_time: int(s.total_elapsed_time),
      total_elevation_gain: num(s.total_ascent),
      elev_high: elevHigh,
      elev_low: elevLow,
      average_speed: num(s.enhanced_avg_speed ?? s.avg_speed),
      max_speed: num(s.enhanced_max_speed ?? s.max_speed),
      average_heartrate: avgHr,
      max_heartrate: num(s.max_heart_rate),
      has_heartrate: avgHr != null,
      average_cadence: num(s.avg_cadence),
      average_watts: num(s.avg_power),
      max_watts: num(s.max_power),
      weighted_average_watts: num(s.normalized_power),
      kilojoules: num(s.total_work) == null ? null : num(s.total_work) / 1000,
      calories: num(s.total_calories),
      device_name: device,
      trainer,
      extra,
    },
    privateRow: { activity_id: Number(id), private_note: null, extra: null },
  };
}

/** A GPX file → { row, privateRow }: name and type from <trk>, numbers from the track. */
export function activityFromGpx(xml, { id, timeZone = "Asia/Kolkata", now = new Date().toISOString() } = {}) {
  const { points } = trackFromGpx(xml);
  if (!id || points.length < 2) return null;
  const trk = (/<trk>([\s\S]*?)<trkseg/.exec(xml) || [])[1] || "";
  const gpxType = inner(trk, "type");
  const { sportType } = sportTypeFromFit(gpxType, null);
  const startIso = new Date(points[0].t * 1000).toISOString().replace(".000Z", "Z");
  const { local, date } = toLocal(startIso, timeZone);
  const last = points[points.length - 1];
  let climb = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = (points[i].ele ?? 0) - (points[i - 1].ele ?? 0);
    if (points[i].ele != null && points[i - 1].ele != null && d > 0) climb += d;
  }
  const moving = movingBetween(points, 0, points.length - 1);
  const [elevLow, elevHigh] = minMax(points.map((p) => p.ele));
  const hrs = points.map((p) => p.hr).filter((v) => v != null);
  return {
    row: {
      ...emptyRow(Number(id), now, timeZone),
      name: text(inner(trk, "name")) || defaultName(sportType, Number(local.slice(11, 13))),
      sport_type: sportType,
      type: sportType,
      start_date: startIso,
      start_date_local: local,
      date,
      distance: Math.round(last.dist),
      moving_time: Math.round(moving),
      elapsed_time: Math.round(last.t - points[0].t),
      total_elevation_gain: Math.round(climb),
      elev_high: elevHigh,
      elev_low: elevLow,
      average_speed: moving ? Number((last.dist / moving).toFixed(3)) : null,
      average_heartrate: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null,
      max_heartrate: hrs.length ? Math.max(...hrs) : null,
      has_heartrate: hrs.length > 0,
      extra: { source: "gpx" },
    },
    privateRow: { activity_id: Number(id), private_note: null, extra: null },
  };
}

const FAMILIES = {
  Run: "run", TrailRun: "run", VirtualRun: "run", Walk: "walk", Hike: "hike", Swim: "swim",
};
const familyOf = (t) => FAMILIES[t] || (/Ride$/.test(String(t)) ? "ride" : String(t || "other"));

/**
 * Rows in `candidates` that are an activity already in `existing` (or earlier
 * in `candidates`) under a different id: same sport family, start within
 * `windowSec`. The same id is not a duplicate — that row is updated in place.
 * Returns [{ row, of }] where `of` is the id it duplicates.
 */
export function findDuplicates(candidates, existing = [], { windowSec = 60 } = {}) {
  const seen = (existing || [])
    .filter((e) => e.start_date)
    .map((e) => ({ id: Number(e.id), t: Date.parse(e.start_date), family: familyOf(e.sport_type) }));
  const out = [];
  (candidates || []).forEach((row) => {
    const t = Date.parse(row.start_date || "");
    if (!Number.isFinite(t)) return;
    const family = familyOf(row.sport_type);
    const hit = seen.find((e) => e.id !== Number(row.id) && e.family === family && Math.abs(e.t - t) <= windowSec * 1000);
    if (hit) out.push({ row, of: hit.id });
    else seen.push({ id: Number(row.id), t, family });
  });
  return out;
}
