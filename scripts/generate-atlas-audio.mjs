#!/usr/bin/env node
/**
 * generate-atlas-audio.mjs — synthesizes the Wanderer's Atlas audio assets
 * (phase 12, plan §4.9) and encodes them to public/audio/*.m4a.
 *
 *   node scripts/generate-atlas-audio.mjs
 *
 * Requires ffmpeg for the AAC encode: either on PATH or the ffmpeg-static
 * package (npm i --no-save ffmpeg-static). Everything is procedurally
 * generated right here — filtered noise, sine partials and envelopes; no
 * third-party recordings — so the output carries the repo's own license
 * (deviation from the "source CC0 audio" default in plan §10, chosen because
 * it is license-clean by construction and byte-for-byte reproducible).
 *
 * Loop layout (click-free looping, §4.9): each ambient bed is built as a
 * seamless period P (its tail crossfaded into its head), then written as
 *   [last GUARD s of P] + [P] + [first GUARD s of P]
 * so the audioManager can loop between GUARD and GUARD+P — identical samples
 * at both loop points, immune to the AAC encoder's edge padding.
 *
 * Output budget: mono 64 kbps, ~21 s beds -> ~170 KB each (spec <= 200 KB).
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SR = 44100;
const PERIOD = 21; // seamless loop period (s)
const GUARD = 0.2; // guard pad on both sides of the loop region (s)
const XFADE = 1.0; // tail->head crossfade making the period seamless (s)

const OUT_DIR = path.resolve("public/audio");
const TMP_DIR = path.join(tmpdir(), "atlas-audio-wav");

// ---------------------------------------------------------------------------
// ffmpeg discovery: PATH first, then ffmpeg-static.
// ---------------------------------------------------------------------------
async function findFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return "ffmpeg";
  } catch {
    /* not on PATH */
  }
  try {
    const mod = await import("ffmpeg-static");
    return mod.default;
  } catch {
    throw new Error(
      "ffmpeg not found. Install it on PATH or run: npm i --no-save ffmpeg-static",
    );
  }
}

// ---------------------------------------------------------------------------
// Tiny deterministic DSP toolkit.
// ---------------------------------------------------------------------------
const makeRng = (seed) => {
  let s = seed >>> 0;
  return () => {
    // xorshift32 — deterministic across runs/platforms.
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0xffffffff;
  };
};

const onePoleLp = (cutoff) => {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  return (x) => { y += a * (x - y); return y; };
};

const onePoleHp = (cutoff) => {
  const lp = onePoleLp(cutoff);
  return (x) => x - lp(x);
};

/** Sum `gen(t, i)` into `buf` starting at second `at`. */
const mixAt = (buf, at, durSec, gen) => {
  const start = Math.floor(at * SR);
  const n = Math.min(Math.floor(durSec * SR), buf.length - start);
  for (let i = 0; i < n; i += 1) {
    buf[start + i] += gen(i / SR, i);
  }
};

/** Exponentially decaying sine partials — bells, thumps, chirps. */
const partials = (defs) => (t) => defs.reduce(
  (sum, [freq, amp, decay]) => sum + amp * Math.exp(-t / decay) * Math.sin(2 * Math.PI * freq * t),
  0,
);

// ---------------------------------------------------------------------------
// Ambient bed recipes — each fills a Float32Array of PERIOD seconds.
// ---------------------------------------------------------------------------
const N = Math.floor(PERIOD * SR);

/** Wind bed: lowpassed noise with two slow gust LFOs. */
const windInto = (buf, rng, { cutoff = 420, amp = 0.22, gust = 0.07 } = {}) => {
  const lp = onePoleLp(cutoff);
  for (let i = 0; i < N; i += 1) {
    const t = i / SR;
    const gusts = 0.6
      + 0.25 * Math.sin(2 * Math.PI * gust * t)
      + 0.15 * Math.sin(2 * Math.PI * gust * 2.7 * t + 1.3);
    buf[i] += amp * gusts * lp(rng() * 2 - 1);
  }
};

/** Ocean swell: leaky-integrated (brown) noise + swell-gated foam hiss. */
const wavesInto = (buf, rng, { amp = 0.3 } = {}) => {
  const lp = onePoleLp(620);
  const hp = onePoleHp(1800);
  let brown = 0;
  for (let i = 0; i < N; i += 1) {
    const t = i / SR;
    const white = rng() * 2 - 1;
    brown = (brown + 0.02 * white) * 0.998;
    // Two offset swells so the loop never feels metronomic.
    const swell = 0.45
      + 0.32 * Math.sin(2 * Math.PI * (t / 7))
      + 0.23 * Math.sin(2 * Math.PI * (t / 4.7) + 2.1);
    buf[i] += amp * swell * lp(brown * 22)
      + amp * 0.35 * Math.max(swell - 0.55, 0) * hp(white);
  }
};

