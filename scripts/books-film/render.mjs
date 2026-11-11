// The /books film: "The Reading Room" — 60 seconds, vertical, narrated in an
// Indian English voice over a lo-fi beat, rendered by Remotion.
//
//   npm run books:film                    footage → data → voice → score → render
//   npm run books:film -- --publish       …then the web copy in public/video/
//   npm run books:film -- --capture       re-shoot the page first (all of it)
//   npm run books:film -- --capture=pull,lenses   re-shoot some clips
//   npm run books:film -- --stills        one still per scene, no video
//   npm run books:film -- --frame=12.5    one still at 12.5 s
//   npm run books:film -- --voice=en-IN-PrabhatNeural   another narrator
//
// Steps:
//   1. capture.mjs records the live page at phone size (every view: both
//      shells, light and dark, the six arrangements, spines and covers,
//      filters, the open book, the five lenses) when the footage is missing.
//   2. data.mjs reads the live table through src/lib/bookShelf.js.
//   3. voice.py speaks each scene's line (edge-tts, en-IN Neerja by default)
//      and returns every word's time; the scenes are sized around the lines
//      to fill exactly 60 s, and the captions light each word as it is said.
//   4. score.mjs synthesises the beat to the scene cuts (nothing to license).
//   5. Remotion bundles remotion/index.jsx and renders 1080×1920 at 30 fps.
//   6. --publish: a small 720×1280 web encode, poster, captions and chapters
//      to public/video/the-books-story.{mp4,jpg,vtt,json} (committed).
//
// Working files live in gitignored knowledge_base/books-film/. The numbers
// are baked in when it renders: re-run after books are added.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { loadFilmData } from "./data.mjs";
import { renderScore } from "./score.mjs";
import { capture } from "./capture.mjs";
import { wavSeconds } from "../blueprint-film/voice.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const WORK = path.join(ROOT, "knowledge_base", "books-film");
const PUB = path.join(WORK, "public");
const OUT = path.join(WORK, "the-books-story.mp4");
const WEB = path.join(ROOT, "public", "video", "the-books-story");
const FPS = 30;
const SECONDS = 60;
const CHROME = process.env.CHROME_PATH || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : null);
const CLIP_NAMES = ["atlas", "arrange", "reach", "filter", "pull", "covers", "lenses", "night"];

const args = process.argv.slice(2);
const flag = (name) => args.some((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n) => NUMBER_WORDS[n] || String(n);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/**
 * The story: a modern, digital bookshelf. `say` is spoken and captioned word
 * for word; `min` is the least time the scene's motion needs, `weight` shares
 * out what is left of the minute. A line whose number is missing drops the
 * number, never says zero.
 */
function script(d) {
  const f = d.facts;
  const count = [
    f.total ? `${f.total} books,` : "Books",
    "two languages,",
    f.pages >= 1000 ? `${(Math.floor(f.pages / 1000) * 1000).toLocaleString("en-IN")} pages.` : null,
  ].filter(Boolean).join(" ").replace(/,$/, ".");
  return [
    { id: "hook", min: 4.6, weight: 1.2, say: "Every reader keeps a shelf. Meet the modern, digital one." },
    { id: "count", min: 5, weight: 1, say: count },
    { id: "anatomy", min: 6, weight: 1.2, say: "Every book is a spine. Width is pages, colour is subject, and a ribbon means a review." },
    { id: "reach", min: 3.6, weight: 0.8, say: "Run a finger along the shelf, and each one tips out." },
    { id: "arrange", min: 4.6, weight: 1.2, say: `${cap(word(d.arrangements.length))} ways to shelve it. Every book walks to its place.` },
    { id: "filter", min: 3.8, weight: 0.8, say: "Filter, and nothing vanishes. The rest just dim." },
    { id: "covers", min: 3.2, weight: 0.7, say: "Or turn the shelf face out." },
    { id: "pull", min: 4.4, weight: 1, say: "Can't choose? Pull one for me." },
    { id: "lenses", min: 5.5, weight: 1.2, say: "Four more lenses: the slip, the numbers, the lines I kept, the catalogue." },
    { id: "shells", min: 3.6, weight: 0.8, say: "By day, or after dark. Classic, or atlas." },
    { id: "finale", min: 5.2, weight: 1, say: "The Reading Room. Come, take one down, at sankettambare dot in, slash books." },
  ];
}

const norm = (x) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * The voice's tokens carry no punctuation and may split or join words
 * differently from the script; pair them back up with the script's own words
 * so a caption reads "shelf." and not "shelf".
 */
function align(tokens, text) {
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < words.length && j < tokens.length) {
    let w = words[i];
    let t = { ...tokens[j] };
    let nw = norm(w);
    let nt = norm(t.w);
    i += 1;
    j += 1;
    while (nw !== nt && (nw.length < nt.length ? i < words.length : j < tokens.length)) {
      if (nw.length < nt.length) { w = `${w} ${words[i]}`; nw += norm(words[i]); i += 1; } else {
        const n = tokens[j];
        t = { t: t.t, d: n.t + n.d - t.t, w: `${t.w}${n.w}` };
        nt += norm(n.w);
        j += 1;
      }
    }
    out.push({ ...t, w });
  }
  return out;
}

