// Each page film's music, synthesised sample by sample: no samples, no
// library, nothing to license. Every film runs at 120 BPM, so a beat is 0.5 s
// and a bar is 2 s, and the cuts in film.html land on bars. What changes per
// film is the MOOD below: key, progression, which instruments play and how
// hard the drums hit. The shape is the same 30-second arc for all seven:
// 0–4 s intro (pad alone), 4 s the groove enters, 24–26 s a one-bar lift,
// 26–30 s the outro rings out on the tonic.

export const RATE = 44100;
const BPM = 120;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

// Chords as MIDI triads, one bar each, cycled.
export const MOODS = {
  // About: warm, curious, a little wistful. D major, I–V–vi–IV.
  about: { chords: [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]], drums: 0.6, arp: "up", pluck: 0.5, bassOct: -24, swing: 0.05 },
  // Resume: precise, confident, office-clean. C major, I–vi–IV–V, tight hats.
  resume: { chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], drums: 0.8, arp: "pulse", pluck: 0.55, bassOct: -24, swing: 0 },
  // Writing Ledger: ink and paper, an unhurried pen. F major, I–iii–IV–I.
  ledger: { chords: [[53, 57, 60], [57, 60, 64], [58, 62, 65], [53, 57, 60]], drums: 0.45, arp: "broken", pluck: 0.6, bassOct: -24, swing: 0.08 },
  // Micro-blog: after dark. A minor, i–VI–III–VII, sparse, lots of air.
  microblog: { chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], drums: 0.4, arp: "stars", pluck: 0.45, bassOct: -24, swing: 0 },
  // Presentations: the lights go down, the deck comes up. E minor, i–VI–III–VII.
  presentations: { chords: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]], drums: 0.75, arp: "pulse", pluck: 0.5, bassOct: -12, swing: 0 },
  // Sports: race day. G minor driving four-on-the-floor.
  sports: { chords: [[55, 58, 62], [51, 55, 58], [58, 62, 65], [53, 57, 60]], drums: 1, arp: "drive", pluck: 0.55, bassOct: -24, swing: 0 },
  // Treks: monsoon on the Sahyadri. D Dorian, i–IV, wide and slow.
  treks: { chords: [[50, 53, 57], [55, 59, 62], [50, 53, 57], [48, 52, 55]], drums: 0.7, arp: "broken", pluck: 0.5, bassOct: -24, swing: 0.04 },
};

let seed = 1;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x3fffffff) - 1;
};

/**
 * @param {string} name     a key of MOODS
 * @param {number} duration seconds
 * @param {number[]} hits   seconds where the picture cuts hard (a boom lands there)
 * @returns {Float32Array[]} [left, right]
 */
