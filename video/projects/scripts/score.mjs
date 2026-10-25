#!/usr/bin/env node
// The projects film's music and sound, synthesised sample by sample like the
// trailer's and the marathons film's (no samples, nothing to license).
// 120 BPM in A minor (Am–F–C–G): a beat is 0.5 s, so every cut in
// src/timeline.js lands on one. No narration — the sound carries the cuts.
//
//   node scripts/score.mjs   → public/score.wav
//
// 0–1.5 boot (drone, keystrokes), 1.5–4.3 a pluck per cover, riser into the
// caption hit at 5, heartbeat to 8, drop on the numbers, groove through the
// spotlights with a whoosh and hit on every cut, the hook from RunFolio on,
// keystrokes and a chime on /ask, a last hit on the outro and ring-out.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RATE, toWav } from "../../../scripts/trailer/score.mjs";
import { T, POP_STEP } from "../src/timeline.js";
import footage from "../src/footage.json" with { type: "json" };

const BEAT = 0.5;
const BAR = BEAT * 4;
const DURATION = T.end;
const COVERS = footage.projects.filter((p) => p.cover).length;

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const CHORDS = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]];
const ROOTS = [33, 29, 36, 31];
const HOOK = [
  [76, null, 79, 76, 74, null, 72, 74],
  [72, null, 69, null, 72, 74, null, 77],
  [79, null, 76, null, 74, 72, 74, null],
  [74, null, 71, null, 74, 76, 79, null],
];
const CUTS = [T.dividend, T.feed, T.escape, T.runfolio, T.site, T.ngo, T.variety, T.ask];

let seed = 1234567;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x3fffffff) - 1;
};
const between = (t, a, b) => t >= a && t < b;
const groove = (t) => between(t, T.stats, T.ask);
const hook = (t) => between(t, T.runfolio, T.ask);
const quiet = (t) => between(t, T.ask, T.outro);

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
const pluck = (at, m, gain = 1, pan = 1) => {
  const s = Math.round(at * RATE);
  const f = midi(m);
  for (let i = 0; i < 1.2 * RATE; i += 1) {
    const t = i / RATE;
    const v = (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.01 * t) * Math.exp(-t * 6)) * Math.exp(-t * 3.5) * 0.12 * gain;
    add(s + i, v * pan, v * (2 - pan));
  }
};
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
// A keystroke: a click with a little body.
const key = (at, gain = 1) => {
  const s = Math.round(at * RATE);
  for (let i = 0; i < 0.04 * RATE; i += 1) {
    const t = i / RATE;
    add(s + i, (noise() * Math.exp(-t * 220) * 0.22 + Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 300) * 0.05) * gain);
  }
};
// Digital glitch: bit-crushed noise burst for the RGB-split cuts.
const glitch = (at, len = 0.18, gain = 1) => {
  const s = Math.round(at * RATE);
  let hold = 0;
  for (let i = 0; i < len * RATE; i += 1) {
    if (i % 90 === 0) hold = noise();
    const k = i / (len * RATE);
    add(s + i, hold * (1 - k) * 0.12 * gain, -hold * (1 - k) * 0.12 * gain);
  }
};

// --- drums -------------------------------------------------------------------
for (let b = 0; b < DURATION / BEAT; b += 1) {
  const t = b * BEAT;
  if (between(t, T.caption, T.stats) && b % 2 === 0) { kick(t, 0.6); kick(t + 0.18, 0.35); }
  if (groove(t)) {
    kick(t, 1);
    if (b % 2 === 1) clap(t);
    hat(t, false, 0.7);
    hat(t + BEAT / 2, true, 0.8);
    hat(t + BEAT / 4, false, 0.4);
    hat(t + (3 * BEAT) / 4, false, 0.4);
  }
  if (quiet(t)) { hat(t, false, 0.5); if (b % 2 === 0) kick(t, 0.5); }
  if (between(t, T.outro, T.outro + 2) && b % 2 === 0) kick(t, 0.7);
}
riser(T.collage + 2, T.caption, 0.9);
riser(T.stats - 1.5, T.stats, 0.8);
riser(T.vtbm - 1.5, T.vtbm, 0.7);
riser(T.outro - 1.5, T.outro, 0.7);
[T.caption, T.stats, T.vtbm, T.outro].forEach((at) => impact(at, 0.85));
CUTS.forEach((at) => { impact(at, 0.35); whoosh(at - 0.3, 0.5, 1.1); });
[T.stats, T.vtbm, ...CUTS, T.outro].forEach((at) => glitch(at));