// The address is spoken as words and captioned as an address.
function mergeAddress(words) {
  const at = words.findIndex((w) => /^sankettambare/i.test(w.w));
  // "…down, at sankettambare dot in, slash books." → one caption word.
  if (at < 0) return words;
  const end = words.findIndex((w, k) => k > at && /^books/i.test(w.w));
  if (end < 0) return words;
  const last = words[end];
  return [...words.slice(0, at), { t: words[at].t, d: last.t + last.d - words[at].t, w: `sankettambare.in/books${/\.$/.test(last.w) ? "." : ""}` }, ...words.slice(end + 1)];
}

const VOICE = opt("voice") || process.env.BOOKS_FILM_VOICE || "en-IN-NeerjaExpressiveNeural";
const PITCH = "+0Hz";

/** One line, spoken (cached by voice + rate + text): { wav, secs, words }. */
function speak(text, rate) {
  const dir = path.join(WORK, "voice");
  fs.mkdirSync(dir, { recursive: true });
  const key = crypto.createHash("sha1").update(JSON.stringify([VOICE, rate, PITCH, text])).digest("hex").slice(0, 16);
  const wav = path.join(dir, `${key}.wav`);
  const meta = path.join(dir, `${key}.json`);
  if (!fs.existsSync(wav) || !fs.existsSync(meta)) {
    const mp3 = path.join(dir, `${key}.mp3`);
    const ca = ["/root/.ccr/ca-bundle.crt", process.env.SSL_CERT_FILE].find((p) => p && fs.existsSync(p));
    execFileSync("python3", ["-I", path.join(HERE, "voice.py"), VOICE, rate, PITCH, mp3, meta], {
      input: text, stdio: ["pipe", "ignore", "inherit"], env: { ...process.env, ...(ca && !process.env.EDGE_TTS_CA ? { EDGE_TTS_CA: ca } : {}) },
    });
    // Trim the leading silence edge-tts adds so LEAD alone sets the pause.
    execFileSync("ffmpeg", ["-y", "-i", mp3, "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", wav], { stdio: "ignore" });
    fs.rmSync(mp3, { force: true });
  }
  const { words } = JSON.parse(fs.readFileSync(meta, "utf8"));
  // The take ends with silence; the line is as long as its last word.
  const end = words.length ? words[words.length - 1].t + words[words.length - 1].d + 0.12 : wavSeconds(wav);
  return { wav, secs: Math.min(end, wavSeconds(wav)), words: mergeAddress(align(words, text)) };
}

const LEAD = 0.3; // seconds of picture before a line starts
const TAIL = 0.35; // and after it ends

