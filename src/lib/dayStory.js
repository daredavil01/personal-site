// One activity told as a walk along a line: the terrain it covered (the
// per-km splits' elevation change, summed), with figures at the moments that
// mattered — the start, the fastest kilometre, a stop, the biggest climb, the
// heart-rate peak, the finish — and plain figures in between whose stride
// shows the pace. Pure: splits in, a profile and "beats" out, so the page and
// its test agree on what happened. The component decides how many fit.

import { sportFamily } from "./training";

/** Seconds stopped inside a split before it counts as a stop worth showing. */
export const STOP_SECONDS = 60;
/** A pace figure sits down only when the stop is this share of its kilometre. */
export const REST_SHARE = 0.3;
/** A kilometre that climbs at least this much is a climb worth a figure. */
export const CLIMB_METRES = 8;

const median = (arr) => {
  const a = arr.filter((v) => v > 0).sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
};

/** The figure's pose for a family and how this km's pace compares to the day's. */
export function poseFor(family, speed, typical) {
  if (family === "ride") return "ride";
  if (family === "swim") return "swim";
  if (family === "hike") return "hike";
  if (family === "walk") return "walk";
  if (!typical || !speed) return "run";
  if (speed >= typical * 1.06) return "fast";
  if (speed <= typical / 1.15) return "walk";
  return "run";
}

/**
 * splits (the API's splits_metric shape) → {
 *   points: [{ i, km, at, elev, speed, hr, stopped, split }]  one per split end,
 *           plus the start at index 0 (km 0, elev 0)
 *   beats:  [{ i, kind, pose, priority, label, detail }]  i indexes points
 *   range:  { lo, hi } of elev, hr: { lo, hi }, typical speed
 * } or null when there are fewer than two splits.
 *
 * Priorities (lower wins a crowded spot): start and finish 0, the longest
 * stop 1, the fastest km 2, the biggest climb 3, the heart-rate peak 4,
 * pace figures 9.
 */
export function storyOf(splits, { sport = "Run", startLocal = null } = {}) {
  const list = (splits || []).filter((s) => (s.distance || 0) > 0);
  if (list.length < 2) return null;
  const family = sportFamily(sport);
  const typical = median(list.map((s) => s.average_speed || 0));

  const points = [{
    i: 0, km: 0, at: 0, elev: 0, speed: null, hr: null, stopped: 0, split: null,
  }];
  let km = 0;
  let at = 0;
  let elev = 0;
  list.forEach((s, k) => {
    km += (s.distance || 0) / 1000;
    at += s.elapsed_time || s.moving_time || 0;
    elev += s.elevation_difference || 0;
    points.push({
      i: k + 1,
      km,
      at,
      elev,
      speed: s.average_speed || null,
      hr: s.average_heartrate || null,
      stopped: Math.max(0, (s.elapsed_time || 0) - (s.moving_time || 0)),
      split: s,
    });
  });

  const elevs = points.map((p) => p.elev);
  const hrs = points.map((p) => p.hr).filter(Boolean);
  const beats = [];
  const time = startLocal ? String(startLocal).slice(11, 16) : null;
  beats.push({
    i: 0, kind: "start", pose: "stand", priority: 0, label: "Start", detail: time,
  });

  const body = points.slice(1);
  const by = (fn) => body.reduce((best, p) => (fn(p) > fn(best) ? p : best), body[0]);

  const stop = by((p) => p.stopped);
  if (stop.stopped >= STOP_SECONDS) {
    beats.push({
      i: stop.i, kind: "stop", pose: "rest", priority: 1, label: "Paused", detail: stop.stopped,
    });
  }
  // A last, partial kilometre is not a fair "fastest".
  const whole = body.filter((p) => (p.split.distance || 0) >= 900);
  const fastest = whole.reduce((best, p) => ((p.speed || 0) > (best?.speed || 0) ? p : best), null);
  if (fastest && fastest.speed) {
    beats.push({
      i: fastest.i, kind: "fastest", pose: family === "run" ? "fast" : poseFor(family), priority: 2, label: "Fastest km", detail: fastest.speed,
    });
  }
  const climb = by((p) => p.split.elevation_difference || 0);
  if ((climb.split.elevation_difference || 0) >= CLIMB_METRES) {
    beats.push({
      i: climb.i, kind: "climb", pose: "climb", priority: 3, label: "Biggest climb", detail: climb.split.elevation_difference,
    });
  }
  const peak = by((p) => p.hr || 0);
  if (peak.hr) {
    beats.push({
      i: peak.i, kind: "heart", pose: poseFor(family, peak.speed, typical), priority: 4, label: "Heart peaked", detail: Math.round(peak.hr),
    });
  }
  const last = points[points.length - 1];
  beats.push({
    i: last.i, kind: "finish", pose: "summit", priority: 0, label: "Finish", detail: last.km,
  });

  // Pace figures everywhere else; the component keeps the ones that fit.
  const taken = new Set(beats.map((b) => b.i));
  body.forEach((p) => {
    if (taken.has(p.i)) return;
    beats.push({
      // Hikers pause on most kilometres; only a stop that is a real share of
      // the kilometre sits the figure down (the longest one is labelled above).
      i: p.i, kind: "pace", pose: p.stopped >= STOP_SECONDS && p.stopped >= REST_SHARE * (p.split.elapsed_time || 0) ? "rest" : poseFor(family, p.speed, typical), priority: 9, label: null, detail: null,
    });
  });

  return {
    points,
    beats: beats.sort((a, b) => a.i - b.i),
    range: { lo: Math.min(...elevs), hi: Math.max(...elevs) },
    hr: hrs.length ? { lo: Math.min(...hrs), hi: Math.max(...hrs) } : null,
    typical,
    family,
  };
}

