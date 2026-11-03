// Sample training data for /training until the Strava export is imported.
//
// Deterministic (a seeded generator, fixed dates), so every visitor and every
// screenshot sees the same log. Rows are the shape of fromActivityRow in
// src/lib/api/training.js, gear the shape of a strava_gear row, best efforts
// the shape of the activity_best_efforts() RPC — so every view runs on it
// unchanged. The page says it is sample data whenever it shows it.
//
// Ids live above DEMO_ID_BASE, far from any real Strava id the page would
// ever link to, which is how /training/:id knows to read a sample row.

import { encodePolyline, trimRoute } from "./strava";
import { sportFamily } from "./training";

import { DEMO_ID_BASE } from "./trainingDemoId";

export { DEMO_ID_BASE, isDemoId } from "./trainingDemoId";

const START = Date.UTC(2023, 0, 2);
const END = Date.UTC(2026, 10, 2);
const DAY = 86400000;

function rng(seed) {
  let a = seed >>> 0; // eslint-disable-line no-bitwise
  return () => {
    /* eslint-disable no-bitwise */
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    /* eslint-enable no-bitwise */
  };
}

// Places around Pune to start from, so the routes overlap the way a real
// training log's do.
const HUBS = [
  { name: "riverside", at: [18.5362, 73.8930] },
  { name: "hill", at: [18.5196, 73.8301] },
  { name: "lake", at: [18.4575, 73.8508] },
  { name: "university", at: [18.5531, 73.8253] },
  { name: "cantonment", at: [18.5089, 73.8908] },
];

// Daily trainers rotate every ~11% of the log (about 900 km each), plus a
// race pair and a trail pair that only see their own days.
const DAILY = ["Tempo Trainer", "Long Haul", "Cloud Cruiser", "Daily Cruiser", "Pacer", "Steady"];
const SHOES = [
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `g10${String(i + 1).padStart(2, "0")}`,
    name: `${DAILY[i % DAILY.length]} ${i >= DAILY.length ? "II" : ""}`.trim(),
    brand_name: i % 2 ? "Volt" : "Stride",
    model_name: `${DAILY[i % DAILY.length]} ${i + 1}`,
    from: i / 9,
    to: i === 8 ? 1.01 : (i + 1) / 9,
  })),
  { id: "g1090", name: "Race Day Carbon", brand_name: "Volt", model_name: "Carbon X", race: true },
  { id: "g1091", name: "Fort Grip Trail", brand_name: "Ridge", model_name: "Grip 3", trail: true },
];
const BIKE = { id: "b2001", name: "Grey Gravel", brand_name: "Vela", model_name: "Gravel 105" };

const RACES = [
  { date: "2023-02-19", name: "Pune Riverfront 10K", km: 10 },
  { date: "2023-12-17", name: "Deccan Half Marathon", km: 21.0975 },
  { date: "2024-01-21", name: "Coastal Marathon", km: 42.195 },
  { date: "2024-08-11", name: "Monsoon 10K", km: 10 },
  { date: "2024-12-08", name: "Deccan Half Marathon", km: 21.0975 },
  { date: "2025-01-19", name: "Coastal Marathon", km: 42.195 },
  { date: "2025-06-22", name: "Sahyadri Trail 25K", km: 25, trail: true },
  { date: "2025-11-30", name: "City Lights 5K", km: 5 },
  { date: "2026-01-18", name: "Coastal Marathon", km: 42.195 },
  { date: "2026-08-23", name: "Ghats Ultra 50K", km: 50, trail: true },
  { date: "2026-10-25", name: "Deccan Half Marathon", km: 21.0975 },
];

const HIKES = ["Sinhagad sunrise", "Rajgad climb", "Torna ridge walk", "Purandar loop", "Lohagad in the rain", "Tikona scramble", "Rajmachi trail"];
const RUN_NAMES = {
  easy: ["Easy miles", "Morning shakeout", "Recovery run", "Riverside easy", "Dawn patrol", "Before-work run"],
  tempo: ["Tempo Tuesday", "Threshold blocks", "Cruise intervals", "Progression run"],
  intervals: ["Track 400s", "Hill repeats", "Yasso 800s", "Fartlek on the ghats road"],
  long: ["Sunday long run", "Long run to the lake", "Long run, negative split", "Marathon-pace long run"],
};
const RIDES = ["Ride to Khadakwasla", "Gravel to the dam", "Sunday spin", "Hill climbs on Katraj ghat", "Coffee ride"];
const WALKS = ["Evening walk", "Walk after dinner", "Monsoon walk"];
const CONDITIONS = ["Clear", "Partly cloudy", "Humid", "Light rain", "Haze", "Overcast"];

