// /training's swarm: every activity is one dot, and each lens of the page is
// a different formation of the same dots. Pure geometry — rows (the list
// shape of fromActivityRow, any order) and a box in, positions and the few
// axis marks out — so the canvas only tweens between answers and the maths is
// tested. Nothing here reads the DOM.
//
// A formation is { x, y, r: Float32Array (one slot per row, in `order`),
// marks: [{ kind: "text"|"line"|"ring", … }] }. `order` is oldest first and
// is the index every formation shares, which is what lets a dot travel.

import { sportFamily, weekOf } from "./training";

export const LENSES = ["overview", "calendar", "rhythm", "stats", "facts", "routes", "log"];

const DAY = 86400000;
const utc = (iso) => Date.parse(`${iso}T00:00:00Z`);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Oldest first, undated rows dropped: the order every formation indexes by. */
export function swarmOrder(rows) {
  return (rows || []).filter((r) => r.date).slice().sort((a, b) => {
    const ka = a.startDate || a.date;
    const kb = b.startDate || b.date;
    if (ka === kb) return 0;
    return ka < kb ? -1 : 1;
  });
}

/** The padding the dots keep clear of, by box width. */
export const padOf = (width) => (width < 560
  ? { l: 30, r: 12, t: 22, b: 30 }
  : { l: 52, r: 24, t: 28, b: 36 });

/** A dot's own radius: the square root of its kilometres, so area reads as distance. */
export function baseRadius(row, width) {
  const scale = clamp(width / 1000, 0.6, 1.15);
  const km = (Number(row.distance) || 0) / 1000;
  return clamp(1.7 + Math.sqrt(km) * 0.62, 1.7, 6.2) * scale;
}

const hourOf = (r) => {
  const s = r.startLocal ? String(r.startLocal) : "";
  const h = Number(s.slice(11, 13));
  const m = Number(s.slice(14, 16));
  return s.length >= 16 && Number.isFinite(h) && Number.isFinite(m) ? h + m / 60 : null;
};

/** Weeks from the first activity's Monday to the last's, and each row's column. */
function weekAxis(order) {
  if (!order.length) return { first: 0, count: 0, col: [] };
  const first = utc(weekOf(order[0].date));
  const last = utc(weekOf(order[order.length - 1].date));
  const count = Math.round((last - first) / (7 * DAY)) + 1;
  return { first, count, col: order.map((r) => Math.round((utc(weekOf(r.date)) - first) / (7 * DAY))) };
}

/** Year labels (and month ticks when there is room) along a week axis. */
function timeMarks(axis, x0, colW, y, withMonths) {
  const marks = [];
  for (let c = 0; c < axis.count; c += 1) {
    const d = new Date(axis.first + c * 7 * DAY);
    const dom = d.getUTCDate();
    if (dom > 7) continue; // eslint-disable-line no-continue -- only the first week of a month is marked
    const m = d.getUTCMonth();
    const x = x0 + (c + 0.5) * colW;
    if (m === 0 || c === 0) marks.push({ kind: "text", x, y: y + 22, text: String(d.getUTCFullYear()), align: "left", strong: true });
    if (withMonths && colW * 4.3 >= 26) marks.push({ kind: "text", x, y: y + 10, text: MONTHS[m], align: "left" });
    else if (withMonths && m % 3 === 0) marks.push({ kind: "text", x, y: y + 10, text: MONTHS[m], align: "left" });
  }
  return marks;
}

const make = (n) => ({ x: new Float32Array(n), y: new Float32Array(n), r: new Float32Array(n), marks: [] });

/** Overview: each session stacked on the week it happened — the log as a skyline of weeks. */
function weeksFormation(order, w, h) {
  const p = padOf(w);
  const out = make(order.length);
  const axis = weekAxis(order);
  if (!axis.count) return out;
  const innerW = w - p.l - p.r;
  const innerH = h - p.t - p.b;
  const colW = innerW / axis.count;
  const stacks = new Array(axis.count).fill(0);
  axis.col.forEach((c) => { stacks[c] += 1; });
  const tallest = Math.max(1, ...stacks);
  const step = Math.min(colW * 2.6, innerH / tallest);
  const seen = new Array(axis.count).fill(0);
  const base = h - p.b;
  order.forEach((r, i) => {
    const c = axis.col[i];
    out.x[i] = p.l + (c + 0.5) * colW;
    out.y[i] = base - (seen[c] + 0.5) * step;
    out.r[i] = Math.max(1.2, Math.min(step, colW) * 0.43);
    seen[c] += 1;
  });
  out.marks.push({ kind: "line", x1: p.l, y1: base + 1, x2: w - p.r, y2: base + 1 });
  out.marks.push(...timeMarks(axis, p.l, colW, base, true));
  [5, 10, 15].filter((k) => k <= tallest).forEach((k) => {
    out.marks.push({ kind: "text", x: p.l - 8, y: base - k * step + 4, text: String(k), align: "right" });
  });
  out.marks.push({ kind: "text", x: p.l - 8, y: p.t + 2, text: "a week", align: "right" });
  return out;
}

