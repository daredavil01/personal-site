// The /books film's music, synthesised sample by sample like the other films'
// (scripts/trailer/score.mjs): no samples, nothing to license.
//
// A reading-room lo-fi beat at 90 BPM in D Kafi (D dorian): a tanpura drone
// (Pa–Sa–Sa–Sa), a plucked string with a little meend (Karplus–Strong with a
// jawari buzz), soft Rhodes-like chords, a swung kit with a bayan that bends
// on the one, and vinyl crackle. Cut to the scenes the narration sized:
//
//   hook      crackle, the drone breathing in, the string alone; a riser
//   count…    the beat drops (kick, snare, hats, bayan), chords enter
//   shells    breakdown: drums out, the string and chords alone
//   finale    the beat back for a bar, then the last chord rings out
//
// A whoosh leads into every cut and a page-turn lands on it. The narration
// ducks the music in the composition (remotion/Film.jsx), not here.

import { RATE, toWav } from "../trailer/score.mjs";

const BPM = 90;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

let seed = 20261111;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x3fffffff) - 1;
};

// One chord per bar: Dm9 · B♭maj7 · Gm9 · A7sus4
const CHORDS = [[50, 53, 57, 60, 64], [46, 50, 53, 57, 62], [43, 50, 53, 57, 58], [45, 50, 52, 55, 59]];
// The string's phrases, one per two bars (MIDI note, beat offset, length in
// beats); D dorian with the flattened seventh leaning on Sa.
const PHRASES = [
  [[74, 0, 1], [72, 1, 0.5], [74, 1.5, 0.5], [77, 2, 1.5], [76, 4, 0.5], [74, 4.5, 0.5], [72, 5, 1], [69, 6, 2]],
  [[69, 0, 0.5], [72, 0.5, 0.5], [74, 1, 1.5], [76, 3, 1], [77, 4, 0.75], [76, 4.75, 0.25], [74, 5, 1], [74, 6.5, 1.5]],
  [[81, 0, 1], [79, 1, 0.5], [77, 1.5, 0.5], [76, 2, 1], [74, 3, 1], [72, 4, 1], [74, 5, 3]],
];

