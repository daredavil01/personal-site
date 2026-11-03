// The /training film's numbers, read live from the public table and reduced
// with the page's own modules (src/lib/training.js, trainingFacts.js,
// dayStory.js) through Vite's SSR loader — the film never computes a number
// the page would compute differently. Only public columns are read: the
// routes are the end-trimmed `route_polyline`, never the private GPS.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function env(name) {
  if (process.env[name]) return process.env[name];
  const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
  const m = new RegExp(`^\\s*${name}\\s*=\\s*"([^"]+)"`, "m").exec(toml);
  return m ? m[1] : null;
}

async function rest(query) {
  const url = env("VITE_SUPABASE_URL");
  const key = env("VITE_SUPABASE_PUBLISHABLE_KEY");
  const out = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(`${url}/rest/v1/${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    // eslint-disable-next-line no-await-in-loop
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

async function siteModules() {
  const vite = await createServer({
    root: ROOT,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const mods = await Promise.all([
      "/src/lib/training.js", "/src/lib/trainingFacts.js", "/src/lib/dayStory.js", "/src/lib/strava.js",
    ].map((m) => vite.ssrLoadModule(m)));
    return Object.assign({}, ...mods);
  } finally {
    await vite.close();
  }
}

const r1 = (v) => Math.round(v * 10) / 10;
const median = (arr) => {
  const a = [...arr].sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
};

// The film's width for the day replay's line, in its own pixels.
export const DAY_W = 960;

/** Everything the film draws, as plain JSON. */
export async function loadFilmData({ today = new Date().toISOString().slice(0, 10) } = {}) {
  const M = await siteModules();
  const LIGHT = [
    "id", "name", "sport_type", "start_date", "start_date_local", "date", "distance", "moving_time", "elapsed_time",
    "total_elevation_gain", "average_speed", "average_heartrate", "max_heartrate", "calories", "elev_high", "elev_low",
    "average_cadence", "average_watts", "max_speed", "device_name", "extra", "visible",
  ].join(",");
  const raw = await rest(`strava_activities?select=${LIGHT}&visible=eq.true&order=start_date.asc`);
  const rows = raw.map((r) => ({
    id: r.id,
    name: r.name,
    sport: r.sport_type,
    startDate: r.start_date,
    startLocal: r.start_date_local,
    date: r.date,
    distance: r.distance ?? 0,
    movingTime: r.moving_time ?? 0,
    elapsedTime: r.elapsed_time ?? 0,
    elevationGain: r.total_elevation_gain ?? 0,
    elevHigh: r.elev_high,
    elevLow: r.elev_low,
    averageSpeed: r.average_speed,
    maxSpeed: r.max_speed,
    averageHeartrate: r.average_heartrate,
    maxHeartrate: r.max_heartrate,
    averageCadence: r.average_cadence,
    averageWatts: r.average_watts,
    calories: r.calories,
    deviceName: r.device_name,
    extra: r.extra || {},
  }));
  if (!rows.length) throw new Error("No activities in strava_activities — import first (docs/strava.md).");

  const t = M.totals(rows);
  const groups = M.factsOf(rows, { today });
  const inv = M.inventory(rows);
  const facts = Object.fromEntries(groups.map((g) => [g.id, g]));
  const find = (gid, re) => facts[gid]?.facts.find((f) => re.test(f.label)) || null;
  const pick = (f) => (f ? { label: f.label, value: f.value, detail: f.detail || null, n: f.n ?? null, unit: f.unit || null } : null);

  // Sports, biggest first.
  const fam = {};
  rows.forEach((r) => {
    const f = M.sportFamily(r.sport);
    // "Other" is strength and yoga in this log: name it for what it is.
    fam[f] = fam[f] || { family: f, label: f === "other" ? "Strength" : (M.FAMILY_LABELS[f] || f), count: 0, km: 0 };
    fam[f].count += 1;
    fam[f].km += (r.distance || 0) / 1000;
  });
  const families = Object.values(fam).sort((a, b) => b.count - a.count).map((f) => ({ ...f, km: Math.round(f.km) }));
  // One dot per activity, oldest first, carrying its family.
  const dots = rows.map((r) => M.sportFamily(r.sport));

  // The calendar: every day from the log proper (after any >90-day gap) to its last day.
  const allDays = [...new Set(rows.map((r) => r.date))].sort();
  let from = 0;
  for (let i = 1; i < allDays.length; i += 1) {
    if ((Date.parse(allDays[i]) - Date.parse(allDays[i - 1])) / 86400000 > 90) from = i;
  }
  const first = allDays[from];
  const last = allDays[allDays.length - 1];
  const kmByDay = {};
  rows.forEach((r) => { kmByDay[r.date] = (kmByDay[r.date] || 0) + (r.distance || 0) / 1000; });
  const calendar = [];
  for (let d = Date.parse(`${first}T00:00:00Z`); d <= Date.parse(`${last}T00:00:00Z`); d += 86400000) {
    const iso = new Date(d).toISOString().slice(0, 10);
    // An active day with no distance (strength, yoga) still lights its cell.
    calendar.push(iso in kmByDay ? Math.max(0.1, r1(kmByDay[iso])) : 0);
  }
  // Where the longest streak sits on that calendar.
  let best = { len: 0, end: 0 };
  let run = 0;
  calendar.forEach((v, i) => {
    run = v > 0 ? run + 1 : 0;
    if (run > best.len) best = { len: run, end: i };
  });
  const streak = { length: best.len, start: best.end - best.len + 1, end: best.end };
  const st = M.streaks(rows, today);

  // Routes for the light painting: home ground, oldest first.
  const routeRows = await rest("strava_activities?select=id,sport_type,route_polyline,start_date&visible=eq.true&route_polyline=not.is.null&order=start_date.asc");
  const decoded = routeRows.map((r) => ({ fam: M.sportFamily(r.sport_type), pts: M.decodePolyline(r.route_polyline) })).filter((r) => r.pts.length > 4);
  const mids = decoded.map((r) => r.pts[Math.floor(r.pts.length / 2)]);
  const centre = [median(mids.map((c) => c[0])), median(mids.map((c) => c[1]))];
  const home = decoded.filter((_, i) => M.haversine(mids[i], centre) <= 15000);
  const lats = [];
  const lngs = [];
  home.forEach((r) => r.pts.forEach(([la, ln]) => { lats.push(la); lngs.push(ln); }));
  lats.sort((a, b) => a - b);
  lngs.sort((a, b) => a - b);
  const q = (arr, f) => arr[Math.floor(f * (arr.length - 1))];
  const minLat = q(lats, 0.02);
  const maxLat = q(lats, 0.98);
  const minLng = q(lngs, 0.02);
  const maxLng = q(lngs, 0.98);
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = (maxLng - minLng) * k;
  const spanY = maxLat - minLat;
  const S = 1000 / Math.max(spanX, spanY);
  const routes = home.map((r) => {
    const step = Math.max(1, Math.floor(r.pts.length / 120));
    const pts = r.pts.filter((_, i) => i % step === 0 || i === r.pts.length - 1)
      .map(([la, ln]) => [Math.round(((ln - minLng) * k * S + (1000 - spanX * S) / 2) * 10) / 10, Math.round(((maxLat - la) * S + (1000 - spanY * S) / 2) * 10) / 10]);
    return { fam: r.fam, d: `M${pts.map((p) => p.join(" ")).join("L")}` };
  });

  // The day: the longest activity with splits.
  const longest = [...rows].sort((a, b) => b.distance - a.distance)[0];
  const [full] = await rest(`strava_activities?select=id,name,sport_type,start_date_local,date,distance,moving_time,total_elevation_gain,splits_metric,profile&id=eq.${longest.id}`);
  const story = M.storyOf(full.splits_metric, { sport: full.sport_type, startLocal: full.start_date_local });
  const terrain = M.terrainOf(story.points, full.profile);
  const endKm = story.points[story.points.length - 1].km;
  const pxOf = (i) => (story.points[i].km / endKm) * DAY_W;
  const slots = M.pickSlots(story.beats, pxOf, { count: M.GROUP, gap: 70 });
  const day = {
    id: full.id,
    name: full.name,
    sport: full.sport_type,
    date: full.date,
    km: r1(full.distance / 1000),
    climb: Math.round(full.total_elevation_gain || 0),
    movingTime: full.moving_time,
    family: story.family,
    points: story.points.map((p) => ({ km: r1(p.km * 100) / 100, at: p.at, stopped: p.stopped })),
    terrain: terrain.line.filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 160)) === 0 || i === a.length - 1)
      .map((p) => ({ km: Math.round(p.km * 100) / 100, elev: Math.round(p.elev) })),
    slots: slots.map((s) => ({ i: s.i, kind: s.kind, pose: s.pose, label: s.label })),
    walkPose: M.poseFor(story.family, story.typical, story.typical),
  };

  const zones = facts.heart?.viz?.zones?.map((z) => ({ zone: z.zone, share: z.share })) || [];
  return {
    today,
    totals: {
      km: Math.round(t.distance / 1000),
      hours: Math.round(t.movingTime / 3600),
      count: rows.length,
      climb: Math.round(t.elevationGain || rows.reduce((s, r) => s + (r.elevationGain || 0), 0)),
      activeDays: allDays.length,
    },
    families,
    dots,
    calendar: {
      first, last, days: calendar, active: calendar.filter((v) => v > 0).length, streak, longest: st.longest, current: st.current,
    },
    routes,
    day,
    numbers: {
      factCount: groups.reduce((s, g) => s + g.facts.length, 0),
      variableCount: inv.filter((v) => v.count > 0).length,
      steps: pick(find("volume", /step/i)),
      climb: pick(find("volume", /climb/i)),
      hour: pick(find("habits", /hour/i)),
      weekday: pick(find("habits", /favourite day/i)),
      cadence: pick(find("form", /cadence/i)),
      stride: pick(find("form", /stride/i)),
      hours: facts.habits?.viz?.hours || [],
      weekdayKm: facts.habits?.viz?.weekdayKm || [],
      zones,
    },
    groups: groups.map((g) => ({ id: g.id, title: g.title, labels: g.facts.map((f) => f.label) })),
  };
}