/** Birdsong: short descending FM chirps in loose clusters. */
const birdsInto = (buf, rng, { count = 9, amp = 0.07 } = {}) => {
  for (let c = 0; c < count; c += 1) {
    const at = 0.8 + rng() * (PERIOD - 2);
    const f0 = 2400 + rng() * 1400;
    const drop = 500 + rng() * 700;
    const dur = 0.09 + rng() * 0.09;
    mixAt(buf, at, dur, (t) => {
      const env = Math.sin((Math.PI * t) / dur) ** 2;
      return amp * env * Math.sin(2 * Math.PI * (f0 - (drop * t) / dur) * t);
    });
  }
};

/** Water babble: highpassed noise with fast amplitude jitter. */
const babbleInto = (buf, rng, { amp = 0.1 } = {}) => {
  const hp = onePoleHp(1300);
  const jitterLp = onePoleLp(6);
  for (let i = 0; i < N; i += 1) {
    const jitter = 0.5 + 1.6 * Math.abs(jitterLp(rng() * 2 - 1)) * 4;
    buf[i] += amp * jitter * hp(rng() * 2 - 1) * 0.5;
  }
};

/** A distant struck bell every `every` seconds. */
const bellInto = (buf, { every = 14, freq = 660, amp = 0.07 } = {}) => {
  for (let at = 3.5; at < PERIOD - 3; at += every) {
    mixAt(buf, at, 3, partials([
      [freq, amp, 0.9],
      [freq * 2.76, amp * 0.4, 0.5],
      [freq * 5.4, amp * 0.18, 0.25],
    ]));
  }
};

/** Quill scratches: bandpassed noise strokes in writing bursts. */
const scratchesInto = (buf, rng, { amp = 0.085 } = {}) => {
  let at = 0.6;
  while (at < PERIOD - 1) {
    const strokes = 4 + Math.floor(rng() * 5);
    for (let s = 0; s < strokes && at < PERIOD - 0.5; s += 1) {
      const dur = 0.05 + rng() * 0.09;
      const lp = onePoleLp(3400);
      const hp = onePoleHp(900);
      mixAt(buf, at, dur, (t) => {
        const env = Math.exp(-t / (dur * 0.4)) * Math.min(t / 0.004, 1);
        return amp * env * hp(lp(rng() * 2 - 1)) * 2.2;
      });
      at += dur + 0.05 + rng() * 0.12;
    }
    at += 0.9 + rng() * 1.6; // thinking pause between bursts
  }
};

/** Workshop machinery: layered hum + alternating gear ticks + rare thump. */
const machineryInto = (buf, rng) => {
  for (let i = 0; i < N; i += 1) {
    const t = i / SR;
    const wobble = 1 + 0.06 * Math.sin(2 * Math.PI * 0.11 * t);
    buf[i] += 0.05 * wobble * (
      Math.sin(2 * Math.PI * 55 * t)
      + 0.6 * Math.sin(2 * Math.PI * 110.3 * t)
      + 0.3 * Math.sin(2 * Math.PI * 164.6 * t)
    );
  }
  for (let k = 0; at(k) < PERIOD - 0.3; k += 1) {
    const freq = k % 2 ? 1750 : 1280;
    mixAt(buf, at(k), 0.05, (t) => 0.035 * Math.exp(-t / 0.012) * Math.sin(2 * Math.PI * freq * t));
  }
  function at(k) { return 0.4 + k * 0.75; }
  mixAt(buf, 6.3, 0.5, partials([[92, 0.11, 0.09], [58, 0.08, 0.16]]));
  mixAt(buf, 15.8, 0.5, partials([[92, 0.1, 0.09], [58, 0.07, 0.16]]));
  void rng;
};

/** Clock room tone: soft tick every second. */
const ticksInto = (buf) => {
  for (let at = 0.5; at < PERIOD - 0.2; at += 1) {
    mixAt(buf, at, 0.04, (t) => 0.03 * Math.exp(-t / 0.008) * Math.sin(2 * Math.PI * 950 * t));
  }
};

// region key -> recipe (map = the hub's own gentle bed).
const BEDS = {
  map: (buf, rng) => {
    windInto(buf, rng, { cutoff: 300, amp: 0.2, gust: 0.05 });
    bellInto(buf, { every: 16, freq: 1046, amp: 0.035 });
  },
  marathons: (buf, rng) => {
    wavesInto(buf, rng);
    windInto(buf, rng, { cutoff: 380, amp: 0.08 });
  },
  treks: (buf, rng) => {
    windInto(buf, rng, { cutoff: 480, amp: 0.28, gust: 0.09 });
    birdsInto(buf, rng, { count: 5, amp: 0.05 });
  },
  reader: (buf, rng) => {
    windInto(buf, rng, { cutoff: 520, amp: 0.13 });
    birdsInto(buf, rng, { count: 12, amp: 0.07 });
  },
  writer: (buf, rng) => {
    windInto(buf, rng, { cutoff: 240, amp: 0.06 });
    scratchesInto(buf, rng);
    ticksInto(buf);
  },
  creator: (buf, rng) => {
    windInto(buf, rng, { cutoff: 260, amp: 0.06 });
    machineryInto(buf, rng);
  },
  person: (buf, rng) => {
    babbleInto(buf, rng);
    windInto(buf, rng, { cutoff: 340, amp: 0.09 });
    bellInto(buf, { every: 13.5, freq: 523, amp: 0.05 });
  },
};