/** Calendar: weeks across, weekdays down — one cell a day. */
function calendarFormation(order, w, h) {
  const p = padOf(w);
  const out = make(order.length);
  const axis = weekAxis(order);
  if (!axis.count) return out;
  const innerW = w - p.l - p.r;
  const innerH = h - p.t - p.b;
  const colW = innerW / axis.count;
  const rowH = innerH / 7;
  const cell = Math.min(colW, rowH);
  const perDay = new Map();
  order.forEach((r) => perDay.set(r.date, (perDay.get(r.date) || 0) + 1));
  const used = new Map();
  order.forEach((r, i) => {
    const dow = (new Date(utc(r.date)).getUTCDay() + 6) % 7;
    const n = perDay.get(r.date);
    const k = used.get(r.date) || 0;
    used.set(r.date, k + 1);
    const spread = n > 1 ? (k - (n - 1) / 2) * Math.min(colW * 0.5, 3) : 0;
    out.x[i] = p.l + (axis.col[i] + 0.5) * colW + spread;
    out.y[i] = p.t + (dow + 0.5) * rowH;
    out.r[i] = clamp(baseRadius(r, w), 1.3, Math.max(1.6, cell * 0.62));
  });
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((d, k) => {
    out.marks.push({ kind: "text", x: p.l - 8, y: p.t + (k + 0.5) * rowH + 4, text: w < 560 ? d[0] : d, align: "right" });
  });
  out.marks.push(...timeMarks(axis, p.l, colW, h - p.b, true));
  return out;
}

/** Rhythm: a 24-hour dial, midnight at the top, the oldest sessions at the centre. */
function rhythmFormation(order, w, h) {
  const p = padOf(w);
  const out = make(order.length);
  if (!order.length) return out;
  const cx = w / 2;
  const cy = p.t + (h - p.t - p.b) / 2 + 4;
  const R = Math.min(w - p.l - p.r, h - p.t - p.b) / 2 - 12;
  const t0 = utc(order[0].date);
  const span = Math.max(1, utc(order[order.length - 1].date) - t0);
  order.forEach((r, i) => {
    const hr = hourOf(r);
    const age = (utc(r.date) - t0) / span;
    const rad = R * (0.2 + 0.8 * age);
    const a = ((hr == null ? 0 : hr) / 24) * Math.PI * 2 - Math.PI / 2;
    out.x[i] = cx + Math.cos(a) * (hr == null ? 0 : rad);
    out.y[i] = cy + Math.sin(a) * (hr == null ? 0 : rad);
    out.r[i] = clamp(baseRadius(r, w) * 0.85, 1.3, 5);
  });
  [0.2, 0.6, 1].forEach((k) => out.marks.push({ kind: "ring", cx, cy, r: R * k }));
  [[0, "Midnight"], [6, "6 am"], [12, "Noon"], [18, "6 pm"]].forEach(([hr, text]) => {
    const a = (hr / 24) * Math.PI * 2 - Math.PI / 2;
    const rr = R + 12;
    out.marks.push({
      kind: "text",
      x: cx + Math.cos(a) * rr,
      y: cy + Math.sin(a) * rr + (hr === 0 ? -2 : hr === 12 ? 10 : 4), // eslint-disable-line no-nested-ternary
      text,
      align: hr === 6 ? "left" : hr === 18 ? "right" : "center", // eslint-disable-line no-nested-ternary
      strong: true,
    });
    out.marks.push({
      kind: "line", x1: cx + Math.cos(a) * R * 0.2, y1: cy + Math.sin(a) * R * 0.2, x2: cx + Math.cos(a) * R, y2: cy + Math.sin(a) * R,
    });
  });
  for (let hr = 0; hr < 24; hr += 1) {
    if (hr % 6 === 0) continue; // eslint-disable-line no-continue
    const a = (hr / 24) * Math.PI * 2 - Math.PI / 2;
    out.marks.push({
      kind: "line", x1: cx + Math.cos(a) * (R + 2), y1: cy + Math.sin(a) * (R + 2), x2: cx + Math.cos(a) * (R + 6), y2: cy + Math.sin(a) * (R + 6),
    });
  }
  return out;
}

