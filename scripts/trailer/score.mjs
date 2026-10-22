// The trailer's music, synthesised sample by sample: no samples, no library,
// nothing to license. 120 BPM in A minor (Am–F–C–G), so one bar is exactly
// two seconds and every cut in trailer.html lands on a beat.
//
// Shape (seconds): 0–6 cold open (pad, heartbeat), 6–10 build (snare roll,
// riser), 10 drop, 60–68 breakdown, 68 re-drop, 76–84 finale with the hook,
// 84 last hit, 84–90 the pad rings out.

export const BPM = 120;
export const RATE = 44100;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
// Am, F, C, G as MIDI chord tones (root position, around A3).
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const ROOTS = [33, 29, 36, 31];
// The hook: one bar per chord, eighth notes (null = rest).
const HOOK = [
  [69, null, 72, null, 76, null, 74, 72],
  [72, null, 69, null, 65, null, 69, 72],
  [76, null, 79, null, 76, null, 74, 72],
  [74, null, 71, null, 67, null, 71, 74],
];

// Seeded noise, so the score renders the same every time.
let seed = 1234567;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x3fffffff) - 1;
};

const between = (t, a, b) => t >= a && t < b;

/**
 * @param {number} duration  seconds
 * @param {number[]} impacts seconds where the picture slams (titles, cuts)
 * @returns {Float32Array[]} [left, right]
 */