/** tl (render.mjs's timeline) → a stereo 44.1 kHz WAV buffer. */
export function renderScore(tl) {
  const dur = tl.frames / tl.fps;
  const n = Math.ceil(dur * RATE);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const sec = (f) => f / tl.fps;
  const scene = Object.fromEntries(tl.scenes.map((s) => [s.id, { a: sec(s.from), b: sec(s.from + s.dur) }]));
  const cuts = tl.scenes.slice(1).map((s) => sec(s.from));
  const dropAt = scene.count ? scene.count.a : 5;
  const breakA = scene.shells ? scene.shells.a : dur;
  const breakB = scene.finale ? scene.finale.a : dur;
  const endBeat = dur - 2.6; // the kit stops here; the last chord rings out
  const add = (i, v, pan = 0) => {
    if (i < 0 || i >= n) return;
    L[i] += v * (1 - pan) * 0.5;
    R[i] += v * (1 + pan) * 0.5;
  };
  const drums = (t) => t >= dropAt && t < endBeat && !(t >= breakA && t < breakB);

  // --- Vinyl crackle, all the way through.
  for (let i = 0; i < n; i += 1) {
    if (noise() > 0.9993) {
      const amp = 0.05 + 0.06 * Math.abs(noise());
      for (let k = 0; k < 40; k += 1) add(i + k, amp * noise() * Math.exp(-k / 6), noise() * 0.6);
    }
    add(i, 0.004 * noise());
  }

  // --- Tanpura: Pa–Sa–Sa–Sa(low), each string a bank of harmonics whose top
  // swells after the pluck (the jawari's buzz), ringing over the next.
  const TANPURA = [45, 50, 50, 38];
  const tanIn = (t) => Math.min(1, t / 2.5) * (t > dur - 1.5 ? Math.max(0, (dur - t) / 1.5) : 1);
  for (let k = 0, t0 = 0.2; t0 < dur; k += 1, t0 += BEAT * 1.5) {
    const f = midi(TANPURA[k % 4]);
    const pan = [-0.3, 0.1, 0.25, -0.1][k % 4];
    const len = Math.floor(RATE * 4.2);
    const start = Math.floor(t0 * RATE);
    for (let j = 0; j < len; j += 1) {
      const t = j / RATE;
      const env = Math.exp(-t * 0.9) * Math.min(1, t * 40);
      const buzz = 0.4 + 0.6 * Math.min(1, t * 1.6);
      let v = 0;
      for (let h = 1; h <= 9; h += 1) v += (Math.sin(2 * Math.PI * f * h * t * (1 + 0.0004 * h)) / h) * (h > 3 ? buzz : 1);
      add(start + j, 0.022 * v * env * tanIn(t0 + t), pan);
    }
  }

  // --- Chords: a soft electric piano (sine + a bell partial, gentle tremolo),
  // from the drop to the end.
  for (let b = Math.floor(dropAt / BAR); b * BAR < dur; b += 1) {
    const t0 = b * BAR;
    if (t0 + BAR < dropAt - 0.01) continue; // eslint-disable-line no-continue
    const ch = CHORDS[b % CHORDS.length];
    const last = t0 + BAR > dur - 2.6;
    const len = Math.floor(RATE * (last ? dur - t0 : BAR + 0.4));
    ch.forEach((m, j) => {
      const f = midi(m);
      const strum = Math.floor(RATE * j * 0.018);
      for (let k = 0; k < len; k += 1) {
        const t = k / RATE;
        const env = Math.exp(-t * (last ? 0.5 : 0.75)) * Math.min(1, t * 60);
        const trem = 1 + 0.12 * Math.sin(2 * Math.PI * 4.5 * t);
        const v = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 4 * t) * Math.exp(-t * 6);
        add(Math.floor(t0 * RATE) + strum + k, 0.03 * v * env * trem, j % 2 ? 0.3 : -0.3);
      }
    });
  }

  // --- The plucked string: Karplus–Strong with a soft clip for the buzz and
  // a slide up into some notes (meend).
  const pluck = (t0, m, beats, amp, pan) => {
    const f = midi(m);
    const P = Math.round(RATE / f);
    const buf = new Float32Array(P).map(() => noise() * 0.8);
    const len = Math.floor(RATE * (beats * BEAT + 0.9));
    const slide = beats >= 1 ? 0.06 : 0;
    let idx = 0;
    let prev = 0;
    for (let k = 0; k < len; k += 1) {
      const t = k / RATE;
      const cur = buf[idx];
      const next = buf[(idx + 1) % P];
      buf[idx] = 0.996 * 0.5 * (cur + next);
      // The meend: read slightly behind at first, catching up to pitch.
      const v = Math.tanh(2.2 * (cur * 0.8 + prev * 0.2)) * 0.6;
      prev = cur;
      idx = (idx + 1 + (slide && t < slide && k % 9 === 0 ? 1 : 0)) % P;
      add(Math.floor(t0 * RATE) + k, amp * v * Math.min(1, t * 400), pan);
    }
  };
  // Alone in the hook, then a phrase every two bars except while the
  // narrator is busiest — every other pair of bars.
  pluck(0.6, 69, 1, 0.16, 0.2);
  pluck(0.6 + BEAT, 74, 2, 0.16, 0.2);
  pluck(0.6 + BEAT * 3, 72, 1, 0.12, 0.2);
  for (let p = 0, t0 = Math.ceil(dropAt / BAR) * BAR; t0 < dur - 3; p += 1, t0 += BAR * 2) {
    if (p % 2 === 1 && !(t0 >= breakA - BAR && t0 < breakB)) continue; // eslint-disable-line no-continue
    PHRASES[p % PHRASES.length].forEach(([m, at, beats]) => {
      const t = t0 + at * BEAT;
      if (t < dur - 2.8) pluck(t, m, beats, 0.11, 0.25);
    });
  }

  // --- The kit: swung, soft, lowpassed.
  const kick = (t0, amp = 1) => {
    for (let k = 0; k < RATE * 0.35; k += 1) {
      const t = k / RATE;
      const f = 46 + 90 * Math.exp(-t * 28);
      add(Math.floor(t0 * RATE) + k, 0.42 * amp * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9));
    }
  };
  let lp = 0;
  const snare = (t0) => {
    for (let k = 0; k < RATE * 0.25; k += 1) {
      const t = k / RATE;
      lp += 0.35 * (noise() - lp);
      const v = lp * Math.exp(-t * 16) * 0.5 + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30) * 0.25;
      add(Math.floor(t0 * RATE) + k, 0.32 * v, 0.1);
    }
  };
  let hp = 0;
  let hpPrev = 0;
  const hat = (t0, amp) => {
    for (let k = 0; k < RATE * 0.05; k += 1) {
      const x = noise();
      hp = 0.85 * (hp + x - hpPrev);
      hpPrev = x;
      add(Math.floor(t0 * RATE) + k, amp * hp * Math.exp(-k / (RATE * 0.012)), 0.35);
    }
  };
  // The bayan: a low drum whose pitch bends up under the palm.
  const bayan = (t0) => {
    let ph = 0;
    for (let k = 0; k < RATE * 0.6; k += 1) {
      const t = k / RATE;
      const f = 70 + 45 * Math.min(1, t * 5);
      ph += (2 * Math.PI * f) / RATE;
      add(Math.floor(t0 * RATE) + k, 0.2 * Math.sin(ph) * Math.exp(-t * 4.5), -0.25);
    }
  };
  // The dayan's ringing "na" on the off-beats now and then.
  const na = (t0) => {
    for (let k = 0; k < RATE * 0.3; k += 1) {
      const t = k / RATE;
      const v = Math.sin(2 * Math.PI * 587 * t) + 0.5 * Math.sin(2 * Math.PI * 587 * 2.76 * t) * Math.exp(-t * 20);
      add(Math.floor(t0 * RATE) + k, 0.06 * v * Math.exp(-t * 11), 0.3);
    }
  };
  const swing = BEAT * 0.5 * 0.16;
  for (let b = 0; b * BEAT < dur; b += 1) {
    const t = b * BEAT;
    if (drums(t)) {
      const inBar = b % 4;
      if (inBar === 0) { kick(t); if ((b / 4) % 2 === 0) bayan(t); }
      if (inBar === 2) kick(t + BEAT * 0.5, 0.7);
      if (inBar === 1 || inBar === 3) snare(t);
      if (inBar === 3 && b % 8 === 7) na(t + BEAT * 0.5 + swing);
      [0, 0.5].forEach((s, k) => hat(t + s * BEAT + (k ? swing : 0), k ? 0.035 : 0.05));
    }
  }

  // --- A riser into the drop, a whoosh into every cut, a page-turn on it.
  const riserA = Math.max(0, dropAt - 1.6);
  for (let i = Math.floor(riserA * RATE); i < Math.floor(dropAt * RATE); i += 1) {
    const k = (i / RATE - riserA) / 1.6;
    add(i, 0.09 * k * k * noise() * (0.5 + 0.5 * Math.sin(2 * Math.PI * (200 + 1800 * k) * (i / RATE))), Math.sin(k * 6) * 0.4);
  }
  kick(dropAt, 1.2);
  let wl = 0;
  cuts.forEach((c, k) => {
    for (let i = Math.floor((c - 0.4) * RATE); i < Math.floor((c + 0.1) * RATE); i += 1) {
      const x = (i / RATE - (c - 0.4)) / 0.5;
      wl += (0.08 + 0.4 * x) * (noise() - wl);
      add(i, 0.13 * wl * Math.sin(Math.PI * x), (k % 2 ? 1 : -1) * (x - 0.5));
    }
    // The page-turn: two short brushes of paper.
    [0, 0.07].forEach((off, j) => {
      let pl = 0;
      for (let q = 0; q < RATE * 0.09; q += 1) {
        pl += 0.6 * (noise() - pl);
        add(Math.floor((c + off) * RATE) + q, (j ? 0.05 : 0.08) * pl * Math.sin((Math.PI * q) / (RATE * 0.09)), 0.2);
      }
    });
  });

  // --- A small bell on the last chord.
  const bellAt = dur - 2.6;
  [74, 81, 86].forEach((m, j) => {
    for (let k = 0; k < RATE * 2.5; k += 1) {
      const t = k / RATE;
      const f = midi(m);
      const v = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.4 * t);
      add(Math.floor((bellAt + j * 0.12) * RATE) + k, 0.04 * v * Math.exp(-t * 2), j - 1);
    }
  });

  // Normalise, with a soft fade at the very end.
  let peak = 0;
  for (let i = 0; i < n; i += 1) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak > 0 ? 0.85 / peak : 1;
  for (let i = 0; i < n; i += 1) {
    const fade = Math.min(1, (n - i) / (RATE * 0.4));
    L[i] *= g * fade;
    R[i] *= g * fade;
  }
  return toWav([L, R]);
}