export function renderScore(name, duration, hits = []) {
  const M = MOODS[name] || MOODS.about;
  seed = [...name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) & 0x7fffffff;
  const n = Math.ceil(duration * RATE);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const add = (i, l, r = l) => { if (i >= 0 && i < n) { L[i] += l; R[i] += r; } };
  const groove = (t) => t >= 4 && t < 26;
  const lift = (t) => t >= 24 && t < 26;
  const chordAt = (t) => M.chords[Math.floor(t / BAR) % M.chords.length];

  // --- pad: three detuned partial stacks per chord tone, slow swell --------------
  for (let i = 0; i < n; i += 1) {
    const t = i / RATE;
    const ch = chordAt(t);
    const barPos = (t % BAR) / BAR;
    const env = Math.min(1, t / 2.5) * (t > duration - 3 ? Math.max(0, (duration - t) / 3) : 1);
    const swell = 0.75 + 0.25 * Math.sin(barPos * Math.PI);
    let l = 0;
    let r = 0;
    ch.forEach((m, k) => {
      const f = midi(m);
      const a = Math.sin(2 * Math.PI * f * 0.998 * t) + 0.35 * Math.sin(2 * Math.PI * f * 2.003 * t) + 0.12 * Math.sin(2 * Math.PI * f * 3 * t);
      const b = Math.sin(2 * Math.PI * f * 1.002 * t + k) + 0.35 * Math.sin(2 * Math.PI * f * 1.997 * t) + 0.12 * Math.sin(2 * Math.PI * f * 3.01 * t);
      l += a;
      r += b;
    });
    const g = 0.045 * env * swell;
    add(i, l * g, r * g);
  }

  // --- bass: root on every beat in the groove, an octave pedal in the outro ------
  const bassNote = (at, m, len, gain) => {
    const s = Math.round(at * RATE);
    const f = midi(m);
    for (let i = 0; i < len * RATE; i += 1) {
      const t = i / RATE;
      const e = Math.min(1, t * 80) * Math.exp(-t * 3.2);
      const v = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * e * gain;
      add(s + i, v);
    }
  };
  for (let b = 0; b * BEAT < duration; b += 1) {
    const at = b * BEAT;
    if (groove(at)) bassNote(at, chordAt(at)[0] + M.bassOct, BEAT * 0.95, 0.16);
    else if (at >= 26 && at < duration - 1 && b % 4 === 0) bassNote(at, M.chords[0][0] + M.bassOct, BAR, 0.14);
  }

  // --- pluck arpeggio ---------------------------------------------------------------
  const pluck = (at, m, gain) => {
    const s = Math.round(at * RATE);
    const f = midi(m);
    for (let i = 0; i < 0.6 * RATE; i += 1) {
      const t = i / RATE;
      const e = Math.min(1, t * 400) * Math.exp(-t * 7);
      const v = (Math.sin(2 * Math.PI * f * t) * 0.7 + Math.sin(2 * Math.PI * f * 2 * t) * 0.2 * Math.exp(-t * 14) + Math.sin(2 * Math.PI * f * 3 * t) * 0.1 * Math.exp(-t * 20)) * e * gain;
      const pan = 0.5 + 0.35 * Math.sin(m * 1.7);
      add(s + i, v * (1 - pan) * 1.4, v * pan * 1.4);
    }
  };
  const PATTERNS = {
    up: [0, 1, 2, 3, 2, 1, 0, 1],
    pulse: [0, 0, 1, 0, 2, 0, 1, 0],
    broken: [0, 2, 1, 3, 0, 2, 1, 3],
    stars: [3, null, null, 2, null, 4, null, null],
    drive: [0, 1, 2, 1, 3, 1, 2, 1],
  };
  const pat = PATTERNS[M.arp];
  for (let e = 0; e * BEAT / 2 < duration - 2; e += 1) {
    const at = e * BEAT / 2 + (e % 2 ? M.swing : 0);
    if (at < 2) continue;
    const step = pat[e % 8];
    if (step == null) continue;
    const ch = chordAt(at);
    const notes = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[1] + 24];
    const gain = (at < 4 ? 0.5 : 1) * (lift(at) ? 1.2 : 1) * M.pluck * 0.22;
    pluck(at, notes[step], gain);
  }

  // --- drums -----------------------------------------------------------------------
  const kick = (at, gain) => {
    const s = Math.round(at * RATE);
    let ph = 0;
    for (let i = 0; i < 0.4 * RATE; i += 1) {
      const t = i / RATE;
      ph += (2 * Math.PI * (45 + 100 * Math.exp(-t * 30))) / RATE;
      add(s + i, Math.sin(ph) * Math.exp(-t * 8) * gain * 0.8);
    }
  };
  const hat = (at, gain, open = false) => {
    const s = Math.round(at * RATE);
    let prev = 0;
    for (let i = 0; i < (open ? 0.22 : 0.05) * RATE; i += 1) {
      const t = i / RATE;
      const x = noise();
      const hp = x - prev;
      prev = x;
      add(s + i, hp * Math.exp(-t * (open ? 14 : 60)) * gain * 0.12, hp * Math.exp(-t * (open ? 14 : 60)) * gain * 0.14);
    }
  };
  const snare = (at, gain) => {
    const s = Math.round(at * RATE);
    let lp = 0;
    for (let i = 0; i < 0.22 * RATE; i += 1) {
      const t = i / RATE;
      const x = noise();
      lp += 0.4 * (x - lp);
      add(s + i, ((x - lp) * 0.5 * Math.exp(-t * 16) + Math.sin(2 * Math.PI * 185 * t) * 0.25 * Math.exp(-t * 28)) * gain);
    }
  };
  const D = M.drums;
  for (let b = 0; b * BEAT < duration; b += 1) {
    const at = b * BEAT;
    if (!groove(at)) continue;
    const beat = b % 4;
    if (D >= 0.9 || beat === 0 || (D >= 0.6 && beat === 2)) kick(at, D);
    if (beat === 1 || beat === 3) snare(at, D * 0.45);
    hat(at + BEAT / 2, D, D >= 0.9 && beat === 3);
    if (D >= 0.7) hat(at, D * 0.6);
  }
  // The lift: a snare roll across bar 12 (24–26 s).
  for (let k = 0; k < 16; k += 1) snare(24 + k * BEAT / 4, D * 0.18 * (0.4 + k / 16));

  // --- hits: a low boom and a reversed-noise swell into each one ---------------------
  hits.forEach((at) => {
    const s = Math.round(at * RATE);
    for (let i = 0; i < 1.6 * RATE; i += 1) {
      const t = i / RATE;
      add(s + i, Math.sin(2 * Math.PI * (38 + 30 * Math.exp(-t * 6)) * t) * Math.exp(-t * 2.4) * 0.35);
    }
    for (let i = 0; i < 0.6 * RATE; i += 1) {
      const t = i / RATE;
      add(s - Math.round(0.6 * RATE) + i, noise() * 0.05 * (t / 0.6) ** 2);
    }
  });

  // Soft clip.
  for (let i = 0; i < n; i += 1) {
    L[i] = Math.tanh(L[i] * 1.2) * 0.9;
    R[i] = Math.tanh(R[i] * 1.2) * 0.9;
  }
  return [L, R];
}