const EFFORTS = [
  ["400m", 400], ["1/2 mile", 805], ["1K", 1000], ["1 mile", 1609], ["2 mile", 3219], ["5K", 5000],
  ["10K", 10000], ["15K", 15000], ["10 mile", 16093], ["20K", 20000], ["Half-Marathon", 21097],
  ["30K", 30000], ["Marathon", 42195], ["50K", 50000],
];

const pick = (r, list) => list[Math.floor(r() * list.length)];
const iso = (t) => new Date(t).toISOString().slice(0, 10);

/** A route `km` long from `hub`, wandering with a smooth heading, as point list. */
function wander(r, hub, km, shape) {
  const step = 0.12; // km per point
  const n = Math.max(12, Math.round(km / step));
  let [lat, lng] = hub;
  let heading = r() * Math.PI * 2;
  const turn = shape === "loop" ? (Math.PI * 2) / n : 0;
  const pts = [[lat, lng]];
  const half = Math.floor(n / 2);
  for (let i = 1; i < n; i += 1) {
    if (shape === "out" && i === half) heading += Math.PI;
    heading += turn + (r() - 0.5) * 0.5;
    const d = step / 111;
    lat += Math.cos(heading) * d;
    lng += (Math.sin(heading) * d) / Math.cos((lat * Math.PI) / 180);
    pts.push([lat, lng]);
  }
  return pts;
}

function splitsFor(r, km, speed) {
  const out = [];
  const whole = Math.floor(km);
  for (let i = 1; i <= whole; i += 1) {
    const fatigue = 1 - Math.max(0, i - 25) * 0.006;
    const s = speed * fatigue * (0.96 + r() * 0.08);
    out.push({
      split: i,
      distance: 1000,
      moving_time: Math.round(1000 / s),
      elapsed_time: Math.round(1000 / s) + (r() < 0.1 ? Math.round(r() * 20) : 0),
      average_speed: Number(s.toFixed(3)),
      elevation_difference: Number(((r() - 0.5) * 14).toFixed(1)),
      average_heartrate: Math.round(138 + i * 0.6 + r() * 10),
    });
  }
  return out;
}

function effortsFor(km, speed) {
  return EFFORTS.filter(([, m]) => m <= km * 1000).map(([name, m]) => {
    // Shorter efforts inside a run are run faster than its average.
    const boost = 1 + Math.max(0, Math.log10((km * 1000) / m)) * 0.06;
    const t = Math.round(m / (speed * boost));
    return {
      name, distance: m, elapsed_time: t, moving_time: t,
    };
  });
}

let CACHE = null;

