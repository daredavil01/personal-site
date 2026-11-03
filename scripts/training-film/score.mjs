// The /training film's music, synthesised sample by sample like the other
// films' (scripts/trailer/score.mjs): no samples, nothing to license.
// 120 BPM in D minor, cut to the scenes the narration sized:
//
//   pulse     a heartbeat alone, then a pad breathing in
//   pile      kick enters, the pad opens
//   light     hats, shimmer bells
//   calendar  a ticking clock of 16ths, rising
//   day       the drop: bass line and a pluck arpeggio
//   numbers   brighter, a hit on every fact
//   modes     half-time, airy
//   finale    the last hit, the chord ringing out
//
// A whoosh leads into every cut. The narration ducks the music in the
// composition (remotion/Film.jsx), not here.

import { RATE, toWav } from "../trailer/score.mjs";

const BEAT = 0.5;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

let seed = 20261103;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x3fffffff) - 1;
};

// One chord per bar (2 s): Dm9 · B♭maj7 · Fmaj7 · C
const CHORDS = [[50, 53, 57, 60, 64], [46, 50, 53, 57, 62], [41, 48, 53, 57, 60], [48, 52, 55, 60, 62]];
const chordAt = (t) => CHORDS[Math.floor(t / 2) % CHORDS.length];

/** tl (render.mjs's timeline) → a stereo 44.1 kHz WAV buffer. */
export function renderScore(tl) {
  const dur = tl.frames / tl.fps;
  const n = Math.ceil(dur * RATE);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const sec = (f) => f / tl.fps;
  const scene = Object.fromEntries(tl.scenes.map((s) => [s.id, { a: sec(s.from), b: sec(s.from + s.dur) }]));
  const cuts = tl.scenes.slice(1).map((s) => sec(s.from));
  const inScene = (t, ...ids) => ids.some((id) => scene[id] && t >= scene[id].a && t < scene[id].b);
  const add = (i, v, pan = 0) => {
    if (i < 0 || i >= n) return;
    L[i] += v * (1 - pan) * 0.5;
    R[i] += v * (1 + pan) * 0.5;
  };

  // --- Heartbeat: lub-dub at 64 bpm through the opening.
  const hb = scene.pulse;
  if (hb) {
    for (let b = 0.15; b < hb.b + 0.2; b += 60 / 64) {
      [[0, 1], [0.22, 0.7]].forEach(([off, amp]) => {
        const t0 = b + off;
        for (let k = 0; k < RATE * 0.25; k += 1) {
          const t = k / RATE;
          const f = 48 + 60 * Math.exp(-t * 30);
          add(Math.floor((t0 + t) * RATE), amp * 0.9 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 14));
        }
      });
    }
  }

  // --- Pad: detuned saws through a one-pole low-pass that opens with the film.
  let lpL = 0;
  let lpR = 0;
  const padStart = hb ? hb.a + 1.2 : 0;
  for (let i = Math.floor(padStart * RATE); i < n; i += 1) {
    const t = i / RATE;
    const ch = chordAt(t);
    let sL = 0;
    let sR = 0;
    ch.forEach((m, j) => {
      const f = midi(m);
      const saw = (x) => 2 * (x - Math.floor(x + 0.5));
      sL += saw(t * f * 1.003 + j * 0.13);
      sR += saw(t * f * 0.997 + j * 0.29);
    });
    // Brightness follows the story: dark → open at the drop → bright → mellow.
    let cutoff = 500;
    if (inScene(t, "pile", "light", "calendar")) cutoff = 900;
    if (inScene(t, "day")) cutoff = 1500;
    if (inScene(t, "numbers")) cutoff = 2000;
    if (inScene(t, "modes")) cutoff = 1100;
    if (inScene(t, "finale")) cutoff = 1300;
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
    lpL += a * (sL - lpL);
    lpR += a * (sR - lpR);
    const swell = Math.min(1, (t - padStart) / 3);
    const fade = Math.min(1, (dur - t) / 2.5);
    const bar = (t % 2) / 2;
    const breathe = 0.75 + 0.25 * Math.sin(Math.PI * bar);
    const g = 0.045 * swell * fade * breathe;
    L[i] += lpL * g;
    R[i] += lpR * g;
  }

  // --- Drums.
  const kick = (t0, amp = 1) => {
    for (let k = 0; k < RATE * 0.35; k += 1) {
      const t = k / RATE;
      const f = 45 + 110 * Math.exp(-t * 40);
      add(Math.floor((t0 + t) * RATE), amp * 0.8 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9));
    }
  };
  const hat = (t0, amp = 1, pan = 0.3) => {
    let prev = 0;
    for (let k = 0; k < RATE * 0.06; k += 1) {
      const t = k / RATE;
      const x = noise();
      const hp = x - prev;
      prev = x;
      add(Math.floor((t0 + t) * RATE), amp * 0.18 * hp * Math.exp(-t * 70), pan);
    }
  };
  const tick = (t0, amp = 1) => {
    for (let k = 0; k < RATE * 0.03; k += 1) {
      const t = k / RATE;
      add(Math.floor((t0 + t) * RATE), amp * 0.12 * Math.sin(2 * Math.PI * 3200 * t) * Math.exp(-t * 160), -0.4);
    }
  };
  for (let t = 0; t < dur; t += BEAT / 4) {
    const q = Math.round(t / (BEAT / 4));
    const onBeat = q % 4 === 0;
    const offBeat = q % 4 === 2;
    if (inScene(t, "pile", "light", "calendar", "day", "numbers") && onBeat) kick(t, inScene(t, "pile") ? 0.7 : 1);
    if (inScene(t, "modes") && q % 8 === 0) kick(t, 0.8);
    if (inScene(t, "light", "calendar", "day", "numbers") && offBeat) hat(t, 1, 0.35);
    if (inScene(t, "day", "numbers") && !onBeat && !offBeat) hat(t, 0.45, -0.3);
    if (inScene(t, "calendar")) {
      const s = scene.calendar;
      tick(t, 0.4 + 0.8 * ((t - s.a) / (s.b - s.a)));
    }
  }

  // --- Bass (8ths) and pluck arpeggio (16ths) from the drop.
  for (let t = 0; t < dur; t += BEAT / 2) {
    if (!inScene(t, "day", "numbers", "finale")) continue;
    const root = chordAt(t)[0] - 12;
    const q = Math.round(t / (BEAT / 2));
    const note = q % 4 === 3 ? root + 12 : root;
    const len = inScene(t, "finale") ? 0 : 0.22;
    for (let k = 0; k < RATE * len; k += 1) {
      const tt = k / RATE;
      const f = midi(note);
      const v = Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(4 * Math.PI * f * tt);
      add(Math.floor((t + tt) * RATE), 0.22 * v * Math.min(1, tt * 200) * Math.exp(-tt * 6));
    }
  }
  for (let t = 0; t < dur; t += BEAT / 4) {
    if (!inScene(t, "day", "numbers")) continue;
    const ch = chordAt(t);
    const q = Math.round(t / (BEAT / 4));
    const m = ch[[0, 2, 4, 3, 1, 2, 4, 3][q % 8] % ch.length] + 12;
    for (let k = 0; k < RATE * 0.2; k += 1) {
      const tt = k / RATE;
      const f = midi(m);
      const v = Math.sin(2 * Math.PI * f * tt + 0.8 * Math.sin(2 * Math.PI * f * 2 * tt) * Math.exp(-tt * 18));
      add(Math.floor((t + tt) * RATE), 0.07 * v * Math.exp(-tt * 16), q % 2 ? 0.45 : -0.45);
    }
  }

  // --- Bells over the light painting and the modes.
  for (let t = 0; t < dur; t += BEAT) {
    if (!inScene(t, "light", "modes")) continue;
    const ch = chordAt(t);
    const m = ch[Math.floor(t / BEAT) % ch.length] + 24;
    for (let k = 0; k < RATE * 1.2; k += 1) {
      const tt = k / RATE;
      const f = midi(m);
      const v = Math.sin(2 * Math.PI * f * tt) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * tt) * Math.exp(-tt * 6);
      add(Math.floor((t + tt) * RATE), 0.035 * v * Math.exp(-tt * 3), Math.sin(t) * 0.6);
    }
  }

  // --- Whoosh into every cut, a boom on it.
  const whoosh = (tc) => {
    let lp = 0;
    const len = 0.55;
    for (let k = 0; k < RATE * len; k += 1) {
      const t = k / RATE;
      const x = t / len;
      const a = 0.02 + 0.25 * x * x;
      lp += a * (noise() - lp);
      add(Math.floor((tc - len + t) * RATE), 0.5 * lp * x * x, (x - 0.5) * 1.2);
    }
  };
  const boom = (tc, amp = 1) => {
    for (let k = 0; k < RATE * 1.4; k += 1) {
      const t = k / RATE;
      const f = 38 + 50 * Math.exp(-t * 12);
      add(Math.floor((tc + t) * RATE), amp * 0.7 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3.2));
    }
  };
  cuts.forEach((c) => { whoosh(c); boom(c, 0.55); });
  // Hits on the facts, on the frames each card lands (render.mjs).
  const num = tl.scenes.find((s) => s.id === "numbers");
  if (num?.cards) num.cards.slice(1).forEach((f) => boom(sec(num.from + f), 0.5));
  // The last hit: a full chord ringing out.
  if (scene.finale) {
    const t0 = scene.finale.a + 0.9;
    boom(t0, 1.1);
    [38, 50, 57, 62, 65, 69].forEach((m, j) => {
      for (let k = 0; k < RATE * (dur - t0); k += 1) {
        const t = k / RATE;
        const f = midi(m);
        const v = Math.sin(2 * Math.PI * f * t + 0.5 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2));
        add(Math.floor((t0 + t) * RATE), 0.05 * v * Math.exp(-t * 0.9) * Math.min(1, (dur - t0 - t) / 1.5), j % 2 ? 0.4 : -0.4);
      }
    });
  }

  // Soft-clip and normalise to -1 dBFS.
  let peak = 0;
  for (let i = 0; i < n; i += 1) {
    L[i] = Math.tanh(L[i] * 1.2);
    R[i] = Math.tanh(R[i] * 1.2);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const g = peak ? 0.89 / peak : 1;
  for (let i = 0; i < n; i += 1) { L[i] *= g; R[i] *= g; }
  return toWav([L, R]);
}