// --- dynamic sound effects ---------------------------------------------------------
// Every cue in script.js's `sfx` list, synthesised where it lands: a whoosh
// panned the way its scene slides in, ticks that climb in pitch while a
// number counts up, a key click per typed letter, a shutter per photo, a pop
// per item, a stamp on each call-out. `pitch` (0–1) and `gain` vary each one,
// so no two cues in a film sound alike.

const SYNTH = {
  whoosh: { len: 0.55, fn: (t, p, r) => r() * Math.sin(Math.PI * (t / 0.55)) ** 2 * 0.5, band: [0.04, 0.35] },
  swish: { len: 0.28, fn: (t, p, r) => r() * Math.sin(Math.PI * (t / 0.28)) ** 2 * 0.35, band: [0.08, 0.55] },
  boom: { len: 1.2, fn: (t) => Math.sin(2 * Math.PI * (36 + 40 * Math.exp(-t * 7)) * t) * Math.exp(-t * 3) * 0.8 },
  beep: { len: 0.18, fn: (t, p) => Math.sin(2 * Math.PI * 880 * t) * Math.min(1, t * 300) * Math.exp(-t * 10) * 0.35 },
  gun: { len: 0.6, fn: (t, p, r) => (r() * Math.exp(-t * 14) * 0.9 + Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 6) * 0.6) },
  tick: { len: 0.04, fn: (t, p, r) => (r() * 0.5 + Math.sin(2 * Math.PI * (1800 + p * 1600) * t)) * Math.exp(-t * 160) * 0.35 },
  ding: { len: 0.9, fn: (t, p) => (Math.sin(2 * Math.PI * (1318 + p * 400) * t) + 0.4 * Math.sin(2 * Math.PI * (2636 + p * 800) * t)) * Math.min(1, t * 500) * Math.exp(-t * 5) * 0.22 },
  pop: { len: 0.12, fn: (t, p) => Math.sin(2 * Math.PI * (380 + p * 700) * t * (1 + 2.5 * Math.exp(-t * 40))) * Math.min(1, t * 900) * Math.exp(-t * 30) * 0.4 },
  key: { len: 0.05, fn: (t, p, r) => (r() * 0.6 + Math.sin(2 * Math.PI * (2400 + p * 900) * t) * 0.5) * Math.exp(-t * 120) * 0.3 },
  bell: { len: 1.2, fn: (t) => (Math.sin(2 * Math.PI * 1760 * t) + 0.5 * Math.sin(2 * Math.PI * 2640 * t)) * Math.exp(-t * 3.2) * 0.16 },
  shutter: { len: 0.16, fn: (t, p, r) => r() * (Math.exp(-t * 90) + (t > 0.07 ? Math.exp(-(t - 0.07) * 110) : 0)) * 0.55 },
  stamp: { len: 0.35, fn: (t, p, r) => (Math.sin(2 * Math.PI * (90 + 60 * Math.exp(-t * 30)) * t) * 0.8 + r() * 0.4 * Math.exp(-t * 40)) * Math.exp(-t * 11) },
  rise: { len: 0.32, fn: (t, p) => Math.sin(2 * Math.PI * (220 + p * 500) * t * (1 + t * 2)) * Math.sin(Math.PI * t / 0.32) * 0.16 },
  drip: { len: 0.14, fn: (t, p) => Math.sin(2 * Math.PI * (600 + p * 900) * t * (1 + 6 * t)) * Math.exp(-t * 26) * 0.22 },
  riser: { len: 0.7, fn: (t, p, r) => r() * (t / 0.7) ** 3 * 0.25, band: [0.02, 0.5] },
  chime: { len: 1.8, fn: (t) => [1, 1.5, 2].reduce((a, k, i) => a + Math.sin(2 * Math.PI * 784 * k * t) * (t > i * 0.09 ? Math.exp(-(t - i * 0.09) * 2.6) : 0), 0) * 0.12 },
  snap: { len: 0.2, fn: (t, p, r) => r() * Math.exp(-t * 60) * 0.7 },
};

