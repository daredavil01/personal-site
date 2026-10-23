// The /videos film's music, synthesised sample by sample like the trailer's
// (scripts/trailer/score.mjs): no samples, nothing to license. 120 BPM, so
// a bar is two seconds and the cuts in film.html land on beats. Each act has
// its own sound, the way it has its own type:
//
//   0–12.6    orbit       a slow D-minor pad, a sub, glass bells, a swell
//   12.6–15.2 the browser a bright pluck figure
//   15.2–16.4 rewind      tape spinning backwards
//   16.4–28   back-story  lo-fi: soft kick, rim, shaker, Rhodes, crackle
//   28–34     the gap     typewriter ticks over a pulsing low D, then a riser
//   34–36     drum roll   doubling into the ribbon
//   36–40     unveiling   the impact, a major chord and bells
//   40–63     features    bright pop in D major, the hook over the numbers
//   63–76     the hood    four-on-the-floor in B minor, sixteenth arps
//   76–80     before/after half-time, a riser
//   80–90     finale      the pad again, the last hit at 84.6, ringing out

import { RATE, toWav } from "../trailer/score.mjs";

export { toWav };

const BEAT = 0.5;
const BAR = 2;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const between = (t, a, b) => t >= a && t < b;

let seed = 7654321;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x3fffffff) - 1;
};

// Chords per bar, one progression per act (MIDI, around middle C).
const SPACE = [[50, 57, 60, 64], [46, 53, 57, 62], [48, 55, 60, 64], [45, 52, 57, 61]]; // Dm9 B♭ C A
const LOFI = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]; // Fmaj7 Em7 Dm7 Cmaj7
const POP = [[50, 54, 57], [45, 49, 52], [47, 50, 54], [43, 47, 50]]; // D A Bm G
const TECH = [[47, 50, 54], [43, 47, 50], [50, 54, 57], [45, 49, 52]]; // Bm G D A
const HOOK = [
  [74, null, 78, 81, null, 78, 76, null],
  [73, null, 76, 81, null, 76, 73, 71],
  [74, null, 78, 83, null, 81, 78, null],
  [79, 78, 76, null, 74, null, 76, 78],
];

/**
 * @param {number} duration seconds
 * @param {{ impacts?: number[], ticks?: number[] }} cues  impacts: where the
 *   picture hits; ticks: typewriter keystrokes (film.html's typing).
 * @returns {Float32Array[]} [left, right]
 */
