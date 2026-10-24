#!/usr/bin/env node
// The marathons film's music, synthesised sample by sample like the trailer's
// (no samples, nothing to license). 120 BPM in D minor (Dm–Bb–F–C), so one bar
// is two seconds and every cut in src/timeline.js lands on a beat.
//
//   node scripts/score.mjs   → public/score.wav
//
// Shape follows the film: 0–11 globe (pad, heartbeat, a pluck per city),
// 11–14 the question (snare roll, riser), 14 drop on the photo wall,
// 20–24 paper breakdown (footsteps), 24 re-drop on the page, 44–56 hook,
// 56 last hit, 56–60 ring out.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RATE, toWav } from "../../../scripts/trailer/score.mjs";
import { T, CITY_BEATS, PHOTO_BEATS, CLICKS } from "../src/timeline.js";

const BPM = 120;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const DURATION = T.end;

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const CHORDS = [[62, 65, 69], [58, 62, 65], [53, 57, 60], [60, 64, 67]];
const ROOTS = [38, 34, 41, 36];
const HOOK = [
  [74, null, 77, 76, 74, null, 72, 74],
  [74, null, 70, null, 72, 74, null, 77],
  [77, null, 81, null, 79, 77, 76, null],
  [76, null, 72, null, 74, 76, 79, null],
];

let seed = 7654321;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x3fffffff) - 1;
};
const between = (t, a, b) => t >= a && t < b;

const groove = (t) => between(t, T.drop, T.paper) || between(t, T.page, T.outro);
const breakdown = (t) => between(t, T.paper, T.page);
const hook = (t) => between(t, T.default, T.outro);

const n = Math.ceil(DURATION * RATE);
const L = new Float32Array(n);
const R = new Float32Array(n);
const add = (i, l, r = l) => { if (i >= 0 && i < n) { L[i] += l; R[i] += r; } };

const kick = (at, gain = 1) => {
  const s = Math.round(at * RATE);
  let ph = 0;
  for (let i = 0; i < 0.45 * RATE; i += 1) {
    const t = i / RATE;
    ph += (2 * Math.PI * (45 + 115 * Math.exp(-t * 28))) / RATE;
    add(s + i, Math.sin(ph) * Math.exp(-t * 7) * gain * 0.9 + (i < 60 ? noise() * 0.3 * gain : 0));
  }
};
const clap = (at, gain = 1) => {
  const s = Math.round(at * RATE);
  let lp = 0;
  for (let i = 0; i < 0.25 * RATE; i += 1) {
    const t = i / RATE;
    const burst = t < 0.03 ? (Math.floor(t / 0.01) % 2 ? 0.6 : 1) : 1;
    const x = noise();
    lp += 0.35 * (x - lp);
    const v = (x - lp) * Math.exp(-t * 18) * burst * 0.45 * gain + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30) * 0.2 * gain;
    add(s + i, v * 0.9, v * 1.1);
  }
};
const hat = (at, open = false, gain = 1) => {
  const s = Math.round(at * RATE);
  let prev = 0;
  const len = open ? 0.22 : 0.05;
  const pan = open ? 0.7 : 1.2;
  for (let i = 0; i < len * RATE; i += 1) {
    const t = i / RATE;
    const x = noise();
    const v = (x - prev) * Math.exp(-t * (open ? 14 : 70)) * 0.12 * gain;
    prev = x;
    add(s + i, v * pan, v * (2 - pan));
  }
};
// A footstep on gravel: short low thud plus filtered crunch.
const step = (at, gain = 1, pan = 1) => {
  const s = Math.round(at * RATE);
  let lp = 0;
  for (let i = 0; i < 0.12 * RATE; i += 1) {
    const t = i / RATE;
    lp += 0.25 * (noise() - lp);
    const v = (Math.sin(2 * Math.PI * 85 * t) * Math.exp(-t * 40) * 0.5 + lp * Math.exp(-t * 35) * 0.5) * gain;
    add(s + i, v * pan, v * (2 - pan));
  }
};
const impact = (at, gain = 1) => {
  const s = Math.round(at * RATE);
  let ph = 0;
  let lp = 0;
  for (let i = 0; i < 3.2 * RATE; i += 1) {
    const t = i / RATE;
    ph += (2 * Math.PI * (38 + 70 * Math.exp(-t * 6))) / RATE;
    lp += 0.08 * (noise() - lp);
    add(s + i, (Math.sin(ph) * Math.exp(-t * 1.6) + lp * Math.exp(-t * 2.5) * 1.6) * gain);
  }
};
const riser = (from, to, gain = 1) => {
  const s = Math.round(from * RATE);
  const len = (to - from) * RATE;
  let a = 0;
  let b = 0;
  let ph = 0;
  for (let i = 0; i < len; i += 1) {
    const k = i / len;
    const cut = 0.01 + 0.5 * k * k;
    a += cut * (noise() - a);
    b += cut * (a - b);
    ph += (2 * Math.PI * (200 + 1400 * k * k)) / RATE;
    const v = (b * 1.4 + Math.sin(ph) * 0.08) * k * k * gain * 0.6;
    add(s + i, v * (1 - 0.3 * Math.sin(k * 40)), v * (1 + 0.3 * Math.sin(k * 40)));
  }
};
// A bell-ish pluck, for each city pin and each photo.
const pluck = (at, m, gain = 1, pan = 1) => {
  const s = Math.round(at * RATE);
  const f = midi(m);
  for (let i = 0; i < 1.2 * RATE; i += 1) {
    const t = i / RATE;
    const v = (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.01 * t) * Math.exp(-t * 6)) * Math.exp(-t * 3.5) * 0.12 * gain;
    add(s + i, v * pan, v * (2 - pan));
  }
};
// Paper swish for wipes and slides.
const whoosh = (at, len = 0.5, gain = 1) => {
  const s = Math.round(at * RATE);
  let a = 0;
  for (let i = 0; i < len * RATE; i += 1) {
    const k = i / (len * RATE);
    a += (0.05 + 0.3 * Math.sin(Math.PI * k)) * (noise() - a);
    const v = a * Math.sin(Math.PI * k) ** 2 * 0.5 * gain;
    add(s + i, v * (0.5 + k), v * (1.5 - k));
  }
};
// UI click for the cursor.
const tick = (at) => {
  const s = Math.round(at * RATE);
  for (let i = 0; i < 0.03 * RATE; i += 1) add(s + i, noise() * Math.exp(-i / RATE * 250) * 0.25);
};