export function renderScore(duration, impacts = []) {
  const n = Math.ceil(duration * RATE);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const add = (i, l, r = l) => { if (i >= 0 && i < n) { L[i] += l; R[i] += r; } };

  const sections = {
    groove: (t) => (between(t, 10, 60) || between(t, 68, 84)),
    breakdown: (t) => between(t, 60, 68),
    hook: (t) => between(t, 76, 84) || between(t, 34, 42),
    intro: (t) => t < 10,
  };

  // --- drums, placed event by event ---------------------------------------------
  const kick = (at, gain = 1) => {
    const s = Math.round(at * RATE);
    let ph = 0;
    for (let i = 0; i < 0.45 * RATE; i += 1) {
      const t = i / RATE;
      const f = 45 + 110 * Math.exp(-t * 28);
      ph += (2 * Math.PI * f) / RATE;
      const v = Math.sin(ph) * Math.exp(-t * 7) * gain * 0.9 + (i < 60 ? noise() * 0.3 * gain : 0);
      add(s + i, v);
    }
  };
  const clap = (at, gain = 1) => {
    const s = Math.round(at * RATE);
    let lp = 0;
    for (let i = 0; i < 0.25 * RATE; i += 1) {
      const t = i / RATE;
      // Three quick bursts then a tail: the shape of hands.
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
      const hp = x - prev;
      prev = x;
      const v = hp * Math.exp(-t * (open ? 14 : 70)) * 0.12 * gain;
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
      const v = (Math.sin(ph) * Math.exp(-t * 1.6) * 1.0 + lp * Math.exp(-t * 2.5) * 1.6) * gain;
      add(s + i, v);
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

  const beats = Math.floor(duration / BEAT);
  for (let b = 0; b < beats; b += 1) {
    const t = b * BEAT;
    if (sections.intro(t) && t < 6 && b % 2 === 0) { kick(t, 0.7); kick(t + 0.18, 0.4); } // heartbeat
    if (between(t, 6, 10)) {
      kick(t, 0.8);
      // A snare roll that doubles every bar into the drop.
      const per = t < 8 ? 2 : t < 9 ? 4 : 8;
      for (let k = 0; k < per; k += 1) clap(t + (k * BEAT) / per, 0.35 + 0.65 * ((t - 6) / 4));
    }
    if (sections.groove(t)) {
      kick(t, 1);
      if (b % 2 === 1) clap(t);
      hat(t + BEAT / 2, true, 0.8);
      hat(t, false, 0.7);
      hat(t + BEAT / 4, false, 0.4);
      hat(t + (3 * BEAT) / 4, false, 0.4);
    }
    if (sections.breakdown(t) && t >= 64) {
      const per = t < 66 ? 2 : 4;
      for (let k = 0; k < per; k += 1) clap(t + (k * BEAT) / per, 0.3 + 0.5 * ((t - 64) / 4));
    }
  }
  riser(6, 10, 1);
  riser(62, 68, 1.1);
  riser(80, 84, 0.8);
  impacts.forEach((at) => impact(at, 0.9));

  // --- tonal parts, sample by sample -------------------------------------------
  // Kick-keyed pumping on the bed: the sound of every trailer drop.
  const pump = (t) => {
    if (!sections.groove(t)) return 1;
    const into = (t % BEAT) / BEAT;
    return 0.35 + 0.65 * Math.min(1, into * 2.2);
  };
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
    const bar = Math.floor(t / BAR);
    const ci = bar % 4;
    const chord = CHORDS[ci];
    const p = pump(t);
    const tail = t > 84 ? Math.exp(-(t - 84) * 0.55) : 1;
    const fadeIn = Math.min(1, t / 3);

    // Pad: three detuned saws per chord tone, darker in the cold open.
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
    const open = sections.intro(t) ? 0.02 + 0.03 * (t / 10) : sections.breakdown(t) ? 0.03 + 0.05 * ((t - 60) / 8) : 0.06;
    padLP += open * (pl - padLP);
    padLPR += open * (pr - padLPR);
    const padGain = 0.075 * fadeIn * tail * p * (sections.breakdown(t) ? 1.3 : 1);
    let outL = padLP * padGain;
    let outR = padLPR * padGain;

    // Bass: eighth notes on the root, octave jump on the off-beat.
    if (sections.groove(t) || (between(t, 6, 10))) {
      const e = Math.floor(t / (BEAT / 2));
      const inNote = (t % (BEAT / 2)) / (BEAT / 2);
      const m = ROOTS[ci] + (e % 2 ? 12 : 0);
      bassPh = (bassPh + midi(m) / RATE) % 1;
      const sq = bassPh < 0.5 ? 1 : -1;
      bassLP += 0.05 * (sq - bassLP);
      const env = Math.exp(-inNote * 2.5);
      const v = (bassLP * 0.5 + Math.sin(2 * Math.PI * bassPh) * 0.5) * env * 0.32 * p * (between(t, 6, 10) ? 0.5 : 1);
      outL += v; outR += v;
    }

    // Arp: sixteenths through the chord over two octaves, into a dotted-8th echo.
    let arp = 0;
    if (sections.groove(t) || sections.breakdown(t)) {
      const s16 = Math.floor(t / (BEAT / 4));
      const pattern = [0, 1, 2, 3, 2, 1, 4, 2];
      const step = pattern[s16 % 8];
      const m = chord[step % 3] + 12 * (1 + Math.floor(step / 3));
      const inNote = (t % (BEAT / 4)) / (BEAT / 4);
      arpPh = (arpPh + midi(m) / RATE) % 1;
      const raw = (arpPh < 0.3 ? 1 : -1) * 0.6 + (2 * arpPh - 1) * 0.4;
      arpLP += (sections.breakdown(t) ? 0.08 + 0.2 * ((t - 60) / 8) : 0.22) * (raw - arpLP);
      arp = arpLP * Math.exp(-inNote * 5) * 0.06;
    }
    const d = delay.i;
    const echoL = delay.L[d];
    const echoR = delay.R[d];
    delay.L[d] = arp + echoR * 0.38;
    delay.R[d] = echoL * 0.38;
    delay.i = (d + 1) % delay.L.length;
    outL += arp * 0.9 + echoL * 0.6;
    outR += arp * 0.7 + echoR * 0.8;

    // The hook: a vibrato square-sine lead, the part people hum.
    if (sections.hook(t)) {
      const e8 = Math.floor((t % BAR) / (BEAT / 2));
      const m = HOOK[ci][e8];
      if (m) {
        const inNote = ((t % (BEAT / 2)) / (BEAT / 2));
        leadVib += (2 * Math.PI * 5.5) / RATE;
        leadPh = (leadPh + midi(m + 0.15 * Math.sin(leadVib) * Math.min(1, inNote * 3)) / RATE) % 1;
        const v = (Math.sin(2 * Math.PI * leadPh) * 0.7 + (leadPh < 0.5 ? 0.3 : -0.3)) * Math.min(1, inNote * 40) * Math.exp(-inNote * 1.2) * (t < 42 ? 0.07 : 0.1);
        outL += v; outR += v;
      }
    }

    L[i] += outL;
    R[i] += outR;
  }

  // Soft clip; ffmpeg's loudnorm sets the final level.
  for (let i = 0; i < n; i += 1) {
    L[i] = Math.tanh(L[i] * 1.1);
    R[i] = Math.tanh(R[i] * 1.1);
  }
  return [L, R];
}

export function toWav([L, R]) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i += 1) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  return buf;
}