/**
 * Keep the beats that fit at `pxPerPoint` spacing: highest priority first,
 * each at least `gap` px from every kept one. Start and finish always stay.
 */
export function fitBeats(beats, pxOf, gap = 64) {
  const kept = [];
  [...beats].sort((a, b) => a.priority - b.priority || a.i - b.i).forEach((b) => {
    const x = pxOf(b.i);
    if (b.priority === 0 || kept.every((k) => Math.abs(pxOf(k.i) - x) >= gap)) kept.push(b);
  });
  return kept.sort((a, b) => a.i - b.i);
}

/** Where the replay figure is at `t` seconds: { p (point index, fractional), stopped }. */
export function positionAt(points, tIn) {
  // A requestAnimationFrame timestamp can predate the start by a few ms.
  const t = Math.max(0, Number(tIn) || 0);
  for (let k = 1; k < points.length; k += 1) {
    const a = points[k - 1];
    const b = points[k];
    if (t <= b.at) {
      const span = b.at - a.at || 1;
      const moving = span - b.stopped;
      const into = t - a.at;
      // The stop is drawn at the end of the kilometre it happened in.
      if (into >= moving) return { p: k, stopped: true };
      return { p: k - 1 + into / (moving || 1), stopped: false };
    }
  }
  return { p: points.length - 1, stopped: false };
}

/** The group that sets out together; one stays behind at each slot. */
export const GROUP = 10;

/**
 * Up to `count` places along the line for the group to fill: every beat
 * fitBeats keeps, then pace figures chosen one at a time as far as possible
 * from every place already taken, so the rest end up spread evenly ("at the
 * end they are distributed"). Sorted along the line.
 */
export function pickSlots(beats, pxOf, { count = GROUP, gap = 64 } = {}) {
  // When more fit than the group has people, the moments win over pace figures.
  const kept = fitBeats(beats, pxOf, gap).sort((a, b) => a.priority - b.priority || a.i - b.i).slice(0, count);
  const spare = beats.filter((b) => b.kind === "pace" && !kept.includes(b));
  while (kept.length < count && spare.length) {
    let best = 0;
    let bestD = -1;
    spare.forEach((b, k) => {
      const d = Math.min(...kept.map((x) => Math.abs(pxOf(x.i) - pxOf(b.i))));
      if (d > bestD) { bestD = d; best = k; }
    });
    kept.push(spare.splice(best, 1)[0]);
  }
  return kept.sort((a, b) => a.i - b.i);
}

/** Kilometre reached at `t` seconds, and whether the group is stopped there. */
export function tipAt(points, t) {
  const { p, stopped } = positionAt(points, t);
  const k = Math.max(0, Math.min(points.length - 2, Math.floor(p)));
  const f = Math.max(0, Math.min(1, p - k));
  return { km: points[k].km + (points[k + 1].km - points[k].km) * f, stopped };
}

/**
 * The ground under the line: the profile's altitude stream when the file had
 * one (240 samples, so a hill is a hill, not a kilometre's net change), else
 * the splits' summed elevation. → { line: [{ km, elev }], elevAt(km) }, elev
 * relative to the start.
 */
export function terrainOf(points, profile) {
  let line;
  if (profile && profile.by === "distance" && Array.isArray(profile.e) && profile.e.some((v) => v != null)) {
    const base = profile.e.find((v) => v != null);
    line = [{ km: 0, elev: 0 }];
    profile.x.forEach((x, k) => {
      if (profile.e[k] != null) line.push({ km: x / 1000, elev: profile.e[k] - base });
    });
    // Stretch to the splits' length so figures and line agree on where the end is.
    const end = points[points.length - 1].km;
    const last = line[line.length - 1].km || 1;
    line = line.map((q) => ({ km: (q.km / last) * end, elev: q.elev }));
  } else {
    line = points.map((p) => ({ km: p.km, elev: p.elev }));
  }
  const elevAt = (km) => {
    if (km <= line[0].km) return line[0].elev;
    for (let k = 1; k < line.length; k += 1) {
      if (km <= line[k].km) {
        const a = line[k - 1];
        const b = line[k];
        const f = (km - a.km) / ((b.km - a.km) || 1);
        return a.elev + (b.elev - a.elev) * f;
      }
    }
    return line[line.length - 1].elev;
  };
  return { line, elevAt };
}