// --- drums -------------------------------------------------------------------
const beats = Math.floor(DURATION / BEAT);
for (let b = 0; b < beats; b += 1) {
  const t = b * BEAT;
  if (t < T.question && b % 2 === 0) { kick(t, 0.6); kick(t + 0.18, 0.35); } // heartbeat
  if (between(t, T.question, T.drop)) {
    kick(t, 0.8);
    const per = t < T.question + 1 ? 2 : t < T.drop - 1 ? 4 : 8;
    for (let k = 0; k < per; k += 1) clap(t + (k * BEAT) / per, 0.3 + 0.7 * ((t - T.question) / (T.drop - T.question)));
  }
  if (groove(t)) {
    kick(t, 1);
    if (b % 2 === 1) clap(t);
    hat(t, false, 0.7);
    hat(t + BEAT / 2, true, 0.8);
    hat(t + BEAT / 4, false, 0.4);
    hat(t + (3 * BEAT) / 4, false, 0.4);
  }
  if (breakdown(t)) {
    // The runner's cadence: steps on eighths, left and right.
    step(t, 0.9, 0.8);
    step(t + BEAT / 2, 0.7, 1.2);
    if (t >= T.page - 2) for (let k = 0; k < 4; k += 1) clap(t + (k * BEAT) / 4, 0.3 + 0.4 * ((t - (T.page - 2)) / 2));
  }
}
riser(T.question + 0.5, T.drop, 1);
riser(T.page - 2, T.page, 0.9);
riser(T.outro - 2, T.outro, 0.8);
[T.drop, T.page, T.stats, T.interactive, T.default, T.outro].forEach((at) => impact(at, 0.85));
[T.paper, T.page - 0.4, T.stats - 0.3, T.interactive - 0.3, T.default - 0.3].forEach((at) => whoosh(at, 0.6, 1.2));
CITY_BEATS.forEach((at, i) => pluck(at, [74, 77, 81, 79, 86][i % 5], 1.3, 0.6 + (i % 3) * 0.4));
PHOTO_BEATS.forEach((at, i) => pluck(at, CHORDS[Math.floor(at / BAR) % 4][i % 3] + 24, 0.5, i % 2 ? 0.6 : 1.4));
Object.values(CLICKS).forEach(tick);

// --- tonal parts -------------------------------------------------------------
const pump = (t) => (groove(t) ? 0.35 + 0.65 * Math.min(1, ((t % BEAT) / BEAT) * 2.2) : 1);
const delay = { L: new Float32Array(Math.round(0.375 * RATE)), R: new Float32Array(Math.round(0.375 * RATE)), i: 0 };
const padPh = new Float64Array(12);
let padLP = 0;
let padLPR = 0;
let bassPh = 0;
let bassLP = 0;
let arpPh = 0;
let arpLP = 0;
let leadPh = 0;
let leadVib = 0;