// Boot: keystrokes while the command types, a blip as projects load.
for (let k = 0; k < 30; k += 2) key(0.15 + k / 34, 0.8);
pluck(1.05, 81, 0.8);
// One pluck per cover, climbing the chord.
for (let i = 0; i < COVERS; i += 1) {
  const chord = CHORDS[Math.floor(i / 6) % 4];
  pluck(T.collage + i * POP_STEP, chord[i % 3] + 12 + 12 * Math.floor((i % 6) / 3), 0.9, i % 2 ? 0.6 : 1.4);
}
// The stat counters tick in.
[0.4, 1.2, 2.0].forEach((d, i) => pluck(T.stats + d, [69, 72, 76][i] + 12, 1.1));
// /ask: the question is typed, then a chime when the answer lands.
for (let k = 0; k < 18; k += 1) key(T.ask + 0.2 + k * (1.1 / 18), 0.8);
[81, 84, 88].forEach((m, i) => pluck(T.ask + 1.9 + i * 0.08, m, 1.2));

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
let droneLP = 0;

for (let i = 0; i < n; i += 1) {
  const t = i / RATE;
  const ci = Math.floor(t / BAR) % 4;
  const chord = CHORDS[ci];
  const p = pump(t);
  const tail = t > T.outro ? Math.exp(-(t - T.outro) * 0.6) : 1;

  // Boot drone: a filtered low A that opens as the collage fills.
  let outL = 0;
  let outR = 0;
  if (t < T.stats) {
    droneLP += 0.02 * (Math.sin(2 * Math.PI * midi(33) * t) + 0.5 * Math.sin(2 * Math.PI * midi(45) * t * 1.003) - droneLP);
    const v = droneLP * 0.25 * Math.min(1, t / 0.8);
    outL += v; outR += v;
  }

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
  const open = t < T.stats ? 0.01 + 0.04 * (t / T.stats) : quiet(t) ? 0.025 : 0.06;
  padLP += open * (pl - padLP);
  padLPR += open * (pr - padLPR);
  const padGain = 0.07 * Math.min(1, t / 1.5) * tail * p;
  outL += padLP * padGain;
  outR += padLPR * padGain;

  if (groove(t) || quiet(t)) {
    const e = Math.floor(t / (BEAT / 2));
    const inNote = (t % (BEAT / 2)) / (BEAT / 2);
    const m = ROOTS[ci] + (e % 2 ? 12 : 0);
    bassPh = (bassPh + midi(m) / RATE) % 1;
    bassLP += 0.05 * ((bassPh < 0.5 ? 1 : -1) - bassLP);
    const v = (bassLP * 0.5 + Math.sin(2 * Math.PI * bassPh) * 0.5) * Math.exp(-inNote * 2.5) * 0.32 * p * (quiet(t) ? 0.4 : 1);
    outL += v; outR += v;
  }

  let arp = 0;
  if (groove(t) || between(t, T.collage, T.stats)) {
    const s16 = Math.floor(t / (BEAT / 4));
    const st = [0, 1, 2, 3, 2, 1, 4, 2][s16 % 8];
    const m = chord[st % 3] + 12 * (1 + Math.floor(st / 3));
    const inNote = (t % (BEAT / 4)) / (BEAT / 4);
    arpPh = (arpPh + midi(m) / RATE) % 1;
    const raw = (arpPh < 0.3 ? 1 : -1) * 0.6 + (2 * arpPh - 1) * 0.4;
    arpLP += (groove(t) ? 0.22 : 0.05) * (raw - arpLP);
    arp = arpLP * Math.exp(-inNote * 5) * (groove(t) ? 0.06 : 0.03);
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
      const v = (Math.sin(2 * Math.PI * leadPh) * 0.7 + (leadPh < 0.5 ? 0.3 : -0.3)) * Math.min(1, inNote * 40) * Math.exp(-inNote * 1.2) * 0.07;
      outL += v; outR += v;
    }
  }
  L[i] += outL;
  R[i] += outR;
}

for (let i = 0; i < n; i += 1) {
  const fadeOut = Math.min(1, (DURATION - i / RATE) / 0.8);
  L[i] = Math.tanh(L[i] * 1.1) * fadeOut;
  R[i] = Math.tanh(R[i] * 1.1) * fadeOut;
}

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "score.wav");
fs.writeFileSync(out, toWav([L, R]));
console.info(`  score.wav  ${DURATION}s`);