// ---------------------------------------------------------------------------
// SFX sprite — offsets/durations MUST match src/atlas/audio/sfxMap.js.
// ---------------------------------------------------------------------------
const SFX = [
  ["stamp", 0.0, 0.45, (buf, rng) => {
    mixAt(buf, 0, 0.45, (t) => {
      const glide = 120 - 90 * Math.min(t / 0.2, 1);
      return 0.5 * Math.exp(-t / 0.09) * Math.sin(2 * Math.PI * glide * t);
    });
    const lp = onePoleLp(4000);
    mixAt(buf, 0, 0.02, (t) => 0.3 * Math.exp(-t / 0.005) * lp(rng() * 2 - 1) * 2);
  }],
  ["chime", 0.6, 1.1, (buf) => {
    mixAt(buf, 0.6, 1.1, partials([
      [880, 0.3, 0.35],
      [1760, 0.14, 0.22],
      [2640, 0.06, 0.12],
    ]));
  }],
  ["whoosh", 1.9, 0.7, (buf, rng) => {
    const lp = onePoleLp(2600);
    const hp = onePoleHp(350);
    mixAt(buf, 1.9, 0.7, (t) => {
      const env = Math.sin((Math.PI * t) / 0.7) ** 1.5;
      return 0.42 * env * hp(lp(rng() * 2 - 1)) * 2.4;
    });
  }],
  ["egg", 2.8, 1.0, (buf) => {
    [[1046.5, 0], [1318.5, 0.09], [1568, 0.18], [2093, 0.27]].forEach(([freq, offset]) => {
      mixAt(buf, 2.8 + offset, 0.7, partials([[freq, 0.2, 0.28], [freq * 2, 0.05, 0.14]]));
    });
  }],
];
const SFX_TOTAL = 3.9;

// ---------------------------------------------------------------------------
// WAV writer (16-bit PCM mono) + loop assembly.
// ---------------------------------------------------------------------------
const toWav = (samples) => {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};

/** Crossfade the bed's tail into its head, then add guard pads. */
const assembleLoop = (bed) => {
  const xf = Math.floor(XFADE * SR);
  const seamless = new Float32Array(N);
  seamless.set(bed.subarray(0, N));
  for (let i = 0; i < xf; i += 1) {
    const mix = i / xf; // 0 -> tail, 1 -> head (equal-power)
    seamless[i] = bed[N - xf + i] * Math.cos((mix * Math.PI) / 2) ** 2
      + bed[i] * Math.sin((mix * Math.PI) / 2) ** 2;
  }
  const g = Math.floor(GUARD * SR);
  const out = new Float32Array(g + N + g);
  out.set(seamless.subarray(N - g), 0); // tail guard
  out.set(seamless, g); // loop body
  out.set(seamless.subarray(0, g), g + N); // head guard
  return out;
};

// ---------------------------------------------------------------------------
const main = async () => {
  const ffmpeg = await findFfmpeg();
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });

  const encode = (wavPath, outName) => {
    const outPath = path.join(OUT_DIR, outName);
    execFileSync(ffmpeg, ["-y", "-i", wavPath, "-ac", "1", "-c:a", "aac", "-b:a", "64k", outPath], { stdio: "ignore" });
    const kb = (statSync(outPath).size / 1024).toFixed(0);
    console.log(`  ${outName}  ${kb} KB`);
    if (statSync(outPath).size > 200 * 1024) {
      throw new Error(`${outName} exceeds the 200 KB budget`);
    }
  };

  console.log("Ambient beds:");
  Object.entries(BEDS).forEach(([key, recipe], idx) => {
    const bed = new Float32Array(N);
    recipe(bed, makeRng(0xa71a5 + idx * 7919));
    const wavPath = path.join(TMP_DIR, `loop-${key}.wav`);
    writeFileSync(wavPath, toWav(assembleLoop(bed)));
    encode(wavPath, `loop-${key}.m4a`);
  });

  console.log("SFX sprite:");
  const sprite = new Float32Array(Math.floor(SFX_TOTAL * SR));
  SFX.forEach(([, , , render], idx) => render(sprite, makeRng(0x5f0d + idx * 104729)));
  const sfxWav = path.join(TMP_DIR, "sfx.wav");
  writeFileSync(sfxWav, toWav(sprite));
  encode(sfxWav, "sfx.m4a");

  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
  console.log(`Done -> ${OUT_DIR}`);
};

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