/** Speak every line, then size the scenes around them to fill SECONDS. */
function timeline(scenes) {
  let pct = 6; // Neerja's default pace is unhurried; a film wants a touch more.
  let takes;
  const need = () => scenes.reduce((sum, s, i) => sum + Math.max(s.min, LEAD + takes[i].secs + TAIL), 0);
  // Too long for a minute? Ask the voice to speak a little quicker (≤ +20%).
  for (;;) {
    const rate = `${pct >= 0 ? "+" : ""}${pct}%`;
    takes = scenes.map((s) => speak(s.say, rate));
    if (need() <= SECONDS || pct >= 20) break;
    pct += 3;
  }
  if (need() > SECONDS) throw new Error(`The narration needs ${need().toFixed(1)} s even at +20% — shorten a line.`);
  fs.mkdirSync(path.join(PUB, "voice"), { recursive: true });
  const base = scenes.map((s, i) => Math.max(s.min, LEAD + takes[i].secs + TAIL));
  const spare = SECONDS - base.reduce((a, b) => a + b, 0);
  const W = scenes.reduce((a, s) => a + s.weight, 0);
  let at = 0;
  const out = scenes.map((s, i) => {
    const dur = base[i] + (spare * s.weight) / W;
    const from = Math.round(at * FPS);
    at += dur;
    const to = Math.round(at * FPS);
    const src = `voice/${s.id}.wav`;
    execFileSync("ffmpeg", ["-y", "-i", takes[i].wav, "-t", (takes[i].secs + 0.25).toFixed(3), "-af", "afade=t=out:st=" + takes[i].secs.toFixed(3) + ":d=0.25", path.join(PUB, src)], { stdio: "ignore" });
    const lead = Math.round(LEAD * FPS);
    return {
      id: s.id,
      from,
      dur: to - from,
      line: {
        src,
        from: from + lead,
        dur: Math.ceil(takes[i].secs * FPS),
        text: s.say,
        // Each word's start and length in frames, from the line's start.
        words: takes[i].words.map((w) => ({ f: Math.round(w.t * FPS), d: Math.max(1, Math.round(w.d * FPS)), w: w.w })),
      },
    };
  });
  return {
    fps: FPS, frames: SECONDS * FPS, rate: pct, voice: VOICE, scenes: out,
  };
}

function vttTime(frames) {
  const s = frames / FPS;
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = (s % 60).toFixed(3).padStart(6, "0");
  return `${hh}:${mm}:${ss}`;
}

/** Captions at sentence ends, timed by the voice's own word boundaries. */
function vtt(tl) {
  const cues = [];
  tl.scenes.forEach(({ line }) => {
    let group = [];
    const flush = () => {
      if (!group.length) return;
      const last = group[group.length - 1];
      cues.push({ a: line.from + group[0].f, b: line.from + last.f + last.d + 6, text: group.map((g) => g.w).join(" ") });
      group = [];
    };
    line.words.forEach((w) => {
      group.push(w);
      if (/[.?!:]$/.test(w.w) || group.length >= 9) flush();
    });
    flush();
  });
  // A cue never runs into the next one.
  cues.forEach((c, k) => { if (cues[k + 1]) c.b = Math.min(c.b, cues[k + 1].a); });
  return `WEBVTT\n\n${cues.map((c) => `${vttTime(c.a)} --> ${vttTime(c.b)}\n${c.text}`).join("\n\n")}\n`;
}

const CHAPTERS = {
  hook: "The shelf", count: "The library", anatomy: "A spine is data", reach: "Take one down", arrange: "Six ways", filter: "Filters dim", covers: "Face out", pull: "Pull one", lenses: "Five lenses", shells: "Day and night", finale: "Come in",
};

