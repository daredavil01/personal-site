// /training's Facts: every variable the import keeps, how many activities
// carry it, and the facts that fall out of them. Pure — rows (the list shape
// of fromActivityRow in src/lib/api/training.js, `extra` included) in, plain
// objects out — so the classic tab, the atlas chapter and the tests agree.
// A fact with nothing behind it is left out, never shown as zero.

import {
  sportFamily, startHours, streaks, totals,
} from "./training";
import { formatDuration, formatPace } from "./strava";

const EVEREST = 8849;
const DAY = 86400000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ex = (r, k) => (r.extra && r.extra[k] != null && r.extra[k] !== "" ? r.extra[k] : null);
const st = (r) => (r.extra && r.extra._stats) || null; // eslint-disable-line no-underscore-dangle
const pos = (v) => (Number(v) > 0 ? Number(v) : null);
const has = (v) => v != null && v !== "" && !(typeof v === "number" && Number.isNaN(v));
const streamOf = (key) => (r) => (st(r)?.streams || []).includes(key) || null;

/**
 * The inventory: what the watch (or Strava) recorded and the import kept,
 * by where it comes from. `get(row)` is null when that activity lacks it.
 */
export const VARIABLES = [
  // The session summary
  ["sport", "Sport", "", "session", (r) => r.sport],
  ["start", "Start time", "local", "session", (r) => r.startLocal],
  ["distance", "Distance", "m", "session", (r) => pos(r.distance)],
  ["moving", "Moving time", "s", "session", (r) => pos(r.movingTime)],
  ["elapsed", "Elapsed time", "s", "session", (r) => pos(r.elapsedTime)],
  ["climb", "Elevation gain", "m", "session", (r) => pos(r.elevationGain)],
  ["descent", "Elevation loss", "m", "session", (r) => ex(r, "Elevation Loss")],
  ["avgSpeed", "Average speed", "m/s", "session", (r) => pos(r.averageSpeed)],
  ["maxSpeed", "Max speed", "m/s", "session", (r) => pos(r.maxSpeed)],
  ["hrAvg", "Average heart rate", "bpm", "session", (r) => pos(r.averageHeartrate)],
  ["hrMax", "Max heart rate", "bpm", "session", (r) => pos(r.maxHeartrate)],
  ["hrMin", "Min heart rate", "bpm", "session", (r) => ex(r, "Min Heart Rate")],
  ["cadence", "Average cadence", "per min", "session", (r) => pos(r.averageCadence)],
  ["cadenceMax", "Max cadence", "per min", "session", (r) => ex(r, "Max Cadence")],
  ["power", "Average power", "W", "session", (r) => pos(r.averageWatts)],
  ["calories", "Calories", "kcal", "session", (r) => pos(r.calories)],
  ["temp", "Average temperature", "°C", "session", (r) => ex(r, "Average Temperature")],
  ["cycles", "Total cycles (strides)", "", "session", (r) => ex(r, "Total Cycles")],
  ["stride", "Average step length", "mm", "session", (r) => ex(r, "Average Step Length (mm)")],
  ["contact", "Ground contact time", "ms", "session", (r) => ex(r, "Average Ground Contact Time (ms)")],
  ["bounce", "Vertical oscillation", "mm", "session", (r) => ex(r, "Average Vertical Oscillation (mm)")],
  ["ratio", "Vertical ratio", "%", "session", (r) => ex(r, "Average Vertical Ratio")],
  ["effort", "Effort pace (hill-adjusted)", "/km", "session", (r) => ex(r, "Effort Pace")],
  ["device", "Device", "", "session", (r) => r.deviceName],
  // Strength
  ["sets", "Sets", "", "set", (r) => ex(r, "Sets")],
  ["reps", "Repetitions", "", "set", (r) => ex(r, "Repetitions")],
  // Every second
  ["sHr", "Heart rate", "bpm", "record", streamOf("hr")],
  ["sSpeed", "Speed", "m/s", "record", streamOf("speed")],
  ["sCad", "Cadence", "per min", "record", streamOf("cad")],
  ["sEle", "Altitude", "m", "record", streamOf("ele")],
  ["sPos", "Position (kept private)", "lat/lng", "record", streamOf("lat")],
  ["sPow", "Power", "W", "record", streamOf("watts")],
  ["sStep", "Step length", "mm", "record", streamOf("step")],
  ["sGct", "Ground contact", "ms", "record", streamOf("gct")],
  ["sVosc", "Vertical oscillation", "mm", "record", streamOf("vosc")],
  // Worked out at import from the streams
  ["zones", "Time in heart-rate zones", "s", "derived", (r) => (st(r)?.hrBins ? true : null)],
  ["drift", "Aerobic decoupling (long runs)", "%", "derived", (r) => st(r)?.drift ?? null],
  ["split", "Half split", "s/km", "derived", (r) => st(r)?.negSplit ?? null],
  ["tPeak", "Hottest lap", "°C", "derived", (r) => st(r)?.tMax ?? null],
  ["pPeak", "Peak power", "W", "derived", (r) => st(r)?.pMax ?? null],
  // Kept, but not a fact: one GPS jump makes a 49 km/h "run".
  ["vPeak", "Top speed (GPS, spiky)", "m/s", "derived", (r) => st(r)?.vMax ?? null],
  ["alt", "Highest point", "m", "derived", (r) => st(r)?.altMax ?? pos(r.elevHigh)],
  ["steps", "Steps", "", "derived", (r) => st(r)?.steps ?? null],
  ["route", "Route, splits, laps, best efforts", "", "derived", (r) => ((st(r)?.streams || []).includes("lat") && pos(r.distance) ? true : null)],
].map(([key, label, unit, source, get]) => ({
  key, label, unit, source, get,
}));