for (let i = 0; i < n; i += 1) {
  const t = i / RATE;
  const ci = Math.floor(t / BAR) % 4;
  const chord = CHORDS[ci];
  const p = pump(t);
  const tail = t > T.outro ? Math.exp(-(t - T.outro) * 0.7) : 1;
  const fadeIn = Math.min(1, t / 2.5);

  let pl = 0;
  let pr = 0;
  chord.forEach((m, k) => {
    [-0.12, 0, 0.12].forEach((det, j) => {
      const idx = k * 3 + j;
      padPh[idx] = (padPh[idx] + midi(m + det) / RATE) % 1;
      const saw = 2 * padPh[idx] - 1;
      if (j === 0) pl += saw; else if (j === 2) pr += saw; else { pl += saw * 0.5; pr += saw * 0.5; }
    });
  });
  const open = t < T.drop ? 0.015 + 0.04 * (t / T.drop) : breakdown(t) ? 0.03 : 0.06;
  padLP += open * (pl - padLP);
  padLPR += open * (pr - padLPR);
  const padGain = 0.08 * fadeIn * tail * p * (breakdown(t) ? 1.2 : 1);
  let outL = padLP * padGain;
  let outR = padLPR * padGain;

  if (groove(t) || between(t, T.question, T.drop) || breakdown(t)) {
    const e = Math.floor(t / (BEAT / 2));
    const inNote = (t % (BEAT / 2)) / (BEAT / 2);
    const m = ROOTS[ci] + (e % 2 ? 12 : 0);
    bassPh = (bassPh + midi(m) / RATE) % 1;
    bassLP += 0.05 * ((bassPh < 0.5 ? 1 : -1) - bassLP);
    const v = (bassLP * 0.5 + Math.sin(2 * Math.PI * bassPh) * 0.5) * Math.exp(-inNote * 2.5) * 0.32 * p * (groove(t) ? 1 : 0.45);
    outL += v; outR += v;
  }

  let arp = 0;
  if (groove(t) || breakdown(t)) {
    const s16 = Math.floor(t / (BEAT / 4));
    const st = [0, 1, 2, 3, 2, 1, 4, 2][s16 % 8];
    const m = chord[st % 3] + 12 * (1 + Math.floor(st / 3));
    const inNote = (t % (BEAT / 4)) / (BEAT / 4);
    arpPh = (arpPh + midi(m) / RATE) % 1;
    const raw = (arpPh < 0.3 ? 1 : -1) * 0.6 + (2 * arpPh - 1) * 0.4;
    arpLP += (breakdown(t) ? 0.06 + 0.2 * ((t - T.paper) / (T.page - T.paper)) : 0.22) * (raw - arpLP);
    arp = arpLP * Math.exp(-inNote * 5) * 0.06 * tail;
  }
  const d = delay.i;
  const echoL = delay.L[d];
  const echoR = delay.R[d];
  delay.L[d] = arp + echoR * 0.38;
  delay.R[d] = echoL * 0.38;
  delay.i = (d + 1) % delay.L.length;
  outL += arp * 0.9 + echoL * 0.6;
  outR += arp * 0.7 + echoR * 0.8;

  if (hook(t)) {
    const m = HOOK[ci][Math.floor((t % BAR) / (BEAT / 2))];
    if (m) {
      const inNote = (t % (BEAT / 2)) / (BEAT / 2);
      leadVib += (2 * Math.PI * 5.5) / RATE;
      leadPh = (leadPh + midi(m + 0.15 * Math.sin(leadVib) * Math.min(1, inNote * 3)) / RATE) % 1;
      const v = (Math.sin(2 * Math.PI * leadPh) * 0.7 + (leadPh < 0.5 ? 0.3 : -0.3)) * Math.min(1, inNote * 40) * Math.exp(-inNote * 1.2) * 0.08;
      outL += v; outR += v;
    }
  }
  L[i] += outL;
  R[i] += outR;
}

for (let i = 0; i < n; i += 1) {
  const fadeOut = Math.min(1, (DURATION - i / RATE) / 0.6);
  L[i] = Math.tanh(L[i] * 1.1) * fadeOut;
  R[i] = Math.tanh(R[i] * 1.1) * fadeOut;
}

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "score.wav");
fs.writeFileSync(out, toWav([L, R]));
console.info(`  score.wav  ${DURATION}s`);