/** Mix the film's cues into a stereo buffer. `events` are script.js sfx (frames). */
export function mixSfx([L, R], events, fps = 30) {
  const n = L.length;
  events.forEach((e, k) => {
    const def = SYNTH[e.kind];
    if (!def) return;
    let sd = (k + 1) * 7919;
    const r = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return (sd / 0x3fffffff) - 1; }; // eslint-disable-line no-bitwise
    const s0 = Math.round((e.at / fps) * RATE);
    const p = e.pitch || 0;
    const g = e.gain ?? 1;
    const pan = Math.max(-1, Math.min(1, e.pan || 0));
    let lp = 0;
    let hp = 0;
    for (let i = 0; i < def.len * RATE; i += 1) {
      const t = i / RATE;
      let v = def.fn(t, p, r);
      if (def.band) {
        // A sweeping band-pass: noise that moves, the way a whoosh does.
        const k2 = def.band[0] + (def.band[1] - def.band[0]) * Math.sin(Math.PI * Math.min(1, t / def.len));
        lp += k2 * (v - lp);
        hp = lp - hp * 0.6;
        v = hp;
      }
      // A slide pans across as it plays.
      const move = pan * (2 * (t / def.len) - 1);
      const idx = s0 + i;
      if (idx >= 0 && idx < n) {
        L[idx] += v * g * (1 - move) * 0.7;
        R[idx] += v * g * (1 + move) * 0.7;
      }
    }
  });
  for (let i = 0; i < n; i += 1) {
    L[i] = Math.tanh(L[i]);
    R[i] = Math.tanh(R[i]);
  }
  return [L, R];
}

export function toWav([L, R]) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i += 1) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  return buf;
}