async function main() {
  fs.mkdirSync(PUB, { recursive: true });
  // Fonts: the page's own Fraunces + Tiro Devanagari Marathi, and the site's
  // Plus Jakarta Sans and Inter for labels.
  fs.readdirSync(path.join(HERE, "fonts")).filter((f) => f.endsWith(".woff")).forEach((f) => fs.copyFileSync(path.join(HERE, "fonts", f), path.join(PUB, f)));
  ["plus-jakarta-sans-latin-700-normal.woff", "inter-latin-400-normal.woff", "inter-latin-700-normal.woff"]
    .forEach((f) => fs.copyFileSync(path.join(ROOT, "scripts", "og-fonts", f), path.join(PUB, f)));

  const missing = CLIP_NAMES.filter((c) => !fs.existsSync(path.join(PUB, `clip-${c}.mp4`)));
  const recapture = opt("capture")?.split(",") || (flag("capture") ? [] : null);
  if (recapture || missing.length) {
    console.log("Recording the page…");
    await capture(PUB, recapture?.length ? recapture : (missing.length && !recapture ? missing : null));
  }
  const clips = JSON.parse(fs.readFileSync(path.join(PUB, "clips.json"), "utf8"));

  console.log("Reading the shelf…");
  const data = await loadFilmData();
  const scenes = script(data);
  console.log(`Narrator: ${VOICE}`);
  const tl = timeline(scenes);
  console.log(`Scenes: ${tl.scenes.map((s) => `${s.id} ${(s.dur / FPS).toFixed(1)}s`).join(" · ")}${tl.rate ? ` (voice +${tl.rate}%)` : ""}`);

  fs.writeFileSync(path.join(PUB, "score.wav"), renderScore(tl));
  const props = { data, tl, clips };
  fs.writeFileSync(path.join(WORK, "props.json"), JSON.stringify(props));
  fs.writeFileSync(path.join(WORK, "the-books-story.vtt"), vtt(tl));

  console.log("Bundling…");
  const serveUrl = await bundle({ entryPoint: path.join(HERE, "remotion", "index.jsx"), publicDir: PUB, onProgress: () => {} });
  const composition = await selectComposition({
    serveUrl, id: "BooksFilm", inputProps: props, browserExecutable: CHROME,
  });

  const stillAt = async (sec, file) => {
    await renderStill({
      serveUrl, composition, inputProps: props, frame: Math.min(composition.durationInFrames - 1, Math.round(sec * FPS)), output: file, browserExecutable: CHROME,
    });
    console.log(`  ${path.relative(ROOT, file)}`);
  };
  if (opt("frame")) {
    for (const s of opt("frame").split(",").map(Number)) await stillAt(s, path.join(WORK, `frame-${s}.png`)); // eslint-disable-line no-await-in-loop
    return;
  }
  if (flag("stills")) {
    for (const s of tl.scenes) await stillAt((s.from + s.dur * 0.6) / FPS, path.join(WORK, `still-${s.id}.png`)); // eslint-disable-line no-await-in-loop
    return;
  }

  console.log("Rendering…");
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps: props,
    codec: "h264",
    crf: 18,
    outputLocation: OUT,
    browserExecutable: CHROME,
    concurrency: Number(opt("concurrency")) || null,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) { last = p; process.stdout.write(`${p * 10}% `); }
    },
  });
  console.log(`\n${path.relative(ROOT, OUT)}`);

  if (flag("publish")) {
    fs.mkdirSync(path.dirname(WEB), { recursive: true });
    // Small on purpose: a phone that presses play downloads all of it.
    execFileSync("ffmpeg", ["-y", "-i", OUT, "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "30",
      "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "80k", "-ar", "48000", `${WEB}.mp4`], { stdio: "ignore" });
    const hook = tl.scenes.find((s) => s.id === "hook");
    const posterAt = (hook.from + hook.dur * 0.9) / FPS;
    execFileSync("ffmpeg", ["-y", "-ss", posterAt.toFixed(2), "-i", OUT, "-frames:v", "1", "-vf", "scale=720:1280:flags=lanczos", "-q:v", "5", `${WEB}.jpg`], { stdio: "ignore" });
    fs.copyFileSync(path.join(WORK, "the-books-story.vtt"), `${WEB}.vtt`);
    fs.writeFileSync(`${WEB}.json`, `${JSON.stringify({
      duration: SECONDS,
      narrator: `Microsoft neural voice ${VOICE} (edge-tts)`,
      chapters: tl.scenes.map((s) => ({ t: Math.round((s.from / FPS) * 10) / 10, title: CHAPTERS[s.id] })),
    }, null, 2)}\n`);
    const mb = fs.statSync(`${WEB}.mp4`).size / 1024 / 1024;
    console.log(`Published public/video/the-books-story.{mp4,jpg,vtt,json} (${mb.toFixed(1)} MB)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