/** Rows that cannot sit on a chart's axes, parked as a neat strip along the foot. */
/* eslint-disable no-param-reassign -- `out` is the formation being filled */
function strip(out, idx, w, h, label, gap = 22) {
  if (!idx.length) return 0;
  const p = padOf(w);
  const innerW = w - p.l - p.r;
  const cell = clamp(innerW / Math.ceil(idx.length / 2), 3.4, 9);
  const perRow = Math.max(1, Math.floor(innerW / cell));
  const rowsN = Math.ceil(idx.length / perRow);
  const top = h - p.b - rowsN * cell;
  idx.forEach((i, k) => {
    out.x[i] = p.l + ((k % perRow) + 0.5) * cell;
    out.y[i] = top + (Math.floor(k / perRow) + 0.5) * cell;
    out.r[i] = cell * 0.36;
  });
  out.marks.push({ kind: "text", x: p.l, y: top - 7, text: label, align: "left" });
  return rowsN * cell + gap;
}
/* eslint-enable no-param-reassign */

const quantile = (sorted, q) => sorted[clamp(Math.floor(sorted.length * q), 0, sorted.length - 1)];
const paceLabel = (secs) => `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, "0")}`;

/** Records: distance across, pace up. Sessions with no distance wait along the foot. */
function paceFormation(order, w, h) {
  const p = padOf(w);
  const out = make(order.length);
  const on = [];
  const off = [];
  order.forEach((r, i) => {
    const fam = sportFamily(r.sport);
    const ok = (fam === "run" || fam === "walk" || fam === "hike") && Number(r.distance) > 500 && Number(r.averageSpeed) > 0.4;
    (ok ? on : off).push(i);
  });
  const foot = strip(out, off, w, h, `${off.length} with no distance: strength, yoga, workouts`);
  if (!on.length) return out;
  const top = p.t + 6;
  const bottom = h - p.b - foot;
  const maxKm = Math.max(...on.map((i) => order[i].distance / 1000));
  const xOf = (km) => p.l + Math.sqrt(km / maxKm) * (w - p.l - p.r - 8);
  const paces = on.map((i) => 1000 / order[i].averageSpeed).sort((a, b) => a - b);
  const fast = quantile(paces, 0.01);
  const slow = quantile(paces, 0.97);
  const yOf = (secs) => top + ((clamp(secs, fast, slow) - fast) / Math.max(1, slow - fast)) * (bottom - top - 6);
  on.forEach((i) => {
    const r = order[i];
    out.x[i] = xOf(r.distance / 1000);
    out.y[i] = yOf(1000 / r.averageSpeed);
    out.r[i] = clamp(baseRadius(r, w) * 0.8, 1.4, 5);
  });
  [5, 10, 21.1, 42.2, 50].filter((k) => k <= maxKm * 1.02).forEach((k) => {
    out.marks.push({ kind: "line", x1: xOf(k), y1: top, x2: xOf(k), y2: bottom, faint: true });
    out.marks.push({ kind: "text", x: xOf(k), y: top - 8, text: `${k} km`, align: "center", strong: true });
  });
  const stepSecs = slow - fast > 600 ? 180 : 120;
  for (let s = Math.ceil(fast / stepSecs) * stepSecs; s <= slow; s += stepSecs) {
    out.marks.push({ kind: "text", x: p.l - 8, y: yOf(s) + 4, text: paceLabel(s), align: "right" });
  }
  out.marks.push({ kind: "text", x: p.l - 8, y: top - 8, text: "/km", align: "right" });
  return out;
}