export const SOURCES = {
  session: "Session summary",
  set: "Strength sets",
  record: "Every second",
  derived: "Worked out at import",
};

/** [{ ...variable, count }] for the rows, in VARIABLES order; count ≥ 1 only. */
export function inventory(rows) {
  return VARIABLES.map((v) => ({ ...v, count: (rows || []).filter((r) => has(v.get(r))).length }))
    .filter((v) => v.count > 0);
}

const avgOf = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const medianOf = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const maxRow = (rows, fn) => rows.reduce((best, r) => {
  const v = fn(r);
  return v != null && v > 0 && (!best || v > fn(best)) ? r : best;
}, null);
const minRow = (rows, fn) => rows.reduce((best, r) => {
  const v = fn(r);
  return v != null && (!best || v < fn(best)) ? r : best;
}, null);
const fmtInt = (n) => Math.round(n).toLocaleString("en-GB");
const km = (m) => `${(m / 1000).toLocaleString("en-GB", { maximumFractionDigits: m >= 100000 ? 0 : 1 })} km`;
const hourLabel = (h) => (h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h} am` : `${h - 12} pm`); // eslint-disable-line no-nested-ternary
const longDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const paceToSec = (s) => {
  const m = /^(\d+):(\d{2})/.exec(String(s || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const fact = (label, value, extra = {}) => (value == null ? null : { label, value, ...extra });
const link = (r) => (r ? { to: `/training/${r.id}`, when: r.date } : {});

/** Zones Z1–Z5 as shares of time, against `max` (the observed max heart rate). */
export function zonesOf(rows, max) {
  if (!max) return null;
  const secs = [0, 0, 0, 0, 0];
  (rows || []).forEach((r) => {
    Object.entries(st(r)?.hrBins || {}).forEach(([bin, s]) => {
      const pct = (Number(bin) + 5) / max;
      if (pct < 0.5) return;
      const z = Math.min(4, Math.max(0, Math.floor((pct - 0.5) * 10)));
      secs[z] += s;
    });
  });
  const total = secs.reduce((a, b) => a + b, 0);
  if (!total) return null;
  return secs.map((s, i) => ({ zone: i + 1, seconds: s, share: s / total, from: Math.round(max * (0.5 + i / 10)) }));
}

/** The longest run of consecutive active days, with the day it ended. */
function longestStreak(dates) {
  let best = { length: 0, end: null };
  let run = 0;
  let prev = null;
  dates.forEach((d) => {
    const t = Date.parse(`${d}T00:00:00Z`);
    run = prev != null && t - prev === DAY ? run + 1 : 1;
    if (run > best.length) best = { length: run, end: d };
    prev = t;
  });
  return best;
}

/**
 * rows → [{ id, title, facts: [{ label, value, detail?, to?, when?, n? }], viz? }].
 * `n` is the plain number behind `value` when it can count up.
 */
export function factsOf(rows, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const list = (rows || []).filter((r) => r.date);
  if (!list.length) return [];
  const t = totals(list);
  const groups = [];
  const allDays = [...new Set(list.map((r) => r.date))].sort();
  // A few stray activities long before the log proper (an old upload) would
  // make "share of days" and "longest break" about the gap, not the habit:
  // after a break of more than 90 days, the log is counted from its far side.
  let from = 0;
  for (let i = 1; i < allDays.length; i += 1) {
    if ((Date.parse(`${allDays[i]}T00:00:00Z`) - Date.parse(`${allDays[i - 1]}T00:00:00Z`)) / DAY > 90) from = i;
  }
  const days = allDays.slice(from);
  const earlier = list.filter((r) => r.date < days[0]).length;
  const spanDays = Math.round((Date.parse(`${days[days.length - 1]}T00:00:00Z`) - Date.parse(`${days[0]}T00:00:00Z`)) / DAY) + 1;

  // Volume
  const paused = list.reduce((s, r) => s + Math.max(0, (r.elapsedTime || 0) - (r.movingTime || 0)), 0);
  const kcal = list.reduce((s, r) => s + (Number(r.calories) || 0), 0);
  const steps = list.reduce((s, r) => s + (st(r)?.steps || 0), 0);
  groups.push({
    id: "volume",
    title: "How much",
    facts: [
      fact("Distance", t.distance ? km(t.distance) : null, { n: t.distance / 1000, unit: "km" }),
      fact("Moving", t.movingTime ? `${fmtInt(t.movingTime / 3600)} h` : null, { n: t.movingTime / 3600, unit: "h", detail: paused > 600 ? `plus ${fmtInt(paused / 3600)} h paused` : null }),
      fact("Steps", steps ? fmtInt(steps) : null, { n: steps, detail: steps ? `about ${fmtInt(steps / days.length)} a day out` : null }),
      fact("Climbed", t.elevationGain ? `${fmtInt(t.elevationGain)} m` : null, { n: t.elevationGain, unit: "m", detail: t.elevationGain >= EVEREST * 0.1 ? `${(t.elevationGain / EVEREST).toFixed(2)}× Everest` : null }),
      fact("Energy", kcal ? `${fmtInt(kcal)} kcal` : null, { n: kcal, unit: "kcal", detail: kcal ? `${fmtInt(kcal / 2000)} days of eating at 2,000 kcal` : null }),
      fact("Active days", `${days.length}`, { n: days.length, detail: `${Math.round((days.length / spanDays) * 100)}% of the ${spanDays} days since ${longDate(days[0])}${earlier ? ` (plus ${earlier} earlier)` : ""}` }),
    ].filter(Boolean),
  });

  // Habits
  const hours = startHours(list);
  const peakHour = hours.indexOf(Math.max(...hours));
  const early = hours.slice(4, 8).reduce((a, b) => a + b, 0);
  const hourTotal = hours.reduce((a, b) => a + b, 0);
  const weekdayKm = [0, 0, 0, 0, 0, 0, 0];
  list.forEach((r) => { weekdayKm[new Date(`${r.date}T00:00:00Z`).getUTCDay()] += (Number(r.distance) || 0) / 1000; });
  const favDay = weekdayKm.indexOf(Math.max(...weekdayKm));
  const months = {};
  list.forEach((r) => { const m = r.date.slice(0, 7); months[m] = (months[m] || 0) + (Number(r.distance) || 0); });
  const bigMonth = Object.entries(months).sort((a, b) => b[1] - a[1])[0];
  const streak = longestStreak(days);
  const perDay = {};
  list.forEach((r) => { perDay[r.date] = (perDay[r.date] || 0) + 1; });
  const doubles = Object.values(perDay).filter((n) => n > 1).length;
  let gap = { days: 0, after: null };
  for (let i = 1; i < days.length; i += 1) {
    const g = (Date.parse(`${days[i]}T00:00:00Z`) - Date.parse(`${days[i - 1]}T00:00:00Z`)) / DAY - 1;
    if (g > gap.days) gap = { days: g, after: days[i - 1] };
  }
  const { current } = streaks(list, today);
  groups.push({
    id: "habits",
    title: "When",
    viz: { hours, weekdayKm },
    facts: [
      fact("Favourite hour", hourTotal ? hourLabel(peakHour) : null, { detail: hourTotal ? `${hours[peakHour]} starts; ${Math.round((early / hourTotal) * 100)}% begin between 4 and 8 am` : null }),
      fact("Favourite day", t.distance ? WEEKDAYS[favDay] : null, { detail: t.distance ? `${km(weekdayKm[favDay] * 1000)} of ${km(t.distance)} — ${Math.round(((weekdayKm[favDay] * 1000) / t.distance) * 100)}%` : null }),
      fact("Biggest month", bigMonth && bigMonth[1] ? new Date(`${bigMonth[0]}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) : null, { detail: bigMonth ? km(bigMonth[1]) : null }),
      fact("Longest streak", streak.length > 1 ? `${streak.length} days` : null, { n: streak.length, unit: "days", detail: streak.end ? `ended ${longDate(streak.end)}${current > 1 ? ` · current ${current}` : ""}` : null }),
      fact("Doubles", doubles ? `${doubles} day${doubles === 1 ? "" : "s"}` : null, { n: doubles, detail: doubles ? `with two or more activities (most: ${Math.max(...Object.values(perDay))})` : null }),
      fact("Longest break", gap.days >= 2 ? `${gap.days} days` : null, { detail: gap.after ? `after ${longDate(gap.after)}` : null }),
    ].filter(Boolean),
  });

  // Bests
  const runs = list.filter((r) => sportFamily(r.sport) === "run" && (r.distance || 0) > 1000);
  const longest = maxRow(list, (r) => r.distance || 0);
  // Distance only: a gym session with the watch left running is not an outing.
  const longestTime = maxRow(list.filter((r) => (r.distance || 0) > 0), (r) => r.movingTime || 0);
  const climb = maxRow(list, (r) => r.elevationGain || 0);
  const fastest = maxRow(runs.filter((r) => r.distance >= 5000), (r) => r.averageSpeed || 0);
  const high = maxRow(list, (r) => st(r)?.altMax ?? r.elevHigh ?? 0);
  const hrPeak = maxRow(list, (r) => r.maxHeartrate || 0);
  groups.push({
    id: "bests",
    title: "Bests",
    facts: [
      fact("Longest", longest ? km(longest.distance) : null, { detail: longest?.name, ...link(longest) }),
      fact("Longest time out", longestTime ? formatDuration(longestTime.movingTime) : null, { detail: longestTime?.name, ...link(longestTime) }),
      fact("Biggest climb", climb ? `${fmtInt(climb.elevationGain)} m` : null, { detail: climb?.name, ...link(climb) }),
      fact("Fastest run (5 km+)", fastest ? formatPace(fastest.averageSpeed) : null, { detail: fastest ? `${km(fastest.distance)}, ${fastest.name}` : null, ...link(fastest) }),
      fact("Highest point", high ? `${fmtInt(st(high)?.altMax ?? high.elevHigh)} m` : null, { detail: high?.name, ...link(high) }),
      fact("Highest heart rate", hrPeak ? `${Math.round(hrPeak.maxHeartrate)} bpm` : null, { detail: hrPeak ? `the watch's single highest reading, ${hrPeak.name}` : null, ...link(hrPeak) }),
    ].filter(Boolean),
  });

  // Heart
  const maxes = list.map((r) => Number(r.maxHeartrate) || 0).filter(Boolean).sort((a, b) => a - b);
  // The 98th percentile, so one strap spike does not set every zone.
  const hrMax = maxes.length ? maxes[Math.min(maxes.length - 1, Math.floor(maxes.length * 0.98))] : null;
  const zones = zonesOf(list, hrMax);
  const lowest = minRow(list.filter((r) => ex(r, "Min Heart Rate") > 30), (r) => ex(r, "Min Heart Rate"));
  const drifts = list.map((r) => st(r)?.drift).filter((v) => v != null);
  const easy = zones ? zones[0].share + zones[1].share : null;
  groups.push({
    id: "heart",
    title: "Heart",
    viz: zones ? { zones, hrMax } : null,
    facts: [
      fact("Easy zones", easy != null ? `${Math.round(easy * 100)}%` : null, { detail: zones ? `of ${fmtInt(zones.reduce((a, z) => a + z.seconds, 0) / 3600)} h with heart rate in Z1–Z2 (under ${zones[2].from} bpm)` : null }),
      fact("Hard zones", zones ? `${Math.round((zones[3].share + zones[4].share) * 100)}%` : null, { detail: zones ? `in Z4–Z5 (${zones[3].from} bpm and up), against a max of ${hrMax}` : null }),
      fact("Lowest recorded", lowest ? `${ex(lowest, "Min Heart Rate")} bpm` : null, { detail: lowest?.name, ...link(lowest) }),
      fact("Heart drift on long runs", drifts.length ? `${medianOf(drifts) > 0 ? "+" : ""}${medianOf(drifts).toFixed(1)}%` : null, { detail: drifts.length ? `median over ${drifts.length} runs of 8 km+; under 5% means the pace was aerobic` : null }),
    ].filter(Boolean),
  });

  // Running form
  const formRuns = runs.filter((r) => r.averageCadence);
  const exAvg = (key, rowsIn = runs) => avgOf(rowsIn.map((r) => Number(ex(r, key))).filter((v) => v > 0));
  const byTime = [...runs].sort((a, b) => (a.date < b.date ? -1 : 1));
  const halfway = Math.floor(byTime.length / 2);
  const pace = (arr) => {
    const tt = totals(arr);
    return tt.movingTime ? tt.distance / tt.movingTime : null;
  };
  const p1 = byTime.length >= 6 ? pace(byTime.slice(0, halfway)) : null;
  const p2 = byTime.length >= 6 ? pace(byTime.slice(halfway)) : null;
  const effortGap = avgOf(runs.map((r) => {
    const e = paceToSec(ex(r, "Effort Pace"));
    return e && r.averageSpeed ? 1000 / r.averageSpeed - e : null;
  }).filter((v) => v != null));
  const stride = exAvg("Average Step Length (mm)");
  const contact = exAvg("Average Ground Contact Time (ms)");
  const bounce = exAvg("Average Vertical Oscillation (mm)");
  const ratio = exAvg("Average Vertical Ratio");
  const power = avgOf(runs.map((r) => Number(r.averageWatts)).filter((v) => v > 0));
  groups.push({
    id: "form",
    title: "Running form",
    facts: [
      fact("Cadence", formRuns.length ? `${Math.round(avgOf(formRuns.map((r) => r.averageCadence)) * 2)} spm` : null, { detail: "steps a minute, both feet" }),
      fact("Stride", stride ? `${(stride / 1000).toFixed(2)} m` : null),
      fact("Ground contact", contact ? `${Math.round(contact)} ms` : null, { detail: "time each foot is down" }),
      fact("Bounce", bounce ? `${(bounce / 10).toFixed(1)} cm` : null, { detail: ratio ? `vertical ratio ${ratio.toFixed(1)}% — lower is more efficient` : null }),
      fact("Power", power ? `${Math.round(power)} W` : null, { detail: "average while running" }),
      fact("Getting quicker", p1 && p2 ? `${formatPace(p1).replace(" /km", "")} → ${formatPace(p2)}` : null, { detail: p1 && p2 ? `first ${halfway} runs against the last ${byTime.length - halfway}` : null }),
      fact("Hills, accounted for", effortGap != null ? `${effortGap >= 0 ? "−" : "+"}${Math.abs(Math.round(effortGap))} s/km` : null, { detail: effortGap != null ? "Effort Pace (adjusted for climbing) against the actual pace" : null }),
    ].filter(Boolean),
  });

  // Conditions
  const temps = list.map((r) => Number(ex(r, "Average Temperature"))).filter((v) => Number.isFinite(v) && v !== 0);
  const hot = maxRow(list, (r) => st(r)?.tMax ?? null);
  const cold = minRow(list.filter((r) => st(r)?.tMin != null), (r) => st(r).tMin);
  groups.push({
    id: "conditions",
    title: "Conditions",
    facts: [
      fact("Average temperature", temps.length ? `${avgOf(temps).toFixed(1)} °C` : null, { detail: "read at the wrist, so a few degrees above the air" }),
      fact("Hottest", hot ? `${st(hot).tMax} °C` : null, { detail: hot?.name, ...link(hot) }),
      fact("Coolest", cold ? `${st(cold).tMin} °C` : null, { detail: cold?.name, ...link(cold) }),
    ].filter(Boolean),
  });

  // Strength
  const gym = list.filter((r) => r.sport === "WeightTraining");
  const reps = gym.map((r) => Number(ex(r, "Repetitions"))).filter((v) => v > 0);
  groups.push({
    id: "strength",
    title: "Strength",
    facts: [
      fact("Sessions", gym.length ? `${gym.length}` : null, { n: gym.length, detail: gym.length ? `${fmtInt(totals(gym).movingTime / 3600)} h under the bar` : null }),
      fact("Repetitions", reps.length ? fmtInt(reps.reduce((a, b) => a + b, 0)) : null, { n: reps.reduce((a, b) => a + b, 0), detail: reps.length ? `${fmtInt(avgOf(reps))} a session, over ${reps.length} logged` : null }),
    ].filter(Boolean),
  });

  return groups.filter((g) => g.facts.length);
}
