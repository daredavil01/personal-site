// The narrator for the film's audio description.
//
// Two voices, in order of preference:
//
//   aura   Deepgram Aura 2 on Workers AI — the voice the Atlas guide already
//          speaks with (scripts/generate-guide-audio.mjs), through the same
//          runWorkersAi() call. Needs CF_ACCOUNT_ID / CF_API_TOKEN.
//   piper  Piper, an offline neural TTS, for machines without those keys.
//          PIPER_VOICE is the path to a voice's .onnx (its .onnx.json beside
//          it); PIPER_BIN the executable if `piper` is not on PATH. The film
//          was first narrated with en_GB-cori-high, trained on public-domain
//          LibriVox recordings — pick a voice whose dataset licence allows
//          publishing (each voice's MODEL_CARD says).
//
// Every take is converted to 48 kHz mono PCM and cached by voice + text, so a
// re-run only speaks the lines that changed.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { runWorkersAi } from "../lib/workersAi.mjs";

export const AURA = "@cf/deepgram/aura-2-en";

const hasAura = () => Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN);

function piperVoice() {
  const model = process.env.PIPER_VOICE;
  if (!model || !fs.existsSync(model)) return null;
  const bin = process.env.PIPER_BIN || "piper";
  try {
    execFileSync(bin, ["--help"], { stdio: "ignore" });
  } catch (_) {
    return null;
  }
  return {
    kind: "piper",
    bin,
    model,
    // A touch quicker than Piper's default pace: description has to fit the
    // gaps between what happens on screen.
    lengthScale: Number(process.env.PIPER_LENGTH_SCALE) || 0.92,
  };
}

/** The voice to narrate with: `requested` if given, else aura, else piper. */
export function pickVoice(requested = null) {
  if (requested === "aura" || (!requested && hasAura())) {
    if (!hasAura()) throw new Error("--voice=aura needs CF_ACCOUNT_ID / CF_API_TOKEN (in .env).");
    return { kind: "aura" };
  }
  const piper = piperVoice();
  if (piper) return piper;
  throw new Error(
    "No narrator. Set CF_ACCOUNT_ID / CF_API_TOKEN for Workers AI, or install Piper "
    + "(pip install piper-tts) and point PIPER_VOICE at a voice's .onnx.",
  );
}

/** A credit line for the voice, for the page and the run log. */
export function voiceCredit(voice) {
  if (voice.kind === "aura") return "Deepgram Aura 2 on Workers AI, the Atlas guide's voice";
  return `Piper TTS, ${path.basename(voice.model, ".onnx")}`;
}

/** Seconds of audio in a PCM WAV, read from its chunks. */
export function wavSeconds(file) {
  const buf = fs.readFileSync(file);
  let at = 12;
  let byteRate = 0;
  while (at + 8 <= buf.length) {
    const id = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(at + 16);
    if (id === "data") return byteRate ? size / byteRate : 0;
    at += 8 + size + (size % 2);
  }
  return 0;
}

/** One line, spoken, as a cached 48 kHz mono WAV; returns its path. */
export async function speak(voice, text, { ffmpeg, dir }) {
  fs.mkdirSync(dir, { recursive: true });
  const key = crypto.createHash("sha1")
    .update(JSON.stringify([voice.kind, voice.model || AURA, voice.lengthScale || 1, text]))
    .digest("hex")
    .slice(0, 16);
  const out = path.join(dir, `${key}.wav`);
  if (fs.existsSync(out)) return out;

  const take = path.join(dir, `${key}.take`);
  if (voice.kind === "aura") {
    fs.writeFileSync(take, await runWorkersAi(AURA, { text }, { raw: true }));
  } else {
    execFileSync(voice.bin, ["-m", voice.model, "--length-scale", String(voice.lengthScale), "-f", take], {
      input: text, stdio: ["pipe", "ignore", "ignore"],
    });
  }
  execFileSync(ffmpeg, ["-y", "-i", take, "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", out], { stdio: "ignore" });
  fs.rmSync(take, { force: true });
  return out;
}