/** Engine: average heart rate across, time out up. No heart-rate trace → the foot. */
function heartFormation(order, w, h) {
  const p = padOf(w);
  const out = make(order.length);
  const on = [];
  const off = [];
  order.forEach((r, i) => ((Number(r.averageHeartrate) > 40 && Number(r.movingTime) > 0 ? on : off).push(i)));
  const foot = strip(out, off, w, h, `${off.length} without a heart-rate trace`, 46);
  if (!on.length) return out;
  const top = p.t + 6;
  const bottom = h - p.b - foot;
  const hrs = on.map((i) => order[i].averageHeartrate).sort((a, b) => a - b);
  const lo = Math.floor(quantile(hrs, 0.005) / 10) * 10;
  const hi = Math.ceil(hrs[hrs.length - 1] / 10) * 10;
  const maxT = Math.max(...on.map((i) => order[i].movingTime));
  const xOf = (bpm) => p.l + ((clamp(bpm, lo, hi) - lo) / Math.max(1, hi - lo)) * (w - p.l - p.r - 8);
  const yOf = (secs) => bottom - 4 - Math.sqrt(secs / maxT) * (bottom - top - 8);
  on.forEach((i) => {
    const r = order[i];
    out.x[i] = xOf(r.averageHeartrate);
    out.y[i] = yOf(r.movingTime);
    out.r[i] = clamp(baseRadius(r, w) * 0.8, 1.4, 5);
  });
  for (let b = lo; b <= hi; b += 20) {
    out.marks.push({ kind: "text", x: xOf(b), y: bottom + 14, text: b === lo ? `${b} bpm` : String(b), align: "center", strong: true });
  }
  [1, 2, 4, 6].filter((k) => k * 3600 <= maxT).forEach((k) => {
    out.marks.push({ kind: "line", x1: p.l, y1: yOf(k * 3600), x2: w - p.r, y2: yOf(k * 3600), faint: true });
    out.marks.push({ kind: "text", x: p.l - 8, y: yOf(k * 3600) + 4, text: `${k} h`, align: "right" });
  });
  return out;
}

/** Routes: time across, metres climbed up — the log as a mountain range. */
function climbFormation(order, w, h) {
  const p = padOf(w);
  const out = make(order.length);
  if (!order.length) return out;
  const t0 = utc(order[0].date);
  const span = Math.max(DAY, utc(order[order.length - 1].date) - t0);
  const top = p.t + 6;
  const base = h - p.b;
  const maxGain = Math.max(1, ...order.map((r) => Number(r.elevationGain) || 0));
  const yOf = (m) => base - 4 - Math.sqrt(m / maxGain) * (base - top - 8);
  order.forEach((r, i) => {
    out.x[i] = p.l + ((utc(r.date) - t0) / span) * (w - p.l - p.r - 8);
    out.y[i] = yOf(Number(r.elevationGain) || 0);
    out.r[i] = clamp(baseRadius(r, w) * 0.8, 1.3, 5);
  });
  [100, 500, 1000, 2000, 3000].filter((m) => m <= maxGain).forEach((m) => {
    out.marks.push({ kind: "line", x1: p.l, y1: yOf(m), x2: w - p.r, y2: yOf(m), faint: true });
    out.marks.push({ kind: "text", x: p.l - 8, y: yOf(m) + 4, text: `${m.toLocaleString("en-IN")} m`, align: "right" });
  });
  const axis = weekAxis(order);
  out.marks.push({ kind: "line", x1: p.l, y1: base + 1, x2: w - p.r, y2: base + 1 });
  out.marks.push(...timeMarks(axis, p.l, (w - p.l - p.r - 8) / axis.count, base, false));
  return out;
}

/** Log: the whole ledger in reading order, newest first. */
function ledgerFormation(order, w, h) {
  const p = padOf(w);
  const out = make(order.length);
  const n = order.length;
  if (!n) return out;
  const innerW = w - p.l - p.r;
  const innerH = h - p.t - p.b;
  let cell = Math.sqrt((innerW * innerH) / n);
  let cols = Math.max(1, Math.floor(innerW / cell));
  while (Math.ceil(n / cols) * cell > innerH && cell > 2) {
    cell -= 0.25;
    cols = Math.max(1, Math.floor(innerW / cell));
  }
  const offX = p.l + (innerW - cols * cell) / 2;
  order.forEach((r, i) => {
    const k = n - 1 - i; // newest first
    out.x[i] = offX + ((k % cols) + 0.5) * cell;
    out.y[i] = p.t + (Math.floor(k / cols) + 0.5) * cell;
    out.r[i] = cell * 0.34;
  });
  out.marks.push({ kind: "text", x: offX, y: p.t - 8, text: "Newest", align: "left", strong: true });
  out.marks.push({ kind: "text", x: offX + cols * cell, y: p.t + Math.ceil(n / cols) * cell + 14, text: "Oldest", align: "right", strong: true });
  return out;
}

const FORMATIONS = {
  overview: weeksFormation,
  calendar: calendarFormation,
  rhythm: rhythmFormation,
  stats: paceFormation,
  facts: heartFormation,
  routes: climbFormation,
  log: ledgerFormation,
};

/** The formation of `order` (from swarmOrder) for one lens, in a width × height box. */
export function formationOf(lens, order, width, height) {
  return (FORMATIONS[lens] || FORMATIONS.overview)(order, width, height);
}