export function renderScore(duration, { impacts = [], ticks = [] } = {}) {
  const n = Math.ceil(duration * RATE);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const add = (i, l, r = l) => { if (i >= 0 && i < n) { L[i] += l; R[i] += r; } };

  // --- one-shots -----------------------------------------------------------------
  const kick = (at, gain = 1, tight = 1) => {
    const s = Math.round(at * RATE);
    let ph = 0;
    for (let i = 0; i < 0.4 * RATE; i += 1) {
      const t = i / RATE;
      ph += (2 * Math.PI * (45 + 120 * Math.exp(-t * 30 * tight))) / RATE;
      add(s + i, Math.sin(ph) * Math.exp(-t * 8 * tight) * gain * 0.9);
    }
  };
  const clap = (at, gain = 1) => {
    const s = Math.round(at * RATE);
    let lp = 0;
    for (let i = 0; i < 0.22 * RATE; i += 1) {
      const t = i / RATE;
      const burst = t < 0.03 ? (Math.floor(t / 0.01) % 2 ? 0.6 : 1) : 1;
      const x = noise();
      lp += 0.35 * (x - lp);
      const v = (x - lp) * Math.exp(-t * 18) * burst * 0.42 * gain;
      add(s + i, v * 0.9, v * 1.1);
    }
  };
  const hat = (at, open = false, gain = 1) => {
    const s = Math.round(at * RATE);
    let prev = 0;
    const len = open ? 0.2 : 0.045;
    for (let i = 0; i < len * RATE; i += 1) {
      const t = i / RATE;
      const x = noise();
      const v = (x - prev) * Math.exp(-t * (open ? 14 : 75)) * 0.11 * gain;
      prev = x;
      add(s + i, v * 1.2, v * 0.8);
    }
  };
  const rim = (at, gain = 1) => {
    const s = Math.round(at * RATE);
    for (let i = 0; i < 0.06 * RATE; i += 1) {
      const t = i / RATE;
      add(s + i, (Math.sin(2 * Math.PI * 1700 * t) * 0.5 + noise() * 0.3) * Math.exp(-t * 70) * 0.2 * gain);
    }
  };
  // A typewriter key: a click, a little thunk.
  const tick = (at, gain = 1) => {
    const s = Math.round(at * RATE);
    for (let i = 0; i < 0.04 * RATE; i += 1) {
      const t = i / RATE;
      const v = (noise() * Math.exp(-t * 260) * 0.5 + Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 90) * 0.3) * gain * 0.35;
      add(s + i, v * 0.8, v);
    }
  };
  const impact = (at, gain = 1) => {
    const s = Math.round(at * RATE);
    let ph = 0;
    let lp = 0;
    for (let i = 0; i < 3 * RATE; i += 1) {
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
    for (let i = 0; i < len; i += 1) {
      const k = i / len;
      const cut = 0.01 + 0.5 * k * k;
      a += cut * (noise() - a);
      b += cut * (a - b);
      const v = b * 1.4 * k * k * gain * 0.6;
      add(s + i, v * (1 - 0.3 * Math.sin(k * 40)), v * (1 + 0.3 * Math.sin(k * 40)));
    }
  };
  // Glass bell: two inharmonic partials, a long tail.
  const bell = (at, m, gain = 1, pan = 0) => {
    const s = Math.round(at * RATE);
    const f = midi(m);
    for (let i = 0; i < 2.4 * RATE; i += 1) {
      const t = i / RATE;
      const v = (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 3)) * Math.exp(-t * 1.8) * 0.07 * gain;
      add(s + i, v * (1 - pan), v * (1 + pan));
    }
  };
  // Plucked string (Karplus–Strong).
  const pluck = (at, m, gain = 1, pan = 0, len = 0.9) => {
    const s = Math.round(at * RATE);
    const p = Math.max(2, Math.round(RATE / midi(m)));
    const buf = Float32Array.from({ length: p }, () => noise());
    for (let i = 0; i < len * RATE; i += 1) {
      const j = i % p;
      const v = buf[j];
      buf[j] = 0.5 * (buf[j] + buf[(j + 1) % p]) * 0.996;
      const out = v * 0.16 * gain * Math.min(1, (len * RATE - i) / 2000);
      add(s + i, out * (1 - pan), out * (1 + pan));
    }
  };
  // Tape rewind: a pitch that dives and wobbles, with hiss.
  const rewind = (from, to) => {
    const s = Math.round(from * RATE);
    let ph = 0;
    for (let i = 0; i < (to - from) * RATE; i += 1) {
      const t = i / RATE;
      const k = t / (to - from);
      ph += (2 * Math.PI * (900 * (1 - k) + 140 + 60 * Math.sin(t * 38))) / RATE;
      const v = (Math.sin(ph) * 0.12 + noise() * 0.08) * Math.sin(Math.PI * k) * 1.1;
      add(s + i, v, v * 0.9);
    }
  };

  // --- drums and events, beat by beat ---------------------------------------------
  const beats = Math.floor(duration / BEAT);
  for (let b = 0; b < beats; b += 1) {
    const t = b * BEAT;
    const inBar = b % 4;
    if (between(t, 16.5, 28)) { // lo-fi
      // Kick on one and on the "and" of three.
      if (inBar === 0) kick(t, 0.55, 0.7);
      if (inBar === 2) kick(t + BEAT / 2, 0.45, 0.7);
      if (inBar === 1 || inBar === 3) rim(t, 0.9);
      hat(t + BEAT / 2, false, 0.5);
    }
    if (between(t, 28, 34)) kick(t, t < 32 ? 0.35 : 0.5, 1.4); // a heartbeat under the chores
    if (between(t, 34, 36)) { // the roll: eighths, sixteenths, thirty-seconds
      const per = t < 35 ? 2 : t < 35.5 ? 4 : 8;
      for (let k = 0; k < per; k += 1) clap(t + (k * BEAT) / per, 0.3 + 0.7 * ((t - 34) / 2));
    }
    if (between(t, 40, 63)) { // pop
      kick(t, 0.95);
      if (b % 2 === 1) clap(t);
      hat(t, false, 0.6);
      hat(t + BEAT / 2, true, 0.6);
    }
    if (between(t, 63, 76)) { // the hood
      kick(t, 1, 1.2);
      hat(t + BEAT / 2, true, 0.75);
      for (let k = 0; k < 4; k += 1) hat(t + (k * BEAT) / 4, false, k % 2 ? 0.35 : 0.55);
      if (b % 4 === 2) clap(t, 0.8);
    }
    if (between(t, 76, 80) && b % 2 === 0) { kick(t, 0.8); if (b % 4 === 2) clap(t, 0.9); }
  }
  ticks.forEach((at) => tick(at));
  riser(10.6, 12.6, 0.6);
  rewind(15.2, 16.4);
  riser(31.6, 34, 0.7);
  riser(78, 80, 0.8);
  impacts.forEach((at, i) => impact(at, i === 0 ? 0.55 : 0.95));
  // Bells: a scattering in orbit, a run at the unveiling, the last chord.
  const bellR = (() => { let a = 99; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
  for (let t = 1; t < 12; t += 0.75 + bellR() * 0.9) bell(t, [74, 76, 77, 81, 84, 86][Math.floor(bellR() * 6)], 0.8, bellR() - 0.5);
  [74, 78, 81, 86, 90].forEach((m, i) => bell(36.1 + i * 0.12, m, 1.2, (i - 2) * 0.2));
  [62, 66, 69, 74, 78].forEach((m, i) => bell(84.6 + i * 0.09, m, 1.1, (i - 2) * 0.2));
  // The browser's pluck figure, and a soft arpeggio over the scrapbook.
  [74, 78, 81, 86, 81, 78].forEach((m, i) => pluck(12.7 + i * 0.25, m, 1, (i % 2 ? 0.3 : -0.3)));
  for (let t = 16.5; t < 27.8; t += BEAT / 2) {
    const chord = LOFI[Math.floor(t / BAR) % 4];
    const step = Math.round((t - 16.5) / (BEAT / 2)) % 8;
    if ([0, 3, 5, 6].includes(step)) pluck(t, chord[[0, 2, 3, 1][[0, 3, 5, 6].indexOf(step)]] + 12, 0.55, step % 2 ? 0.4 : -0.4, 0.7);
  }

  // --- tonal beds, sample by sample ------------------------------------------------
  const padPh = new Float64Array(16);
  let padL = 0;
  let padR = 0;
  let subPh = 0;
  let bassPh = 0;
  let bassLP = 0;
  let arpPh = 0;
  let arpLP = 0;
  let leadPh = 0;
  let vib = 0;
  const rh = new Float64Array(4);
  const echo = { L: new Float32Array(Math.round(0.375 * RATE)), R: new Float32Array(Math.round(0.375 * RATE)), i: 0 };

  for (let i = 0; i < n; i += 1) {
    const t = i / RATE;
    const bar = Math.floor(t / BAR);
    let outL = 0;
    let outR = 0;

    // Pad: orbit, the unveiling and the finale.
    const padOn = t < 15.4 || between(t, 36, 40.5) || t >= 80;
    if (padOn) {
      const chords = between(t, 36, 40.5) || t >= 84.6 ? POP : SPACE;
      const chord = t >= 84.6 ? POP[0] : chords[bar % 4];
      let pl = 0;
      let pr = 0;
      chord.forEach((m, k) => {
        [-0.1, 0.1].forEach((det, j) => {
          const idx = k * 2 + j;
          padPh[idx] = (padPh[idx] + midi(m + det) / RATE) % 1;
          const saw = 2 * padPh[idx] - 1;
          if (j) pr += saw; else pl += saw;
        });
      });
      const open = 0.015 + 0.04 * Math.min(1, t / 12) + (t >= 36 && t < 40.5 ? 0.04 : 0);
      padL += open * (pl - padL);
      padR += open * (pr - padR);
      const env = t < 15.4 ? Math.min(1, t / 3) * (1 - Math.max(0, (t - 14.8) / 0.6))
        : t < 40.5 ? Math.min(1, (t - 36) / 0.3) * (1 - Math.max(0, (t - 40) / 0.5))
          : Math.min(1, (t - 80) / 1) * (t > 84.6 ? Math.exp(-(t - 84.6) * 0.45) : 1);
      outL += padL * 0.07 * env;
      outR += padR * 0.07 * env;
      // Sub under orbit.
      if (t < 12.8) {
        subPh = (subPh + midi(26) / RATE) % 1;
        const v = Math.sin(2 * Math.PI * subPh) * 0.12 * Math.min(1, t / 4) * (1 - Math.max(0, (t - 12.2) / 0.6));
        outL += v; outR += v;
      }
    }

    // Rhodes under the scrapbook: sine plus a soft second partial, tremolo.
    if (between(t, 16.4, 28.2)) {
      const chord = LOFI[bar % 4];
      const into = (t % BAR) / BAR;
      const trem = 0.8 + 0.2 * Math.sin(2 * Math.PI * 4.5 * t);
      let v = 0;
      chord.forEach((m, k) => {
        rh[k] = (rh[k] + midi(m) / RATE) % 1;
        v += Math.sin(2 * Math.PI * rh[k]) + 0.25 * Math.sin(4 * Math.PI * rh[k]);
      });
      v *= 0.03 * trem * (0.55 + 0.45 * Math.exp(-into * 3)) * Math.min(1, (t - 16.4) / 0.3) * (1 - Math.max(0, (t - 27.8) / 0.4));
      outL += v * 1.05; outR += v * 0.95;
      // Vinyl crackle.
      if (noise() > 0.9993) { const c = noise() * 0.25; outL += c; outR += c; }
      const hiss = noise() * 0.004;
      outL += hiss; outR += hiss;
    }

    // The gap: a low D pulsing in eighths.
    if (between(t, 28, 34)) {
      const into = (t % (BEAT / 2)) / (BEAT / 2);
      bassPh = (bassPh + midi(38) / RATE) % 1;
      const sq = bassPh < 0.5 ? 1 : -1;
      bassLP += 0.04 * (sq - bassLP);
      const v = bassLP * Math.exp(-into * 4) * 0.22 * Math.min(1, (t - 28) / 1);
      outL += v; outR += v;
    }

    // Pop and the hood: bass and arp.
    const pop = between(t, 40, 63);
    const tech = between(t, 63, 80);
    if (pop || tech) {
      const chords = pop ? POP : TECH;
      const chord = chords[bar % 4];
      const e8 = Math.floor(t / (BEAT / 2));
      const into = (t % (BEAT / 2)) / (BEAT / 2);
      const root = chord[0] - 12 + (pop && e8 % 2 ? 12 : 0);
      bassPh = (bassPh + midi(root) / RATE) % 1;
      const sq = bassPh < 0.5 ? 1 : -1;
      bassLP += (tech ? 0.03 : 0.05) * (sq - bassLP);
      // Off-beat bass in the hood, every eighth in pop.
      const gate = tech ? (e8 % 2 ? 1 : 0.15) : 1;
      const pump = tech ? 0.35 + 0.65 * Math.min(1, ((t % BEAT) / BEAT) * 2.2) : 1;
      const v = (bassLP * 0.5 + Math.sin(2 * Math.PI * bassPh) * 0.5) * Math.exp(-into * 2.5) * 0.3 * gate * pump * (between(t, 76, 80) ? 0.6 : 1);
      outL += v; outR += v;

      const s16 = Math.floor(t / (BEAT / 4));
      const pattern = tech ? [0, 1, 2, 3, 2, 1, 2, 3] : [0, 2, 1, 2, 3, 2, 1, 2];
      const step = pattern[s16 % 8];
      const m = chord[step % 3] + 12 * (1 + Math.floor(step / 3));
      const in16 = (t % (BEAT / 4)) / (BEAT / 4);
      arpPh = (arpPh + midi(m) / RATE) % 1;
      const raw = (arpPh < 0.3 ? 1 : -1) * 0.6 + (2 * arpPh - 1) * 0.4;
      arpLP += (tech ? 0.12 + 0.1 * Math.sin(t * 0.8) : 0.2) * (raw - arpLP);
      const arp = arpLP * Math.exp(-in16 * 5) * (tech ? 0.055 : 0.045) * (between(t, 76, 80) ? 0.5 : 1);
      const d = echo.i;
      const eL = echo.L[d];
      const eR = echo.R[d];
      echo.L[d] = arp + eR * 0.36;
      echo.R[d] = eL * 0.36;
      echo.i = (d + 1) % echo.L.length;
      outL += arp * 0.9 + eL * 0.6;
      outR += arp * 0.7 + eR * 0.8;
    }

    // The hook, over the numbers (54–59) and the before/after.
    if (between(t, 54, 59) || between(t, 76, 80)) {
      const ci = bar % 4;
      const e8 = Math.floor((t % BAR) / (BEAT / 2));
      const m = HOOK[ci][e8];
      if (m) {
        const inNote = (t % (BEAT / 2)) / (BEAT / 2);
        vib += (2 * Math.PI * 5.5) / RATE;
        leadPh = (leadPh + midi(m + 0.15 * Math.sin(vib) * Math.min(1, inNote * 3)) / RATE) % 1;
        const v = (Math.sin(2 * Math.PI * leadPh) * 0.7 + (leadPh < 0.5 ? 0.25 : -0.25)) * Math.min(1, inNote * 40) * Math.exp(-inNote * 1.2) * 0.075;
        outL += v; outR += v;
      }
    }

    L[i] += outL;
    R[i] += outR;
  }

  for (let i = 0; i < n; i += 1) {
    L[i] = Math.tanh(L[i] * 1.1);
    R[i] = Math.tanh(R[i] * 1.1);
  }
  return [L, R];
}