function build() {
  const r = rng(20260601);
  const rows = [];
  let n = 0;
  const raceByDate = new Map(RACES.map((x) => [x.date, x]));

  const add = (t, spec) => {
    const progress = (t - START) / (END - START);
    const family = sportFamily(spec.sport);
    const { km } = spec;
    // Runs get quicker over the years: about 6:25/km down to 5:15/km easy.
    const basePace = 385 - progress * 70;
    let speed;
    if (family === "run") speed = 1000 / (basePace / (spec.intensity || 1));
    else if (family === "ride") speed = (22 + progress * 5 + r() * 4) / 3.6;
    else if (family === "hike") speed = (3.2 + r() * 0.8) / 3.6;
    else if (family === "swim") speed = 1000 / (130 + r() * 20);
    else speed = (5 + r()) / 3.6;
    const moving = Math.round((km * 1000) / speed);
    const startHour = spec.hour ?? (r() < 0.82 ? 5 + r() * 2.2 : 17 + r() * 2.5);
    const localMs = t + startHour * 3600000;
    const local = new Date(localMs).toISOString().slice(0, 19);
    const utc = new Date(localMs - 5.5 * 3600000).toISOString().replace(".000Z", "Z");
    const id = DEMO_ID_BASE + (n += 1);
    const hub = spec.trail ? [18.3664 + r() * 0.08, 73.7553 + r() * 0.06] : pick(r, HUBS).at;
    const raw = family === "swim" || spec.indoor ? null
      : wander(r, hub, family === "ride" ? km * 0.6 : km, km > 15 ? "out" : "loop");
    const route = raw ? trimRoute(encodePolyline(raw)) : null;
    const climbPerKm = { hike: 70, ride: 9, run: spec.trail ? 38 : 6 }[family] ?? 2;
    const elevation = Math.round(km * climbPerKm * (0.6 + r() * 0.8));
    const hr = family === "walk" ? 104 + r() * 10 : 136 + (spec.intensity || 1) * 14 + r() * 8;
    const isRun = family === "run";
    const shoe = isRun ? (() => {
      if (spec.race && !spec.trail) return "g1090";
      if (spec.trail) return "g1091";
      const s = SHOES.find((g) => g.from != null && progress >= g.from && progress < g.to);
      return s ? s.id : "g1009";
    })() : null;
    rows.push({
      id,
      url: `https://www.strava.com/activities/${id}`,
      name: spec.name,
      sport: spec.sport,
      workoutType: spec.race ? 1 : null,
      startDate: utc,
      startLocal: local,
      date: iso(t),
      timezone: "Asia/Kolkata",
      distance: Math.round(km * 1000),
      movingTime: moving,
      elapsedTime: moving + Math.round(r() * 300),
      elevationGain: elevation,
      elevHigh: 560 + Math.round(r() * (family === "hike" ? 800 : 60)),
      elevLow: 540 + Math.round(r() * 20),
      averageSpeed: Number(speed.toFixed(3)),
      maxSpeed: Number((speed * (1.25 + r() * 0.3)).toFixed(3)),
      averageHeartrate: family === "swim" ? null : Math.round(hr),
      maxHeartrate: family === "swim" ? null : Math.round(hr + 18 + r() * 12),
      averageCadence: isRun ? Math.round(84 + r() * 6) : null,
      averageWatts: family === "ride" ? Math.round(150 + r() * 60) : null,
      maxWatts: family === "ride" ? Math.round(420 + r() * 200) : null,
      weightedAverageWatts: null,
      kilojoules: family === "ride" ? Math.round(moving * 0.17) : null,
      calories: Math.round(km * (family === "ride" ? 28 : 68)),
      sufferScore: Math.round((moving / 60) * ((spec.intensity || 1) * 0.9) * (0.7 + r() * 0.4)),
      perceivedExertion: null,
      kudos: 0,
      comments: 0,
      achievements: 0,
      prs: 0,
      athletes: 1,
      trainer: !!spec.indoor,
      commute: false,
      manual: false,
      private: false,
      visibility: "everyone",
      gearId: family === "ride" ? BIKE.id : shoe,
      deviceName: family === "swim" ? "Sample Watch (pool)" : "Sample Watch",
      description: spec.description || "",
      route,
      splits: isRun || family === "walk" || family === "hike" ? splitsFor(r, km, speed) : [],
      laps: [],
      bestEfforts: isRun ? effortsFor(km, speed) : [],
      segmentEfforts: [],
      extra: {
        "Weather Condition": pick(r, CONDITIONS),
        "Weather Temperature": Math.round(19 + r() * 12),
        Humidity: Number((0.45 + r() * 0.45).toFixed(2)),
        ...(isRun ? { "Total Steps": Math.round(km * 1000 * 1.38) } : {}),
        // What the import's deepStatsOf keeps, roughly: the heart-rate
        // histogram around the average, steps and the hottest lap.
        _stats: family === "swim" ? null : {
          hrBins: Object.fromEntries([-20, -10, 0, 10].map((d) => [Math.floor((hr + d) / 10) * 10, Math.round(moving * [0.1, 0.3, 0.45, 0.15][[-20, -10, 0, 10].indexOf(d)])])),
          ...(family === "run" || family === "walk" || family === "hike" ? { steps: Math.round(km * 1000 * 1.38) } : {}),
          tMax: Math.round(24 + r() * 10),
          tMin: Math.round(19 + r() * 5),
          streams: ["hr", "speed", "cad", "ele", ...(raw ? ["lat"] : [])],
        },
      },
      visible: true,
      sportId: null,
      syncedAt: "2026-11-02T00:00:00Z",
      detailSyncedAt: "2026-11-02T00:00:00Z",
      tags: spec.race ? ["race", spec.km >= 42 ? "marathon" : "running"] : [],
    });
  };

  for (let t = START; t <= END; t += DAY) {
    const date = iso(t);
    const dow = new Date(t).getUTCDay();
    const progress = (t - START) / (END - START);
    const month = new Date(t).getUTCMonth();
    const monsoon = month >= 5 && month <= 8;
    const race = raceByDate.get(date);
    if (race) {
      add(t, {
        sport: race.trail ? "TrailRun" : "Run",
        km: race.km,
        name: race.name,
        race: true,
        trail: race.trail,
        intensity: race.km <= 10 ? 1.22 : 1.12,
        hour: 5.75,
        description: "Race day. Started steady, kept something for the last third.",
      });
    } else if (dow === 0) {
      // Sunday: the long run, building through the years.
      if (r() < 0.86) {
        const km = Math.min(34, 12 + progress * 12 + r() * 8);
        add(t, { sport: "Run", km, name: pick(r, RUN_NAMES.long) });
      }
    } else if (dow === 6 && r() < 0.42) {
      if (r() < 0.45) add(t, { sport: "Hike", km: 6 + r() * 9, name: pick(r, HIKES), trail: true, hour: 5.2 });
      else add(t, { sport: "Ride", km: 30 + r() * 55, name: pick(r, RIDES) });
    } else if (dow === 2 || dow === 4) {
      if (r() < 0.84) {
        const kind = dow === 2 ? "tempo" : "intervals";
        add(t, {
          sport: "Run", km: 7 + r() * 5, name: pick(r, RUN_NAMES[kind]), intensity: 1.12,
        });
      }
    } else if (dow === 1 || dow === 5) {
      if (r() < 0.62 + progress * 0.2) {
        add(t, {
          sport: monsoon && r() < 0.3 ? "VirtualRun" : "Run",
          km: 5 + r() * 4,
          name: pick(r, RUN_NAMES.easy),
          indoor: monsoon && r() < 0.3,
        });
      }
    } else if (dow === 3) {
      if (r() < 0.22) add(t, { sport: "Swim", km: 1 + r() * 1.2, name: "Pool laps", indoor: true });
      else if (r() < 0.3) add(t, { sport: "Walk", km: 3 + r() * 3, name: pick(r, WALKS) });
    }
  }

  const gear = [...SHOES.map((g) => ({ ...g, kind: "shoe" })), { ...BIKE, kind: "bike" }].map((g) => {
    const used = rows.filter((x) => x.gearId === g.id);
    return {
      id: g.id,
      kind: g.kind,
      name: g.name,
      brand_name: g.brand_name,
      model_name: g.model_name,
      distance: used.reduce((s, x) => s + x.distance, 0),
      retired: g.to != null && g.to < 1,
      is_primary: g.id === "g1009",
    };
  });

  // activity_best_efforts(): the fastest effort per name per year.
  const best = new Map();
  rows.forEach((a) => a.bestEfforts.forEach((e) => {
    const key = `${e.name}|${a.date.slice(0, 4)}`;
    const cur = best.get(key);
    if (!cur || e.elapsed_time < cur.elapsed_time) {
      best.set(key, {
        name: e.name, distance: e.distance, year: Number(a.date.slice(0, 4)), elapsed_time: e.elapsed_time, activity_id: a.id, date: a.date,
      });
    }
  }));

  rows.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  return { rows, gear, efforts: [...best.values()] };
}

const data = () => {
  if (!CACHE) CACHE = build();
  return CACHE;
};

export const demoActivities = () => data().rows;
export const demoGear = () => data().gear;
export const demoBestEfforts = () => data().efforts;
export const demoActivity = (id) => data().rows.find((a) => String(a.id) === String(id)) || null;
